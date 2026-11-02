import api from "./api";
import { useUserStore } from "../store/userStore";
import {
  clearRecoveryReference,
  saveRecoveryReference,
  useTransferStore,
} from "../store/transferStore";
import { isUnresolved, type TransferIntent } from "../types/transfer";
import { interpretTransferResponse } from "../utils/transferResponse";

let mutation: Promise<void> | null = null;
let recovery: Promise<void> | null = null;
const current = (intent: TransferIntent) =>
  useUserStore.getState().user?.id === intent.ownerId &&
  useTransferStore.getState().active?.idempotencyKey === intent.idempotencyKey;
const submissionEnabled = () =>
  process.env.EXPO_PUBLIC_TRANSFER_CONTRACT_CONFIRMED === "true" &&
  !!process.env.EXPO_PUBLIC_TRANSFER_KEY_LOOKUP_PATH?.startsWith("/") &&
  !!process.env.EXPO_PUBLIC_TRANSFER_KEY_LOOKUP_PATH?.includes(":key");

async function applyResponse(
  intent: TransferIntent,
  data: unknown,
  source: "submit" | "confirm" | "status",
) {
  if (!current(intent)) return;
  const update = interpretTransferResponse(data, source);
  const active = useTransferStore.getState().active!;
  if (!isUnresolved(active.phase)) return;
  if (
    source === "status" &&
    (active.phase === "submitting" ||
      !update.transactionId ||
      (active.transactionId && update.transactionId !== active.transactionId))
  )
    return;
  if (
    (active.amount !== null &&
      update.amount !== undefined &&
      active.amount !== update.amount) ||
    (active.recipient &&
      update.recipient &&
      active.recipient.id !== update.recipient.id)
  ) {
    useTransferStore.setState({
      active: {
        ...active,
        phase: "unknown",
        message:
          "The payment details need verification. Check the original payment reference with support before sending again.",
      },
    });
    return;
  }
  const next = { ...useTransferStore.getState().active!, ...update };
  useTransferStore.setState({ active: next });
  // Keep the old reference if a secure write fails. Recovery remains possible.
  try {
    if (isUnresolved(next.phase)) await saveRecoveryReference(next);
    else await clearRecoveryReference(next.ownerId);
    if (current(intent)) useTransferStore.setState({ recoveryError: null });
  } catch {
    if (current(intent))
      useTransferStore.setState({
        recoveryError:
          "Payment status is available, but secure recovery storage could not be updated.",
      });
  }
}

export const submitTransfer = (): Promise<void> => {
  if (mutation) return mutation;
  const intent = useTransferStore.getState().active;
  if (!submissionEnabled())
    return Promise.reject(
      new Error(
        "Payments are temporarily unavailable. Please try again later.",
      ),
    );
  if (
    !intent ||
    !current(intent) ||
    intent.phase !== "review" ||
    !intent.recipient ||
    !intent.amount
  )
    return Promise.reject(new Error("Review this payment before confirming."));
  mutation = (async () => {
    // Persist before the first network side effect; a restart can recover the same intent.
    useTransferStore.setState({ active: { ...intent, phase: "submitting" } });
    try {
      await saveRecoveryReference(intent);
    } catch {
      if (current(intent))
        useTransferStore.setState({
          active: {
            ...intent,
            phase: "review",
            message: "Unable to save payment recovery securely. Please retry.",
          },
        });
      return;
    }
    if (!current(intent)) return;
    try {
      const response = await api.post(
        "/transactions/transfer",
        {
          recipient_id: intent.recipient!.id,
          amount: intent.amount,
          ...(intent.note ? { note: intent.note } : {}),
        },
        { headers: { "Idempotency-Key": intent.idempotencyKey } },
      );
      await applyResponse(intent, response.data, "submit");
    } catch {
      if (current(intent))
        useTransferStore.setState({
          active: {
            ...useTransferStore.getState().active!,
            phase: "unknown",
            message:
              "We could not confirm the payment outcome. Check status before making another payment.",
          },
        });
    }
  })().finally(() => {
    mutation = null;
  });
  return mutation;
};

export const confirmFlaggedTransfer = (): Promise<void> => {
  if (mutation) return mutation;
  if (!submissionEnabled())
    return Promise.reject(
      new Error(
        "Payments are temporarily unavailable. Please try again later.",
      ),
    );
  const intent = useTransferStore.getState().active;
  if (
    !intent ||
    !current(intent) ||
    intent.phase !== "flagged" ||
    !intent.flag ||
    intent.flag.expiresAt <= Date.now()
  )
    return Promise.reject(new Error("Approval expired. Check payment status."));
  mutation = (async () => {
    useTransferStore.setState({ active: { ...intent, phase: "submitting" } });
    try {
      await saveRecoveryReference(intent);
    } catch {
      if (current(intent))
        useTransferStore.setState({
          active: {
            ...intent,
            message: "Unable to save payment recovery securely. Please retry.",
          },
        });
      return;
    }
    if (!current(intent)) return;
    try {
      const response = await api.post(
        "/transactions/transfer/confirm",
        { confirm_token: intent.flag!.token },
        { headers: { "Idempotency-Key": `${intent.idempotencyKey}.confirm` } },
      );
      await applyResponse(intent, response.data, "confirm");
    } catch {
      if (current(intent))
        useTransferStore.setState({
          active: {
            ...useTransferStore.getState().active!,
            flag: undefined,
            phase: "unknown",
            message:
              "Approval outcome is being verified. Check status before retrying.",
          },
        });
    }
  })().finally(() => {
    mutation = null;
  });
  return mutation;
};

/** Lookup by key is opt-in until the backend freezes the proposed route. Never POST a recovery. */
export const recoverTransfer = (): Promise<void> => {
  if (recovery) return recovery;
  const intent = useTransferStore.getState().active;
  if (
    !intent ||
    !current(intent) ||
    !isUnresolved(intent.phase) ||
    intent.phase === "submitting"
  )
    return Promise.resolve();
  const template = intent.transactionId
    ? process.env.EXPO_PUBLIC_TRANSFER_STATUS_PATH || "/transactions/:id"
    : process.env.EXPO_PUBLIC_TRANSFER_KEY_LOOKUP_PATH;
  if (!template) {
    useTransferStore.setState({
      active: {
        ...intent,
        message:
          "This payment is still being verified. Check your history or contact support with the payment reference before trying again.",
      },
    });
    return Promise.resolve();
  }
  const path = template
    .replace(":id", encodeURIComponent(intent.transactionId ?? ""))
    .replace(":key", encodeURIComponent(intent.idempotencyKey));
  recovery = (async () => {
    try {
      const response = await api.get(path);
      await applyResponse(intent, response.data, "status");
    } catch {
      /* A 404, timeout, or transport failure never proves that a debit failed. */
    }
  })().finally(() => {
    recovery = null;
  });
  return recovery;
};
