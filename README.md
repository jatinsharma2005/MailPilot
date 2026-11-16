# MailPilot — AI-Powered Personal Assistant Email Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js_v20+-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)

> **Product Philosophy**: *AI handles the organization. Assistants handle the operations. Clients handle the decisions that require their attention.*

MailPilot is a full-stack, enterprise-grade SaaS platform purpose-built for executive personal assistants who manage high-stakes email communications on behalf of executives and principals.

---

## 1. Product Architecture & Workspaces

MailPilot provides two distinct user interfaces backed by a unified database, strict workspace isolation, and an AI intelligence engine:

### A. Executive Assistant Workspace (`/assistant`)
- **Executive Overview Dashboard**: Real-time KPI statistics calculated from live database records (Total Synchronized, Unread, Action Required, Client Attention, Assistant Queue, Waiting for Response).
- **Executive Email Inbox**: Multi-dimensional filtering (`All`, `Action Required`, `Assistant to Reply`, `Client to Reply`, `Needs Review`, `No Reply Needed`, `Important`, `Unread`, `Waiting`, `Meetings`), debounced search across sender, subject, and body, and instant row-level reclassification.
- **Conversation Thread & AI Intelligence Panel**: Full email thread inspection with complete AI explanation (classification reason, confidence score, suggested action, key extracted points, date entities) and human manual override audit logging.
- **AI Reply Composer**: Multi-tone response drafting (`Professional`, `Friendly`, `Concise`, `Formal`) with human-in-the-loop confirmation modal before simulated dispatch.
- **Operational Tasks & Calendar**: AI-extracted meeting coordination and pending follow-up tracking with deadline management.
- **Multi-Account Sync**: Support for simulated OAuth connections across Google Workspace and Microsoft 365.

### B. Executive Client Workspace (`/client`)
- **Distraction-Free Executive View**: Minimalist interface showing only high-stakes communications requiring executive judgment or signatures.
- **Decision Brief Cards**: AI executive summary highlighting *"Why your response is needed"*, sender context, urgency badge, and key bullet points.
- **One-Click Action Execution**:
  - **"I'll Handle This"**: Resolves the conversation and archives the decision into historical logs with optional notes.
  - **"Delegate to Assistant"**: Hands off operational follow-up to the assistant with custom delegation instructions.
- **Real-Time Workspace Synchronization**: State shifts in the Client Workspace immediately reflect in the Assistant Workspace priority queues.

### C. Contextual AI Drawer ("Ask MailPilot AI")
- Accessible in both workspaces via a floating button.
- Queries live database records to answer questions like *"Which emails require client attention?"*, *"What meetings are upcoming this week?"*, or *"Summarize contracts pending review."*

---

## 2. Design System & Visual Identity

The UI strictly adheres to the requested muted, warm-neutral executive design system:

| Element | Color Hex | Role |
| :--- | :--- | :--- |
| **Primary Background** | `#F7F6F2` | Warm parchment base |
| **Secondary Background** | `#EFEEE8` | Subtle grouping containers & hover |
| **Main Surface** | `#FFFFFF` | Card & modal background |
| **Primary Text** | `#252923` | High-contrast readable typography |
| **Secondary Text** | `#777970` | Metadata, timestamps, captions |
| **Primary Accent** | `#526B50` | Muted forest green |
| **Accent Hover** | `#40563F` | Darker forest interactive hover |
| **Soft Green Background** | `#E9EFE6` | Active tags, assistant badges, accents |
| **Border Main** | `#E6E5DE` | Subtle 1px dividing lines |
| **Warm Beige** | `#EAE4D8` | Muted chips and borders |
| **Status Warning (Amber)** | `#B7833D` | Client attention & high urgency |
| **Status Error (Terracotta)** | `#B75C52` | Needs review & error notices |
| **Status Success** | `#66845E` | Handled & completed actions |

- **Typography**: Inter & DM Sans via Google Fonts.
- **Layout**: 8px baseline spacing system, 12px rounded cards (`rounded-card`), restrained elevation shadows, and zero blue/purple/neon gradients.

---

## 3. Demo Credentials

MailPilot includes instant 1-click demo login buttons directly on the `/login` screen:

| Role | Email | Password | Primary Interface |
| :--- | :--- | :--- | :--- |
| **Executive Assistant** | `assistant@mailpilot.io` | `password123` | Assistant Workspace (`/assistant/dashboard`) |
| **Executive Client** | `client@mailpilot.io` | `password123` | Client Workspace (`/client/dashboard`) |
| **Admin** | `admin@mailpilot.io` | `password123` | Full Workspace Access |

---

## 4. AI Engine & Classification Architecture

MailPilot implements an AI classification engine with Gemini API integration and hybrid fallback:

### 4 Classification Categories:
1. **`ASSISTANT_TO_REPLY`**: Administrative tasks, scheduling meetings, logistics, routine requests.
2. **`CLIENT_TO_REPLY`**: Financial approvals, legal contracts, executive decisions, personal inquiries.
3. **`NO_REPLY_NEEDED`**: Newsletters, receipts, automated notifications, resolved threads.
4. **`NEEDS_REVIEW`**: High ambiguity, conflicting signals, low AI confidence (< 0.70).

