import type {
  EnquiryInterest,
  EnquiryLanguage,
  EnquirySource,
  EnquiryStatus,
} from "./types";

export const STATUS_ORDER: EnquiryStatus[] = [
  "new",
  "contacted",
  "interested",
  "paid",
  "lost",
];

export const STATUS_META: Record<
  EnquiryStatus,
  { label: string; pill: string }
> = {
  new: { label: "New", pill: "bg-stone-100 text-stone-600 border-stone-200" },
  contacted: {
    label: "Contacted",
    pill: "bg-sky-50 text-sky-700 border-sky-200",
  },
  interested: {
    label: "Interested",
    pill: "bg-amber-50 text-amber-800 border-amber-200",
  },
  paid: {
    label: "Paid",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  lost: { label: "Lost", pill: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const SOURCE_META: Record<EnquirySource, { label: string }> = {
  whatsapp: { label: "WhatsApp" },
  facebook: { label: "Facebook" },
  website: { label: "Website" },
  phone: { label: "Phone call" },
};

export const INTEREST_META: Record<EnquiryInterest, { label: string }> = {
  bootcamp: { label: "Bootcamp" },
  fellowship: { label: "Fellowship" },
  corporate_training: { label: "Corporate training" },
};

export const LANGUAGE_META: Record<EnquiryLanguage, { label: string }> = {
  bangla: { label: "Bangla" },
  banglish: { label: "Banglish" },
  english: { label: "English" },
};

export const INTENTS = [
  "price_question",
  "schedule",
  "scholarship",
  "ready_to_pay",
  "general",
] as const;

export type EnquiryIntent = (typeof INTENTS)[number];

export const INTENT_META: Record<EnquiryIntent, { label: string }> = {
  price_question: { label: "Asking about fees" },
  schedule: { label: "Asking about schedule" },
  scholarship: { label: "Asking about scholarship" },
  ready_to_pay: { label: "Ready to enrol" },
  general: { label: "General enquiry" },
};
