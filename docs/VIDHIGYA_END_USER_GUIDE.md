# Vidhigya — Guide for End Users and Trainers

This document summarizes what **Vidhigya** offers in the web application today. Use it when onboarding staff, demonstrating the product, or drafting user-facing help. Technical implementation details may change; the intent here is to describe capabilities as users experience them.

---

## What Vidhigya Is

Vidhigya is a **legal practice management platform**. It brings together matters (cases), clients, documents, billing, tasks, collaboration (chat and video), court-related lookups, notifications, and—where your permissions allow—analytics and administrative tools. The experience adapts based on **who you are** (your role) and **what your organization allows** (permissions tied to practice and system roles).

---

## Signing In and Account Basics

| Area | What users can do |
|------|-------------------|
| **Login** | Sign in with email and password. |
| **Registration** | New users can register when your deployment allows it. |
| **Forgot password** | Start a password reset flow. |
| **Reset password** | Complete reset from the link sent to email. |
| **Logout** | End the session securely. |

After login, users are routed to an appropriate **home dashboard**: administrators typically land on the **Admin Dashboard**; others land on the main **Dashboard**.

---

## Roles (High Level)

The application recognizes several **user roles**. Not every screen is available to every role.

- **SUPER_ADMIN** — Full platform administration, including **System Settings** and cross-practice oversight (with context selection on the admin side).
- **ADMIN** — Firm- or tenant-level administration (users, lawyers, cases, billing, documents, analytics, reports), but not necessarily system-wide settings reserved for Super Admin.
- **LAWYER** — Full practice workflows; firm owners may also manage **Practice Users**.
- **ASSOCIATE** / **PARALEGAL** — Practice workflows scoped by permissions (cases, clients, documents, tasks, billing as allowed).
- **CLIENT** — A focused portal: own cases, documents, billing visibility, and communication with the firm, without internal admin tools.

Within a practice, members can have **practice roles** (for example Owner, Partner, Associate, Paralegal, Staff) that describe what they should be allowed to do. The sidebar and buttons only show actions the user is permitted to perform.

---

## Interface Conventions

- **Sidebar navigation** — Primary way to move between modules; on small screens it collapses behind a menu control.
- **Practice context** — Where relevant, the current **practice** (and firm name when available) appears in the header; **Practice Management** includes switching or managing context.
- **Dark and light themes** — Users can switch appearance (theme toggle in the shell).
- **Notifications** — A bell for alerts plus a full **Notifications** area to read, filter, mark read, or remove items.
- **Profile and settings** — From the user menu: **Profile** (role-appropriate titles), **Settings** (preferences such as notifications, timezone, currency, locale), and **Logout**. Admins who open Settings may be routed to **Admin** settings when applicable.

---

## Dashboard

The **Dashboard** is role-aware.

**For lawyers and firm staff (typical):**

- Welcome summary and **statistics** such as cases, clients, documents, billing, and trends where available.
- **Quick actions** — Shortcuts such as creating a case, uploading a document, creating a bill, adding a client, scheduling an event, creating a task, starting or joining collaboration (for example instant call) depending on setup.
- Sections may include **upcoming hearings**, **overdue bills**, **recent activity**, and links into deeper modules.

**For clients:**

- A tailored view focused on **their** cases, documents, billing, and upcoming items rather than firm-wide administration.

---

## Practice Management

**Practice Management** is the hub for **your legal practice as an organization**:

- View practice information and **statistics** for the practice.
- **Practice selector** — When you belong to more than one context, choose which practice you are working in.
- **Team / members** — Invite or manage members, assign **practice roles**, and understand role capabilities (for example Owner vs Partner vs Associate vs Paralegal vs Staff).
- **Practice Users** — Available to **LAWYER** users with manage permissions on the practice resource (typically the firm owner), for administering users tied to the practice.

---

## Cases

- **Case list** — Browse matters with search and filters (status, priority, and similar fields as exposed in the UI).
- **Case detail** — Deep view per matter: parties, court, judge, hearings, assignments, linked documents, and related workflow.
- **Create / edit / archive** — Subject to permissions; destructive actions often require confirmation.

Clients see a **limited case view** aligned to matters they are associated with.

---

## Clients

- **Directory of clients** with search and status filters.
- **Create, view, edit** client records (contact details, activity, linked cases, documents, billing summaries where shown).
- **Role-based visibility** — Clients do not use the internal “clients CRM” the same way staff do; they interact as **their own** client record.

---

## Documents

- **Upload** documents, assign categories and status, and link them to cases.
- **View and download** with an in-app viewer where supported.
- **Filters and search** within the document library.
- **AI-related flows** — Upload and processing may tie into document intelligence features (for example extraction or progress tracking components in the UI).
- **Semantic search** — From the Documents area, search can surface relevant passages across uploaded files (see also **Search & Reference**).

---

## Tasks

- **Task list** with search and filters (status, priority, assignment).
- **Create tasks**, assign to colleagues, set due dates, and link tasks to cases.
- **Lifecycle** — Update status through completion; view task detail and history as provided.

---

## Billing

- **Bills** — Create and manage billing records with amounts, types (for example consultation), due dates, and linkage to cases or clients as the UI allows.
- **Filters** — By status, case, overdue-only, and search.
- **Currency** — Displays respect user or organization currency preferences where configured.

