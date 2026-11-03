import { MongoClient, type Collection, type Db } from "mongodb";
import type { Enquiry } from "./types";

const globalForDb = globalThis as unknown as {
  __biaiMongoClientPromise?: Promise<MongoClient>;
  __biaiIndexesReady?: boolean;
};

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and add your Atlas connection string.",
    );
  }
  return uri;
}

function connect(): Promise<MongoClient> {
  if (!globalForDb.__biaiMongoClientPromise) {
    globalForDb.__biaiMongoClientPromise = new MongoClient(getUri(), {
      maxPoolSize: 5,
    }).connect();
  }
  return globalForDb.__biaiMongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await connect();
  return client.db(process.env.MONGODB_DB || undefined);
}

export async function getEnquiriesCollection(): Promise<Collection<Enquiry>> {
  const col = (await getDb()).collection<Enquiry>("enquiries");
  if (!globalForDb.__biaiIndexesReady) {
    try {
      await col.createIndexes([
        { key: { phone: 1 } },
        { key: { status: 1 } },
        { key: { lastActivityAt: 1 } },
      ]);
    } catch {
      // Index creation is best-effort; queries work without it.
    }
    globalForDb.__biaiIndexesReady = true;
  }
  return col;
}
