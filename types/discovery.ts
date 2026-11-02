export interface DiscoveryProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url?: string;
  trust_score?: number;
  trust_tier?: string;
  mutual_trust?: string;
  presence?: string;
  distance_signal?: string;
  relationship?: "PAID_BEFORE" | "CONTACT_PAID" | "NO_PRIOR_RELATIONSHIP";
}

export interface NearbyUser extends DiscoveryProfile {
  lastSeenAt: number;
  smoothedRssi: number | null;
}

export interface DiscoveryRegistration {
  expiresAt: number;
}

export type Resolution =
  | { kind: "resolved"; user: DiscoveryProfile }
  | { kind: "invalid" }
  | { kind: "retry" };

export type DiscoveryMode = "scan" | "advertise";
