import { Types } from 'mongoose';
import { Email, IEmail } from '../models/Email.js';
import { Conversation, IConversation } from '../models/Conversation.js';

/**
 * Normalizes subject for thread matching (removes leading Re:, Fwd:, whitespace)
 */
export function normalizeSubject(subject: string): string {
  if (!subject) return 'No Subject';
  return subject
    .replace(/^((re|fwd|fw):\s*)+/i, '')
    .trim();
}

/**
 * Synchronizes and repairs conversation threads across emails in MongoDB.
 * Idempotent: can be run safely at startup or after database seeding.
 */
export async function syncConversations(): Promise<{ syncedEmails: number; syncedConversations: number }> {
  const emails = await Email.find().sort({ receivedAt: 1 });
  if (emails.length === 0) return { syncedEmails: 0, syncedConversations: 0 };

  // 1. Ensure all emails have valid direction, threadId, and conversationId
  for (const email of emails) {
    let dirty = false;

    // Detect outbound replies
    const isOutbound = Boolean(
      email.direction === 'OUTBOUND' ||
      email.isSent === true ||
      /assistant@mailpilot.io/i.test(email.sender?.email || '') ||
      /sarah/i.test(email.sender?.name || '') ||
      (email.subject && email.subject.toLowerCase().startsWith('re:'))
    );

    if (email.direction !== (isOutbound ? 'OUTBOUND' : 'INBOUND')) {
      email.direction = isOutbound ? 'OUTBOUND' : 'INBOUND';
      email.isSent = isOutbound;
      dirty = true;
    }

    if (!email.threadId && email.conversationId) {
      email.threadId = email.conversationId.toString();
      dirty = true;
    }

    // Verify conversation exists
    if (!email.conversationId) {
      const normSubj = normalizeSubject(email.subject);
      let conv = await Conversation.findOne({
        workspaceId: email.workspaceId,
        subject: normSubj,
      });

      if (!conv) {
        conv = await Conversation.create({
          workspaceId: email.workspaceId,
          subject: normSubj,
          messageIds: [email._id],
          lastMessageAt: email.receivedAt,
          currentClassification: email.classification,
          assignedTo:
            email.classification === 'CLIENT_TO_REPLY'
              ? 'CLIENT'
              : email.classification === 'ASSISTANT_TO_REPLY'
              ? 'ASSISTANT'
              : 'NONE',
          isCompleted: email.status === 'COMPLETED',
          isArchived: email.isArchived,
          isStarred: email.isImportant,
          snippet: email.body.slice(0, 100),
          participantNames: [email.sender.name],
          unreadCount: email.isRead ? 0 : 1,
          messageCount: 1,
          hasOutbound: isOutbound,
          hasInbound: !isOutbound,
          priority: email.priority,
          requiresAction: email.requiresAction,
        });
      }

      email.conversationId = conv._id;
      email.threadId = conv._id.toString();
      dirty = true;
    }

    if (dirty) {
      await email.save();
    }
  }

  // 2. Refresh all Conversation documents based on their member emails
  const conversations = await Conversation.find();
  for (const conv of conversations) {
    const threadEmails = await Email.find({ conversationId: conv._id }).sort({ receivedAt: 1 });
    if (threadEmails.length === 0) continue;

    const latestEmail = threadEmails[threadEmails.length - 1];
    const earliestEmail = threadEmails[0];

    const hasOutbound = threadEmails.some((e) => e.direction === 'OUTBOUND' || e.isSent === true);
    const hasInbound = threadEmails.some((e) => e.direction === 'INBOUND' || !e.isSent);
    const unreadCount = threadEmails.filter((e) => !e.isRead).length;
    const isStarred = threadEmails.some((e) => e.isImportant || e.isStarred);
    const requiresAction = threadEmails.some((e) => e.requiresAction);

    // Collect all participant names
    const participantSet = new Set<string>();
    threadEmails.forEach((e) => {
      if (e.sender?.name) participantSet.add(e.sender.name);
      if (e.recipients && Array.isArray(e.recipients)) {
        e.recipients.forEach((r) => {
          if (r.name) participantSet.add(r.name);
        });
      }
    });

    const snippet =
      latestEmail.direction === 'OUTBOUND'
        ? `You: ${(latestEmail.body || '').slice(0, 100).trim()}`
        : (latestEmail.body || '').slice(0, 100).trim();

    conv.messageIds = threadEmails.map((e) => e._id);
    conv.messageCount = threadEmails.length;
    conv.latestEmailId = latestEmail._id;
    conv.lastMessageAt = latestEmail.receivedAt;
    conv.hasOutbound = hasOutbound;
    conv.hasInbound = hasInbound;
    conv.participantNames = Array.from(participantSet);
    conv.unreadCount = unreadCount;
    conv.isStarred = isStarred;
    conv.snippet = snippet;
    conv.currentClassification = latestEmail.classification || conv.currentClassification || 'NEEDS_REVIEW';
    conv.priority = latestEmail.priority || conv.priority || 'MEDIUM';
    conv.requiresAction = requiresAction;
    conv.aiSummary = latestEmail.aiSummary || conv.aiSummary || '';
    conv.classificationReason = latestEmail.classificationReason || conv.classificationReason || '';
    conv.suggestedAction = latestEmail.suggestedAction || conv.suggestedAction || '';

    await conv.save();
  }

  return { syncedEmails: emails.length, syncedConversations: conversations.length };
}
