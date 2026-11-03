export const SOURCES = ["whatsapp", "facebook", "website", "phone"] as const;
export type EnquirySource = (typeof SOURCES)[number];

export const INTERESTS = [
  "bootcamp",
  "fellowship",
  "corporate_training",
] as const;
export type EnquiryInterest = (typeof INTERESTS)[number];

export const STATUSES = [
  "new",
  "contacted",
  "interested",
  "paid",
  "lost",
] as const;
export type EnquiryStatus = (typeof STATUSES)[number];

export const LANGUAGES = ["bangla", "banglish", "english"] as const;
export type EnquiryLanguage = (typeof LANGUAGES)[number];

/** Language picker values for the reply panel ("auto" = use detected language). */
export const REPLY_LANGUAGES = ["auto", "english", "banglish"] as const;
export type ReplyLanguage = (typeof REPLY_LANGUAGES)[number];

/** Fields the AI (or heuristic) fills from a pasted message. */
export interface ExtractedEnquiry {
  name: string | null;
  phone: string | null;
  source: EnquirySource | null;
  interest: EnquiryInterest | null;
  language: EnquiryLanguage;
  intent: string | null;
  needsReview: boolean;
  suggestedReply: string | null;
}

export interface StatusHistoryEntry {
  status: EnquiryStatus;
  at: Date;
}

/**
 * Document shape stored in the `enquiries` collection.
 * `_id` is added by MongoDB (see `WithId<Enquiry>`).
 */
export interface Enquiry {
  name: string | null;
  /** Normalized to +8801XXXXXXXXX when valid; otherwise a cleaned raw value. */
  phone: string | null;
  source: EnquirySource;
  interest: EnquiryInterest | null;
  status: EnquiryStatus;
  /** Original pasted message text. */
  message: string;
  language: EnquiryLanguage;
  /** e.g. price_question, schedule, scholarship, ready_to_pay, general */
  intent: string | null;
  needsReview: boolean;
  suggestedReply: string | null;
  notes: string;
  statusHistory: StatusHistoryEntry[];
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Enquiry as delivered to the browser (dates as ISO strings, _id as string). */
export interface SerializedEnquiry
  extends Omit<
    Enquiry,
    "lastActivityAt" | "createdAt" | "updatedAt" | "statusHistory"
  > {
  _id: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: { status: EnquiryStatus; at: string }[];
}
