import { NextRequest, NextResponse } from "next/server";
import { apiError, firstIssueMessage, readJsonBody } from "@/lib/api";
import { aiReply } from "@/lib/gemini";
import { replyBodySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = replyBodySchema.safeParse(body.body);
  if (!parsed.success) return apiError(firstIssueMessage(parsed.error), 400);

  try {
    const result = await aiReply(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Could not suggest a reply", 500);
  }
}
