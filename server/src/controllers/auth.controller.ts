import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { ApiError } from '../utils/ApiError.js';
import { generateToken } from '../utils/generateToken.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    const { name, email, password, role, workspaceName } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, 'An account with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create workspace
    const workspace = await Workspace.create({
      name: workspaceName || `${name}'s Executive Workspace`,
    });

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'ASSISTANT',
      workspaceId: workspace._id,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });

    if (user.role === 'ASSISTANT') {
      workspace.assistantId = user._id;
    } else if (user.role === 'CLIENT') {
      workspace.clientIds.push(user._id);
    }
    await workspace.save();

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      workspaceId: workspace._id,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: workspace._id,
        workspaceName: workspace.name,
        avatar: user.avatar,
      },
    });
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const workspace = await Workspace.findById(user.workspaceId);

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: workspace?.name || 'Executive Workspace',
        avatar: user.avatar,
      },
    });
  }

  static async demoLogin(req: Request, res: Response) {
    const { role } = req.body;
    const targetEmail =
      role === 'CLIENT'
        ? 'client@mailpilot.io'
        : role === 'ADMIN'
        ? 'admin@mailpilot.io'
        : 'assistant@mailpilot.io';

    let user = await User.findOne({ email: targetEmail });
    if (!user) {
      // Find any user matching the role
      user = await User.findOne({ role });
    }

    if (!user) {
      throw new ApiError(404, `Demo user for role ${role} not found. Please ensure database is seeded.`);
    }

    const workspace = await Workspace.findById(user.workspaceId);

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    });

    res.status(200).json({
      success: true,
      message: `Signed in as Demo ${role}`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: workspace?.name || 'Acme Executive Group',
        avatar: user.avatar,
      },
    });
  }

  static async getMe(req: AuthRequest, res: Response) {
    const user = req.user!;
    const workspace = await Workspace.findById(user.workspaceId);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: workspace?.name,
        avatar: user.avatar,
      },
    });
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    const user = req.user!;
    const { name, workspaceName, avatar } = req.body;

    if (name) {
      user.name = name;
    }
    if (avatar) {
      user.avatar = avatar;
    }
    await user.save();

    let workspace;
    if (workspaceName && user.workspaceId) {
      workspace = await Workspace.findByIdAndUpdate(
        user.workspaceId,
        { name: workspaceName },
        { new: true }
      );
    } else if (user.workspaceId) {
      workspace = await Workspace.findById(user.workspaceId);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: workspace?.name,
        avatar: user.avatar,
      },
    });
  }

  static async logout(req: Request, res: Response) {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}
