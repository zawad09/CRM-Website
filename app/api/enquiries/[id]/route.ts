import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type UpdateFilter } from "mongodb";
import { apiError, firstIssueMessage, readJsonBody } from "@/lib/api";
import { getEnquiriesCollection } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { serializeEnquiry } from "@/lib/serialize";
import type { Enquiry, StatusHistoryEntry } from "@/lib/types";
import { updateEnquirySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return apiError("Invalid enquiry id", 400);

  try {
    const col = await getEnquiriesCollection();
    const doc = await col.findOne({ _id: objectId });
    if (!doc) return apiError("Enquiry not found", 404);
    return NextResponse.json({ enquiry: serializeEnquiry(doc) });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not load enquiry", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return apiError("Invalid enquiry id", 400);

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = updateEnquirySchema.safeParse(body.body);
  if (!parsed.success) return apiError(firstIssueMessage(parsed.error), 400);
  const input = parsed.data;

  try {
    const col = await getEnquiriesCollection();
    const current = await col.findOne({ _id: objectId });
    if (!current) return apiError("Enquiry not found", 404);

    const now = new Date();
    const set: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) set.name = input.name;
    if (input.source !== undefined) set.source = input.source;
    if (input.interest !== undefined) set.interest = input.interest;
    if (input.message !== undefined) set.message = input.message;
    if (input.language !== undefined) set.language = input.language;
    if (input.intent !== undefined) set.intent = input.intent;
    if (input.notes !== undefined) set.notes = input.notes;
    if (input.suggestedReply !== undefined) set.suggestedReply = input.suggestedReply;

    if (input.phone !== undefined) {
      const phoneInput = input.phone?.trim() ?? "";
      if (!phoneInput) {
        set.phone = null;
        if (input.needsReview === undefined) set.needsReview = false;
      } else {
        const norm = normalizePhone(phoneInput);
        set.phone = norm.phone;
        if (input.needsReview === undefined) set.needsReview = !norm.valid;
      }
    }
    if (input.needsReview !== undefined) set.needsReview = input.needsReview;

    const update: UpdateFilter<Enquiry> = { $set: set };

    // Any status change appends to history and counts as activity.
    if (input.status !== undefined && input.status !== current.status) {
      set.status = input.status;
      set.lastActivityAt = now;
      const entry: StatusHistoryEntry = { status: input.status, at: now };
      update.$push = { statusHistory: entry };
    } else if (
      input.touch ||
      (input.notes !== undefined && input.notes !== current.notes)
    ) {
      set.lastActivityAt = now;
    }

    await col.updateOne({ _id: objectId }, update);
    const updated = await col.findOne({ _id: objectId });
    if (!updated) return apiError("Enquiry not found", 404);
    return NextResponse.json({ enquiry: serializeEnquiry(updated) });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not update enquiry", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return apiError("Invalid enquiry id", 400);

  try {
    const col = await getEnquiriesCollection();
    const result = await col.deleteOne({ _id: objectId });
    if (result.deletedCount === 0) return apiError("Enquiry not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not delete enquiry", 500);
  }
}
