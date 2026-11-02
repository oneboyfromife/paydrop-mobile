import type { QueryClient } from "@tanstack/react-query";
import { recoverTransfer } from "./transfers";
import { Platform } from "react-native";

type NativeWebSocket = new (
  url: string,
  protocols: string[],
  options: { headers: Record<string, string> },
) => WebSocket;

/** Optional, explicitly configured JSON WebSocket transport; no /ws protocol is assumed. */
export const connectRealtime = (
  accessToken: string,
  queryClient: QueryClient,
) => {
  const url = process.env.EXPO_PUBLIC_REALTIME_URL;
  if (!url || !url.startsWith("wss://") || Platform.OS === "web")
    return () => {};
  let stopped = false;
  let socket: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  const seen = new Set<string>();
  const connect = () => {
    if (stopped) return;
    let connection: WebSocket;
    try {
      connection = new (WebSocket as unknown as NativeWebSocket)(url, [], {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      timer = setTimeout(
        connect,
        Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)),
      );
      return;
    }
    socket = connection;
    connection.onopen = () => {
      if (!stopped && socket === connection) {
        attempt = 0;
        void recoverTransfer();
      }
    };
    connection.onmessage = (event) => {
      if (stopped || socket !== connection) return;
      try {
        const data: unknown = JSON.parse(String(event.data));
        if (!data || typeof data !== "object") return;
        const record = data as Record<string, unknown>;
        if (
          ![
            "balance.updated",
            "transaction.updated",
            "payment.received",
          ].includes(String(record.type))
        )
          return;
        if (typeof record.id === "string") {
          if (seen.has(record.id)) return;
          seen.add(record.id);
          if (seen.size > 200) seen.delete(seen.values().next().value!);
        }
        // Events are hints. REST remains authoritative, including unordered updates.
        void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
        void queryClient.invalidateQueries({ queryKey: ["transactions"] });
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        void recoverTransfer();
      } catch {
        /* Ignore malformed transport messages. */
      }
    };
    connection.onerror = () => connection.close();
    connection.onclose = () => {
      if (!stopped && socket === connection)
        timer = setTimeout(
          connect,
          Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)),
        );
    };
  };
  connect();
  return () => {
    stopped = true;
    clearTimeout(timer);
    socket?.close();
  };
};
