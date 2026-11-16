import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Task } from '../models/Task.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { ApiError } from '../utils/ApiError.js';

export class TaskController {
  static async getTasks(req: AuthRequest, res: Response) {
    const workspaceId = req.workspaceId!;
    const { type, status, assignedTo } = req.query as Record<string, string>;

    const query: any = {
      workspaceId: new Types.ObjectId(workspaceId),
    };

    if (type) query.type = type;
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query).sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  }

  static async createTask(req: AuthRequest, res: Response) {
    const workspaceId = req.workspaceId!;
    const user = req.user!;
    const { title, description, dueDate, assignedTo = 'ASSISTANT', type = 'FOLLOW_UP', conversationId, emailId, meetingDetails } = req.body;

    if (!title) throw new ApiError(400, 'Task title is required.');

    const task = await Task.create({
      workspaceId: new Types.ObjectId(workspaceId),
      conversationId: conversationId ? new Types.ObjectId(conversationId) : undefined,
      emailId: emailId ? new Types.ObjectId(emailId) : undefined,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedTo,
      type,
      meetingDetails,
    });

    await ActivityLog.create({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: user._id,
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: task._id.toString(),
      description: `Created new ${type.toLowerCase().replace('_', ' ')}: "${title}"`,
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  }

  static async updateTask(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;
    const user = req.user!;
    const { title, description, dueDate, status, assignedTo, type, meetingDetails } = req.body;

    const task = await Task.findOne({
      _id: id,
      workspaceId: new Types.ObjectId(workspaceId),
    });

    if (!task) throw new ApiError(404, 'Task not found.');

    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      task.completedAt = new Date();
      task.completedBy = user._id;

      await ActivityLog.create({
        workspaceId: new Types.ObjectId(workspaceId),
        userId: user._id,
        action: 'TASK_COMPLETED',
        entityType: 'TASK',
        entityId: task._id.toString(),
        description: `Completed task: "${task.title}"`,
      });
    }

    // Safely assign whitelisted fields only to eliminate Mass Assignment vulnerabilities
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (status !== undefined) task.status = status;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (type !== undefined) task.type = type;
    if (meetingDetails !== undefined) task.meetingDetails = meetingDetails;

    await task.save();

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  }

  static async deleteTask(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;

    const task = await Task.findOneAndDelete({
      _id: id,
      workspaceId: new Types.ObjectId(workspaceId),
    });

    if (!task) throw new ApiError(404, 'Task not found.');

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  }
}
