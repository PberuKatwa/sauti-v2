export type TokenPurpose = 'reset_password' | 'verify_email';

export interface BaseVerifyToken {
  id: number;
  token: string;
  purpose: TokenPurpose;
  recipientEmail:string;
}

export interface VerifyTokenProfile {
  id: number;
  user_id: number;
  expires_at: string;
  is_used: boolean;
  purpose: TokenPurpose;
}