Clients see billing information **relevant to them** rather than the firm-wide billing workspace.

---

## Search & Reference

This module supports **finding information inside your uploaded materials** and **asking questions**:

- **Semantic search** across document content with filters (for example category, date).
- **Document Q&A** — Interactive Q&A against your materials (distinct tab in the UI).
- Results can tie back to **document preview** or viewer experiences.

---

## Tasks, Calendar, and Scheduling

- **Tasks** — Covered above; primary navigation entry is **Tasks**.
- **Calendar** — A **calendar route** exists in the app for events (hearings, meetings, recurring rules, and related fields). The main sidebar may not list **Calendar** in all builds (it can be commented out), but the feature area is implemented for users who navigate to it when enabled.

The **Dashboard** may offer **Schedule event** style quick actions depending on role and configuration.

---

## Notifications

- Central list of notifications with **search** and filters (for example read vs unread, type).
- Open items; **mark as read**; delete where supported.
- Types can correspond to cases, documents, billing, calendar, tasks, video, or system events as implemented.

---

## Chat

- **Conversation list** with last message preview and unread counts.
- **Search** chats; **start new** conversations with allowed users (for example colleagues or associated clients depending on role).
- **Online presence** — Status may update when users come online or go offline.

---

## Video Calls

- **Scheduled meetings** — Title, time window, meeting ID, optional case link, host and participant lists, status.
- **Join by meeting ID**, copy links, and manage meetings subject to permission.
- **Instant call** style flows may be available from the dashboard or dedicated components.

---

## eCourts Services

The **eCourts Services** hub groups integrations and lookups related to Indian eCourts-style data:

| Service | Typical user-facing purpose | Notes |
|--------|-------------------------------|--------|
| **Case Search** | Find cases by number, party, advocate, or similar criteria | Primary discovery flow |
| **Court Search** | Find courts by location, type, or name | |
| **Judge Search** | Look up judges | Marked **Coming Soon** in the hub |
| **Hearings** | Hearing schedules | Marked **Coming Soon** in the hub |
| **Orders** | Orders and judgments | Marked **Coming Soon** in the hub |

Treat “Coming Soon” areas as **planned or partial** when setting expectations with users.

---

## Reports (AI & Productivity)

The application includes a **Reports** experience (for example under `/reports`) focused on **AI usage and productivity**: query volumes, satisfaction or feedback signals, feature usage, recent Q&A activity, and summarized metrics. Availability depends on role and backend configuration.

---

## Administration (ADMIN / SUPER_ADMIN)

Administrators get additional navigation and screens, including:

| Area | Purpose |
|------|---------|
| **Admin Dashboard** | Overview with **Super Admin context selector** — switch between global view, a specific practice, firm, or individual practitioner when acting as Super Admin. |
| **User Management** | Manage platform or tenant users as permitted. |
| **Admin Lawyers / Admin Clients / Admin Cases / Admin Documents / Admin Billing** | Cross-cutting management views for oversight and corrections. |
| **Analytics** | Operational metrics: users, cases, documents, billing aggregates, trends, and performance-style indicators where returned by the API. |
| **Admin Reports** | Report **templates**, **parameters**, **generate** reports, and **download** generated outputs when available. |
| **System Settings** | **SUPER_ADMIN** — system-level configuration. |

Non-admin users are **redirected away** from admin URLs if they try to open them directly.

---

## Analytics & Reports (Navigation Detail)

- **Analytics** and **Reports** appear in the sidebar for users with **ADMIN / SUPER_ADMIN** roles and appropriate permissions.
- Separate entries exist for **Analytics** / **Reports** (general navigation) and **Admin Analytics** / **Admin Reports** aligned to admin workflows; both families target oversight and operational reporting.

---

## Permissions (Concept for Training)

Beyond fixed roles, the product uses **permission checks** (actions like read, create, update, delete, manage on resources such as practice, case, client, document, billing, task, analytics, report). If something is missing from the menu or a button is unavailable, explain that **access is controlled by the organization** rather than assuming a bug.

---

## Profile

- Role-specific labeling (Lawyer / Client / Admin profile).
- Manage professional or personal profile fields as exposed.
- Profile photo support via **Profile Picture** components and related upload flows in **Settings** where applicable.

---

## Summary Checklist for Demos

When demonstrating Vidhigya end-to-end, consider walking through:

1. Login and landing **Dashboard** for your demo persona.  
2. **Practice Management** — practice selection and team.  
3. **Cases** — list → detail → linked documents/tasks.  
4. **Clients** — record management.  
5. **Documents** — upload → view → search.  
6. **Tasks** — create and complete.  
7. **Billing** — create and filter bills.  
8. **Search & Reference** — semantic search and Q&A.  
9. **Notifications** and **Chat**.  
10. **Video Calls** — schedule or join.  
11. **eCourts** — case and court search; set expectations on “Coming Soon” tiles.  
12. **Admin** flows — only with an admin demo account.

---

## Document Maintenance

This guide is derived from the Vidhigya web application structure (navigation, routes, and page-level behavior). When shipping major features or renaming modules, update this file so trainers and customer-facing teams stay aligned.
