import type { DiscoveryProfile } from "../types/discovery";
import { asRecord, unwrapData } from "./apiPayload";

export const parseDiscoveryProfile = (
  value: unknown,
): DiscoveryProfile | null => {
  const record = asRecord(value);
  if (typeof record.id !== "string" || !record.id.trim()) return null;
  const text = (key: string) =>
    typeof record[key] === "string" ? (record[key] as string) : "";
  if (!text("first_name").trim() && !text("username").trim()) return null;
  const relationship = record.relationship;
  return {
    id: record.id,
    first_name: text("first_name"),
    last_name: text("last_name"),
    username: text("username"),
    avatar_url: text("avatar_url") || undefined,
    trust_tier: text("trust_tier") || undefined,
    trust_score:
      typeof record.trust_score === "number" ? record.trust_score : undefined,
    mutual_trust: text("mutual_trust") || undefined,
    presence: text("presence") || undefined,
    distance_signal: text("distance_signal") || undefined,
    relationship:
      relationship === "PAID_BEFORE" ||
      relationship === "CONTACT_PAID" ||
      relationship === "NO_PRIOR_RELATIONSHIP"
        ? relationship
        : undefined,
  };
};

export const resolvedProfiles = (value: unknown): DiscoveryProfile[] => {
  const body = unwrapData(value);
  const list = Array.isArray(value)
    ? value
    : (body.users ?? body.resolved ?? (body.user ? [body.user] : []));
  return Array.isArray(list)
    ? list
        .map(parseDiscoveryProfile)
        .filter((user): user is DiscoveryProfile => user !== null)
    : [];
};

export const relationshipLabel = (profile: DiscoveryProfile): string => {
  switch (profile.relationship) {
    case "PAID_BEFORE":
      return "You have paid this person before";
    case "CONTACT_PAID":
      return "A contact has paid this person";
    case "NO_PRIOR_RELATIONSHIP":
      return "No prior payment relationship";
    default:
      return profile.mutual_trust || "Relationship information unavailable";
  }
};
