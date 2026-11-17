import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Email } from '../models/Email.js';
import { Conversation } from '../models/Conversation.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { ApiError } from '../utils/ApiError.js';

export class ClientController {
  /**
   * Get emails requiring client attention
   */
  static async getAttentionEmails(req: AuthRequest, res: Response) {
    const workspaceId = req.workspaceId!;

    const emails = await Email.find({
      workspaceId: new Types.ObjectId(workspaceId),
      classification: 'CLIENT_TO_REPLY',
      status: 'PENDING',
      isArchived: false,
    })
      .sort({ priority: -1, receivedAt: -1 })
      .populate('accountId', 'provider emailAddress displayName');

    // Grouping by categories for client quick view (e.g. Invoices, Contracts, Executive)
    const categoryCounts: Record<string, number> = {};
    emails.forEach((e) => {
      const cat = e.suggestedCategory || 'General Attention';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        emails,
        totalPending: emails.length,
        categoryCounts,
      },
    });
  }

  /**
   * Action 1: Client handles the matter directly ("I'll Handle This")
   */
  static async handleEmail(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { clientNotes } = req.body;
    const workspaceId = req.workspaceId!;
    const user = req.user!;

    const email = await Email.findOne({
      _id: id,
      workspaceId: new Types.ObjectId(workspaceId),
    });

    if (!email) throw new ApiError(404, 'Email not found.');

    email.status = 'HANDLED';
    email.requiresAction = false;
    email.clientNotes = clientNotes || 'Handled directly by client.';
    await email.save();

    await Conversation.findOneAndUpdate(
      { _id: email.conversationId, workspaceId: new Types.ObjectId(workspaceId) },
      { isCompleted: true, assignedTo: 'NONE' }
    );

    await ActivityLog.create({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: user._id,
      action: 'EMAIL_HANDLED',
      entityType: 'EMAIL',
      entityId: email._id.toString(),
      description: `${user.name} marked matter as handled: "${email.subject}"`,
      metadata: { clientNotes },
    });

    res.status(200).json({
      success: true,
      message: 'Matter marked as handled. Updated across assistant and client workspaces.',
      data: email,
    });
  }

  /**
   * Action 2: Client delegates the matter to the assistant ("Delegate to Assistant")
   */
  static async delegateEmail(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { delegationReason } = req.body;
    const workspaceId = req.workspaceId!;
    const user = req.user!;

    const email = await Email.findOne({
      _id: id,
      workspaceId: new Types.ObjectId(workspaceId),
    });

    if (!email) throw new ApiError(404, 'Email not found.');

    const previousClassification = email.classification;
    email.status = 'DELEGATED';
    email.classification = 'ASSISTANT_TO_REPLY';
    email.delegationReason = delegationReason || 'Client delegated operational handling to assistant.';
    email.requiresAction = true;
    await email.save();

    await Conversation.findOneAndUpdate(
      { _id: email.conversationId, workspaceId: new Types.ObjectId(workspaceId) },
      {
        currentClassification: 'ASSISTANT_TO_REPLY',
        assignedTo: 'ASSISTANT',
        isCompleted: false,
      }
    );

    await ActivityLog.create({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: user._id,
      action: 'EMAIL_DELEGATED',
      entityType: 'EMAIL',
      entityId: email._id.toString(),
      previousValue: previousClassification,
      newValue: 'ASSISTANT_TO_REPLY',
      description: `${user.name} delegated "${email.subject}" to assistant. Note: ${email.delegationReason}`,
      metadata: { delegationReason },
    });

    res.status(200).json({
      success: true,
      message: 'Conversation delegated to assistant. Now visible on assistant action queue.',
      data: email,
    });
  }

  /**
   * History of previously handled decisions
   */
  static async getHistory(req: AuthRequest, res: Response) {
    const workspaceId = req.workspaceId!;

    const resolvedEmails = await Email.find({
      workspaceId: new Types.ObjectId(workspaceId),
      status: { $in: ['HANDLED', 'DELEGATED', 'COMPLETED'] },
    })
      .sort({ updatedAt: -1 })
      .limit(30)
      .populate('accountId', 'provider emailAddress displayName');

    res.status(200).json({
      success: true,
      data: resolvedEmails,
    });
  }
}
