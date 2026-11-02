import { getDeviceId } from "@/lib/deviceId";
import { showToast } from "@/utils/toast";
import axios from "axios";
import { router } from "expo-router";
import { hydrateUserSession, useUserStore } from "../store/userStore";

const api = axios.create({
  baseURL:
    process.env.EXPO_PUBLIC_API_URL ||
    "https://paydrop-backend.onrender.com/api/v1",
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  if (!useUserStore.getState().hasHydrated) await hydrateUserSession();
  if (!useUserStore.getState().hasHydrated)
    throw new Error("Unlock your device and retry secure sign-in.");
  const accessToken = useUserStore.getState().accessToken;
  if (accessToken && !config.headers.Authorization)
    config.headers.Authorization = `Bearer ${accessToken}`;
  config.headers["x-device-id"] = await getDeviceId();
  return config;
});

let refresh: Promise<string> | null = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      !original ||
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.startsWith("/auth/")
    )
      throw error;
    const session = useUserStore.getState();
    // An old account's cleanup must never refresh or invalidate a newer account.
    if (original.headers.Authorization !== `Bearer ${session.accessToken}`)
      throw error;
    original._retry = true;
    if (!refresh) {
      const refreshToken = session.refreshToken;
      const accessToken = session.accessToken;
      refresh = (async () => {
        if (!refreshToken) throw new Error("Session expired");
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
          { timeout: 15000, headers: { "x-device-id": await getDeviceId() } },
        );
        const data = response.data?.data ?? response.data;
        if (
          typeof data?.accessToken !== "string" ||
          typeof data?.refreshToken !== "string"
        )
          throw new Error("Invalid refreshed session");
        if (useUserStore.getState().accessToken !== accessToken)
          throw new Error("Session changed");
        useUserStore.getState().setTokens(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      })()
        .catch((cause) => {
          if (useUserStore.getState().accessToken === accessToken) {
            useUserStore.getState().logout();
            router.replace("/(auth)/login");
            showToast.error(
              "Session Expired",
              "Please login again to continue.",
            );
          }
          throw cause;
        })
        .finally(() => {
          refresh = null;
        });
    }
    const token = await refresh;
    // Financial mutations can only be replayed with the original intent's key.
    if (
      original.url?.startsWith("/transactions/") &&
      !["get", "head"].includes(original.method ?? "") &&
      !original.headers["Idempotency-Key"]
    )
      throw error;
    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  },
);

export default api;
