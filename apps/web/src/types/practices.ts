export interface Practice {
  id: string;
  name: string;
  practiceType: "INDIVIDUAL" | "FIRM" | "MIXED";
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  firm?: Firm;
  members: PracticeMember[];
  _count?: {
    clients: number;
    members: number;
  };
}

export interface Firm {
  id: string;
  practiceId: string;
  registrationNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeMember {
  id: string;
  practiceId: string;
  userId: string;
  departmentId?: string;
  supervisorId?: string;
  permissions?: any;
  isActive: boolean;
  joinDate: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreatePracticeDto {
  name: string;
  description?: string;
  practiceType: "INDIVIDUAL" | "FIRM" | "MIXED";
}

export interface UpdatePracticeDto {
  name?: string;
  description?: string;
  practiceType?: "INDIVIDUAL" | "FIRM" | "MIXED";
}

export interface AddMemberDto {
  email: string;
}
