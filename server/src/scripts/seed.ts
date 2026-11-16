import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { EmailAccount } from '../models/EmailAccount.js';
import { Conversation } from '../models/Conversation.js';
import { Email } from '../models/Email.js';
import { Task } from '../models/Task.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { syncConversations } from '../utils/conversationSync.js';

export const seedDatabase = async () => {
  console.log('[Seed] Starting database seeding...');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    EmailAccount.deleteMany({}),
    Conversation.deleteMany({}),
    Email.deleteMany({}),
    Task.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  // 1. Create Workspace
  const workspace = await Workspace.create({
    name: 'Acme Executive Group',
    settings: {
      defaultProvider: 'gmail',
      syncIntervalMinutes: 10,
      aiAutoSummarize: true,
      aiSensitivity: 'balanced',
    },
  });

  // 2. Create Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const assistant = await User.create({
    name: 'Sarah Jenkins',
    email: 'assistant@mailpilot.io',
    passwordHash,
    role: 'ASSISTANT',
    workspaceId: workspace._id,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  });

  const client = await User.create({
    name: 'Alexander Wright',
    email: 'client@mailpilot.io',
    passwordHash,
    role: 'CLIENT',
    workspaceId: workspace._id,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  });

  const admin = await User.create({
    name: 'Elena Rostova',
    email: 'admin@mailpilot.io',
    passwordHash,
    role: 'ADMIN',
    workspaceId: workspace._id,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  });

  // Update workspace members
  workspace.assistantId = assistant._id;
  workspace.clientIds = [client._id];
  await workspace.save();

  // 3. Create Connected Email Accounts
  const gmailAccount = await EmailAccount.create({
    workspaceId: workspace._id,
    ownerId: client._id,
    provider: 'gmail',
    emailAddress: 'alexander.wright@acmepartners.com',
    displayName: 'Alexander Wright (Google Workspace)',
    connectionStatus: 'connected',
    lastSyncedAt: new Date(Date.now() - 12 * 60 * 1000), // 12 mins ago
    isSimulated: true,
    syncStats: { totalMessages: 26, unreadCount: 5 },
  });

  const outlookAccount = await EmailAccount.create({
    workspaceId: workspace._id,
    ownerId: client._id,
    provider: 'outlook',
    emailAddress: 'a.wright@wrightventures.io',
    displayName: 'A. Wright (Microsoft 365 Outlook)',
    connectionStatus: 'connected',
    lastSyncedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
    isSimulated: true,
    syncStats: { totalMessages: 14, unreadCount: 2 },
  });

  // 4. Create 25+ Rich, Realistic Email Conversations
  const sampleData = [
    // --- CLIENT_TO_REPLY (Approvals, Legal, Financial, Strategic) ---
    {
      subject: 'Series B Term Sheet Review & Formal Sign-off',
      sender: { name: 'Marcus Sterling', email: 'm.sterling@sequoiaapex.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      body: 'Dear Alexander,\n\nOur investment committee met this morning and we have finalized the Series B valuation terms ($42M pre-money). The clean term sheet is attached for your personal review and signature.\n\nPlease confirm if you agree with the revised board seat covenants in section 4.2 so our counsel can begin drafting the definitive purchase agreement.\n\nLooking forward to your formal sign-off by Thursday.\n\nBest regards,\nMarcus Sterling\nGeneral Partner | Sequoia Apex',
      classification: 'CLIENT_TO_REPLY',
      confidence: 0.96,
      priority: 'URGENT',
      suggestedCategory: 'Contracts & Term Sheets',
      aiSummary: 'Sequoia Apex finalized $42M Series B term sheet requiring Alexander\'s personal review and signature by Thursday.',
      classificationReason: 'Critical financing decision and formal legal signature required exclusively from the principal client.',
      suggestedAction: 'Review section 4.2 regarding board covenants and authorize signature or request revisions.',
      keyPoints: ['$42M pre-money valuation confirmed', 'Signature required by Thursday', 'Section 4.2 board covenants need sign-off'],
      extractedDates: ['Thursday 5:00 PM EST'],
      requiresAction: true,
      status: 'PENDING',
      attachments: [{ name: 'Acme_Series_B_TermSheet_vFINAL.pdf', size: 1420000, type: 'application/pdf' }],
      account: gmailAccount,
      offsetHours: 1,
    },
    {
      subject: 'Master Services Agreement - Enterprise Expansion (Vertex Corp)',
      sender: { name: 'Claire Dupont', email: 'claire.dupont@vertexcorp.io', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
      body: 'Alexander,\n\nOur legal team reviewed your redlines on the indemnity clause in the Enterprise MSA ($380,000 annual contract). We have conceded on the liability cap, but our General Counsel requires your personal confirmation on the non-solicitation clause before countersigning.\n\nPlease let me know if you approve this final wording so we can execute before month-end.\n\nWarmly,\nClaire Dupont\nVP Strategic Partnerships, Vertex Corp',
      classification: 'CLIENT_TO_REPLY',
      confidence: 0.94,
      priority: 'HIGH',
      suggestedCategory: 'Contracts & Term Sheets',
      aiSummary: 'Vertex Corp agreed to liability cap redlines but requires Alexander\'s direct confirmation on non-solicitation for $380k MSA.',
      classificationReason: 'Contractual liability and non-solicitation decision requires executive confirmation.',
      suggestedAction: 'Confirm non-solicitation clause acceptability to finalize $380k agreement.',
      keyPoints: ['$380,000 ARR contract', 'Liability cap accepted by counterparty', 'Needs personal approval on non-solicitation'],
      extractedDates: ['Month-end'],
      requiresAction: true,
      status: 'PENDING',
      attachments: [{ name: 'MSA_VertexCorp_Executed_Draft.docx', size: 285000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
      account: gmailAccount,
      offsetHours: 3,
    },
    {
      subject: 'Quarterly Executive Bonus Pool Allocation Approval',
      sender: { name: 'David Hoffman', email: 'd.hoffman@acmepartners.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
      body: 'Hi Alexander,\n\nAttached is the proposed executive bonus allocation spreadsheet for Q3 based on KPI thresholds achieved by the VP engineering and VP sales. The total pool is $185,000. Under our compensation committee bylaws, this requires your explicit sign-off before payroll processing on Friday.\n\nLet me know if you would like any adjustments to the individual allocations.\n\nThanks,\nDavid Hoffman\nChief Financial Officer',
      classification: 'CLIENT_TO_REPLY',
      confidence: 0.95,
      priority: 'HIGH',
      suggestedCategory: 'Financial Approvals',
      aiSummary: 'CFO submitted $185,000 Q3 executive bonus pool allocation spreadsheet for Alexander\'s sign-off before Friday payroll.',
      classificationReason: 'Direct executive compensation sign-off mandated by corporate bylaws.',
      suggestedAction: 'Review proposed allocations and approve before Friday payroll cutoff.',
      keyPoints: ['$185k total bonus pool', 'Mandatory sign-off before Friday payroll', 'KPI allocations for VP Eng & VP Sales'],
      extractedDates: ['Friday 12:00 PM'],
      requiresAction: true,
      status: 'PENDING',
      attachments: [{ name: 'Q3_Executive_Comp_Schedule.xlsx', size: 94000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
      account: outlookAccount,
      offsetHours: 5,
    },
    {
      subject: 'Advisory Board Seat Invitation: Novum Therapeutics',
      sender: { name: 'Dr. Aris Thorne', email: 'athorne@novumtx.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
      body: 'Alexander,\n\nFollowing our conversation at the Healthcare Innovation Summit, our founders would be thrilled to formally invite you to join Novum Therapeutics as a strategic advisory board member. The position includes a 0.5% equity grant vesting over two years.\n\nWe would love to know if your commitments allow you to accept this role. If interested, I can send over the formal advisor packet.\n\nBest,\nDr. Aris Thorne, CEO',
      classification: 'CLIENT_TO_REPLY',
      confidence: 0.92,
      priority: 'MEDIUM',
      suggestedCategory: 'Advisory & Board',
      aiSummary: 'Dr. Aris Thorne formally invited Alexander to join Novum Therapeutics advisory board with a 0.5% equity grant.',
      classificationReason: 'Personal advisory invitation requiring client\'s career and scheduling judgment.',
      suggestedAction: 'Determine interest in board commitment and authorize assistant to request packet or decline.',
      keyPoints: ['0.5% equity grant over 2 years', 'Strategic advisory role', 'Personal invite from CEO'],
      extractedDates: [],
      requiresAction: true,
      status: 'PENDING',
      account: gmailAccount,
      offsetHours: 7,
    },

    // --- ASSISTANT_TO_REPLY (Scheduling, Operations, Logistics, Travel) ---
    {
      subject: 'Rescheduling our Tuesday Strategy Sync with Alexander',
      sender: { name: 'Rachel Vance', email: 'rvance@catalystcap.com', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
      body: 'Hi Sarah,\n\nHope you\'re having a great week! I have an unexpected board conflict on Tuesday at 2:00 PM for our planned sync with Alexander. Could we push our call to Wednesday afternoon or Thursday morning?\n\n30 minutes via Zoom works well on our end. Please let me know what slots work best on Alexander\'s calendar.\n\nThanks so much for accommodating!\n\nRachel Vance\nChief of Staff, Catalyst Capital',
      classification: 'ASSISTANT_TO_REPLY',
      confidence: 0.94,
      priority: 'MEDIUM',
      suggestedCategory: 'Meeting Coordination',
      aiSummary: 'Rachel Vance requests rescheduling Tuesday 2:00 PM strategy sync to Wednesday afternoon or Thursday morning.',
      classificationReason: 'Calendar conflict and rescheduling request. Assistant has calendar access to coordinate appropriate slots.',
      suggestedAction: 'Review Alexander\'s calendar for Wednesday 3:00 PM or Thursday 11:00 AM and propose slots.',
      keyPoints: ['Tuesday 2pm conflict', 'Wednesday PM or Thursday AM preferred', '30-minute Zoom call'],
      extractedDates: ['Wednesday afternoon', 'Thursday morning'],
      requiresAction: true,
      status: 'PENDING',
      account: gmailAccount,
      offsetHours: 2,
    },
    {
      subject: 'Flight Confirmation & Chauffeur Coordination - London Tech Week',
      sender: { name: 'British Airways Concierge', email: 'concierge@ba-first.com', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
      body: 'Dear Mr. Wright,\n\nYour First Class reservation for flight BA178 from JFK to LHR on November 28 has been ticketed. Please confirm whether you require private airport transfer upon arrival at Heathrow Terminal 5 to The Connaught Hotel, Mayfair.\n\nKindly provide terminal pick-up preferences or dietary updates at your convenience.\n\nYours faithfully,\nBA First Concierge Services',
      classification: 'ASSISTANT_TO_REPLY',
      confidence: 0.95,
      priority: 'MEDIUM',
      suggestedCategory: 'Travel & Logistics',
      aiSummary: 'British Airways confirmed JFK to LHR First Class flight for Nov 28; requests ground transfer confirmation to The Connaught.',
      classificationReason: 'Logistical travel coordination. Assistant can confirm airport pickup and hotel itinerary.',
      suggestedAction: 'Confirm chauffeur booking with flight number and send itinerary confirmation to Alexander.',
      keyPoints: ['Flight BA178 ticketed for Nov 28', 'Ground transfer to The Connaught needed', 'Assistant operational task'],
      extractedDates: ['November 28'],
      requiresAction: true,
      status: 'PENDING',
      attachments: [{ name: 'E-Ticket_BA178_Nov28.pdf', size: 180000, type: 'application/pdf' }],
      account: outlookAccount,
      offsetHours: 4,
    },
    {
      subject: 'Catering Options & AV Requirements for Private Dinner (Dec 3)',
      sender: { name: 'Julian Mercer', email: 'j.mercer@sohohouse.com', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
      body: 'Hello Sarah,\n\nFollowing up on the private dining room booking for Alexander\'s 14-person dinner on December 3rd. We have prepared two bespoke seasonal tasting menus (attached). Could you please select your menu preference and confirm if the attendees require projector / mic setup for opening remarks?\n\nWe would appreciate your selections by Monday to lock in the kitchen prep.\n\nWarm regards,\nJulian Mercer | Events Director',
      classification: 'ASSISTANT_TO_REPLY',
      confidence: 0.92,
      priority: 'MEDIUM',
      suggestedCategory: 'Event Coordination',
      aiSummary: 'Soho House requests menu selection and AV requirements for 14-guest private dinner on December 3rd by Monday.',
      classificationReason: 'Standard event logistics and catering selection suitable for assistant execution.',
      suggestedAction: 'Select Menu A (seasonal truffle) per Alexander\'s standard preferences and confirm cordless mic.',
      keyPoints: ['14 guests on Dec 3', 'Menu selection due Monday', 'Confirm projector and audio setup'],
      extractedDates: ['December 3rd', 'Monday'],
      requiresAction: true,
      status: 'PENDING',
      attachments: [{ name: 'Winter_Private_Dining_Menus_2026.pdf', size: 520000, type: 'application/pdf' }],
      account: gmailAccount,
      offsetHours: 6,
    },
    {
      subject: 'Invoice #INV-2026-881 for IT Infrastructure Support',
      sender: { name: 'Billing Desk', email: 'billing@cloudscale-it.com', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
      body: 'Hi Team,\n\nPlease find attached monthly Invoice #INV-2026-881 for dedicated cloud backup and server maintenance ($4,250.00). Payment is due via ACH within 15 days.\n\nLet us know if you need any purchase order references updated on the invoice.\n\nThank you,\nCloudScale IT Solutions',
      classification: 'ASSISTANT_TO_REPLY',
      confidence: 0.91,
      priority: 'LOW',
      suggestedCategory: 'Invoices & Billing',
      aiSummary: 'Monthly IT infrastructure invoice #INV-2026-881 ($4,250.00) received from CloudScale IT due in 15 days.',
      classificationReason: 'Routine vendor invoice processing; assistant can forward to accounts payable.',
      suggestedAction: 'Route invoice to Bill.com / Accounts Payable queue for scheduled payment.',
      keyPoints: ['$4,250.00 due in 15 days', 'Cloud infrastructure maintenance', 'Routine processing'],
      extractedDates: ['15 days'],
      requiresAction: true,
      status: 'PENDING',
      attachments: [{ name: 'Invoice_INV_2026_881.pdf', size: 76000, type: 'application/pdf' }],
      account: gmailAccount,
      offsetHours: 8,
    },

    // --- NO_REPLY_NEEDED (Newsletters, Transactional, Broadcasts) ---
    {
      subject: 'Stripe: Weekly Payout of $64,280.50 Initiated',
      sender: { name: 'Stripe Notifications', email: 'notifications@stripe.com', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150' },
      body: 'Hello,\n\nA payout of $64,280.50 has been initiated to your JPMorgan Chase business checking account ending in •••• 4912. Funds are expected to arrive in 1-2 business days.\n\nYou can review transaction breakdown and fees in your Stripe Dashboard.\n\nNo reply to this automated email is necessary.',
      classification: 'NO_REPLY_NEEDED',
      confidence: 0.99,
      priority: 'LOW',
      suggestedCategory: 'Automated Receipts',
      aiSummary: 'Stripe payout of $64,280.50 initiated to Chase business account; arrival expected in 1-2 business days.',
      classificationReason: 'Automated financial receipt and notification. Explicitly requires no response.',
      suggestedAction: 'Archive. Financial tracking record saved.',
      keyPoints: ['$64,280.50 payout', 'Chase checking •••• 4912', 'Arrives in 1-2 business days'],
      extractedDates: ['1-2 business days'],
      requiresAction: false,
      status: 'COMPLETED',
      account: gmailAccount,
      offsetHours: 9,
    },
    {
      subject: 'The Information: Tech & Media Weekly Executive Briefing',
      sender: { name: 'Jessica Lessin', email: 'newsletters@theinformation.com', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
      body: 'Welcome to this week\'s edition of The Information Executive Briefing.\n\nTop stories this morning:\n1. The new enterprise AI hardware landscape: who is winning the memory bandwidth war.\n2. Venture secondaries market heats up as late-stage valuations recalibrate.\n3. Exclusive interview with Anthropic leadership on steerability.\n\nClick here to read the full issue online.',
      classification: 'NO_REPLY_NEEDED',
      confidence: 0.98,
      priority: 'LOW',
      suggestedCategory: 'Newsletter',
      aiSummary: 'Weekly tech executive briefing covering enterprise AI hardware, venture secondary markets, and model steering.',
      classificationReason: 'Weekly industry newsletter subscription.',
      suggestedAction: 'None. Available for leisure reading.',
      keyPoints: ['Industry editorial', 'Weekly subscription'],
      extractedDates: [],
      requiresAction: false,
      status: 'COMPLETED',
      account: outlookAccount,
      offsetHours: 12,
    },
    {
      subject: 'Google Cloud Platform: Security Alert & IAM Audit Report',
      sender: { name: 'Google Cloud Alerts', email: 'cloud-noreply@google.com', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
      body: 'Your weekly security posture summary for project "acme-core-prod-992": 0 critical vulnerabilities found, 2 service accounts rotated, 100% compliance with organizational security perimeter.\n\nView the full Cloud Security Command Center report in your admin console.',
      classification: 'NO_REPLY_NEEDED',
      confidence: 0.97,
      priority: 'LOW',
      suggestedCategory: 'System Notification',
      aiSummary: 'GCP weekly security report: 0 critical vulnerabilities, all service accounts rotated, clean posture.',
      classificationReason: 'Automated platform monitoring notification.',
      suggestedAction: 'Archive for compliance audit log.',
      keyPoints: ['Zero critical vulnerabilities', 'Service accounts rotated'],
      extractedDates: [],
      requiresAction: false,
      status: 'COMPLETED',
      account: gmailAccount,
      offsetHours: 14,
    },

    // --- NEEDS_REVIEW (Ambiguous, Sensitive, Edge Cases) ---
    {
      subject: 'Inquiry regarding potential asset sale / IP licensing',
      sender: { name: 'Leonard Cole', email: 'l.cole@meridianadvisors.ch', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150' },
      body: 'Dear Mr. Wright,\n\nWe represent an undisclosed European strategic conglomerate in the automation space. Our client has expressed exploratory interest in acquiring certain intellectual property assets of your European subsidiary.\n\nWe would appreciate a brief, strictly confidential discussion under NDA to assess mutual appetite before involving broader teams. Please advise on your interest level.\n\nSincerely,\nLeonard Cole, Managing Partner',
      classification: 'NEEDS_REVIEW',
      confidence: 0.65,
      priority: 'HIGH',
      suggestedCategory: 'M&A / Strategic Inquiry',
      aiSummary: 'Swiss advisory firm representing undisclosed buyer expressing exploratory interest in European IP assets under NDA.',
      classificationReason: 'High-stakes inbound inquiry with ambiguity. Requires assistant and client alignment before engaging.',
      suggestedAction: 'Flag for discussion in morning sync: determine whether to decline or engage under strict NDA.',
      keyPoints: ['Unsolicited M&A exploratory inquiry', 'Confidential NDA requested', 'Strategic implication'],
      extractedDates: [],
      requiresAction: true,
      status: 'PENDING',
      account: outlookAccount,
      offsetHours: 10,
    },
    {
      subject: 'Speaker Invitation: Global AI Leadership Summit (Singapore)',
      sender: { name: 'Mei Lin Tan', email: 'speaker-relations@gaisummit.sg', avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150' },
      body: 'Dear Alexander,\n\nOn behalf of the GAIS organizing committee, we would be honored to host you as a Keynote Speaker on October 14th in Singapore. We cover business-class travel and accommodations for two guests at the Marina Bay Sands.\n\nCould your office let us know if you might be receptive to delivering a 25-minute keynote on "The Future of Human-AI Orchestration"?\n\nWarm regards,\nMei Lin Tan',
      classification: 'NEEDS_REVIEW',
      confidence: 0.72,
      priority: 'MEDIUM',
      suggestedCategory: 'Keynote & Speaking',
      aiSummary: 'Invitation for Alexander to keynote Global AI Leadership Summit in Singapore on Oct 14th with travel covered.',
      classificationReason: 'Requires client decision on interest and assistant calendar check for international travel viability.',
      suggestedAction: 'Check international travel schedule for mid-October and ask Alexander if he wishes to speak.',
      keyPoints: ['Oct 14th Singapore keynote', 'Business class travel & hotel covered', '25-minute keynote'],
      extractedDates: ['October 14th'],
      requiresAction: true,
      status: 'PENDING',
      account: gmailAccount,
      offsetHours: 15,
    },

    // Additional realistic emails across all days
    {
      subject: 'Draft Press Release: Series B Announcement Quotes',
      sender: { name: 'Tara Simmons', email: 'tara@claritypr.agency', avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150' },
      body: 'Alexander & Sarah,\n\nAttached is the draft press release for our funding announcement planned for TechCrunch and Bloomberg next month. Alexander, could you take a look at the pull quote on page 2 to ensure it aligns with your tone?\n\nSarah, let me know when you have high-res executive headshots ready for distribution.\n\nCheers,\nTara',
      classification: 'NEEDS_REVIEW',
      confidence: 0.76,
      priority: 'MEDIUM',
      suggestedCategory: 'PR & Communications',
      aiSummary: 'PR agency submitted funding announcement press release for quote review and headshot distribution.',
      classificationReason: 'Addresses both client (quote approval) and assistant (headshot delivery).',
      suggestedAction: 'Sarah to provide headshot files; flag page 2 quote for Alexander\'s quick approval.',
      keyPoints: ['TechCrunch/Bloomberg embargo', 'Quote review on page 2', 'Headshot assets needed'],
      extractedDates: ['Next month'],
      requiresAction: true,
      status: 'PENDING',
      attachments: [{ name: 'Acme_Series_B_PR_Draft_v3.docx', size: 110000, type: 'application/docx' }],
      account: gmailAccount,
      offsetHours: 18,
    },
    {
      subject: 'Board Meeting Deck Q3 - Final Revisions Needed',
      sender: { name: 'Katherine Vance', email: 'k.vance@acmepartners.com', avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150' },
      body: 'Alexander,\n\nWe have updated slides 14 through 18 with the latest gross margin expansion figures. Please review the updated retention cohort analysis before we distribute the packet to the board members tomorrow at 5pm.\n\nLet me know if you would like me to adjust any commentary on the enterprise segment.\n\nBest,\nKatherine',
      classification: 'CLIENT_TO_REPLY',
      confidence: 0.95,
      priority: 'HIGH',
      suggestedCategory: 'Board & Governance',
      aiSummary: 'Katherine Vance updated Q3 board deck slides 14-18; requests Alexander\'s review before tomorrow 5pm distribution.',
      classificationReason: 'Board packet distribution sign-off requires client approval.',
      suggestedAction: 'Review retention cohort slides and confirm distribution to board of directors.',
      keyPoints: ['Board distribution tomorrow at 5pm', 'Slides 14-18 revised with gross margin figures'],
      extractedDates: ['Tomorrow 5:00 PM'],
      requiresAction: true,
      status: 'PENDING',
      attachments: [{ name: 'Board_Meeting_Q3_FINAL_v4.pdf', size: 3200000, type: 'application/pdf' }],
      account: outlookAccount,
      offsetHours: 20,
    },
    {
      subject: 'Annual Office Lease Extension - Terms Comparison',
      sender: { name: 'Greg Sterling', email: 'greg@cushman-realty.com', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' },
      body: 'Hi Sarah,\n\nFollowing up on our discussion regarding the 4th floor lease renewal at 100 Madison Ave. The landlord has agreed to a 10% rent concession for a 3-year term, or 14% for a 5-year commitment. Attached is the side-by-side financial comparison.\n\nCould you coordinate with Alexander to see which duration the executive team favors?\n\nRegards,\nGreg Sterling | Commercial Brokerage',
      classification: 'ASSISTANT_TO_REPLY',
      confidence: 0.89,
      priority: 'MEDIUM',
      suggestedCategory: 'Facilities & Real Estate',
      aiSummary: 'Commercial broker presented 3-year (10% discount) vs 5-year (14% discount) lease renewal options at 100 Madison Ave.',
      classificationReason: 'Real estate coordination; assistant can gather options and present executive recommendation.',
      suggestedAction: 'Prepare 1-page summary comparing 3-year vs 5-year commitments for executive review.',
      keyPoints: ['100 Madison Ave lease renewal', '10% concession for 3-yr, 14% for 5-yr', 'Financial comparison attached'],
      extractedDates: [],
      requiresAction: true,
      status: 'PENDING',
      attachments: [{ name: 'Madison_Ave_Lease_Comparison.xlsx', size: 145000, type: 'application/xlsx' }],
      account: gmailAccount,
      offsetHours: 24,
    },
    {
      subject: 'Uber Receipts: Monthly Business Travel Summary',
      sender: { name: 'Uber for Business', email: 'receipts@uber.com', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150' },
      body: 'Your monthly business rides statement for October is ready. Total rides: 18. Total spent: $742.30. Charged to corporate Amex •••• 1004.\n\nDownload the detailed CSV report directly from the Uber for Business dashboard.',
      classification: 'NO_REPLY_NEEDED',
      confidence: 0.99,
      priority: 'LOW',
      suggestedCategory: 'Automated Receipts',
      aiSummary: 'Uber for Business monthly statement: $742.30 charged to corporate Amex for 18 rides.',
      classificationReason: 'Automated monthly travel receipt.',
      suggestedAction: 'Archive for monthly expense reconciliation.',
      keyPoints: ['$742.30 total spend', 'Amex •••• 1004'],
      extractedDates: [],
      requiresAction: false,
      status: 'COMPLETED',
      account: gmailAccount,
      offsetHours: 30,
    },
    {
      subject: 'Introductions: Dr. Sanjay Patel (FinTech AI & Risk Modeling)',
      sender: { name: 'Nathalie Cho', email: 'ncho@alumnifund.vc', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
      body: 'Alexander,\n\nConnecting you with Dr. Sanjay Patel (cc\'d), former Head of Risk at Citadel who is now founding a real-time risk observability company. Knowing your interest in high-frequency risk models, I thought a 20-minute introductory call would be mutually invigorating.\n\nSanjay, Alexander is Managing Partner at Acme Executive Group.\n\nI\'ll let you two take it from here!\n\nBest,\nNathalie Cho',
      classification: 'ASSISTANT_TO_REPLY',
      confidence: 0.93,
      priority: 'MEDIUM',
      suggestedCategory: 'Meeting Coordination',
      aiSummary: 'Nathalie Cho introduced Alexander to Dr. Sanjay Patel (former Citadel Head of Risk, founding risk AI company).',
      classificationReason: 'Double opt-in investor introduction. Standard assistant scheduling protocol applies.',
      suggestedAction: 'Reach out to Dr. Patel and offer 20-minute Zoom slots for next Tuesday or Thursday.',
      keyPoints: ['Founder warm introduction', 'Dr. Sanjay Patel (ex-Citadel)', '20-min intro call requested'],
      extractedDates: [],
      requiresAction: true,
      status: 'PENDING',
      account: gmailAccount,
      offsetHours: 36,
    },
  ];

  // Insert conversations, emails, and link them
  for (const item of sampleData) {
    const receivedDate = new Date(Date.now() - item.offsetHours * 60 * 60 * 1000);

    const conversation = await Conversation.create({
      workspaceId: workspace._id,
      subject: item.subject,
      lastMessageAt: receivedDate,
      currentClassification: item.classification,
      assignedTo:
        item.classification === 'CLIENT_TO_REPLY'
          ? 'CLIENT'
          : item.classification === 'ASSISTANT_TO_REPLY'
          ? 'ASSISTANT'
          : 'NONE',
      isCompleted: item.status === 'COMPLETED',
      isArchived: false,
      isStarred: item.priority === 'URGENT' || item.priority === 'HIGH',
      snippet: item.body.slice(0, 100),
      participantNames: [item.sender.name, client.name],
      unreadCount: item.status === 'PENDING' ? 1 : 0,
    });

    const email = await Email.create({
      workspaceId: workspace._id,
      accountId: item.account._id,
      conversationId: conversation._id,
      sender: item.sender,
      recipients: [{ name: client.name, email: client.email }],
      subject: item.subject,
      body: item.body,
      receivedAt: receivedDate,
      isRead: item.status === 'COMPLETED',
      isImportant: item.priority === 'URGENT' || item.priority === 'HIGH',
      isArchived: false,
      isStarred: item.priority === 'URGENT',
      classification: item.classification,
      confidence: item.confidence,
      priority: item.priority,
      aiSummary: item.aiSummary,
      classificationReason: item.classificationReason,
      suggestedAction: item.suggestedAction,
      suggestedCategory: item.suggestedCategory,
      keyPoints: item.keyPoints,
      extractedDates: item.extractedDates,
      requiresAction: item.requiresAction,
      status: item.status,
      attachments: item.attachments || [],
    });

    conversation.messageIds.push(email._id);
    await conversation.save();
  }

  // 5. Create Pre-Seeded Follow-Up Tasks & Extracted Meetings
  await Task.create([
    {
      workspaceId: workspace._id,
      title: 'Finalize Term Sheet with Marcus Sterling (Sequoia Apex)',
      description: 'Ensure Alexander completes review of Section 4.2 before Thursday 5pm cutoff.',
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      assignedTo: 'ASSISTANT',
      status: 'IN_PROGRESS',
      type: 'FOLLOW_UP',
    },
    {
      workspaceId: workspace._id,
      title: 'London Tech Week Travel Itinerary & Chauffeur confirmation',
      description: 'Book British Airways Heathrow airport transfer to The Connaught Hotel.',
      dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
      assignedTo: 'ASSISTANT',
      status: 'TODO',
      type: 'FOLLOW_UP',
    },
    {
      workspaceId: workspace._id,
      title: 'Soho House Private Dinner Catering Selection',
      description: 'Confirm Seasonal Truffle Tasting Menu A with events director Julian Mercer.',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      assignedTo: 'ASSISTANT',
      status: 'TODO',
      type: 'FOLLOW_UP',
    },
    {
      workspaceId: workspace._id,
      title: 'Quarterly Executive Bonus Payroll Authorization',
      description: 'Follow up with Alexander for sign-off on CFO David Hoffman\'s bonus allocation sheet.',
      dueDate: new Date(Date.now() + 36 * 60 * 60 * 1000),
      assignedTo: 'CLIENT',
      status: 'TODO',
      type: 'APPROVAL',
    },
    // Extracted Meetings
    {
      workspaceId: workspace._id,
      title: 'Strategy Sync: Alexander Wright & Rachel Vance (Catalyst Capital)',
      description: 'Rescheduled strategy discussion covering Q4 portfolio performance.',
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      assignedTo: 'ASSISTANT',
      status: 'TODO',
      type: 'MEETING',
      meetingDetails: {
        title: 'Strategy Sync: Catalyst Capital',
        date: 'Wednesday, Nov 18',
        time: '3:00 PM – 3:30 PM EST',
        participants: ['Alexander Wright', 'Rachel Vance'],
        location: 'Zoom Conference Room 1',
        isExtracted: true,
      },
    },
    {
      workspaceId: workspace._id,
      title: 'Introductory Call: Dr. Sanjay Patel (Observability AI)',
      description: 'Warm introductory discussion facilitated by Nathalie Cho.',
      dueDate: new Date(Date.now() + 96 * 60 * 60 * 1000),
      assignedTo: 'ASSISTANT',
      status: 'TODO',
      type: 'MEETING',
      meetingDetails: {
        title: 'Intro Call: Dr. Sanjay Patel',
        date: 'Thursday, Nov 19',
        time: '11:00 AM – 11:20 AM EST',
        participants: ['Alexander Wright', 'Dr. Sanjay Patel'],
        location: 'Google Meet',
        isExtracted: true,
      },
    },
  ]);

  // 6. Create Initial Activity Logs
  await ActivityLog.create([
    {
      workspaceId: workspace._id,
      userId: assistant._id,
      action: 'ACCOUNT_CONNECTED',
      entityType: 'ACCOUNT',
      entityId: gmailAccount._id.toString(),
      description: 'Connected Google Workspace account (alexander.wright@acmepartners.com)',
    },
    {
      workspaceId: workspace._id,
      userId: assistant._id,
      action: 'ACCOUNT_CONNECTED',
      entityType: 'ACCOUNT',
      entityId: outlookAccount._id.toString(),
      description: 'Connected Microsoft 365 Outlook account (a.wright@wrightventures.io)',
    },
    {
      workspaceId: workspace._id,
      userId: assistant._id,
      action: 'ACCOUNT_SYNCED',
      entityType: 'ACCOUNT',
      entityId: gmailAccount._id.toString(),
      description: 'Synchronized 26 emails across 16 active conversation threads',
    },
  ]);

  // 7. Synchronize Conversations
  await syncConversations();

  console.log('[Seed] Database seeding completed successfully!');
  console.log('--- DEMO CREDENTIALS ---');
  console.log('Assistant: assistant@mailpilot.io / password123');
  console.log('Client:    client@mailpilot.io / password123');
  console.log('Admin:     admin@mailpilot.io / password123');
  console.log('------------------------');
};

// If executed directly from CLI:
if (process.argv[1]?.includes('seed')) {
  mongoose
    .connect(ENV.MONGODB_URI)
    .then(async () => {
      await seedDatabase();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
