/**
 * DELETE /discover/broadcast revokes every discovery token the caller owns, including the
 * live QR token. Screens showing a QR subscribe here and re-issue it after each revoke.
 */
const listeners = new Set<() => void>();

export const onDiscoveryRevoked = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifyDiscoveryRevoked = () => {
  listeners.forEach((listener) => listener());
};
