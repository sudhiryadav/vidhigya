-- CreateEnum
CREATE TYPE "public"."PracticeType" AS ENUM ('INDIVIDUAL', 'FIRM', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."PracticeRole" AS ENUM ('OWNER', 'PARTNER', 'SENIOR_ASSOCIATE', 'ASSOCIATE', 'PARALEGAL', 'SUPPORT', 'STAFF');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('LAWYER', 'CLIENT', 'ADMIN', 'ASSOCIATE', 'PARALEGAL', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."CaseCategory" AS ENUM ('CIVIL', 'CRIMINAL', 'FAMILY', 'CORPORATE', 'PROPERTY', 'LABOR', 'TAX', 'INTELLECTUAL_PROPERTY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentCategory" AS ENUM ('CONTRACT', 'AGREEMENT', 'PETITION', 'AFFIDAVIT', 'EVIDENCE', 'COURT_ORDER', 'LEGAL_OPINION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'FILED', 'ARCHIVED', 'PROCESSING', 'PROCESSED');

-- CreateEnum
CREATE TYPE "public"."NoteType" AS ENUM ('GENERAL', 'HEARING', 'EVIDENCE', 'STRATEGY', 'REMINDER');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'FILE', 'IMAGE', 'AUDIO');

-- CreateEnum
CREATE TYPE "public"."BillType" AS ENUM ('CONSULTATION', 'COURT_APPEARANCE', 'DOCUMENT_PREPARATION', 'RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."BillStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('CASE_UPDATE', 'DOCUMENT_UPLOAD', 'HEARING_REMINDER', 'BILLING', 'MESSAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('HEARING', 'CLIENT_MEETING', 'COURT_APPEARANCE', 'DEADLINE', 'INTERNAL_MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ParticipantStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateEnum
CREATE TYPE "public"."CallStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD', 'SEK', 'SGD', 'THB', 'TRY', 'ZAR');

-- CreateEnum
CREATE TYPE "public"."CourtType" AS ENUM ('SUPREME_COURT', 'HIGH_COURT', 'DISTRICT_COURT', 'SESSIONS_COURT', 'MAGISTRATE_COURT', 'FAMILY_COURT', 'LABOR_COURT', 'CONSUMER_COURT', 'TRIBUNAL', 'SPECIAL_COURT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FeedbackType" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "public"."QueryType" AS ENUM ('GENERAL', 'CASE_SPECIFIC', 'DOCUMENT_ANALYSIS', 'LEGAL_RESEARCH', 'DRAFT_GENERATION', 'SUMMARY_REQUEST');

-- CreateTable
CREATE TABLE "public"."practices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "practiceType" "public"."PracticeType" NOT NULL DEFAULT 'INDIVIDUAL',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."firms" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "taxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "practiceArea" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."practice_members" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."PracticeRole" NOT NULL DEFAULT 'STAFF',
    "departmentId" TEXT,
    "supervisorId" TEXT,
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'CLIENT',
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "avatarS3Key" TEXT,
    "clientId" TEXT,
    "primaryPracticeId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."CourtType" NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "jurisdiction" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."legal_cases" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."CasePriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "public"."CaseCategory" NOT NULL,
    "judge" TEXT,
    "opposingParty" TEXT,
    "opposingLawyer" TEXT,
    "filingDate" TIMESTAMP(3),
    "nextHearingDate" TIMESTAMP(3),
    "estimatedCompletionDate" TIMESTAMP(3),
    "assignedLawyerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courtId" TEXT,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "legal_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."legal_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "category" "public"."DocumentCategory" NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "caseId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "aiChunks" INTEGER,
    "aiDocumentId" TEXT,
    "content" TEXT,
    "originalFilename" TEXT,
    "clientId" TEXT,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."case_notes" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "public"."NoteType" NOT NULL DEFAULT 'GENERAL',
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_records" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "billType" "public"."BillType" NOT NULL,
    "status" "public"."BillStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "caseId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'INR',
    "clientId" TEXT,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "eventType" "public"."EventType" NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "caseId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_participants" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."ParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."video_calls" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "meetingUrl" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "status" "public"."CallStatus" NOT NULL DEFAULT 'SCHEDULED',
    "caseId" TEXT,
    "hostId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "video_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."call_participants" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "call_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_entries" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "rate" DOUBLE PRECISION,
    "caseId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "caseId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."client_portals" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "preferences" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "client_portals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_signatures" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."file_shares" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "caseId" TEXT,
    "documentId" TEXT,
    "ownerId" TEXT NOT NULL,
    "sharedWithId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "clientId" TEXT,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "file_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "analyticsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "auditLogging" BOOLEAN NOT NULL DEFAULT true,
    "autoBackup" BOOLEAN NOT NULL DEFAULT true,
    "backupNotifications" BOOLEAN NOT NULL DEFAULT true,
    "billingAlerts" BOOLEAN NOT NULL DEFAULT true,
    "calendarReminders" BOOLEAN NOT NULL DEFAULT true,
    "caseUpdates" BOOLEAN NOT NULL DEFAULT true,
    "dataRetention" TEXT NOT NULL DEFAULT '90',
    "dataSharing" BOOLEAN NOT NULL DEFAULT true,
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "debugMode" BOOLEAN NOT NULL DEFAULT false,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "emailProvider" TEXT NOT NULL DEFAULT 'smtp',
    "ipWhitelist" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'en',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "passwordPolicy" TEXT NOT NULL DEFAULT 'strong',
    "profileVisibility" TEXT NOT NULL DEFAULT 'public',
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "securityEvents" BOOLEAN NOT NULL DEFAULT true,
    "sessionTimeout" TEXT NOT NULL DEFAULT '30',
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "smsProvider" TEXT NOT NULL DEFAULT 'twilio',
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "systemAlerts" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "twoFactorAuth" BOOLEAN NOT NULL DEFAULT false,
    "userActivity" BOOLEAN NOT NULL DEFAULT false,
    "fontSize" TEXT NOT NULL DEFAULT 'sm',
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "feedback" "public"."FeedbackType" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_queries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sources" JSONB,
    "queryType" "public"."QueryType" NOT NULL DEFAULT 'GENERAL',
    "responseTime" INTEGER,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "practiceId" TEXT NOT NULL,

    CONSTRAINT "document_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "firms_practiceId_key" ON "public"."firms"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "practice_members_practiceId_userId_key" ON "public"."practice_members"("practiceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_clientId_key" ON "public"."users"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "users_primaryPracticeId_key" ON "public"."users"("primaryPracticeId");

-- CreateIndex
CREATE UNIQUE INDEX "courts_name_key" ON "public"."courts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "legal_cases_caseNumber_key" ON "public"."legal_cases"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_eventId_userId_key" ON "public"."event_participants"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "video_calls_meetingId_key" ON "public"."video_calls"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "call_participants_callId_userId_key" ON "public"."call_participants"("callId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_portals_userId_key" ON "public"."client_portals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "public"."user_settings"("userId");

-- AddForeignKey
ALTER TABLE "public"."firms" ADD CONSTRAINT "firms_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "public"."firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."practice_members" ADD CONSTRAINT "practice_members_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."practice_members" ADD CONSTRAINT "practice_members_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."practice_members" ADD CONSTRAINT "practice_members_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "public"."practice_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."practice_members" ADD CONSTRAINT "practice_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_primaryPracticeId_fkey" FOREIGN KEY ("primaryPracticeId") REFERENCES "public"."practice_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legal_cases" ADD CONSTRAINT "legal_cases_assignedLawyerId_fkey" FOREIGN KEY ("assignedLawyerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legal_cases" ADD CONSTRAINT "legal_cases_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legal_cases" ADD CONSTRAINT "legal_cases_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "public"."courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legal_cases" ADD CONSTRAINT "legal_cases_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legal_documents" ADD CONSTRAINT "legal_documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."legal_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legal_documents" ADD CONSTRAINT "legal_documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legal_documents" ADD CONSTRAINT "legal_documents_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legal_documents" ADD CONSTRAINT "legal_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_notes" ADD CONSTRAINT "case_notes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."legal_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_notes" ADD CONSTRAINT "case_notes_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_notes" ADD CONSTRAINT "case_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_records" ADD CONSTRAINT "billing_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."legal_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_records" ADD CONSTRAINT "billing_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_records" ADD CONSTRAINT "billing_records_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_records" ADD CONSTRAINT "billing_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."legal_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_participants" ADD CONSTRAINT "event_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."calendar_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_participants" ADD CONSTRAINT "event_participants_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_participants" ADD CONSTRAINT "event_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."video_calls" ADD CONSTRAINT "video_calls_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."legal_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."video_calls" ADD CONSTRAINT "video_calls_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."video_calls" ADD CONSTRAINT "video_calls_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."video_calls" ADD CONSTRAINT "video_calls_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_participants" ADD CONSTRAINT "call_participants_callId_fkey" FOREIGN KEY ("callId") REFERENCES "public"."video_calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_participants" ADD CONSTRAINT "call_participants_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_participants" ADD CONSTRAINT "call_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."legal_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."legal_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_portals" ADD CONSTRAINT "client_portals_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_portals" ADD CONSTRAINT "client_portals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_signatures" ADD CONSTRAINT "document_signatures_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."legal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_signatures" ADD CONSTRAINT "document_signatures_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_signatures" ADD CONSTRAINT "document_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_shares" ADD CONSTRAINT "file_shares_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."legal_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_shares" ADD CONSTRAINT "file_shares_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_shares" ADD CONSTRAINT "file_shares_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."legal_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_shares" ADD CONSTRAINT "file_shares_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_shares" ADD CONSTRAINT "file_shares_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_shares" ADD CONSTRAINT "file_shares_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feedback" ADD CONSTRAINT "feedback_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feedback" ADD CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_queries" ADD CONSTRAINT "document_queries_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."legal_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_queries" ADD CONSTRAINT "document_queries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_queries" ADD CONSTRAINT "document_queries_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "public"."practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_queries" ADD CONSTRAINT "document_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
