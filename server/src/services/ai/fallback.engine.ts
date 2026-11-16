import {
  ClassifyEmailInput,
  GenerateReplyInput,
  SummarizeConversationInput,
  AskAssistantInput,
  ExtractMeetingsInput,
  ExtractedMeeting,
} from './ai.types.js';
import { AIClassificationResult } from '../../validators/ai.schema.js';

export class DeterministicFallbackEngine {
  /**
   * Deterministic Rule-Based Classification
   */
  static classifyEmail(data: ClassifyEmailInput): AIClassificationResult {
    const text = `${data.subject} ${data.body}`.toLowerCase();
    const sender = data.sender.email.toLowerCase();
    const historyText = (data.conversationHistory || []).map((h) => `${h.sender} ${h.body}`).join(' ').toLowerCase();

    // 1. Thread delegation check: If previous thread history indicates client delegation to assistant
    if (
      historyText.includes('delegate') ||
      historyText.includes('assistant') ||
      historyText.includes('take over') ||
      historyText.includes('please coordinate') ||
      historyText.includes('coordinate reservation') ||
      historyText.includes('scheduling')
    ) {
      return {
        classification: 'ASSISTANT_TO_REPLY',
        confidence: 0.93,
        priority: 'MEDIUM',
        requiresAction: true,
        summary: `Follow-up in thread previously delegated to assistant regarding ${data.subject}.`,
        reason: 'Thread history confirms client delegated operational follow-up to the assistant.',
        suggestedAction: 'Review thread history and execute delegated follow-up.',
        suggestedCategory: 'Delegated Follow-up',
        keyPoints: ['Conversation thread history examined', 'Prior delegation to assistant active'],
        extractedDates: this.extractDates(data.body),
        suggestedReply: `Hi ${data.sender.name.split(' ')[0]},\n\nFollowing up as requested on behalf of the team regarding "${data.subject}". We are coordinating this now.\n\nBest regards,\nExecutive Office`,
      };
    }

    // 2. Automated / Newsletters / Receipts
    if (
      sender.includes('no-reply') ||
      sender.includes('noreply') ||
      sender.includes('newsletter') ||
      sender.includes('updates@') ||
      sender.includes('marketing@') ||
      text.includes('unsubscribe') ||
      text.includes('receipt for your payment') ||
      text.includes('statement is ready')
    ) {
      return {
        classification: 'NO_REPLY_NEEDED',
        confidence: 0.96,
        priority: 'LOW',
        requiresAction: false,
        summary: `Automated notification or publication from ${data.sender.name}.`,
        reason: 'Detected automated transactional or newsletter pattern. No response expected.',
        suggestedAction: 'Archive or file for records.',
        suggestedCategory: 'Notification',
        keyPoints: ['Automated delivery', 'Informational only', 'No action required'],
        extractedDates: [],
        suggestedReply: null,
      };
    }

    // 3. Client Strategic Decisions (Approvals, Legal, Financial, Contracts)
    if (
      text.includes('term sheet') ||
      text.includes('series a') ||
      text.includes('signature') ||
      text.includes('sign the') ||
      text.includes('agreement') ||
      text.includes('covenant') ||
      text.includes('board of directors') ||
      text.includes('legal review') ||
      text.includes('confidential') ||
      text.includes('approve the transfer') ||
      text.includes('shareholder') ||
      text.includes('wire transfer') ||
      text.includes('executive contract')
    ) {
      return {
        classification: 'CLIENT_TO_REPLY',
        confidence: 0.94,
        priority: 'HIGH',
        requiresAction: true,
        summary: `Strategic decision / executive approval required regarding ${data.subject}.`,
        reason: 'Involves binding legal terms, investor negotiations, or high-level client authorization.',
        suggestedAction: 'Review terms and sign or delegate operational items.',
        suggestedCategory: 'Executive Decision',
        keyPoints: ['Strategic client decision', 'Requires client personal authorization'],
        extractedDates: this.extractDates(data.body),
        suggestedReply: `Hi ${data.sender.name.split(' ')[0]},\n\nThank you for sending this over. I have received the documents regarding "${data.subject}" and am reviewing them. Will follow up shortly.\n\nBest,`,
      };
    }

    // 4. Routine Scheduling / Coordination (Assistant to Reply)
    if (
      text.includes('schedule') ||
      text.includes('calendar') ||
      text.includes('meeting') ||
      text.includes('availability') ||
      text.includes('coffee') ||
      text.includes('lunch') ||
      text.includes('dinner') ||
      text.includes('zoom') ||
      text.includes('reschedule') ||
      text.includes('flight') ||
      text.includes('hotel') ||
      text.includes('reservation') ||
      text.includes('coordinate')
    ) {
      return {
        classification: 'ASSISTANT_TO_REPLY',
        confidence: 0.91,
        priority: 'MEDIUM',
        requiresAction: true,
        summary: `Scheduling or administrative coordination request regarding ${data.subject}.`,
        reason: 'Involves calendar management or administrative coordination suitable for assistant.',
        suggestedAction: 'Check calendar availability and propose meeting times.',
        suggestedCategory: 'Scheduling',
        keyPoints: ['Meeting request detected', 'Requires calendar verification'],
        extractedDates: this.extractDates(data.body),
        suggestedReply: `Hi ${data.sender.name.split(' ')[0]},\n\nThanks for reaching out regarding "${data.subject}". I will check the calendar and share available times shortly.\n\nBest regards,\nExecutive Office`,
      };
    }

    // 5. Ambiguous / Exploratory Requests (Needs Review)
    return {
      classification: 'NEEDS_REVIEW',
      confidence: 0.68,
      priority: 'MEDIUM',
      requiresAction: true,
      summary: `Inquiry from ${data.sender.name} regarding ${data.subject}.`,
      reason: 'General or multi-stakeholder inquiry requiring manual review to determine ownership.',
      suggestedAction: 'Review message context and assign ownership or reply directly.',
      suggestedCategory: 'General Inquiry',
      keyPoints: ['General correspondence', 'Manual triage recommended'],
      extractedDates: this.extractDates(data.body),
      suggestedReply: `Hi ${data.sender.name.split(' ')[0]},\n\nThank you for reaching out regarding "${data.subject}". We have received your message and will review it with the team.\n\nBest regards,`,
    };
  }

