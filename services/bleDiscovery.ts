import type {
  DiscoveryMode,
  DiscoveryRegistration,
  NearbyUser,
  Resolution,
} from "../types/discovery";
import {
  isValidBleServiceUuid,
  normalizeDiscoveryToken,
} from "../utils/discoveryToken";

export interface DiscoveryAuth {
  accountId: string;
  accessToken: string;
}
export interface DiscoverySnapshot {
  nearbyUsers: NearbyUser[];
  isScanning: boolean;
  isAdvertising: boolean;
  isStarting: boolean;
  error: string | null;
  resolutionError: string | null;
}
export interface DiscoveryDriver {
  prepare(mode: DiscoveryMode): Promise<void>;
  startScan(
    observe: (uuids: string[], rssi: number | null) => void,
    fail: (error: Error) => void,
  ): void | Promise<void>;
  stopScan(): void | Promise<void>;
  advertise(token: string): Promise<void>;
  stopAdvertising(): Promise<void>;
  register(token: string, auth: DiscoveryAuth): Promise<DiscoveryRegistration>;
  revoke(auth: DiscoveryAuth): Promise<void>;
  resolve(token: string, signal: AbortSignal): Promise<Resolution>;
  randomUUID(): string;
  now?: () => number;
  watchUnavailable?(fail: () => void): () => void;
}

interface Observation {
  lastSeenAt: number;
  rssi: number | null;
  user?: NearbyUser;
  retryAt: number;
  invalidUntil?: number;
}

/** Sole owner of radio operations and account-wide registration DELETEs. */
export class BleDiscoveryController {
  private snapshot: DiscoverySnapshot = {
    nearbyUsers: [],
    isScanning: false,
    isAdvertising: false,
    isStarting: false,
    error: null,
    resolutionError: null,
  };
  private listeners = new Set<() => void>();
  private desired: { lease: symbol; mode: DiscoveryMode } | null = null;
  private auth: DiscoveryAuth | null = null;
  private foreground = false;
  private enabled = true;
  private revision = 0;
  private queue: Promise<void> = Promise.resolve();
  private registeredAuth: DiscoveryAuth | null = null;
  private observations = new Map<string, Observation>();
  private resolving = new Set<string>();
  private batchRevision: number | null = null;
  private batchAbort = new AbortController();
  private inFlightResolutions = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private rotationTimer: ReturnType<typeof setTimeout> | undefined;
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  private activeToken: string | null = null;
  private unwatch: (() => void) | undefined;
  private now: () => number;

