import { STATUS_ORDER } from "./constants";
import { isStale } from "./stale";
import type {
  EnquiryInterest,
  EnquirySource,
  EnquiryStatus,
  SerializedEnquiry,
} from "./types";

export interface DashboardStats {
  total: number;
  byStatus: Record<EnquiryStatus, number>;
  bySource: Record<EnquirySource, number>;
  byInterest: Record<EnquiryInterest | "unknown", number>;
  paid: number;
  lost: number;
  conversionPct: number | null;
  stale: SerializedEnquiry[];
}

export function buildDashboardStats(enquiries: SerializedEnquiry[]): DashboardStats {
  const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<
    EnquiryStatus,
    number
  >;
  const bySource: Record<EnquirySource, number> = {
    whatsapp: 0,
    facebook: 0,
    website: 0,
    phone: 0,
  };
  const byInterest: Record<EnquiryInterest | "unknown", number> = {
    bootcamp: 0,
    fellowship: 0,
    corporate_training: 0,
    unknown: 0,
  };

  for (const e of enquiries) {
    byStatus[e.status] += 1;
    bySource[e.source] += 1;
    if (e.interest) byInterest[e.interest] += 1;
    else byInterest.unknown += 1;
  }

  const paid = byStatus.paid;
  const lost = byStatus.lost;
  const closed = paid + lost;
  const conversionPct = closed === 0 ? null : Math.round((paid / closed) * 100);

  const stale = enquiries
    .filter((e) => isStale(e))
    .sort(
      (a, b) =>
        new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime(),
    );

  return {
    total: enquiries.length,
    byStatus,
    bySource,
    byInterest,
    paid,
    lost,
    conversionPct,
    stale,
  };
}

export function statsToPrompt(stats: DashboardStats): string {
  const staleLines =
    stats.stale.length === 0
      ? "Nobody is waiting more than 48 hours."
      : stats.stale
          .slice(0, 12)
          .map(
            (e) =>
              `- ${e.name ?? "Unnamed"} (${e.status}, ${e.interest ?? "unknown programme"}, last activity ${e.lastActivityAt})`,
          )
          .join("\n");

  return `This week in the BIAI CRM:
Total enquiries: ${stats.total}
Pipeline: New ${stats.byStatus.new}, Contacted ${stats.byStatus.contacted}, Interested ${stats.byStatus.interested}, Paid ${stats.byStatus.paid}, Lost ${stats.byStatus.lost}
Sources: WhatsApp ${stats.bySource.whatsapp}, Facebook ${stats.bySource.facebook}, Website ${stats.bySource.website}, Phone ${stats.bySource.phone}
Interest: Bootcamp ${stats.byInterest.bootcamp}, Fellowship ${stats.byInterest.fellowship}, Corporate ${stats.byInterest.corporate_training}, Unknown ${stats.byInterest.unknown}
Closed conversion (paid / paid+lost): ${stats.conversionPct === null ? "n/a" : `${stats.conversionPct}%`}
Follow-ups overdue (48h, still New or Contacted): ${stats.stale.length}
${staleLines}`;
}
