import { asRecord, toApiError, unwrapData } from "../utils/apiPayload";
import api from "./api";

export type OtpIntent = "login" | "signup";
export type Availability = "available" | "taken" | "invalid";

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown> & { id: string };
}

export interface SignupProfile {
  first_name: string;
  last_name: string;
  username: string;
  email?: string;
}

export interface TestAccount {
  index: number;
  phone: string;
  username: string;
  first_name: string;
  last_name: string;
}

/** Canonical session from verify-otp / test-login: data.{accessToken, refreshToken, user}. */
export const parseSession = (body: unknown): Session => {
  const data = unwrapData(body);
  const user = asRecord(data.user);
  if (
    typeof data.accessToken !== "string" ||
    typeof data.refreshToken !== "string" ||
    typeof user.id !== "string"
  )
    throw {
      status: null,
      code: "INVALID_SESSION",
      message: "The server returned an incomplete session. Please try again.",
      details: {},
    };
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: user as Session["user"],
  };
};

export const checkAvailability = async (fields: {
  phone?: string;
  email?: string;
  username?: string;
}): Promise<Record<"phone" | "email" | "username", Availability | undefined>> => {
  try {
    const response = await api.post("/auth/check-availability", fields);
    return unwrapData(response.data) as Record<string, Availability>;
  } catch (error) {
    throw toApiError(error);
  }
};

/** Returns the resend cooldown in seconds. */
export const requestOtp = async (
  intent: OtpIntent,
  phone: string,
): Promise<{ resendAfter: number }> => {
  try {
    const response = await api.post("/auth/request-otp", { intent, phone });
    const data = unwrapData(response.data);
    return {
      resendAfter:
        typeof data.resend_after === "number" ? data.resend_after : 60,
    };
  } catch (error) {
    throw toApiError(error);
  }
};

export const verifyOtp = async (
  request: { intent: OtpIntent; phone: string; otp: string } & Partial<SignupProfile>,
): Promise<Session> => {
  try {
    const response = await api.post("/auth/verify-otp", request);
    return parseSession(response.data);
  } catch (error) {
    if ((error as { code?: string }).code === "INVALID_SESSION") throw error;
    throw toApiError(error);
  }
};

export const refreshTokens = async (refreshToken: string) => {
  try {
    const response = await api.post("/auth/refresh", { refreshToken });
    return unwrapData(response.data);
  } catch (error) {
    throw toApiError(error);
  }
};

/** Best-effort server-side revocation; local logout must never wait on or fail because of it. */
export const logoutSession = async (refreshToken: string | null) => {
  if (!refreshToken) return;
  try {
    await api.post("/auth/logout", { refreshToken }, { timeout: 5000 });
  } catch {
    /* Always 204 server-side; network failures are ignored. */
  }
};

/** Only offered when EXPO_PUBLIC_AUTH_TEST_MODE=true. */
export const isTestAuthEnabled = () =>
  process.env.EXPO_PUBLIC_AUTH_TEST_MODE === "true";

export const getTestAccounts = async (): Promise<TestAccount[]> => {
  try {
    const response = await api.get("/auth/test-accounts");
    const accounts = unwrapData(response.data).accounts;
    return Array.isArray(accounts) ? (accounts as TestAccount[]) : [];
  } catch (error) {
    throw toApiError(error);
  }
};

export const testLogin = async (account: string): Promise<Session> => {
  try {
    const response = await api.post("/auth/test-login", { account });
    return parseSession(response.data);
  } catch (error) {
    if ((error as { code?: string }).code === "INVALID_SESSION") throw error;
    throw toApiError(error);
  }
};
