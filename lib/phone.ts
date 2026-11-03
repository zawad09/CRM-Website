const BENGALI_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

export function convertBanglaDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BENGALI_DIGITS[d] ?? d);
}

export interface NormalizedPhone {
  /** Cleaned number, +8801XXXXXXXXX when valid. Null when the input has no digits at all. */
  phone: string | null;
  /** False when the cleaned value is not a valid Bangladeshi mobile number. */
  valid: boolean;
}

/**
 * Normalize a Bangladeshi mobile number to +8801XXXXXXXXX.
 *
 * Accepts Bangla digits, and 01XXXXXXXXX / 8801XXXXXXXXX / +8801XXXXXXXXX
 * with spaces, dashes and brackets anywhere. When the result is not a valid
 * BD mobile number, the cleaned input is kept as-is with valid=false so the
 * caller can flag it for review.
 */
export function normalizePhone(raw: string | null | undefined): NormalizedPhone {
  if (raw == null) return { phone: null, valid: false };

  // Convert Bangla digits, then drop everything except digits and "+".
  const cleaned = convertBanglaDigits(String(raw))
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return { phone: null, valid: false };

  const hadPlus = cleaned.startsWith("+");
  const digitsRaw = cleaned.replace(/\+/g, "");

  // Work on a copy to decide validity, keeping the raw cleaned value for fallback.
  let digits = digitsRaw;
  if (digits.startsWith("00")) digits = digits.replace(/^0+/, "");
  if (digits.startsWith("880")) digits = digits.slice(3);
  else if (digits.startsWith("0880")) digits = digits.slice(4);
  digits = digits.replace(/^0+/, "");

  // BD mobile: operator codes 013-019, 10 digits after the leading 1.
  if (/^1[3-9]\d{8}$/.test(digits)) {
    return { phone: `+880${digits}`, valid: true };
  }

  return { phone: cleaned || null, valid: false };
}

/**
 * Strip non-digit characters and the 880 / 0 prefixes so a user-typed search
 * query can be matched against a stored +8801XXXXXXXXX number.
 */
export function phoneSearchDigits(query: string): string {
  const digits = convertBanglaDigits(query).replace(/\D/g, "");
  if (!digits) return "";
  let core = digits;
  if (core.startsWith("00")) core = core.replace(/^0+/, "");
  if (core.startsWith("880")) core = core.slice(3);
  core = core.replace(/^0+/, "");
  return core;
}
