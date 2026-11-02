import api from "./api";
import type { DiscoveryAuth } from "./bleDiscovery";
import type { DiscoveryRegistration, Resolution } from "../types/discovery";
import { readExpiresAt } from "../utils/apiPayload";
import { resolvedProfiles } from "../utils/discoveryProfile";
import { useUserStore } from "../store/userStore";

export const getMe = async () => {
  try {
    const response = await api.get("/users/me");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const getWalletBalance = async () => {
  try {
    const response = await api.get("/wallet/balance");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const getTransactions = async (page = 1, limit = 10) => {
  try {
    const response = await api.get("/transactions", {
      params: { page, limit },
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const getQrCode = async (signal?: AbortSignal) => {
  try {
    const response = await api.get("/discover/qr", { signal });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const broadcastDiscovery = async (
  { token }: { token: string },
  auth: DiscoveryAuth,
): Promise<DiscoveryRegistration> => {
  const response = await api.post(
    "/discover/broadcast",
    { token },
    {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    },
  );
  const expiresAt = readExpiresAt(response.data);
  if (expiresAt === null)
    throw new Error("Bluetooth session expiry unavailable. Use QR or retry.");
  return { expiresAt };
};

export const stopDiscoveryBroadcast = async (auth: DiscoveryAuth) => {
  const current = useUserStore.getState();
  const accessToken =
    current.user?.id === auth.accountId && current.accessToken
      ? current.accessToken
      : auth.accessToken;
  await api.delete("/discover/broadcast", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

/** Backend expects `{ token }` (singular), not `{ tokens: [] }`. */
export const resolveDiscoveryToken = async (
  token: string,
  signal?: AbortSignal,
) => {
  try {
    const response = await api.post("/discover/resolve", { token }, { signal });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const getFraudDetail = async (id: string) => {
  try {
    const response = await api.get(`/transactions/${id}/fraud-detail`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const resolveObservedToken = async (
  token: string,
  signal: AbortSignal,
): Promise<Resolution> => {
  try {
    const response = await api.post("/discover/resolve", { token }, { signal });
    const user = resolvedProfiles(response.data)[0];
    return user ? { kind: "resolved", user } : { kind: "invalid" };
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } }).response
      ?.status;
    return status === 404 || status === 410
      ? { kind: "invalid" }
      : { kind: "retry" };
  }
};

export const getNotifications = async () => {
  try {
    const response = await api.get("/notifications");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};
