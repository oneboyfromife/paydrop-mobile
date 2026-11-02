import { extractDiscoveryToken } from "./discoveryToken";

/** Value to encode inside the QR image (from API). */
export const getQrCodeValue = (qrData: unknown): string | null => {
  if (!qrData) return null;
  if (typeof qrData === "string" && qrData.trim()) return qrData.trim();

  const record = qrData as Record<string, unknown>;
  const candidates = [
    record.qr,
    record.payload,
    record.code,
    record.token,
    record.discovery_token,
    record.data,
    (record.data as Record<string, unknown> | undefined)?.qr,
    (record.data as Record<string, unknown> | undefined)?.payload,
    (record.data as Record<string, unknown> | undefined)?.code,
    (record.data as Record<string, unknown> | undefined)?.token,
    (record.data as Record<string, unknown> | undefined)?.discovery_token,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
};

/** Token to register with /discover/broadcast and /discover/resolve. */
export const getDiscoveryTokenFromQrResponse = (
  qrData: unknown,
): string | null => {
  if (!qrData) return null;

  const record = qrData as Record<string, unknown>;
  const directCandidates = [
    record.token,
    record.discovery_token,
    record.session_token,
    (record.data as Record<string, unknown> | undefined)?.token,
    (record.data as Record<string, unknown> | undefined)?.discovery_token,
    (record.data as Record<string, unknown> | undefined)?.session_token,
  ];

  for (const value of directCandidates) {
    if (typeof value === "string" && value.trim()) {
      return extractDiscoveryToken(value) ?? value.trim();
    }
  }

  const qrValue = getQrCodeValue(qrData);
  if (qrValue) return extractDiscoveryToken(qrValue);

  return null;
};
