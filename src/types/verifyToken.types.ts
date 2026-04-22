export type TokenPurpose = 'reset_password' | 'verify_email';

export interface BaseVerifyToken {
  id: number;
  token: string;
  purpose: TokenPurpose;
}
