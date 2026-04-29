import type { ApiResponse } from "./api.types";
import type { UserRoles } from "./authSession.types";

export type UserStatus = 'active' | 'trash' | 'pending';

export interface BaseUser {
  id: number;
  first_name: string;
}

export interface AuthUser extends BaseUser {
  email: string;
  role: UserRoles;
};

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UpdateUserDetailsPayload {
  userId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRoles;
  status?: UserStatus;
}

export interface BaseUserFilters {
  firstName?: string;
  lastName?: string;
  email?: string
}

export interface LoginUser extends AuthUser {
  password: string;
}

export interface UserProfile extends BaseUser {
  last_name: string;
  email: string;
  role: string;
  status: UserStatus;
  created_at: Date;
}

export interface AllUsers {
  users: UserProfile[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface UserApiResponse extends ApiResponse<BaseUser> { };
export interface AuthUserApiResponse extends ApiResponse<AuthUser> { };
export interface ProfileApiResponse extends ApiResponse<UserProfile> { };
export interface AllUsersApiResponse extends ApiResponse<AllUsers> { };
