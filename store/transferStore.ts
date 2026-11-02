import * as Crypto from "expo-crypto";
import { create } from "zustand";
import { secureStorage } from "../lib/secureStorage";
import type { DiscoveryProfile } from "../types/discovery";
import {
  isUnresolved,
  type RecoveryReference,
  type TransferIntent,
} from "../types/transfer";
import { isValidBleServiceUuid } from "../utils/discoveryToken";

const recoveryKey = (ownerId: string) =>
  `paydrop.transfer.${Array.from(ownerId)
    .map((char) => char.codePointAt(0)!.toString(16))
    .join("-")}`;
let accountVersion = 0;
interface TransferStore {
  recipient: DiscoveryProfile | null;
  active: TransferIntent | null;
  hydrated: boolean;
  recoveryError: string | null;
  selectRecipient(recipient: DiscoveryProfile): void;
  review(ownerId: string, amount: number, note: string): void;
}
export const useTransferStore = create<TransferStore>((set, get) => ({
  recipient: null,
  active: null,
  hydrated: false,
  recoveryError: null,
  selectRecipient: (recipient) => set({ recipient }),
  review(ownerId, amount, note) {
    const { active, recipient, hydrated } = get();
    if (!hydrated) throw new Error("Checking previous payments. Please wait.");
    if (active && isUnresolved(active.phase))
      throw new Error("Check your pending payment before starting another.");
    if (!ownerId || !recipient || !Number.isSafeInteger(amount) || amount <= 0)
      throw new Error("Review a recipient and a valid amount first.");
    set({
      active: {
        ownerId,
        recipient,
        amount,
        note: note.trim(),
        idempotencyKey: Crypto.randomUUID(),
        createdAt: Date.now(),
        phase: "review",
      },
    });
  },
}));

export const saveRecoveryReference = async (intent: TransferIntent) => {
  const reference: RecoveryReference = {
    ownerId: intent.ownerId,
    idempotencyKey: intent.idempotencyKey,
    transactionId: intent.transactionId,
    createdAt: intent.createdAt,
  };
  await secureStorage.set(
    recoveryKey(intent.ownerId),
    JSON.stringify(reference),
  );
};
export const clearRecoveryReference = (ownerId: string) =>
  secureStorage.set(recoveryKey(ownerId), null);

let load: { ownerId: string; promise: Promise<void> } | null = null;
export const hydrateTransferRecovery = (ownerId: string): Promise<void> => {
  if (load?.ownerId === ownerId) return load.promise;
  const version = accountVersion;
  const promise = (async () => {
    try {
      const raw = await secureStorage.get(recoveryKey(ownerId));
      if (version !== accountVersion) return;
      const value = raw ? (JSON.parse(raw) as RecoveryReference) : null;
      if (
        raw &&
        (!value ||
          value.ownerId !== ownerId ||
          typeof value.idempotencyKey !== "string" ||
          !isValidBleServiceUuid(value.idempotencyKey) ||
          !Number.isFinite(value.createdAt) ||
          (value.transactionId !== undefined &&
            (typeof value.transactionId !== "string" || !value.transactionId)))
      ) {
        throw new Error("Invalid recovery reference");
      }
      if (
        value &&
        typeof value.idempotencyKey === "string" &&
        typeof value.createdAt === "number"
      ) {
        useTransferStore.setState({
          active: {
            ...value,
            recipient: null,
            amount: null,
            note: "",
            phase: "unknown",
          },
        });
      }
      useTransferStore.setState({ hydrated: true, recoveryError: null });
    } catch {
      if (version !== accountVersion) return;
      useTransferStore.setState({
        hydrated: false,
        recoveryError:
          "Unable to check previous payments securely. Unlock your device and retry.",
      });
    } finally {
      if (load?.ownerId === ownerId) load = null;
    }
  })();
  load = { ownerId, promise };
  return promise;
};

export const resetTransferMemory = () => {
  accountVersion++;
  load = null;
  useTransferStore.setState({
    active: null,
    recipient: null,
    hydrated: false,
    recoveryError: null,
  });
};
