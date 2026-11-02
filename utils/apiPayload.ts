export const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const unwrapData = (value: unknown): Record<string, unknown> => {
  const record = asRecord(value);
  return record.data !== undefined ? asRecord(record.data) : record;
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