  constructor(private driver: DiscoveryDriver) {
    this.now = driver.now ?? Date.now;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<DiscoverySnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.listeners.forEach((listener) => listener());
  }
  setContext(auth: DiscoveryAuth | null, foreground: boolean) {
    const changed =
      auth?.accountId !== this.auth?.accountId ||
      foreground !== this.foreground;
    this.auth = auth;
    this.foreground = foreground;
    if (changed) this.reconcile();
  }
  setEnabled(enabled: boolean) {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.reconcile();
    }
  }
  acquire(mode: DiscoveryMode) {
    const lease = Symbol(mode);
    this.desired = { lease, mode };
    this.reconcile();
    return () => {
      if (this.desired?.lease !== lease) return;
      this.desired = null;
      this.reconcile();
    };
  }
  retry = () => this.reconcile();
  /** Also used by tests to await serialized cleanup. */
  settled = () => this.queue;
  private isCurrent(revision: number) {
    return (
      revision === this.revision &&
      this.foreground &&
      !!this.auth &&
      this.enabled &&
      !!this.desired
    );
  }
  private reconcile() {
    const revision = ++this.revision;
    this.driver.stopScan();
    this.clearTimers();
    this.publish({
      isScanning: false,
      isAdvertising: false,
      isStarting: false,
      nearbyUsers: [],
      error: null,
      resolutionError: null,
    });
    this.queue = this.queue
      .then(async () => {
        await this.cleanup();
        if (!this.isCurrent(revision)) {
          if (!this.enabled && this.desired && this.auth && this.foreground)
            this.publish({
              error:
                "Nearby discovery is currently unavailable. Use QR or a recipient code.",
            });
          return;
        }
        const mode = this.desired!.mode;
        this.publish({ isStarting: true });
        await this.driver.prepare(mode);
        if (!this.isCurrent(revision)) return;
        this.unwatch = this.driver.watchUnavailable?.(() => {
          if (this.isCurrent(revision))
            this.fail(
              "Bluetooth was turned off or became unavailable. Retry or use QR.",
            );
        });
        if (mode === "advertise") {
          await this.rotate(revision);
        } else {
          this.batchAbort = new AbortController();
          await this.driver.startScan(
            (uuids, rssi) => {
              if (this.isCurrent(revision)) this.observe(uuids, rssi, revision);
            },
            () => {
              if (this.isCurrent(revision))
                this.fail(
                  "Bluetooth scanning stopped. Check Bluetooth and retry, or use QR.",
                );
            },
          );
          if (!this.isCurrent(revision)) return;
          this.publish({ isScanning: true, isStarting: false, error: null });
          this.tick(revision);
        }
      })
      .catch(async (error) => {
        try {
          await this.cleanup();
        } catch {
          /* Registration retained for the next serialized cleanup attempt. */
        }
        if (revision === this.revision)
          this.publish({
            isStarting: false,
            isScanning: false,
            isAdvertising: false,
            error:
              error instanceof Error
                ? error.message
                : "Bluetooth unavailable. Use QR or try again.",
          });
      });
  }
  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    clearTimeout(this.rotationTimer);
    clearTimeout(this.expiryTimer);
  }
  private async cleanup() {
    this.clearTimers();
    this.batchAbort.abort();
    this.unwatch?.();
    this.unwatch = undefined;
    await this.driver.stopScan();
    await this.driver.stopAdvertising();
    this.observations.clear();
    this.resolving.clear();
    this.activeToken = null;
    this.batchRevision = null;
    this.nextWindowAt = 0;
    if (this.registeredAuth) {
      // Never register a replacement until the old account-wide DELETE succeeds.
      await this.driver.revoke(this.registeredAuth);
      this.registeredAuth = null;
    }
  }
  private fail(message: string) {
    ++this.revision;
    this.driver.stopScan();
    this.clearTimers();
    this.publish({
      isAdvertising: false,
      isScanning: false,
      isStarting: false,
      nearbyUsers: [],
      error: message,
    });
    this.queue = this.queue.then(() => this.cleanup()).catch(() => {});
  }
  private async rotate(revision: number) {
    if (!this.isCurrent(revision)) return;
    await this.driver.stopAdvertising();
    this.publish({ isAdvertising: false });
    if (this.registeredAuth) {
      await this.driver.revoke(this.registeredAuth);
      this.registeredAuth = null;
    }
    if (!this.isCurrent(revision)) return;
    const auth = { ...this.auth! };
    const token = normalizeDiscoveryToken(this.driver.randomUUID());
    if (!isValidBleServiceUuid(token))
      throw new Error("Unable to create a Bluetooth session. Use QR.");
    // A timeout may still have registered the session: retain ownership before POST.
    this.registeredAuth = auth;
    const { expiresAt } = await this.driver.register(token, auth);
    if (!this.isCurrent(revision)) return;
    if (!Number.isFinite(expiresAt) || expiresAt <= this.now() + 5000)
      throw new Error(
        "Could not confirm Bluetooth session validity. Use QR or retry.",
      );
    this.activeToken = token;
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => {
      if (this.isCurrent(revision))
        this.fail(
          "Bluetooth visibility expired. Enable visibility again or use QR.",
        );
    }, expiresAt - this.now());
    await this.driver.advertise(token);
    if (!this.isCurrent(revision)) return;
    if (this.now() >= expiresAt)
      throw new Error("Bluetooth session expired. Please retry.");
    this.publish({ isAdvertising: true, isStarting: false, error: null });
    this.rotationTimer = setTimeout(
      () => {
        if (!this.isCurrent(revision)) return;
        this.queue = this.queue
          .then(() => this.rotate(revision))
          .catch(() => {
            if (this.isCurrent(revision))
              this.fail(
                "Could not renew Bluetooth visibility. Use QR or retry.",
              );
          });
      },
      Math.min(120000, Math.max(1000, expiresAt - this.now() - 10000)),
    );
  }
  private observe(uuids: string[], rssi: number | null, revision: number) {
    const now = this.now();
    for (const raw of uuids) {
      if (!isValidBleServiceUuid(raw)) continue;
      const token = normalizeDiscoveryToken(raw);
      if (token === this.activeToken) continue;
      let observation = this.observations.get(token);
      if (!observation) {
        if (this.observations.size >= 200) continue;
        observation = { lastSeenAt: now, rssi: null, retryAt: 0 };
        this.observations.set(token, observation);
      }
      observation.lastSeenAt = now;
      if (rssi !== null && rssi < 0 && rssi > -127)
        observation.rssi =
          observation.rssi === null
            ? rssi
            : 0.3 * rssi + 0.7 * observation.rssi;
    }
    this.publishNearby();
    // Immediate first lookup. Subsequent windows are handled by tick.
    if (this.nextWindowAt === 0) this.flush(revision);
  }
  private nextWindowAt = 0;
  private flush(revision: number) {
    if (this.batchRevision === revision) return;
    const now = this.now();
    const candidates = [...this.observations.entries()]
      .filter(
        ([token, item]) =>
          !this.resolving.has(token) &&
          now - item.lastSeenAt < 30000 &&
          now >= item.retryAt &&
          now >= (item.invalidUntil ?? 0),
      )
      .slice(0, 20);
    if (!candidates.length) return;
    this.nextWindowAt = now + 2000;
    let index = 0;
    this.batchRevision = revision;
    const worker = async () => {
      while (index < candidates.length && this.isCurrent(revision)) {
        const [token, observation] = candidates[index++];
        this.resolving.add(token);
        this.inFlightResolutions++;
        observation.retryAt = now + 10000;
        try {
          const result = await this.driver.resolve(
            token,
            this.batchAbort.signal,
          );
          if (
            !this.isCurrent(revision) ||
            this.observations.get(token) !== observation
          )
            continue;
          if (this.now() - observation.lastSeenAt >= 30000) continue;
          if (
            result.kind === "resolved" &&
            result.user.id !== this.auth?.accountId
          ) {
            observation.user = {
              ...result.user,
              lastSeenAt: observation.lastSeenAt,
              smoothedRssi: observation.rssi,
            };
            this.publish({ resolutionError: null });
          }
          if (result.kind === "invalid") {
            observation.invalidUntil = this.now() + 60000;
            observation.user = undefined;
          }
          if (result.kind === "retry") {
            observation.retryAt = this.now() + 2000;
            this.publish({
              resolutionError:
                "Unable to look up nearby people. Check your internet connection or use a recipient code.",
            });
          }
          this.publishNearby();
        } catch {
          observation.retryAt = this.now() + 2000;
        } finally {
          this.inFlightResolutions--;
          if (this.isCurrent(revision)) this.resolving.delete(token);
        }
      }
    };
    // The set includes requests from previous windows, so concurrency stays <= 4.
    const workers = Math.min(4 - this.inFlightResolutions, candidates.length);
    void Promise.all(Array.from({ length: workers }, worker)).finally(() => {
      if (this.batchRevision === revision) this.batchRevision = null;
    });
  }
  private tick(revision: number) {
    if (!this.isCurrent(revision)) return;
    const now = this.now();
    this.observations.forEach((item, token) => {
      if (now - item.lastSeenAt >= 30000 && !this.resolving.has(token))
        this.observations.delete(token);
    });
    this.publishNearby();
    if (now >= this.nextWindowAt) this.flush(revision);
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.tick(revision);
    }, 1000);
    this.timers.add(timer);
  }
  private publishNearby() {
    const users = new Map<string, NearbyUser>();
    this.observations.forEach((item) => {
      if (!item.user || this.now() - item.lastSeenAt >= 30000) return;
      const existing = users.get(item.user.id);
      if (!existing || existing.lastSeenAt < item.lastSeenAt)
        users.set(item.user.id, {
          ...item.user,
          lastSeenAt: item.lastSeenAt,
          smoothedRssi: item.rssi,
        });
    });
    this.publish({
      nearbyUsers: [...users.values()].sort(
        (a, b) => (b.smoothedRssi ?? -127) - (a.smoothedRssi ?? -127),
      ),
    });
  }
}
