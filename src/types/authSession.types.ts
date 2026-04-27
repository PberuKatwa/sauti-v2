export type UserRoles = 'super_admin' | 'admin' | 'basic' | 'demo';

export interface BaseAuthSession {
  id: string;
  user_id: number;
  user_role: UserRoles;
}
