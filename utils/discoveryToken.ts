const UUID_RE =
  /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** Normalize to lowercase hyphenated UUID when possible. */
export const normalizeDiscoveryToken = (value: string): string => {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) return trimmed;

  const hex = trimmed.replace(/-/g, "").toLowerCase();
  if (hex.length !== 32) return trimmed.toLowerCase();

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Extract a discovery token from raw QR / deep-link / manual input.
 * Handles paydrop:// URLs, paydrop: tokens, JSON payloads, and plain UUIDs.
 */
export const extractDiscoveryToken = (raw: string): string | null => {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  if (UUID_RE.test(trimmed)) {
    return normalizeDiscoveryToken(trimmed);
  }

  const lower = trimmed.toLowerCase();

  if (lower.startsWith("paydrop:") && !lower.startsWith("paydrop://")) {
    const payload = trimmed.slice("paydrop:".length).trim();
    if (!payload) return null;
    if (UUID_RE.test(payload)) return normalizeDiscoveryToken(payload);
    return payload;
  }

  // paydrop://discover?token=... (custom scheme)
  if (lower.startsWith("paydrop://")) {
    try {
      const url = new URL(trimmed);
      const fromQuery =
        url.searchParams.get("token") ||
        url.searchParams.get("t") ||
        url.searchParams.get("id");
      if (fromQuery) {
        return UUID_RE.test(fromQuery)
          ? normalizeDiscoveryToken(fromQuery)
          : fromQuery.trim();
      }
    } catch {
      // fall through
    }
  }

  try {
    const url = new URL(trimmed);
    const fromQuery =
      url.searchParams.get("token") ||
      url.searchParams.get("t") ||
      url.searchParams.get("id");
    if (fromQuery) {
      return UUID_RE.test(fromQuery)
        ? normalizeDiscoveryToken(fromQuery)
        : fromQuery.trim();
    }
    const pathPart = url.pathname.split("/").filter(Boolean).pop();
    if (pathPart && UUID_RE.test(pathPart)) {
      return normalizeDiscoveryToken(pathPart);
    }
  } catch {
    // Not a URL — continue
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const candidate =
        parsed?.token ||
        parsed?.qr ||
        parsed?.payload ||
        parsed?.data?.token ||
        parsed?.data?.qr;
      if (typeof candidate === "string" && candidate.trim()) {
        return extractDiscoveryToken(candidate);
      }
    } catch {
      // ignore invalid JSON
    }
  }

  // Alphanumeric discovery codes (e.g. PD-123-456)
  if (/^[a-zA-Z0-9._:-]+$/.test(trimmed) && trimmed.length >= 6) {
    return trimmed;
  }

  return null;
};

export const isValidBleServiceUuid = (token: string): boolean =>
  UUID_RE.test(token);
