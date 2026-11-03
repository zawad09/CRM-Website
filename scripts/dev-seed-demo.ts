/**
 * Fills the database with 20 sample enquiries (Bangla, Banglish, English).
 * Clears the collection first.
 *
 * Usage: npm run seed:demo
 */
import { MongoClient } from "mongodb";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SAMPLE_ENQUIRIES } from "../lib/samples";

function resolveUri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const uriFile = join(process.cwd(), ".memory-mongo-uri");
  if (existsSync(uriFile)) return readFileSync(uriFile, "utf8").trim();
  console.error(
    "No database URI found. Set MONGODB_URI, or run `npm run memory-mongo` first.",
  );
  process.exit(1);
}

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();
const uri = resolveUri();
const dbName = process.env.MONGODB_DB;

async function main(): Promise<void> {
  const now = Date.now();
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(dbName).collection("enquiries");
  await col.deleteMany({});

  const docs = SAMPLE_ENQUIRIES.map((s) => {
    const at = new Date(now - s.hoursAgo * 60 * 60 * 1000);
    return {
      name: s.name,
      phone: s.phone,
      source: s.source,
      interest: s.interest,
      status: s.status,
      message: s.message,
      language: s.language,
      intent: s.intent,
      needsReview: s.needsReview,
      suggestedReply: null,
      notes: "",
      statusHistory: [{ status: s.status, at }],
      lastActivityAt: at,
      createdAt: at,
      updatedAt: at,
    };
  });

  const result = await col.insertMany(docs);
  console.log(`Seeded ${result.insertedCount} sample enquiries.`);
  await client.close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