### Output Schema Validation:
All AI responses are validated against a strict Zod schema:
```json
{
  "classification": "CLIENT_TO_REPLY",
  "confidence": 0.94,
  "priority": "HIGH",
  "requiresAction": true,
  "summary": "Term sheet received from Sequoia requiring executive signature.",
  "reason": "The sender explicitly requests the partner's approval on valuation terms.",
  "suggestedAction": "Review agreement and provide approval or edits.",
  "suggestedCategory": "Legal & Contracts",
  "keyPoints": [
    "Series A valuation outlined",
    "Requires signature by Friday 5 PM",
    "Board seat agreement attached"
  ],
  "extractedDates": ["Friday 5:00 PM EST"],
  "suggestedReply": "Hi Marcus,\n\nI have reviewed the term sheet and..."
}
```

---

## 5. Senior QA Audit & Hardened Fixes Log

During the QA audit phase, the following issues were identified and permanently resolved in code:

| Component | Identified Issue | Code Fix Implemented |
| :--- | :--- | :--- |
| **RBAC Authorization** | Clients could invoke assistant operations (`/classification`, `/reply`, `/accounts`, `/tasks`); assistants could execute client approvals (`/handle`, `/delegate`). | Attached `requireRole('ASSISTANT', 'ADMIN')` and `requireRole('CLIENT', 'ADMIN')` across all routes. |
| **Task Mass Assignment** | `TaskController.updateTask` used `Object.assign(task, updates)`, enabling workspaceId / tenant hijacking. | Whitelisted safe fields only (`title`, `description`, `dueDate`, `status`, `assignedTo`, `type`, `meetingDetails`). |
| **Regex Injection / ReDoS** | Unsanitized search queries with special regex characters (`(`, `[`, `*`) could crash the Node process with 500. | Implemented regex character sanitization escape function before compiling MongoDB search expressions. |
| **Password Projection** | `UserSchema` selected `passwordHash` by default on user queries. | Added `select: false` to `passwordHash` in schema and explicitly select it only during authentication. |
| **Cross-Workspace IDOR** | Inter-tenant queries must be strictly rejected. | Verified all Mongoose queries enforce `workspaceId: req.workspaceId` scoping, rejecting cross-tenant lookups with 404. |
| **Assistant Layout** | Hamburger button toggled state on mobile/tablet viewports, but no drawer opened. | Built a slide-over mobile drawer with all navigation links, active workspace indicator, and sign out. |
| **Overview Statistics** | Metric cards 3 ("Action Required") and 5 ("Assistant Tasks") did not map to dedicated email list filters. | Added backend support for `filter=action` and mapped statistics to their exact filtered inbox views. |
| **Email Search & Filter** | Combining keyword search with meeting filters caused MongoDB `$or` clobbering. | Restructured queries with an `$and` condition array so search and category filters compose safely. |
| **Inbox Table** | Classification change handler existed in state but was never exposed in the table row. | Added a hover classification selector directly to the email row for instant reclassification. |
| **Table Hover Actions** | Hover quick actions (Mark Read/Archive) lacked a parent `group` class. | Added `group` class to each table row for smooth CSS transitions. |
| **Settings Persistence** | Saving profile settings in SettingsPage only updated local UI state. | Added `PATCH /api/auth/profile` endpoint to persist user and workspace name changes to MongoDB. |

---

## 6. Local Setup & Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/mailpilot`) or MongoDB Atlas connection string.

### Step 1: Install Dependencies
```bash
# Install root, server, and client packages
npm run install:all
```

### Step 2: Environment Configuration
Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/mailpilot
JWT_SECRET=super_secret_mailpilot_jwt_key_2026_production
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```

### Step 3: Seed Database
Populates 26 realistic executive email conversations, users, connected accounts, and calendar meetings:
```bash
npm run seed
```

### Step 4: Run Automated QA & Security Audit Test Suites
```bash
# Run baseline API integration tests (16 tests)
npm run test:api

# Run deep multi-phase security & functional verification suite (25 tests)
npm run test:deep
```

### Step 5: Start Development Servers
Run both backend and frontend concurrently:
```bash
# Terminal 1: Start Express backend (Port 5000)
npm run dev:server

# Terminal 2: Start Vite frontend (Port 5173)
npm run dev:client
```
Open [http://localhost:5173](http://localhost:5173) in your browser and click **"Demo Assistant"** or **"Demo Client"** to log in instantly.

---

## 7. Production Deployment Guide

### Deploying Backend (Render / Railway)
1. Push the repository to GitHub.
2. In Render or Railway, create a **Web Service** pointing to the `server/` directory.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Set environment variables: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `CLIENT_URL`.

### Deploying Frontend (Vercel / Netlify)
1. In Vercel, import the repository and set Root Directory to `client/`.
2. Framework Preset: `Vite`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Set environment variable: `VITE_API_URL=https://your-backend-service.onrender.com/api`.

---

## 8. License

MIT License. Designed and built for the MailPilot AI Full-Stack Engineer Evaluation.
