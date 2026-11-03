/**
 * API smoke test. Run against a live dev server:
 *   BASE_URL=http://localhost:3000 MONGODB_URI=<same as server> npm run smoke
 *
 * Needs MONGODB_URI (same database as the server) to insert a stale enquiry
 * directly and verify the stale filter.
 */
import { MongoClient } from "mongodb";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MONGODB_URI = process.env.MONGODB_URI ?? "";

// Unique 8-digit tail per run so the smoke test never collides with demo
// data or with itself on a second run. 017 + 8 digits = valid BD mobile.
const SUFFIX = String(Math.floor(10000000 + Math.random() * 90000000));
const bnDigits = (s: string): string =>
  s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
const LOCAL_PHONE = bnDigits(`017${SUFFIX}`); // Bangla numerals, 11 digits
const NORMALIZED_PHONE = `+88017${SUFFIX}`;
const INVALID_PHONE = `017${SUFFIX.slice(0, 3)}`; // too short → needsReview

interface CallResult {
  status: number;
  json: Record<string, unknown>;
}

let failures = 0;

function check(name: string, ok: boolean, detail: unknown = ""): void {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`);
}

async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<CallResult> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: Record<string, unknown>;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { status: res.status, json };
}

function enquiryOf(res: CallResult): Record<string, unknown> {
  return res.json.enquiry as Record<string, unknown>;
}

async function main(): Promise<void> {
  // 1. Validation errors
  const bad = await call("POST", "/api/enquiries", { name: "No message" });
  check("POST without message returns 400", bad.status === 400, bad);

  const badPatch = await call("PATCH", "/api/enquiries/abc", { status: "new" });
  check("PATCH with malformed id returns 400", badPatch.status === 400, badPatch);

  const missing = await call(
    "GET",
    "/api/enquiries/64b000000000000000000000",
  );
  check("GET missing enquiry returns 404", missing.status === 404, missing);

  // 2. Create
  const created = await call("POST", "/api/enquiries", {
    name: "Smoke Test Lead",
    phone: LOCAL_PHONE,
    message: "Hello, bootcamp er fee koto?",
    source: "whatsapp",
  });
  check(
    "POST creates enquiry (201)",
    created.status === 201 && Boolean(enquiryOf(created)?._id),
    created,
  );
  const e1 = enquiryOf(created);
  if (!e1) {
    console.error("Cannot continue without a created enquiry; aborting.");
    process.exit(1);
  }
  const id = String(e1._id);
  check(
    "Bangla-digit phone normalized to +880",
    e1.phone === NORMALIZED_PHONE,
    e1.phone,
  );
  check("statusHistory starts with one entry", Array.isArray(e1.statusHistory) && (e1.statusHistory as unknown[]).length === 1);

  // 3. Duplicate detection
  const dup = await call("POST", "/api/enquiries", {
    name: "Second",
    phone: `017${SUFFIX}`,
    message: "same number again",
    source: "facebook",
  });
  check(
    "POST same phone returns duplicate info",
    dup.status === 200 &&
      dup.json.duplicate === true &&
      (dup.json.existing as Record<string, unknown>)?._id === id,
    dup,
  );
  const forced = await call("POST", "/api/enquiries", {
    name: "Second",
    phone: `017${SUFFIX}`,
    message: "same number again",
    source: "facebook",
    force: true,
  });
  check("POST with force:true saves anyway", forced.status === 201, forced);
  const forcedId = String(enquiryOf(forced)._id);

  // 4. Invalid phone flags needsReview (unique junk number, wrong length)
  const invalid = await call("POST", "/api/enquiries", {
    name: "Bad phone",
    phone: INVALID_PHONE,
    message: "call me back please",
    source: "phone",
  });
  check(
    "Invalid phone kept but flagged needsReview",
    invalid.status === 201 &&
      enquiryOf(invalid).phone === INVALID_PHONE &&
      enquiryOf(invalid).needsReview === true,
    enquiryOf(invalid),
  );

  // 5. List + filters + search
  const list = await call("GET", "/api/enquiries");
  const items = (list.json.enquiries as Record<string, unknown>[]) ?? [];
  check("GET list returns created enquiries", list.status === 200 && items.length >= 3, list.status);
  const search = await call("GET", `/api/enquiries?q=${SUFFIX}`);
  const searchItems = (search.json.enquiries as Record<string, unknown>[]) ?? [];
  check("Search by phone finds both entries", searchItems.length === 2, searchItems.length);
  const byName = await call("GET", "/api/enquiries?q=smoke test");
  check("Search by name (case-insensitive) works", ((byName.json.enquiries as unknown[]) ?? []).length >= 1, byName);

  // 6. PATCH status change appends history + bumps lastActivityAt
  const before = new Date(String(e1.lastActivityAt)).getTime();
  await new Promise((r) => setTimeout(r, 1100));
  const patched = await call("PATCH", `/api/enquiries/${id}`, {
    status: "contacted",
    notes: "Called back, wants bootcamp fee details.",
  });
  const p1 = enquiryOf(patched);
  check(
    "PATCH status appends history",
    p1.status === "contacted" && (p1.statusHistory as unknown[]).length === 2,
    p1.statusHistory,
  );
  check(
    "PATCH status bumps lastActivityAt",
    new Date(String(p1.lastActivityAt)).getTime() > before,
    p1.lastActivityAt,
  );
  const noChange = await call("PATCH", `/api/enquiries/${id}`, {
    status: "contacted",
    interest: "bootcamp",
  });
  const p2 = enquiryOf(noChange);
  check(
    "PATCH with unchanged status does not append history",
    (p2.statusHistory as unknown[]).length === 2 && p2.interest === "bootcamp",
    p2.statusHistory,
  );

  // 7. Stale filter: insert a 3-day-old "new" lead directly.
  if (!MONGODB_URI) {
    console.log("SKIP  stale filter check (MONGODB_URI not set)");
  } else {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const staleDoc = {
      name: "Stale Test Lead",
      phone: null,
      source: "website",
      interest: null,
      status: "new",
      message: "inserted directly for stale test",
      language: "english",
      intent: null,
      needsReview: false,
      suggestedReply: null,
      notes: "",
      statusHistory: [{ status: "new", at: threeDaysAgo }],
      lastActivityAt: threeDaysAgo,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    };
    await client.db().collection("enquiries").insertOne(staleDoc);
    await client.close();

    const staleRes = await call("GET", "/api/enquiries?stale=1");
    const staleItems = (staleRes.json.enquiries as Record<string, unknown>[]) ?? [];
    check(
      "stale=1 returns only old new/contacted leads",
      staleItems.some((i) => i.name === "Stale Test Lead") &&
        staleItems.every((i) => ["new", "contacted"].includes(String(i.status))),
      staleItems.map((i) => i.name),
    );
  }

  // 8. Get one + delete
  const got = await call("GET", `/api/enquiries/${id}`);
  check("GET one returns the enquiry", got.status === 200 && enquiryOf(got)._id === id, got.status);
  const deleted = await call("DELETE", `/api/enquiries/${id}`);
  check("DELETE returns ok", deleted.status === 200 && deleted.json.ok === true, deleted);
  const gone = await call("GET", `/api/enquiries/${id}`);
  check("Deleted enquiry returns 404", gone.status === 404, gone.status);

  // 9. Cleanup: remove the extra docs created by this run (by unique phone
  // and by the test names; demo data such as "Rakib Hasan" is left alone).
  const cleanup = new MongoClient(MONGODB_URI);
  await cleanup.connect();
  await cleanup
    .db()
    .collection("enquiries")
    .deleteMany({
      $or: [
        { phone: { $in: [NORMALIZED_PHONE, INVALID_PHONE] } },
        { name: { $in: ["Smoke Test Lead", "Second", "Bad phone", "Stale Test Lead"] } },
      ],
    });
  await cleanup.close();

  console.log(
    failures === 0
      ? "\nAll API smoke checks passed."
      : `\n${failures} API smoke check(s) FAILED.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
