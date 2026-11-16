import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Email } from '../models/Email.js';
import { Conversation } from '../models/Conversation.js';
import { AIService } from '../services/ai.service.js';
import { ApiError } from '../utils/ApiError.js';

export class AIController {
  /**
   * Health and connectivity status for the AI engine.
   * Returns cached status immediately without triggering repeated provider network requests.
   * If force=true query param is supplied, triggers a real health check.
   */
  static async getAIStatus(req: Request, res: Response) {
    const force = req.query.force === 'true';
    const status = force ? await AIService.checkGeminiConnectivity(true) : AIService.getStatus();
    res.status(200).json({
      success: true,
      ...status,
      data: status,
    });
  }

  /**
   * Manual provider health check for administrators
   */
  static async manualHealthCheck(_req: Request, res: Response) {
    const status = await AIService.checkGeminiConnectivity(true);
    res.status(200).json({
      success: true,
      ...status,
      data: status,
    });
  }

  /**
   * Classify or re-classify an email
   */
  static async classifyEmail(req: AuthRequest, res: Response) {
    const { emailId } = req.params;
    const workspaceId = req.workspaceId!;

    const email = await Email.findOne({
      _id: emailId,
      workspaceId: new Types.ObjectId(workspaceId),
    });

    if (!email) throw new ApiError(404, 'Email not found.');

    // Fetch prior conversation messages so AI evaluates full conversational context
    const priorEmails = await Email.find({
      conversationId: email.conversationId,
      _id: { $ne: email._id },
      workspaceId: new Types.ObjectId(workspaceId),
    }).sort({ receivedAt: 1 });

    const conversationHistory = priorEmails.map((e) => ({
      sender: `${e.sender.name} <${e.sender.email}>`,
      body: e.body,
      date: e.receivedAt ? e.receivedAt.toISOString() : '',
    }));

    const classificationResult = await AIService.classifyEmail({
      subject: email.subject,
      body: email.body,
      sender: email.sender,
      recipients: email.recipients,
      conversationHistory,
    });

    // Update email with AI insights
    email.classification = classificationResult.classification;
    email.confidence = classificationResult.confidence;
    email.priority = classificationResult.priority;
    email.requiresAction = classificationResult.requiresAction;
    email.aiSummary = classificationResult.summary;
    email.classificationReason = classificationResult.reason;
    email.suggestedAction = classificationResult.suggestedAction;
    email.suggestedCategory = classificationResult.suggestedCategory;
    email.keyPoints = classificationResult.keyPoints;
    email.extractedDates = classificationResult.extractedDates;
    if (classificationResult.suggestedReply) {
      email.suggestedReply = classificationResult.suggestedReply;
    }

    await email.save();

    // Sync Conversation record
    await Conversation.findByIdAndUpdate(email.conversationId, {
      currentClassification: classificationResult.classification,
      assignedTo:
        classificationResult.classification === 'CLIENT_TO_REPLY'
          ? 'CLIENT'
          : classificationResult.classification === 'ASSISTANT_TO_REPLY'
          ? 'ASSISTANT'
          : 'NONE',
    });

    res.status(200).json({
      success: true,
      data: {
        email,
        engine: classificationResult.engine,
        isGeminiLive: classificationResult.isGeminiLive,
      },
    });
  }

  /**
   * Summarize a conversation
   */
  static async summarizeConversation(req: AuthRequest, res: Response) {
    const { conversationId } = req.params;
    const convId = Array.isArray(conversationId) ? conversationId[0] : conversationId;
    const workspaceId = req.workspaceId!;

    const conversation = await Conversation.findOne({
      _id: convId,
      workspaceId: new Types.ObjectId(workspaceId),
    });

    if (!conversation) throw new ApiError(404, 'Conversation not found.');

    const emails = await Email.find({
      conversationId: new Types.ObjectId(convId),
      workspaceId: new Types.ObjectId(workspaceId),
    }).sort({ receivedAt: 1 });

    const summaryResult = await AIService.summarizeConversation({
      subject: conversation.subject,
      emails: emails.map((e) => ({
        sender: e.sender,
        body: e.body,
        date: e.receivedAt,
      })),
    });

    res.status(200).json({
      success: true,
      data: {
        summary: summaryResult.summary,
        keyPoints: summaryResult.keyPoints,
        suggestedAction: summaryResult.suggestedAction,
        classification: conversation.currentClassification,
        engine: summaryResult.engine,
        isGeminiLive: summaryResult.isGeminiLive,
      },
    });
  }

  /**
   * Generate an email reply draft
   */
  static async generateReply(req: AuthRequest, res: Response) {
    const { conversationId } = req.params;
    const convId = Array.isArray(conversationId) ? conversationId[0] : conversationId;
    const { tone = 'professional', customInstructions } = req.body;
    const workspaceId = req.workspaceId!;

    const latestEmail = await Email.findOne({
      conversationId: new Types.ObjectId(convId),
      workspaceId: new Types.ObjectId(workspaceId),
    }).sort({ receivedAt: -1 });

    if (!latestEmail) throw new ApiError(404, 'Email conversation thread not found.');

    const result = await AIService.generateReply({
      subject: latestEmail.subject,
      body: latestEmail.body,
      sender: latestEmail.sender,
      tone,
      customInstructions,
    });

    res.status(200).json({
      success: true,
      data: {
        reply: result.reply,
        tone,
        engine: result.engine,
        isGeminiLive: result.isGeminiLive,
      },
    });
  }

  /**
   * Ask Contextual AI Assistant using real database records
   */
  static async askAssistant(req: AuthRequest, res: Response) {
    const { query } = req.body;
    const workspaceId = req.workspaceId!;

    // Retrieve recent actual emails from database for authentic context
    const emails = await Email.find({
      workspaceId: new Types.ObjectId(workspaceId),
      isArchived: false,
    })
      .sort({ receivedAt: -1 })
      .limit(20);

    const emailContext = emails.map((e) => ({
      subject: e.subject,
      sender: `${e.sender.name} (${e.sender.email})`,
      classification: e.classification,
      summary: e.aiSummary || e.body.slice(0, 120),
      priority: e.priority,
      date: new Date(e.receivedAt).toLocaleDateString(),
    }));

    const result = await AIService.askAssistant({
      query,
      relevantEmails: emailContext,
    });

    res.status(200).json({
      success: true,
      data: {
        answer: result.answer,
        contextCount: emails.length,
        engine: result.engine,
        isGeminiLive: result.isGeminiLive,
      },
    });
  }
}
