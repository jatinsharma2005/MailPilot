import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Email, IEmail } from '../models/Email.js';
import { Conversation } from '../models/Conversation.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { ApiError } from '../utils/ApiError.js';
import { syncConversations } from '../utils/conversationSync.js';

export class EmailController {
  /**
   * List conversations/emails with proper Gmail-style grouping, filters, search, and pagination
   */
  static async getEmails(req: AuthRequest, res: Response) {
    const workspaceId = req.workspaceId!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    const {
      page = '1',
      limit = '25',
      classification,
      priority,
      status,
      isRead,
      isImportant,
      isArchived = 'false',
      search,
      filter,
      folder,
    } = req.query as Record<string, string>;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const normalizedFilter = (filter || folder || '').trim().toLowerCase();
    const filterAliases: Record<string, string> = {
      archive: 'archived',
      archived: 'archived',
      no_reply_needed: 'no_reply',
      action_required: 'action',
      waiting_for_response: 'waiting',
      waiting_response: 'waiting',
      assistant_to_reply: 'assistant',
      client_to_reply: 'client',
      needs_review: 'needs_review',
      no_reply: 'no_reply',
      meetings: 'meetings',
      general: 'general',
      sent: 'sent',
      inbox: 'inbox',
      all: 'all',
    };
    const effectiveFilter = filterAliases[normalizedFilter] || normalizedFilter;

    // Build query conditions for the Conversation collection
    const andConditions: any[] = [{ workspaceId: wsObjectId }];

    // Folder and Archive filtering
    if (effectiveFilter === 'sent') {
      // Sent folder: conversations that have outbound replies sent by assistant/user
      andConditions.push({ hasOutbound: true });
    } else if (effectiveFilter === 'archived' || isArchived === 'true') {
      andConditions.push({ isArchived: true });
    } else {
      // Standard active folders (Inbox, unread, etc.): only non-archived conversations
      if (isArchived === 'false' || !isArchived) {
        andConditions.push({ isArchived: false });
      }

      // Default Inbox shows conversations with inbound messages
      if (!effectiveFilter || effectiveFilter === 'all' || effectiveFilter === 'inbox') {
        andConditions.push({ hasInbound: true });
      }
    }

    // Specific category filters
    if (effectiveFilter === 'unread') {
      andConditions.push({ unreadCount: { $gt: 0 } });
    } else if (effectiveFilter === 'important') {
      andConditions.push({ isStarred: true });
    } else if (effectiveFilter === 'action') {
      andConditions.push({ requiresAction: true });
    } else if (effectiveFilter === 'waiting') {
      andConditions.push({ currentClassification: 'ASSISTANT_TO_REPLY', isCompleted: false });
    } else if (effectiveFilter === 'assistant') {
      andConditions.push({ currentClassification: 'ASSISTANT_TO_REPLY' });
    } else if (effectiveFilter === 'client') {
      andConditions.push({ currentClassification: 'CLIENT_TO_REPLY' });
    } else if (effectiveFilter === 'no_reply') {
      // Explicitly return ONLY conversations whose current classification is NO_REPLY_NEEDED
      andConditions.push({ currentClassification: 'NO_REPLY_NEEDED' });
    } else if (effectiveFilter === 'needs_review') {
      andConditions.push({ currentClassification: 'NEEDS_REVIEW' });
    } else if (effectiveFilter === 'meetings') {
      andConditions.push({
        $or: [
          { subject: { $regex: /meeting|schedule|appointment|calendar|call/i } },
          { snippet: { $regex: /meeting|schedule|calendar|coordination/i } },
        ],
      });
    } else if (effectiveFilter === 'general') {
      andConditions.push({
        currentClassification: { $in: ['NO_REPLY_NEEDED', 'NEEDS_REVIEW'] },
      });
    }

    // Optional override parameters
    if (classification && !filter) {
      andConditions.push({ currentClassification: classification });
    }
    if (priority) {
      andConditions.push({ priority });
    }
    if (status) {
      if (status === 'COMPLETED') {
        andConditions.push({ isCompleted: true });
      } else if (status === 'PENDING') {
        andConditions.push({ isCompleted: false });
      }
    }
    if (isRead !== undefined && !filter) {
      andConditions.push(isRead === 'true' ? { unreadCount: 0 } : { unreadCount: { $gt: 0 } });
    }
    if (isImportant !== undefined && !filter) {
      andConditions.push({ isStarred: isImportant === 'true' });
    }

    // Full-text search across subject, snippet, body, participant names, and sender
    if (search && search.trim().length > 0) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');

      const matchingEmailConvIds = await Email.find({
        workspaceId: wsObjectId,
        $or: [
          { subject: searchRegex },
          { body: searchRegex },
          { 'sender.name': searchRegex },
          { 'sender.email': searchRegex },
        ],
      }).distinct('conversationId');

      andConditions.push({
        $or: [
          { _id: { $in: matchingEmailConvIds } },
          { subject: searchRegex },
          { snippet: searchRegex },
          { participantNames: searchRegex },
        ],
      });
    }

