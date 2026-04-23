export type TokenPurpose = 'reset_password' | 'verify_email';

export interface BaseVerifyToken {
  id: number;
  purpose: TokenPurpose;
  expires_at: string;
}

export interface TokenMailPayload extends BaseVerifyToken {
  recipientEmail:string;
}

export interface VerifyTokenProfile extends BaseVerifyToken {
  user_id: number;
  is_used: boolean;
}
