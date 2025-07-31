import { LegalDocument } from "../documents";
export interface LegalCase {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  category: CaseCategory;
  courtId?: string;
  court?: {
    id: string;
    name: string;
    type: string;
    city: string;
    state: string;
  };
  judge?: string;
  opposingParty?: string;
  opposingLawyer?: string;
  filingDate?: Date;
  nextHearingDate?: Date;
  estimatedCompletionDate?: Date;
  assignedLawyerId: string;
  clientId: string;
  documents: LegalDocument[];
  notes: CaseNote[];
  createdAt: Date;
  updatedAt: Date;
}
export enum CaseStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  PENDING = "pending",
  CLOSED = "closed",
  ARCHIVED = "archived",
}
export enum CasePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}
export enum CaseCategory {
  CIVIL = "civil",
  CRIMINAL = "criminal",
  FAMILY = "family",
  CORPORATE = "corporate",
  PROPERTY = "property",
  LABOR = "labor",
  TAX = "tax",
  INTELLECTUAL_PROPERTY = "intellectual_property",
  OTHER = "other",
}
export interface CaseNote {
  id: string;
  caseId: string;
  userId: string;
  content: string;
  type: NoteType;
  createdAt: Date;
  updatedAt: Date;
}
export enum NoteType {
  GENERAL = "general",
  HEARING = "hearing",
  EVIDENCE = "evidence",
  STRATEGY = "strategy",
  REMINDER = "reminder",
}
