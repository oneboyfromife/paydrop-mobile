export const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const unwrapData = (value: unknown): Record<string, unknown> => {
  const record = asRecord(value);
  return record.data !== undefined ? asRecord(record.data) : record;
};

/** Backend error envelope: `{ success: false, code, message, details }`. */
export interface ApiError {
  status: number | null;
  code: string | null;
  message: string;
  details: Record<string, unknown>;
}

export const toApiError = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ApiError => {
  const record = asRecord(error);
  const response = asRecord(record.response);
  const body = asRecord(response.data);
  const status = typeof response.status === "number" ? response.status : null;
  const isAxios = record.isAxiosError === true;
  const timedOut =
    record.code === "ECONNABORTED" || record.code === "ETIMEDOUT";
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message
      : status !== null
        ? fallback
        : timedOut
          ? "The server is taking too long to respond. Please try again in a moment."
          : !isAxios &&
              typeof record.message === "string" &&
              record.message.trim()
            ? // App-side failures (e.g. secure storage locked) keep their own message.
              record.message
            : "Check your connection and try again.";
  return {
    status,
    code: typeof body.code === "string" ? body.code : null,
    message,
    details: asRecord(body.details),
  };
};

/** Only server-supplied validity can enable an expiring session. */
export const readExpiresAt = (
  value: unknown,
  receivedAt = Date.now(),
): number | null => {
  const record = unwrapData(value);
  const outer = asRecord(value);
  const expires = record.expires_at ?? outer.expires_at;
  if (typeof expires === "string") {
    const parsed = Date.parse(expires);
    if (Number.isFinite(parsed)) return parsed;
  }
  const ttl = record.ttl ?? record.expires_in ?? outer.ttl ?? outer.expires_in;
  return typeof ttl === "number" && Number.isFinite(ttl) && ttl > 0
    ? receivedAt + ttl * 1000
    : null;
};
