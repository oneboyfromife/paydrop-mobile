import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { secureStorage } from "../lib/secureStorage";

interface UserState {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasHydrated: boolean;
  storageError: string | null;
  setUser(user: any | null): void;
  setTokens(accessToken: string | null, refreshToken: string | null): void;
  logout(): void;
}
const SESSION_KEY = "paydrop.session.v2";
let version = 0;
const persistSession = () => {
  const currentVersion = ++version;
  const { accessToken, refreshToken, user } = useUserStore.getState();
  const value = accessToken
    ? JSON.stringify({
        accessToken,
        refreshToken,
        user: user?.id ? { id: user.id } : null,
      })
    : null;
  void secureStorage.set(SESSION_KEY, value).catch(() => {
    if (version === currentVersion)
      useUserStore.setState({
        accessToken: null,
        refreshToken: null,
        user: null,
        storageError: "Unable to save your session securely. Please retry.",
      });
  });
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hasHydrated: false,
  storageError: null,
  setUser: (user) => {
    set({ user });
    persistSession();
  },
  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken, storageError: null });
    persistSession();
  },
  logout: () => {
    set({ user: null, accessToken: null, refreshToken: null });
    persistSession();
    void AsyncStorage.removeItem("user-storage").catch(() => {});
  },
}));

let hydration: Promise<void> | null = null;
export const hydrateUserSession = () =>
  (hydration ??= (async () => {
    const initialVersion = version;
    try {
      let stored = await secureStorage.get(SESSION_KEY);
      const legacy = await AsyncStorage.getItem("user-storage");
      if (!stored && legacy) {
        const state = JSON.parse(legacy)?.state;
        if (typeof state?.accessToken === "string") {
          stored = JSON.stringify({
            accessToken: state.accessToken,
            refreshToken: state.refreshToken,
            user: state.user?.id ? { id: state.user.id } : null,
          });
          await secureStorage.set(SESSION_KEY, stored);
        }
      }
      // Credentials are never persisted to AsyncStorage again.
      await AsyncStorage.removeItem("user-storage");
      const data = stored ? JSON.parse(stored) : null;
      if (version === initialVersion)
        useUserStore.setState({
          accessToken:
            typeof data?.accessToken === "string" ? data.accessToken : null,
          refreshToken:
            typeof data?.refreshToken === "string" ? data.refreshToken : null,
          user:
            typeof data?.user?.id === "string" ? { id: data.user.id } : null,
          hasHydrated: true,
          storageError: null,
        });
    } catch {
      useUserStore.setState({
        hasHydrated: false,
        storageError:
          "Unable to open secure storage. Unlock your device and retry.",
      });
    } finally {
      hydration = null;
    }
  })());
