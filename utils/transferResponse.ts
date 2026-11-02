import type { TransferIntent } from "../types/transfer";
import { unwrapData, asRecord, readExpiresAt } from "./apiPayload";
import { parseDiscoveryProfile } from "./discoveryProfile";

export const interpretTransferResponse = (
  value: unknown,
  source: "submit" | "confirm" | "status",
  now = Date.now(),
): Partial<TransferIntent> => {
  const body = unwrapData(value);
  const record = body.transaction ? asRecord(body.transaction) : body;
  const text = (key: string) =>
    typeof record[key] === "string" ? (record[key] as string) : undefined;
  const transactionId = text("id") ?? text("transaction_id");
  const verdict = (text("verdict") ?? text("fraud_verdict"))?.toUpperCase();
  const status = text("status")?.toUpperCase();
  const message = text("fraud_reason") ?? text("message");
  const recipient = parseDiscoveryProfile(record.recipient);
  const result: Partial<TransferIntent> = {
    ...(transactionId ? { transactionId } : {}),
    message,
    ...(recipient ? { recipient } : {}),
    ...(typeof record.amount === "number" &&
    Number.isSafeInteger(record.amount) &&
    record.amount > 0
      ? { amount: record.amount }
      : {}),
  };
  if (verdict === "BLOCK")
    return {
      ...result,
      phase: "blocked",
      message: message || "Payment was blocked by the server.",
    };
  if (verdict === "FLAG" && status !== "COMPLETED") {
    const token = text("confirm_token");
    const expiresAt = readExpiresAt(record, now);
    if (token && expiresAt && expiresAt > now)
      return {
        ...result,
        phase: "flagged",
        flag: {
          token,
          expiresAt,
          reason: message || "Please review this payment before proceeding.",
          score:
            typeof record.fraud_score === "number" ? record.fraud_score : null,
        },
      };
    return {
      ...result,
      phase: "unknown",
      message:
        "Approval details are unavailable or expired. Check the original payment status.",
    };
  }
  if (source === "submit" && verdict !== "ALLOW")
    return {
      ...result,
      phase: "unknown",
      message: "Payment outcome is being verified.",
    };
  if (status === "COMPLETED" && transactionId)
    return { ...result, phase: "completed", flag: undefined };
  if (["FAILED", "REJECTED", "CANCELLED"].includes(status ?? ""))
    return {
      ...result,
      phase: "failed",
      flag: undefined,
      message:
        message || "The server confirmed that this payment did not complete.",
    };
  return {
    ...result,
    phase: "processing",
    flag: undefined,
  };
};