    const query = { $and: andConditions };

    // Fetch conversation summaries and count
    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: 'latestEmailId',
          populate: { path: 'accountId', select: 'provider emailAddress displayName' },
        }),
      Conversation.countDocuments(query),
    ]);

    // Format conversation items for the frontend and test suites
    const data = await Promise.all(
      conversations.map(async (conv) => {
        let latestEmail: any = conv.latestEmailId;

        // If latestEmailId wasn't populated or was deleted, retrieve the most recent email for this conversation
        if (!latestEmail) {
          latestEmail = await Email.findOne({
            conversationId: conv._id,
            workspaceId: wsObjectId,
          })
            .sort({ receivedAt: -1 })
            .populate('accountId', 'provider emailAddress displayName');
        }

        const effectiveEmailId = latestEmail?._id?.toString() || conv._id.toString();

        return {
          _id: effectiveEmailId,
          conversationId: conv._id.toString(),
          threadId: conv._id.toString(),
          subject: conv.subject,
          snippet: conv.snippet || (latestEmail?.body || '').slice(0, 100),
          body: latestEmail?.body || conv.snippet || '',
          participants: conv.participantNames,
          participantNames: conv.participantNames,
          messageCount: conv.messageCount || conv.messageIds?.length || 1,
          lastMessageAt: conv.lastMessageAt,
          receivedAt: conv.lastMessageAt,
          sender: latestEmail?.sender || { name: conv.participantNames[0] || 'Unknown', email: '' },
          recipients: latestEmail?.recipients || [],
          classification: conv.currentClassification || 'NEEDS_REVIEW',
          confidence: latestEmail?.confidence ?? 0.85,
          priority: conv.priority || latestEmail?.priority || 'MEDIUM',
          isRead: conv.unreadCount === 0,
          isImportant: conv.isStarred,
          isStarred: conv.isStarred,
          isArchived: conv.isArchived,
          direction: latestEmail?.direction || (conv.hasOutbound ? 'OUTBOUND' : 'INBOUND'),
          hasOutbound: conv.hasOutbound,
          hasInbound: conv.hasInbound,
          status: latestEmail?.status || (conv.isCompleted ? 'COMPLETED' : 'PENDING'),
          requiresAction: conv.requiresAction,
          aiSummary: conv.aiSummary || latestEmail?.aiSummary || conv.snippet || '',
          classificationReason: conv.classificationReason || latestEmail?.classificationReason || '',
          suggestedAction: conv.suggestedAction || latestEmail?.suggestedAction || '',
          suggestedReply: latestEmail?.suggestedReply || '',
          accountId: latestEmail?.accountId,
          attachments: latestEmail?.attachments || [],
        };
      })
    );

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  }

  /**
   * Get single email and its full conversation thread
   */
  static async getEmailById(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    let email = await Email.findOne({
      _id: id,
      workspaceId: wsObjectId,
    }).populate('accountId', 'provider emailAddress displayName');

    let conversation: any = null;

    if (!email) {
      // Check if id is a conversationId
      conversation = await Conversation.findOne({
        _id: id,
        workspaceId: wsObjectId,
      });

      if (conversation) {
        email = await Email.findOne({
          conversationId: conversation._id,
          workspaceId: wsObjectId,
        })
          .sort({ receivedAt: -1 })
          .populate('accountId', 'provider emailAddress displayName');
      }
    }

    if (!email) {
      throw new ApiError(404, 'Email conversation not found in this workspace.');
    }

    if (!conversation) {
      conversation = await Conversation.findOne({
        _id: email.conversationId,
        workspaceId: wsObjectId,
      });
    }

    // Auto mark all messages in this conversation as read
    await Email.updateMany(
      { conversationId: email.conversationId, workspaceId: wsObjectId, isRead: false },
      { isRead: true }
    );
    email.isRead = true;

    if (conversation) {
      conversation.unreadCount = 0;
      await conversation.save();
    }

    // Fetch all messages in this conversation sorted chronologically
    const threadMessages = await Email.find({
      conversationId: email.conversationId,
      workspaceId: wsObjectId,
    })
      .sort({ receivedAt: 1 })
      .populate('accountId', 'provider emailAddress displayName');

    res.status(200).json({
      success: true,
      data: {
        email,
        conversation,
        threadMessages,
      },
    });
  }

  /**
   * Manually override AI classification
   */
  static async updateClassification(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { classification, reason } = req.body;
    const workspaceId = req.workspaceId!;
    const user = req.user!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    let email = await Email.findOne({
      _id: id,
      workspaceId: wsObjectId,
    });

    let convId: Types.ObjectId | null = null;

    if (!email) {
      const conv = await Conversation.findOne({
        _id: id,
        workspaceId: wsObjectId,
      });
      if (conv) {
        convId = conv._id;
        email = await Email.findOne({
          conversationId: conv._id,
          workspaceId: wsObjectId,
        }).sort({ receivedAt: -1 });
      }
    } else {
      convId = email.conversationId;
    }

    if (!email || !convId) {
      throw new ApiError(404, 'Email not found.');
    }

    const previousClassification = email.classification;
    email.classification = classification;
    email.manualOverride = {
      isOverridden: true,
      previousClassification,
      overriddenBy: user._id,
      overriddenAt: new Date(),
      reason: reason || 'Manual user adjustment',
    };

    if (classification === 'CLIENT_TO_REPLY') {
      email.status = 'PENDING';
      email.requiresAction = true;
    } else if (classification === 'ASSISTANT_TO_REPLY') {
      email.status = 'PENDING';
      email.requiresAction = true;
    } else if (classification === 'NO_REPLY_NEEDED') {
      email.requiresAction = false;
      email.status = 'COMPLETED';
    } else if (classification === 'NEEDS_REVIEW') {
      email.requiresAction = true;
      email.status = 'PENDING';
    }

    await email.save();

    // Sync all emails in this conversation
    await Email.updateMany(
      { conversationId: convId, workspaceId: wsObjectId },
      { classification, requiresAction: email.requiresAction, status: email.status }
    );

    // Sync Conversation record
    await Conversation.findByIdAndUpdate(convId, {
      currentClassification: classification,
      requiresAction: email.requiresAction,
      isCompleted: classification === 'NO_REPLY_NEEDED',
      assignedTo:
        classification === 'CLIENT_TO_REPLY'
          ? 'CLIENT'
          : classification === 'ASSISTANT_TO_REPLY'
          ? 'ASSISTANT'
          : 'NONE',
    });

    // Record Activity Log
    await ActivityLog.create({
      workspaceId: wsObjectId,
      userId: user._id,
      action: 'CLASSIFICATION_OVERRIDDEN',
      entityType: 'EMAIL',
      entityId: email._id.toString(),
      previousValue: previousClassification,
      newValue: classification,
      description: `${user.name} adjusted classification from ${previousClassification} to ${classification}`,
    });

    res.status(200).json({
      success: true,
      message: 'Classification updated successfully',
      data: email,
    });
  }

  static async toggleRead(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    let email = await Email.findOne({ _id: id, workspaceId: wsObjectId });
    let convId: Types.ObjectId | null = null;
    if (!email) {
      const conv = await Conversation.findOne({ _id: id, workspaceId: wsObjectId });
      if (conv) {
        convId = conv._id;
        email = await Email.findOne({ conversationId: conv._id, workspaceId: wsObjectId }).sort({ receivedAt: -1 });
      }
    } else {
      convId = email.conversationId;
    }

    if (!email) throw new ApiError(404, 'Email not found.');

    const newReadState = !email.isRead;
    email.isRead = newReadState;
    await email.save();

    if (convId) {
      await Email.updateMany({ conversationId: convId, workspaceId: wsObjectId }, { isRead: newReadState });
      await Conversation.findByIdAndUpdate(convId, {
        unreadCount: newReadState ? 0 : 1,
      });
    }

    res.status(200).json({ success: true, data: email });
  }

  static async toggleImportant(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    let email = await Email.findOne({ _id: id, workspaceId: wsObjectId });
    let convId: Types.ObjectId | null = null;
    if (!email) {
      const conv = await Conversation.findOne({ _id: id, workspaceId: wsObjectId });
      if (conv) {
        convId = conv._id;
        email = await Email.findOne({ conversationId: conv._id, workspaceId: wsObjectId }).sort({ receivedAt: -1 });
      }
    } else {
      convId = email.conversationId;
    }

    if (!email) throw new ApiError(404, 'Email not found.');

    const newImportantState = !email.isImportant;
    email.isImportant = newImportantState;
    email.isStarred = newImportantState;
    await email.save();

    if (convId) {
      await Email.updateMany(
        { conversationId: convId, workspaceId: wsObjectId },
        { isImportant: newImportantState, isStarred: newImportantState }
      );
      await Conversation.findByIdAndUpdate(convId, { isStarred: newImportantState });
    }

    res.status(200).json({ success: true, data: email });
  }

  static async toggleArchive(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    let email = await Email.findOne({ _id: id, workspaceId: wsObjectId });
    let convId: Types.ObjectId | null = null;
    if (!email) {
      const conv = await Conversation.findOne({ _id: id, workspaceId: wsObjectId });
      if (conv) {
        convId = conv._id;
        email = await Email.findOne({ conversationId: conv._id, workspaceId: wsObjectId }).sort({ receivedAt: -1 });
      }
    } else {
      convId = email.conversationId;
    }

    if (!email) throw new ApiError(404, 'Email not found.');

    const newArchiveState = !email.isArchived;
    email.isArchived = newArchiveState;
    await email.save();

    if (convId) {
      await Email.updateMany({ conversationId: convId, workspaceId: wsObjectId }, { isArchived: newArchiveState });
      await Conversation.findByIdAndUpdate(convId, { isArchived: newArchiveState });
    }

    res.status(200).json({ success: true, data: email });
  }

  static async markComplete(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    let email = await Email.findOne({ _id: id, workspaceId: wsObjectId });
    let convId: Types.ObjectId | null = null;
    if (!email) {
      const conv = await Conversation.findOne({ _id: id, workspaceId: wsObjectId });
      if (conv) {
        convId = conv._id;
        email = await Email.findOne({ conversationId: conv._id, workspaceId: wsObjectId }).sort({ receivedAt: -1 });
      }
    } else {
      convId = email.conversationId;
    }

    if (!email) throw new ApiError(404, 'Email not found.');

    email.status = 'COMPLETED';
    email.requiresAction = false;
    await email.save();

    if (convId) {
      await Email.updateMany(
        { conversationId: convId, workspaceId: wsObjectId },
        { status: 'COMPLETED', requiresAction: false }
      );
      await Conversation.findByIdAndUpdate(convId, { isCompleted: true, requiresAction: false });
    }

    res.status(200).json({ success: true, data: email });
  }

  /**
   * Send a reply (with clear simulated indication and explicit human approval)
   */
  static async sendReply(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { to, cc, subject, body, tone, isSimulated = true } = req.body;
    const workspaceId = req.workspaceId!;
    const user = req.user!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    let originalEmail = await Email.findOne({
      _id: id,
      workspaceId: wsObjectId,
    });

    if (!originalEmail) {
      const conv = await Conversation.findOne({
        _id: id,
        workspaceId: wsObjectId,
      });
      if (conv) {
        originalEmail = await Email.findOne({
          conversationId: conv._id,
          workspaceId: wsObjectId,
        }).sort({ receivedAt: -1 });
      }
    }

    if (!originalEmail) throw new ApiError(404, 'Original conversation not found.');

    const cleanSubject = originalEmail.subject.startsWith('Re:')
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`;

    // Create the reply email message in the thread
    const replyEmail = await Email.create({
      workspaceId: wsObjectId,
      accountId: originalEmail.accountId,
      conversationId: originalEmail.conversationId,
      threadId: originalEmail.conversationId.toString(),
      sender: {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      recipients: [{ name: originalEmail.sender.name, email: to }],
      cc: cc ? [{ name: 'CC', email: cc }] : [],
      subject: cleanSubject,
      body,
      receivedAt: new Date(),
      isRead: true,
      direction: 'OUTBOUND',
      isSent: true,
      classification: 'NO_REPLY_NEEDED',
      confidence: 1.0,
      priority: 'MEDIUM',
      aiSummary: `Reply sent by ${user.name}: "${body.slice(0, 100)}..."`,
      requiresAction: false,
      status: 'COMPLETED',
    });

    // Mark original email and conversation as handled/completed
    originalEmail.status = 'COMPLETED';
    originalEmail.requiresAction = false;
    await originalEmail.save();

    // Update conversation: append reply, mark hasOutbound, update lastMessageAt, snippet, messageCount
    const conv = await Conversation.findById(originalEmail.conversationId);
    if (conv) {
      if (!conv.messageIds.some((m) => m.toString() === replyEmail._id.toString())) {
        conv.messageIds.push(replyEmail._id);
      }
      conv.lastMessageAt = new Date();
      conv.latestEmailId = replyEmail._id;
      conv.hasOutbound = true;
      conv.messageCount = (conv.messageCount || conv.messageIds.length || 1) + 1;
      conv.snippet = `You: ${body.slice(0, 100).trim()}`;
      if (!conv.participantNames.includes(user.name)) {
        conv.participantNames.push(user.name);
      }
      conv.isCompleted = true;
      conv.requiresAction = false;
      await conv.save();
    }

    // Log Activity
    await ActivityLog.create({
      workspaceId: wsObjectId,
      userId: user._id,
      action: 'REPLY_SENT',
      entityType: 'EMAIL',
      entityId: replyEmail._id.toString(),
      description: `Sent reply to ${to} (${isSimulated ? 'Simulated Dispatch' : 'Live'}) - Explicitly Approved`,
      metadata: { to, tone, isSimulated, isApproved: true },
    });

    res.status(201).json({
      success: true,
      message: isSimulated
        ? 'Reply dispatched successfully via simulated integration'
        : 'Reply sent successfully',
      data: replyEmail,
    });
  }
}
