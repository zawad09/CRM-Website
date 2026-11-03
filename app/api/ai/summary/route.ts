import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { buildDashboardStats, statsToPrompt } from "@/lib/dashboard";
import { getEnquiriesCollection } from "@/lib/db";
import { aiWeeklySummary } from "@/lib/gemini";
import { serializeEnquiry } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const col = await getEnquiriesCollection();
    const docs = await col.find({}).limit(500).toArray();
    const stats = buildDashboardStats(docs.map(serializeEnquiry));
    const result = await aiWeeklySummary(statsToPrompt(stats));
    return NextResponse.json({ ...result, staleCount: stats.stale.length });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not write summary", 500);
  }
}
