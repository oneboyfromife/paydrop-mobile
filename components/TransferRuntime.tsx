import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useForeground } from "../hooks/useForeground";
import { bleDiscovery } from "../services/bleNative";
import { connectRealtime } from "../services/realtime";
import { recoverTransfer } from "../services/transfers";
import {
  hydrateTransferRecovery,
  resetTransferMemory,
  useTransferStore,
} from "../store/transferStore";
import { useUserStore } from "../store/userStore";
import { isUnresolved } from "../types/transfer";

export default function TransferRuntime() {
  const queryClient = useQueryClient();
  const accessToken = useUserStore((state) => state.accessToken);
  const accountId = useUserStore(
    (state) => state.user?.id as string | undefined,
  );
  const phase = useTransferStore((state) => state.active?.phase);
  const previousAccount = useRef<string | undefined>(undefined);
  const foreground = useForeground();
  useEffect(() => {
    if (previousAccount.current !== accountId || !accessToken) {
      void queryClient.cancelQueries();
      queryClient.clear();
      resetTransferMemory();
    }
    previousAccount.current = accountId;
    if (accountId && accessToken) void hydrateTransferRecovery(accountId);
  }, [accountId, !!accessToken, queryClient]);
  useEffect(() => {
    bleDiscovery.setContext(
      accountId && accessToken ? { accountId, accessToken } : null,
      foreground,
    );
    return () => bleDiscovery.setContext(null, false);
  }, [accountId, accessToken, foreground]);
  useEffect(() => {
    if (!foreground || !accessToken) return;
    return connectRealtime(accessToken, queryClient);
  }, [foreground, accessToken, queryClient]);
  useEffect(() => {
    if (
      !foreground ||
      !accessToken ||
      !accountId ||
      !phase ||
      !isUnresolved(phase)
    )
      return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const poll = async () => {
      await recoverTransfer();
      if (!stopped)
        timer = setTimeout(poll, Math.min(30000, 10000 * 2 ** attempt++));
    };
    // Recover immediately after foreground/restart; submissions get a 10s grace period.
    timer = setTimeout(poll, phase === "unknown" ? 0 : 10000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [foreground, accessToken, accountId, phase]);
  useEffect(() => {
    if (phase === "completed" || phase === "failed" || phase === "blocked") {
      void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    }
  }, [phase, queryClient]);
  return null;
}
