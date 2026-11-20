import api from "./api";
import type { DiscoveryAuth } from "./bleDiscovery";
import type { DiscoveryRegistration, Resolution } from "../types/discovery";
import type {
  Notification,
  PublicUser,
  TransactionPage,
  UserProfile,
  WalletAccount,
  WalletBalance,
} from "../types/api";
import { readExpiresAt, toApiError, unwrapData } from "../utils/apiPayload";
import { resolvedProfiles } from "../utils/discoveryProfile";
import { useUserStore } from "../store/userStore";

const get = async <T>(path: string, params?: object): Promise<T> => {
  try {
    const response = await api.get(path, { params });
    return unwrapData(response.data) as unknown as T;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getMe = () => get<UserProfile>("/users/me");

export const updateProfile = async (
  fields: Partial<
    Pick<UserProfile, "first_name" | "last_name" | "email" | "avatar_url">
  >,
): Promise<UserProfile> => {
  try {
    const response = await api.patch("/users/me", fields);
    return unwrapData(response.data) as unknown as UserProfile;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getPublicUser = (id: string) =>
  get<PublicUser>(`/users/${encodeURIComponent(id)}`);

/** Balance is integer kobo. */
export const getWalletBalance = () => get<WalletBalance>("/wallet/balance");

/** Null until the user has a Squad virtual account (provisioned after KYC). */
export const getWalletAccount = async (): Promise<WalletAccount | null> => {
  try {
    const account = await get<WalletAccount>("/wallet/account");
    return account.virtual_account_number ? account : null;
  } catch (error) {
    const status = (error as { status?: number | null }).status;
    // The API answers 400 ("not provisioned") or 404 when there is no account yet.
    if (status === 400 || status === 404) return null;
    throw error;
  }
};

/** Pages are 1-based; page 0 is silently treated as page 1 by the API. */
export const getTransactions = (page = 1, limit = 10) =>
  get<TransactionPage>("/transactions", { page, limit });

export const getNotifications = () =>
  get<{ notifications?: Notification[]; unread_count?: number }>(
    "/notifications",
  );

export const markNotificationRead = async (id: string) => {
  try {
    await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
  } catch (error) {
    throw toApiError(error);
  }
};

export const markAllNotificationsRead = async () => {
  try {
    await api.patch("/notifications/read-all");
  } catch (error) {
    throw toApiError(error);
  }
};

export const getQrCode = async (signal?: AbortSignal) => {
  try {
    const response = await api.get("/discover/qr", { signal });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
};

/** The server issues the advertised UUID (empty body) and returns it with its expiry. */
export const broadcastDiscovery = async (
  auth: DiscoveryAuth,
): Promise<DiscoveryRegistration> => {
  const response = await api.post(
    "/discover/broadcast",
    {},
    {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    },
  );
  const token = unwrapData(response.data).token;
  const expiresAt = readExpiresAt(response.data);
  if (typeof token !== "string" || expiresAt === null)
    throw new Error("Bluetooth session unavailable. Use QR or retry.");
  return { token, expiresAt };
};

/** Account-wide: also revokes the caller's live QR token. */
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

/** Accepts BLE and QR tokens (`{ token }`). 404 TOKEN_INVALID, 410 TOKEN_EXPIRED. */
export const resolveDiscoveryToken = async (
  token: string,
  signal?: AbortSignal,
) => {
  try {
    const response = await api.post("/discover/resolve", { token }, { signal });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getFraudDetail = (id: string) =>
  get<Record<string, unknown>>(
    `/transactions/${encodeURIComponent(id)}/fraud-detail`,
  );

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
