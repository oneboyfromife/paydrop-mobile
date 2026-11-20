import { logoutSession, type Session } from "../services/auth";
import { useAppState } from "../store/appState";
import { useUserStore } from "../store/userStore";

/** Shared by OTP verification and dev test-login. */
export const startSession = (session: Session) => {
  const store = useUserStore.getState();
  store.setTokens(session.accessToken, session.refreshToken);
  store.setUser(session.user);
  useAppState.getState().setOnboardingCompleted(true);
};

/** Clears the device immediately, then revokes the refresh token server-side (best effort). */
export const endSession = () => {
  const { refreshToken } = useUserStore.getState();
  useUserStore.getState().logout();
  void logoutSession(refreshToken);
};