  /**
   * Helper to extract common date/time mentions
   */
  static extractDates(body: string): string[] {
    const dates: string[] = [];
    const dateRegex =
      /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (?:[0-9]{1,2}(?:st|nd|rd|th)?|\d{1,2},? \d{4})/gi;
    const matches = body.match(dateRegex);
    if (matches) {
      matches.slice(0, 3).forEach((m) => dates.push(m.trim()));
    }
    return dates;
  }

  /**
   * Extract meeting details from subject and body
   */
  static extractMeetings(data: ExtractMeetingsInput): ExtractedMeeting[] {
    const text = `${data.subject} ${data.body}`.toLowerCase();
    const isMeeting =
      text.includes('meet') ||
      text.includes('sync') ||
      text.includes('call') ||
      text.includes('coffee') ||
      text.includes('dinner') ||
      text.includes('schedule') ||
      text.includes('calendar') ||
      text.includes('zoom');

    if (!isMeeting) return [];

    const extractedDates = this.extractDates(data.body);
    const date = extractedDates.length > 0 ? extractedDates[0] : new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Extract time pattern (e.g. "7:00 PM", "10:30 AM", "7 PM")
    const timeMatch =
      data.body.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(?:am|pm)?\b/i) ||
      data.body.match(/\b([1-9]|1[0-2])\s*(?:am|pm)\b/i);
    const time = timeMatch ? timeMatch[0].trim() : '10:00 AM';

    // Location
    let location = 'Google Meet';
    if (text.includes('zoom')) location = 'Zoom';
    else if (text.includes('nobu') || text.includes('restaurant') || text.includes('dinner')) location = 'Nobu Restaurant';
    else if (text.includes('office')) location = 'Executive Office';

