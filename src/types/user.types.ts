import type { ApiResponse } from "./api.types";
import type { UserRoles } from "./authSession.types";

export type UserStatus = 'active' | 'trash' | 'pending';

export interface BaseUser {
  first_name: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UpdateUserPayload{
  id: number;
  firstName: string;
  lastName: string;
}

export interface UpdateUserDetailsPayload {
  userId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRoles;
  status?: UserStatus;
}

export interface AuthUser extends BaseUser {
  id: number;
  email: string;
  first_name: string;
  role: UserRoles;
};

export interface BaseUserFilters {
  firstName?: string;
  lastName?: string;
  email?: string
}

export interface LoginUser extends AuthUser {
  password: string;
}

export interface UserProfile extends BaseUser {
  id: number;
  last_name: string;
  email: string;
  role: string;
  status: UserStatus;
  created_at: Date;
}

export interface UserApiResponse extends ApiResponse<BaseUser> { };
export interface AuthUserApiResponse extends ApiResponse<AuthUser> { };
export interface ProfileApiResponse extends ApiResponse<UserProfile> { };

export interface AllUsers {
  users: UserProfile[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface AllUsersApiResponse extends ApiResponse<AllUsers> { };
