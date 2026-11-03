import { NextRequest, NextResponse } from "next/server";
import type { Filter } from "mongodb";
import { apiError, firstIssueMessage, readJsonBody } from "@/lib/api";
import { getEnquiriesCollection } from "@/lib/db";
import { normalizePhone, phoneSearchDigits } from "@/lib/phone";
import { serializeEnquiry } from "@/lib/serialize";
import { staleCutoff } from "@/lib/stale";
import type { Enquiry } from "@/lib/types";
import { createEnquirySchema, listQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listQuerySchema.safeParse(params);
  if (!parsed.success) return apiError(firstIssueMessage(parsed.error), 400);
  const { status, source, interest, q, stale } = parsed.data;

  try {
    const col = await getEnquiriesCollection();
    const filter: Filter<Enquiry> = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (interest) filter.interest = interest;
    if (q) {
      const nameRx = new RegExp(escapeRegex(q), "i");
      const phoneCore = phoneSearchDigits(q);
      const or: Filter<Enquiry>[] = [{ name: nameRx }];
      if (phoneCore) or.push({ phone: { $regex: escapeRegex(phoneCore) } });
      else or.push({ phone: nameRx });
      filter.$or = or;
    }
    // "stale=1" wins over an explicit status so the follow-up filter always works.
    if (stale === "1") {
      filter.status = { $in: ["new", "contacted"] };
      filter.lastActivityAt = { $lt: staleCutoff() };
    }

    const docs = await col
      .find(filter)
      .sort({ lastActivityAt: -1 })
      .limit(500)
      .toArray();
    return NextResponse.json({ enquiries: docs.map(serializeEnquiry) });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not load enquiries", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = createEnquirySchema.safeParse(body.body);
  if (!parsed.success) return apiError(firstIssueMessage(parsed.error), 400);
  const input = parsed.data;

  const phoneInput = input.phone?.trim() ?? "";
  const phoneProvided = phoneInput !== "";
  const norm = normalizePhone(phoneProvided ? phoneInput : null);
  const needsReview = (input.needsReview ?? false) || (phoneProvided && !norm.valid);

  try {
    const col = await getEnquiriesCollection();

    if (norm.phone && !input.force) {
      const existing = await col.findOne(
        { phone: norm.phone },
        { projection: { name: 1, phone: 1, status: 1 } },
      );
      if (existing) {
        return NextResponse.json({
          duplicate: true,
          existing: {
            _id: existing._id.toString(),
            name: existing.name,
            phone: existing.phone,
            status: existing.status,
          },
        });
      }
    }

    const now = new Date();
    const doc: Enquiry = {
      name: input.name ?? null,
      phone: norm.phone,
      source: input.source,
      interest: input.interest ?? null,
      status: input.status,
      message: input.message,
      language: input.language,
      intent: input.intent ?? null,
      needsReview,
      suggestedReply: input.suggestedReply ?? null,
      notes: input.notes ?? "",
      statusHistory: [{ status: input.status, at: now }],
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await col.insertOne(doc);
    return NextResponse.json(
      { enquiry: serializeEnquiry({ ...doc, _id: insertedId }) },
      { status: 201 },
    );
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not save enquiry", 500);
  }
}