    return [
      {
        title: data.subject.replace(/^(re|fwd):\s*/i, '').trim(),
        date,
        time,
        durationMinutes: 30,
        attendees: [data.sender.email],
        location,
        confidence: 0.9,
      },
    ];
  }

  /**
   * Deterministic Reply Generation
   */
  static generateReply(data: GenerateReplyInput): { reply: string } {
    const firstName = data.sender.name.split(' ')[0] || 'there';
    switch (data.tone) {
      case 'friendly':
        return {
          reply: `Hi ${firstName},\n\nThanks so much for reaching out about "${data.subject}"! I've gone ahead and noted this down. Everything looks great from our side, and we'll keep you posted as soon as we make progress.\n\nHope you have a fantastic rest of your week!\n\nWarmly,`,
        };
      case 'concise':
        return {
          reply: `Hi ${firstName},\n\nReceived with thanks. We have reviewed this regarding "${data.subject}" and are proceeding accordingly. Will follow up if anything further is needed.\n\nBest,`,
        };
      case 'formal':
        return {
          reply: `Dear ${data.sender.name},\n\nThank you for your correspondence regarding "${data.subject}". We acknowledge receipt of your communication and are currently conducting the necessary review.\n\nWe shall revert with a formal update at our earliest convenience.\n\nSincerely,`,
        };
      case 'professional':
      default:
        return {
          reply: `Dear ${firstName},\n\nThank you for reaching out regarding "${data.subject}".\n\nI have reviewed the information provided and we are coordinating the next steps. We appreciate your patience and will follow up with any updates as needed.\n\nPlease don't hesitate to reach out if you have any immediate questions in the interim.\n\nBest regards,`,
        };
    }
  }

  /**
   * Deterministic Summarization
   */
  static summarizeConversation(data: SummarizeConversationInput): {
    summary: string;
    keyPoints: string[];
    suggestedAction: string;
  } {
    const emailCount = data.emails.length;
    const latest = data.emails[data.emails.length - 1];
    const first = data.emails[0];

    const summary =
      emailCount === 1
        ? `Communication from ${latest?.sender.name || 'sender'} regarding "${data.subject}". Initial message received.`
        : `Thread of ${emailCount} message(s) regarding "${data.subject}", initiated by ${first?.sender.name || 'sender'}. Latest update provided by ${latest?.sender.name || 'participant'}.`;

    const keyPoints = [
      `Conversation thread comprises ${emailCount} exchange(s)`,
      `Subject matter focused on: ${data.subject}`,
      `Most recent communication received from ${latest?.sender.name || 'sender'}`,
    ];

    let suggestedAction = 'Review message context and execute appropriate next steps.';
    const sub = data.subject.toLowerCase();
    if (sub.includes('term sheet') || sub.includes('contract') || sub.includes('approval')) {
      suggestedAction = 'Present to client for executive review and formal authorization.';
    } else if (sub.includes('schedule') || sub.includes('meeting') || sub.includes('dinner')) {
      suggestedAction = 'Confirm calendar availability and coordinate logistics with sender.';
    }

    return { summary, keyPoints, suggestedAction };
  }

  /**
   * Deterministic Contextual Q&A
   */
  static askAssistant(data: AskAssistantInput): { answer: string } {
    const q = data.query.toLowerCase();
    if (data.relevantEmails.length === 0) {
      return {
        answer: 'I checked your inbox records, but there are no emails matching that criteria right now.',
      };
    }

    if (q.includes('client') || q.includes('attention') || q.includes('approval')) {
      const clientEmails = data.relevantEmails.filter((e) => e.classification === 'CLIENT_TO_REPLY');
      if (clientEmails.length === 0) {
        return {
          answer: 'All client-attention items have been reviewed or resolved. There are currently no pending decisions requiring the client.',
        };
      }
      return {
        answer:
          `There are currently ${clientEmails.length} email(s) requiring the client's direct attention:\n` +
          clientEmails.map((e) => `• "${e.subject}" from ${e.sender} (${e.priority} Priority): ${e.summary}`).join('\n'),
      };
    }

    if (q.includes('meeting') || q.includes('schedule') || q.includes('calendar')) {
      const meetings = data.relevantEmails.filter(
        (e) => e.subject.toLowerCase().includes('meet') || e.classification === 'ASSISTANT_TO_REPLY'
      );
      return {
        answer:
          `Found ${meetings.length} meeting-related email(s) in your workspace:\n` +
          meetings.map((e) => `• "${e.subject}" from ${e.sender}: ${e.summary}`).join('\n'),
      };
    }

    return {
      answer:
        `Here is a summary of the ${data.relevantEmails.length} most relevant conversations:\n` +
        data.relevantEmails
          .slice(0, 5)
          .map((e) => `• [${e.classification.replace(/_/g, ' ')}] "${e.subject}" from ${e.sender} - ${e.summary}`)
          .join('\n'),
    };
  }
}
