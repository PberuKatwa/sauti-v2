import type { ApiResponse } from "./api.types";

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

export interface AuthUser extends BaseUser {
  id: number;
  email: string;
};

export interface LoginUser extends AuthUser {
  password: string;
}

export interface UserProfile extends BaseUser {
  id: number;
  last_name: string;
  email: string;
  role: string;
  created_at: Date;
}

export interface UserApiResponse extends ApiResponse<BaseUser> { };
export interface AuthUserApiResponse extends ApiResponse<AuthUser> { };
export interface ProfileApiResponse extends ApiResponse<UserProfile> { };
