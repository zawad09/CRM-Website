import { convertBanglaDigits, normalizePhone } from "./phone";
import type {
  EnquiryInterest,
  EnquiryLanguage,
  EnquirySource,
  ExtractedEnquiry,
} from "./types";

const BANGLISH_HINTS =
  /\b(bhai|apu|apa|koto|kobe|hobe|jonno|amar|amake|apnar|apnara|bootcamp er|fee ta|shuru|pathabo|chaichi|kothay|lagbe|din|please share|this side)\b/i;

const INTEREST_PATTERNS: { interest: EnquiryInterest; re: RegExp }[] = [
  {
    interest: "corporate_training",
    re: /corporate|কর্পোরেট|factory|office team|company training|staff training|supervisors|bank(?:er|'s)? team/i,
  },
  {
    interest: "fellowship",
    re: /fellowship|ফেলোশিপ|fellow /i,
  },
  {
    interest: "bootcamp",
    re: /bootcamp|বুটক্যাম্প|coding|full[- ]?stack|digital marketing|ai course|web development/i,
  },
];

const SOURCE_PATTERNS: { source: EnquirySource; re: RegExp }[] = [
  { source: "facebook", re: /facebook|fb post|fb te|ফেসবুক/i },
  { source: "whatsapp", re: /whatsapp|ওয়াটসঅ্যাপ|wa te/i },
  { source: "website", re: /website|সাইট|form fill/i },
  { source: "phone", re: /called|phone call|ফোন/i },
];

const INTENT_PATTERNS: { intent: string; re: RegExp }[] = [
  { intent: "scholarship", re: /scholarship|বৃত্তি|waiver|discount/i },
  { intent: "ready_to_pay", re: /pay|enroll|enrol|admission|ভর্তি|payment|ready to join/i },
  { intent: "price_question", re: /fee|fees|price|cost|koto|খরচ|ফি |charge/i },
  { intent: "schedule", re: /batch|kobe|schedule|start|কবে|শুরু|timing|weekend/i },
];

export function detectLanguage(text: string): EnquiryLanguage {
  const banglaChars = (text.match(/[\u0980-\u09FF]/g) ?? []).length;
  if (banglaChars >= 8 || banglaChars / Math.max(text.length, 1) > 0.25) {
    return "bangla";
  }
  if (BANGLISH_HINTS.test(text)) return "banglish";
  return "english";
}

export function detectInterest(text: string): EnquiryInterest | null {
  for (const row of INTEREST_PATTERNS) {
    if (row.re.test(text)) return row.interest;
  }
  return null;
}

export function detectSource(text: string): EnquirySource | null {
  for (const row of SOURCE_PATTERNS) {
    if (row.re.test(text)) return row.source;
  }
  return null;
}

export function detectIntent(text: string): string {
  for (const row of INTENT_PATTERNS) {
    if (row.re.test(text)) return row.intent;
  }
  return "general";
}

export function findPhoneInText(text: string): string | null {
  const converted = convertBanglaDigits(text);
  const matches = converted.match(/(?:\+?88[\s-]?)?0?1[3-9](?:[\s-]?\d){8}/g);
  return matches?.[0] ?? null;
}

export function findNameInText(text: string): string | null {
  const latin = text.match(
    /(?:my name is|i['’]?m|i am|this is|\bami)\s+([A-Za-z][A-Za-z]*(?:\s+[A-Za-z][A-Za-z]*){0,2})/i,
  );
  if (latin?.[1]) {
    const name = latin[1].replace(/\s+/g, " ").trim();
    if (name.length >= 2 && !/^(interested|looking|from|the)$/i.test(name)) {
      return name;
    }
  }
  const bangla = text.match(/আমি\s+([\u0980-\u09FF.]+(?:\s+[\u0980-\u09FF.]+){0,2})/);
  if (bangla?.[1]) return bangla[1].trim();
  return null;
}

/** Offline fallback when Gemini is missing or fails. */
export function heuristicExtract(message: string): ExtractedEnquiry {
  const phoneRaw = findPhoneInText(message);
  const norm = normalizePhone(phoneRaw);
  const name = findNameInText(message);
  const interest = detectInterest(message);
  const language = detectLanguage(message);
  const needsReview = !name || !norm.valid || !interest;

  return {
    name,
    phone: phoneRaw,
    source: detectSource(message),
    interest,
    language,
    intent: detectIntent(message),
    needsReview,
    suggestedReply: null,
  };
}
