// eCourts API Types and Interfaces

export interface Court {
  id: string;
  name: string;
  state: string;
  district: string;
  type: CourtType;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
}

export enum CourtType {
  SUPREME_COURT = "SUPREME_COURT",
  HIGH_COURT = "HIGH_COURT",
  DISTRICT_COURT = "DISTRICT_COURT",
  SESSIONS_COURT = "SESSIONS_COURT",
  CIVIL_COURT = "CIVIL_COURT",
  FAMILY_COURT = "FAMILY_COURT",
  CONSUMER_COURT = "CONSUMER_COURT",
  LABOUR_COURT = "LABOUR_COURT",
  REVENUE_COURT = "REVENUE_COURT",
  OTHER = "OTHER",
}

export interface Case {
  caseNumber: string;
  caseTitle: string;
  caseType: string;
  filingDate: string;
  status: CaseStatus;
  court: Court;
  petitioner: Party[];
  respondent: Party[];
  advocate: Advocate[];
  lastHearingDate?: string;
  nextHearingDate?: string;
  caseStage: string;
  caseDetails: CaseDetails;
}

export enum CaseStatus {
  PENDING = "PENDING",
  DISPOSED = "DISPOSED",
  TRANSFERRED = "TRANSFERRED",
  WITHDRAWN = "WITHDRAWN",
  ABATED = "ABATED",
  OTHER = "OTHER",
}

export interface Party {
  name: string;
  type: PartyType;
  address?: string;
  phone?: string;
  email?: string;
}

export enum PartyType {
  PETITIONER = "PETITIONER",
  RESPONDENT = "RESPONDENT",
  APPELLANT = "APPELLANT",
  APPELLEE = "APPELLEE",
  COMPLAINANT = "COMPLAINANT",
  ACCUSED = "ACCUSED",
  OTHER = "OTHER",
}

export interface Advocate {
  name: string;
  barCouncilNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  type: AdvocateType;
}

export enum AdvocateType {
  PETITIONER_ADVOCATE = "PETITIONER_ADVOCATE",
  RESPONDENT_ADVOCATE = "RESPONDENT_ADVOCATE",
  AMICUS_CURIAE = "AMICUS_CURIAE",
  OTHER = "OTHER",
}

export interface CaseDetails {
  caseDescription?: string;
  caseCategory?: string;
  caseSubCategory?: string;
  caseValue?: number;
  casePriority?: CasePriority;
  caseNature?: string;
  caseSubject?: string;
  caseAct?: string;
  caseSection?: string;
}

export enum CasePriority {
  URGENT = "URGENT",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export interface Hearing {
  id: string;
  caseNumber: string;
  hearingDate: string;
  hearingTime?: string;
  purpose: string;
  status: HearingStatus;
  judge?: Judge;
  remarks?: string;
  order?: string;
}

export enum HearingStatus {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  ADJOURNED = "ADJOURNED",
  CANCELLED = "CANCELLED",
  OTHER = "OTHER",
}

export interface Judge {
  id: string;
  name: string;
  designation: string;
  court: Court;
  phone?: string;
  email?: string;
  bio?: string;
}

export interface Order {
  id: string;
  caseNumber: string;
  orderDate: string;
  orderType: OrderType;
  orderText: string;
  judge: Judge;
  orderStatus: OrderStatus;
  pdfUrl?: string;
}

export enum OrderType {
  INTERIM_ORDER = "INTERIM_ORDER",
  FINAL_ORDER = "FINAL_ORDER",
  JUDGMENT = "JUDGMENT",
  DECREE = "DECREE",
  OTHER = "OTHER",
}

export enum OrderStatus {
  PASSED = "PASSED",
  STAYED = "STAYED",
  MODIFIED = "MODIFIED",
  REVERSED = "REVERSED",
  OTHER = "OTHER",
}

// API Request/Response Types
export interface SearchCasesRequest {
  caseNumber?: string;
  partyName?: string;
  advocateName?: string;
  courtId?: string;
  caseType?: string;
  filingDateFrom?: string;
  filingDateTo?: string;
  status?: CaseStatus;
  limit?: number;
  offset?: number;
}

export interface SearchCasesResponse {
  cases: Case[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface GetCaseDetailsRequest {
  caseNumber: string;
  courtId?: string;
}

export interface GetCaseDetailsResponse {
  case: Case;
  hearings: Hearing[];
  orders: Order[];
}

export interface SearchCourtsRequest {
  state?: string;
  district?: string;
  courtType?: CourtType;
  name?: string;
  limit?: number;
  offset?: number;
}

export interface SearchCourtsResponse {
  courts: Court[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchJudgesRequest {
  name?: string;
  courtId?: string;
  designation?: string;
  limit?: number;
  offset?: number;
}

export interface SearchJudgesResponse {
  judges: Judge[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Error Types
export interface ECourtsError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: ECourtsError;
  timestamp: string;
}
