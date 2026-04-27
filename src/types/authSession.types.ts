import { Request } from "express";

export type UserRoles = 'super_admin' | 'admin' | 'basic' | 'demo';

export interface BaseAuthSession {
  id: string;
  user_id: number;
  user_role: UserRoles;
}

export interface UserAuthSession {
  userId: number;
  sessionId: number;
  userRole: UserRoles;
}

export interface RequestWithUser extends Request {
  user: BaseAuthSession;
}
