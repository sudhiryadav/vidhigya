import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    name?: string;
    role: UserRole;
    primaryPracticeId?: string;
  };
}
