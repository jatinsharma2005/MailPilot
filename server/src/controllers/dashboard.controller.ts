import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Email } from '../models/Email.js';
import { Task } from '../models/Task.js';
import { ActivityLog } from '../models/ActivityLog.js';

export class DashboardController {
  static async getStats(req: AuthRequest, res: Response) {
    const workspaceId = req.workspaceId!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    const [
      totalEmails,
      unreadEmails,
      importantEmails,
      actionRequired,
      clientAttention,
      assistantTasks,
      waitingForResponse,
      assistantToReply,
      needsReview,
      noReplyNeeded,
    ] = await Promise.all([
      Email.countDocuments({ workspaceId: wsObjectId, isArchived: false }),
      Email.countDocuments({ workspaceId: wsObjectId, isRead: false, isArchived: false }),
      Email.countDocuments({ workspaceId: wsObjectId, isImportant: true, isArchived: false }),
      Email.countDocuments({ workspaceId: wsObjectId, requiresAction: true, isArchived: false }),
      Email.countDocuments({ workspaceId: wsObjectId, classification: 'CLIENT_TO_REPLY', status: 'PENDING', isArchived: false }),
      Task.countDocuments({ workspaceId: wsObjectId, assignedTo: 'ASSISTANT', status: { $ne: 'COMPLETED' } }),
      Email.countDocuments({ workspaceId: wsObjectId, status: 'PENDING', classification: 'ASSISTANT_TO_REPLY', isArchived: false }),
      Email.countDocuments({ workspaceId: wsObjectId, classification: 'ASSISTANT_TO_REPLY', isArchived: false }),
      Email.countDocuments({ workspaceId: wsObjectId, classification: 'NEEDS_REVIEW', isArchived: false }),
      Email.countDocuments({ workspaceId: wsObjectId, classification: 'NO_REPLY_NEEDED', isArchived: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEmails,
        unreadEmails,
        importantEmails,
        actionRequired,
        clientAttention,
        assistantTasks,
        waitingForResponse,
        breakdown: {
          assistantToReply,
          clientToReply: clientAttention,
          needsReview,
          noReplyNeeded,
        },
      },
    });
  }

  static async getRecent(req: AuthRequest, res: Response) {
    const workspaceId = req.workspaceId!;
    const wsObjectId = new Types.ObjectId(workspaceId);

    const [priorityInbox, recentEmails, upcomingMeetings, pendingTasks, recentActivity] = await Promise.all([
      Email.find({
        workspaceId: wsObjectId,
        requiresAction: true,
        isArchived: false,
      })
        .sort({ priority: -1, receivedAt: -1 })
        .limit(6)
        .populate('accountId', 'provider emailAddress displayName'),

      Email.find({ workspaceId: wsObjectId, isArchived: false })
        .sort({ receivedAt: -1 })
        .limit(10)
        .populate('accountId', 'provider emailAddress displayName'),

      Task.find({
        workspaceId: wsObjectId,
        type: 'MEETING',
        status: { $ne: 'COMPLETED' },
      })
        .sort({ dueDate: 1 })
        .limit(5),

      Task.find({
        workspaceId: wsObjectId,
        type: 'FOLLOW_UP',
        status: { $ne: 'COMPLETED' },
      })
        .sort({ dueDate: 1 })
        .limit(5),

      ActivityLog.find({ workspaceId: wsObjectId })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('userId', 'name role avatar'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        priorityInbox,
        recentEmails,
        upcomingMeetings,
        pendingTasks,
        recentActivity,
      },
    });
  }
}
