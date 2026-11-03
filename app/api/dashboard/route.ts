import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { buildDashboardStats } from "@/lib/dashboard";
import { getEnquiriesCollection } from "@/lib/db";
import { serializeEnquiry } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const col = await getEnquiriesCollection();
    const docs = await col.find({}).limit(500).toArray();
    const stats = buildDashboardStats(docs.map(serializeEnquiry));
    return NextResponse.json({ stats });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not load dashboard", 500);
  }
}
