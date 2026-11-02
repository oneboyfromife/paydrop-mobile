import type { DiscoveryProfile } from "./discovery";

export type TransferPhase =
  | "review"
  | "submitting"
  | "flagged"
  | "processing"
  | "unknown"
  | "completed"
  | "failed"
  | "blocked";
export interface RecoveryReference {
  ownerId: string;
  idempotencyKey: string;
  transactionId?: string;
  createdAt: number;
}
export interface TransferIntent extends RecoveryReference {
  recipient: DiscoveryProfile | null;
  amount: number | null;
  note: string;
  phase: TransferPhase;
  flag?: {
    token: string;
    expiresAt: number;
    reason: string;
    score: number | null;
  };
  message?: string;
}
export const isUnresolved = (phase: TransferPhase) =>
  ["submitting", "flagged", "processing", "unknown"].includes(phase);
