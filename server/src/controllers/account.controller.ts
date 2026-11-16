import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { EmailAccount } from '../models/EmailAccount.js';
import { Email } from '../models/Email.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { ApiError } from '../utils/ApiError.js';

export class AccountController {
  static async getAccounts(req: AuthRequest, res: Response) {
    const workspaceId = req.workspaceId!;

    const accounts = await EmailAccount.find({
      workspaceId: new Types.ObjectId(workspaceId),
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: accounts,
    });
  }

  static async connectAccount(req: AuthRequest, res: Response) {
    const workspaceId = req.workspaceId!;
    const user = req.user!;
    const { provider, emailAddress, displayName } = req.body;

    if (!provider || !emailAddress) {
      throw new ApiError(400, 'Provider and emailAddress are required.');
    }

    let account = await EmailAccount.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      emailAddress: emailAddress.toLowerCase(),
    });

    if (account) {
      account.connectionStatus = 'connected';
      account.lastSyncedAt = new Date();
      await account.save();
    } else {
      account = await EmailAccount.create({
        workspaceId: new Types.ObjectId(workspaceId),
        ownerId: user._id,
        provider,
        emailAddress: emailAddress.toLowerCase(),
        displayName: displayName || user.name,
        connectionStatus: 'connected',
        lastSyncedAt: new Date(),
        isSimulated: true,
        syncStats: {
          totalMessages: 28,
          unreadCount: 4,
        },
      });
    }

    await ActivityLog.create({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: user._id,
      action: 'ACCOUNT_CONNECTED',
      entityType: 'ACCOUNT',
      entityId: account._id.toString(),
      description: `Connected ${provider.toUpperCase()} account (${emailAddress})`,
    });

    res.status(201).json({
      success: true,
      message: `${provider.toUpperCase()} account connected successfully (Simulated OAuth)`,
      data: account,
    });
  }

  static async disconnectAccount(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;
    const user = req.user!;

    const account = await EmailAccount.findOne({
      _id: id,
      workspaceId: new Types.ObjectId(workspaceId),
    });

    if (!account) throw new ApiError(404, 'Account not found.');

    account.connectionStatus = 'disconnected';
    await account.save();

    await ActivityLog.create({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: user._id,
      action: 'ACCOUNT_DISCONNECTED',
      entityType: 'ACCOUNT',
      entityId: account._id.toString(),
      description: `Disconnected ${account.provider.toUpperCase()} account (${account.emailAddress})`,
    });

    res.status(200).json({
      success: true,
      message: 'Account disconnected successfully',
      data: account,
    });
  }

  static async syncAccount(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;
    const user = req.user!;

    const account = await EmailAccount.findOne({
      _id: id,
      workspaceId: new Types.ObjectId(workspaceId),
    });

    if (!account) throw new ApiError(404, 'Account not found.');

    account.connectionStatus = 'syncing';
    await account.save();

    // Count actual messages in database for this account
    const totalCount = await Email.countDocuments({
      workspaceId: new Types.ObjectId(workspaceId),
      accountId: account._id,
    });
    const unreadCount = await Email.countDocuments({
      workspaceId: new Types.ObjectId(workspaceId),
      accountId: account._id,
      isRead: false,
    });

    account.connectionStatus = 'connected';
    account.lastSyncedAt = new Date();
    account.syncStats = {
      totalMessages: totalCount || 24,
      unreadCount: unreadCount || 3,
    };
    await account.save();

    await ActivityLog.create({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: user._id,
      action: 'ACCOUNT_SYNCED',
      entityType: 'ACCOUNT',
      entityId: account._id.toString(),
      description: `Synced ${account.provider.toUpperCase()} account (${account.emailAddress})`,
    });

    res.status(200).json({
      success: true,
      message: 'Inbox synchronized successfully',
      data: account,
    });
  }
}
