import { NextResponse } from "next/server";
import type { z } from "zod";

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

export async function readJsonBody(req: Request): Promise<
  { ok: true; body: unknown } | { ok: false; response: NextResponse }
> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return {
      ok: false,
      response: apiError("Request body must be valid JSON", 400),
    };
  }
}
