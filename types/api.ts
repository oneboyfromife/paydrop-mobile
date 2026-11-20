/** Response shapes from https://paydrop-backend.onrender.com/docs-json (data payloads, unwrapped). */

export type KycStatus = "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED";

export interface UserProfile {
  id: string;
  phone: string;
  username: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  kyc_verified: boolean;
  tier: number;
  trust_score?: number;
  trust_tier?: string;
  squad_virtual_account: string | null;
  squad_bank_code: string | null;
  wallet?: WalletBalance;
}

export interface PublicUser {
  id: string;
  username: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export interface WalletBalance {
  /** Integer kobo. */
  balance: number;
  currency: string;
}

export interface WalletAccount {
  virtual_account_number: string;
  bank_code: string;
  account_name: string;
  bank_name: string;
}

export interface Transaction {
  id: string;
  sender_id: string;
  recipient_id: string;
  /** Integer kobo, always positive; direction comes from sender_id. */
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | string;
  note: string | null;
  squad_ref: string | null;
  fraud_score: number | null;
  fraud_verdict: "ALLOW" | "FLAG" | "BLOCK" | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionPage {
  transactions: Transaction[];
  total: number;
  page: number;
  limit?: number;
}

export interface Notification {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  read?: boolean;
  is_read?: boolean;
  createdAt?: string;
  created_at?: string;
}

export const isOutgoing = (transaction: Transaction, accountId?: string) =>
  !!accountId && transaction.sender_id === accountId;
