import { useIsFocused } from "@react-navigation/native";
import { useEffect, useSyncExternalStore } from "react";
import { bleDiscovery } from "../services/bleNative";
import { useUserStore } from "../store/userStore";
import type { DiscoveryMode } from "../types/discovery";

export type { NearbyUser } from "../types/discovery";

export const useBLEDiscovery = (mode: DiscoveryMode, enabled = true) => {
  const isFocused = useIsFocused();
  const accountId = useUserStore((state) => state.user?.id);
  const authenticated = useUserStore(
    (state) => !!state.accessToken && state.hasHydrated,
  );
  const snapshot = useSyncExternalStore(
    bleDiscovery.subscribe,
    bleDiscovery.getSnapshot,
    bleDiscovery.getSnapshot,
  );
  useEffect(() => {
    if (enabled && isFocused && authenticated && accountId)
      return bleDiscovery.acquire(mode);
  }, [mode, enabled, isFocused, authenticated, accountId]);
  return {
    ...snapshot,
    retry: bleDiscovery.retry,
    refreshPermissions: bleDiscovery.retry,
  };
};
