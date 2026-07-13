// ── Shared Types ───────────────────────────────────────────
// Centralized type definitions used across dashboard, admin, and bulk pages.

export interface Category {
  id: number;
  categoryName: string;
  activityType: 'OFFICIAL' | 'AUTONOMOUS';
  assignedHours: number;
  isActive: boolean;
  department?: string | null;
  maxHours?: number | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Request {
  id: number;
  userId?: number;
  bulkLabel?: string | null;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  activityType: 'OFFICIAL' | 'AUTONOMOUS' | null;
  appliedHours: number | null;
  rejectedReason: string | null;
  evidenceFileUrl: string | null;
  createdAt: string;
  activityDate?: string | null;
  category: Category;
  categoryId?: number;
  createdById?: number | null;
  user?: User | null;
  createdBy?: User | null;
}

export interface GroupedRequest {
  id: string;
  bulkLabel: string | null;
  category: Category;
  activityType: 'OFFICIAL' | 'AUTONOMOUS' | null;
  appliedHours: number | null;
  description: string;
  evidenceFileUrl: string | null;
  createdAt: string;
  activityDate?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectedReason: string | null;
  users: User[];
  requests: Request[];
  createdBy?: User | null;
}
