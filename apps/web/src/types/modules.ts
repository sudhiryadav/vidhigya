export interface NavigationModule {
  id: string;
  name: string;
  path: string;
  icon: string;
  isActive: boolean;
  isVisible: boolean;
  order: number;
  practiceId?: string;
  parentModuleId?: string;
  permissions: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModuleForm {
  name: string;
  path: string;
  icon: string;
  isActive: boolean;
  isVisible: boolean;
  order: number;
  practiceId?: string;
  parentModuleId?: string;
  permissions: string[];
  metadata?: Record<string, any>;
}
