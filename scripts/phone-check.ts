import { normalizePhone, phoneSearchDigits } from "../lib/phone";

interface Case {
  input: string | null;
  expectPhone: string | null;
  expectValid: boolean;
}

const CASES: Case[] = [
  { input: "01712345678", expectPhone: "+8801712345678", expectValid: true },
  { input: "+8801712345678", expectPhone: "+8801712345678", expectValid: true },
  { input: "8801712345678", expectPhone: "+8801712345678", expectValid: true },
  { input: "01712-345 678", expectPhone: "+8801712345678", expectValid: true },
  { input: "(+880) 1812 345 678", expectPhone: "+8801812345678", expectValid: true },
  { input: "০১৭১২৩৪৫৬৭৮", expectPhone: "+8801712345678", expectValid: true },
  { input: "008801912345678", expectPhone: "+8801912345678", expectValid: true },
  { input: "0156 8877 665", expectPhone: "+8801568877665", expectValid: true },
  { input: "01398765432", expectPhone: "+8801398765432", expectValid: true },
  // Invalid BD mobiles: cleaned value kept, valid=false
  { input: "017123456", expectPhone: "017123456", expectValid: false },
  { input: "8802 55667788", expectPhone: "880255667788", expectValid: false },
  { input: "01012345678", expectPhone: "01012345678", expectValid: false },
  { input: "12345", expectPhone: "12345", expectValid: false },
  // No digits at all
  { input: "   ", expectPhone: null, expectValid: false },
  { input: "কোনো নাম্বার নেই", expectPhone: null, expectValid: false },
  { input: null, expectPhone: null, expectValid: false },
];

let failures = 0;
for (const c of CASES) {
  const got = normalizePhone(c.input);
  const ok = got.phone === c.expectPhone && got.valid === c.expectValid;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${JSON.stringify(c.input)} -> phone=${JSON.stringify(got.phone)} valid=${got.valid}` +
      (ok ? "" : `  (expected ${JSON.stringify(c.expectPhone)}, ${c.expectValid})`),
  );
}

const SEARCH_CASES: Array<[string, string]> = [
  ["01712345678", "1712345678"],
  ["+8801712345678", "1712345678"],
  ["০১৭১২ ৩৪৫ ৬৭৮", "1712345678"],
  ["rakib", ""],
];
for (const [input, expected] of SEARCH_CASES) {
  const got = phoneSearchDigits(input);
  const ok = got === expected;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  phoneSearchDigits(${JSON.stringify(input)}) -> ${JSON.stringify(got)}` +
      (ok ? "" : `  (expected ${JSON.stringify(expected)})`),
  );
}

console.log(failures === 0 ? "\nAll phone checks passed." : `\n${failures} phone check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
