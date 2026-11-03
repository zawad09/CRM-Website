/**
 * Dev-only helper: boots an in-memory MongoDB and keeps it alive so the dev
 * server and smoke test can point at it. Writes the URI to a file.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main(): Promise<void> {
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: "biai" },
    binary: { downloadDir: join(process.cwd(), ".mongoms-bin") },
  });
  const uri = mongod.getUri("biai");
  writeFileSync(join(process.cwd(), ".memory-mongo-uri"), uri);
  console.log("Memory MongoDB running:", uri);
  console.log("Point the dev server at it: MONGODB_URI=<uri> npm run dev");
  // Keep the process alive so the mongod child keeps running.
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error("Failed to start memory MongoDB:", err.message);
  process.exit(1);
});
