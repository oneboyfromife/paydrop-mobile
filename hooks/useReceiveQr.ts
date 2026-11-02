import { useIsFocused } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getQrCode } from "../services/user";
import { useUserStore } from "../store/userStore";
import { readExpiresAt } from "../utils/apiPayload";
import { getQrCodeValue } from "../utils/qrPayload";
import { useForeground } from "./useForeground";

export const useReceiveQr = (enabled = true) => {
  const focused = useIsFocused();
  const foreground = useForeground();
  const accountId = useUserStore((state) => state.user?.id);
  const accessToken = useUserStore((state) => state.accessToken);
  const [now, setNow] = useState(Date.now());
  const active = enabled && focused && foreground && !!accessToken;
  const query = useQuery({
    queryKey: ["qr-code", accountId],
    enabled: active,
    queryFn: async ({ signal }) => {
      const raw = await getQrCode(signal);
      const payload = getQrCodeValue(raw);
      const expiresAt = readExpiresAt(raw);
      if (!payload || !expiresAt || expiresAt <= Date.now())
        throw new Error("A valid receiving code is unavailable. Please retry.");
      return { payload, expiresAt };
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(10000, 1000 * 2 ** attempt),
    refetchOnMount: "always",
    refetchInterval: (query) =>
      query.state.error
        ? 10000
        : Math.max(
            5000,
            (query.state.data?.expiresAt ?? Date.now() + 20000) -
              Date.now() -
              10000,
          ),
  });
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return {
    qrPayload:
      active && query.data && query.data.expiresAt > Math.max(now, Date.now())
        ? query.data.payload
        : "",
    qrTTL: query.data
      ? Math.max(0, Math.ceil((query.data.expiresAt - now) / 1000))
      : null,
    qrLoading: query.isLoading,
    qrRefreshing: query.isFetching,
    qrError: query.error,
    refreshQrCode: query.refetch,
  };
};
