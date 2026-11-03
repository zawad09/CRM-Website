# BIAI CRM

Enquiry tracker for BIAI (training company in Bangladesh): saves enquiries from
WhatsApp, Facebook, website and phone calls, fills details from pasted messages
with AI, suggests replies and shows a pipeline.

Built with Next.js (App Router) + TypeScript + Tailwind CSS, MongoDB Atlas
(official `mongodb` driver), Groq (Llama models) via the `openai` SDK, zod and
dnd-kit.

## Status (step 1 of 7)

Done and verified:

- Project setup, Saira font (400/500/600) with Noto Sans Bengali fallback for
  Bangla text, layout and top navigation
- MongoDB connection (`lib/db.ts`) with `phone`, `status`, `lastActivityAt`
  indexes on the `enquiries` collection
- Enquiry data model and CRUD API routes with zod-validated input
- Phone normalization (Bangla digits, 01/880/+880 prefixes) and the 48h
  stale/follow-up rule (`lib/phone.ts`, `lib/stale.ts`)

Coming next: pipeline board (step 2), AI extraction + new enquiry screen
(step 3), reply panel (step 4), dashboard (step 5), weekly summary, CSV export,
seed + evaluate scripts (step 6), README polish and deploy notes (step 7).

## Setup

1. Requirements: Node 20+ and a free MongoDB Atlas cluster.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` (copy `.env.example`):

   ```bash
   cp .env.example .env.local
   ```

   Fill in:

   - `MONGODB_URI` — Atlas connection string (Cluster > Connect > Drivers)
   - `MONGODB_DB` — database name (optional, defaults to the one in the URI)
   - `GROQ_API_KEY` — API key from the Groq console (used for AI features)
   - `GROQ_MODEL` — optional; defaults to `llama-3.1-8b-instant`

4. Run the app:

   ```bash
   npm run dev        # http://localhost:3000
   ```

## Try it without Atlas

No MongoDB? Run everything on a temporary in-memory database:

```bash
npm run memory-mongo   # terminal 1 — prints the URI, keeps running
npm run seed:demo      # fills 8 realistic demo enquiries (status pills, stale
                       # leads, a flagged invalid phone, a Bangla name)
npm run dev            # terminal 2 — MONGODB_URI=... npm run dev, or write the
                       # URI into .env.local
```

The first `memory-mongo` run downloads a small mongod binary (~70 MB) and
caches it in `.mongoms-bin/`. `seed:demo` clears the collection first, so you
can re-run it anytime to reset the demo data. Everything is gone when the
memory-mongo process stops.

5. Check everything:

   ```bash
   npm run typecheck  # strict TypeScript
   npm run smoke      # API smoke tests (needs BASE_URL + MONGODB_URI env)
   npx tsx scripts/phone-check.ts   # phone normalization unit checks
   ```

## API (step 1)

| Route | Description |
| --- | --- |
| `GET /api/enquiries?status=&source=&interest=&q=&stale=1` | List with filters and search (name or phone) |
| `POST /api/enquiries` | Create; normalizes phone; returns `{ duplicate, existing }` unless `force: true` |
| `GET /api/enquiries/[id]` | One enquiry |
| `PATCH /api/enquiries/[id]` | Edit; status change appends to `statusHistory` and bumps `lastActivityAt` |
| `DELETE /api/enquiries/[id]` | Delete |

Every error response is `{ "error": "plain-language message" }`.

## Notes

- No auth by design (single internal team, demo). Do not store real customer data.
- `.env*` files are gitignored; `.env.example` documents the required variables.
