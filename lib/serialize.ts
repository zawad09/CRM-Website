import type { WithId } from "mongodb";
import type { Enquiry, SerializedEnquiry } from "./types";

export function serializeEnquiry(e: WithId<Enquiry>): SerializedEnquiry {
  return {
    _id: e._id.toString(),
    name: e.name,
    phone: e.phone,
    source: e.source,
    interest: e.interest,
    status: e.status,
    message: e.message,
    language: e.language,
    intent: e.intent,
    needsReview: e.needsReview,
    suggestedReply: e.suggestedReply,
    notes: e.notes,
    statusHistory: (e.statusHistory ?? []).map((h) => ({
      status: h.status,
      at: new Date(h.at).toISOString(),
    })),
    lastActivityAt: new Date(e.lastActivityAt).toISOString(),
    createdAt: new Date(e.createdAt).toISOString(),
    updatedAt: new Date(e.updatedAt).toISOString(),
  };
}
