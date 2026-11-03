import type { EnquiryStatus } from "./types";

/** A lead is stale when it is still "new"/"contacted" with no activity for 48h. */
export const STALE_AFTER_HOURS = 48;
const STALE_MS = STALE_AFTER_HOURS * 60 * 60 * 1000;

const ACTIVE_STATUSES: EnquiryStatus[] = ["new", "contacted"];

export function staleCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - STALE_MS);
}

export function isStale(
  enquiry: { status: EnquiryStatus; lastActivityAt: Date | string },
  now: Date = new Date(),
): boolean {
  if (!ACTIVE_STATUSES.includes(enquiry.status)) return false;
  const at =
    typeof enquiry.lastActivityAt === "string"
      ? new Date(enquiry.lastActivityAt)
      : enquiry.lastActivityAt;
  return now.getTime() - at.getTime() > STALE_MS;
}
