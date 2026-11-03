import OpenAI from "openai";
import { heuristicExtract } from "./extract";
import { heuristicReply } from "./reply";
import type {
  EnquiryInterest,
  EnquiryLanguage,
  EnquirySource,
  ExtractedEnquiry,
  ReplyLanguage,
} from "./types";

function getApiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim();
  return key ? key : null;
}

function modelCandidates(): string[] {
  const preferred = process.env.GROQ_MODEL?.trim();
  const fallbacks = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];
  return [...new Set([preferred, ...fallbacks].filter((m): m is string => Boolean(m)))];
}

function errorStatus(err: unknown): number | undefined {
  const s = (err as { status?: unknown })?.status;
  return typeof s === "number" ? s : undefined;
}

function friendlyAiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const status = errorStatus(err);
  if (raw.includes("GROQ_API_KEY")) return "Add GROQ_API_KEY in .env.local.";
  if (status === 404 || raw.includes("model_not_found")) {
    return "The Groq model name is not available. Set GROQ_MODEL=openai/gpt-oss-20b.";
  }
  if (status === 401 || status === 403) return "The Groq API key was rejected.";
  if (status === 429) return "Groq rate limit reached. Try again in a minute.";
  return "Groq did not respond.";
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const value = JSON.parse(trimmed) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Model did not return a JSON object");
  }
  return value as Record<string, unknown>;
}

async function generateText(prompt: string, json: boolean): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
  let lastError: unknown;
  for (const model of modelCandidates()) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: json ? 0.2 : 0.6,
        max_tokens: 1024,
        ...(json ? { response_format: { type: "json_object" as const } } : {}),
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty model response");
      return text;
    } catch (err) {
      lastError = err;
      if (errorStatus(err) !== 404) throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Groq did not respond.");
}

const SOURCES: EnquirySource[] = ["whatsapp", "facebook", "website", "phone"];
const INTERESTS: EnquiryInterest[] = [
  "bootcamp",
  "fellowship",
  "corporate_training",
];
const LANGUAGES: EnquiryLanguage[] = ["bangla", "banglish", "english"];

function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || t.toLowerCase() === "null" || t.toLowerCase() === "unknown") return null;
  return t;
}

export async function aiExtract(message: string): Promise<{
  data: ExtractedEnquiry;
  usedAi: boolean;
  warning: string | null;
}> {
  const fallback = heuristicExtract(message);
  try {
    const text = await generateText(
      `You extract CRM fields from a message sent to BIAI, a Bangladeshi training organisation.

BIAI programmes: bootcamp, fellowship, corporate_training.
Language: bangla = Bengali script, banglish = Bengali written in English letters, english = English.
Intent one of: price_question, schedule, scholarship, ready_to_pay, general.
Source only if the message clearly mentions WhatsApp, Facebook, the website, or a phone call; otherwise null.

Do not invent a name or phone that is not in the message. needsReview is true if name or phone is missing or you are unsure.

Also draft suggestedReply: a short, warm reply (3-6 sentences) in English if they wrote English, otherwise Banglish (Roman Bengali). Never quote fake fees or dates. Ask one useful follow-up question. Sign off as the BIAI team, not with a personal name.

Return JSON with keys: name, phone, source, interest, language, intent, needsReview, suggestedReply.

MESSAGE:
${message}`,
      true,
    );
    const raw = parseJsonObject(text);
    const name = asNullableString(raw.name) ?? fallback.name;
    const phone = asNullableString(raw.phone) ?? fallback.phone;
    const data: ExtractedEnquiry = {
      name,
      phone,
      source: asEnum(raw.source, SOURCES) ?? fallback.source,
      interest: asEnum(raw.interest, INTERESTS) ?? fallback.interest,
      language: asEnum(raw.language, LANGUAGES) ?? fallback.language,
      intent: asNullableString(raw.intent) ?? fallback.intent,
      needsReview:
        typeof raw.needsReview === "boolean"
          ? raw.needsReview
          : fallback.needsReview,
      suggestedReply: asNullableString(raw.suggestedReply),
    };
    if (!data.name || !data.phone || !data.interest) data.needsReview = true;
    return { data, usedAi: true, warning: null };
  } catch (err) {
    return {
      data: fallback,
      usedAi: false,
      warning: `${friendlyAiError(err)} Filled what we could from the message.`,
    };
  }
}

export function resolveReplyLanguage(
  written: EnquiryLanguage,
  override: ReplyLanguage | undefined,
): "english" | "banglish" {
  if (override === "english" || override === "banglish") return override;
  return written === "english" ? "english" : "banglish";
}

export async function aiReply(input: {
  message: string;
  name?: string | null;
  interest?: EnquiryInterest | null;
  language?: EnquiryLanguage;
  replyLanguage?: ReplyLanguage;
  intent?: string | null;
  notes?: string;
}): Promise<{ reply: string; usedAi: boolean; warning: string | null; language: "english" | "banglish" }> {
  const language = input.language ?? "english";
  const target = resolveReplyLanguage(language, input.replyLanguage);
  const fallback = heuristicReply({ ...input, language, target });
  try {
    const reply = await generateText(
      `You write a first reply for the BIAI training team in Bangladesh.

Write in ${target === "english" ? "clear, friendly English" : "Banglish (Bengali in English letters, like 'bhai bootcamp er fee details share korte pari')"}.
Keep it 3-6 short sentences. Warm, not salesy. Do not invent fees, batch dates, or scholarships.
If they asked something specific, answer at a high level and offer to send details.
Ask one follow-up question. Sign as the BIAI team.

Lead name: ${input.name ?? "unknown"}
Programme: ${input.interest ?? "unknown"}
Intent: ${input.intent ?? "general"}
Staff notes: ${input.notes || "(none)"}
Their message:
${input.message}

Return only the reply text.`,
      false,
    );
    return { reply: reply.replace(/^["']|["']$/g, "").trim(), usedAi: true, warning: null, language: target };
  } catch (err) {
    return {
      reply: fallback,
      usedAi: false,
      warning: `${friendlyAiError(err)} Using a template reply.`,
      language: target,
    };
  }
}

export async function aiWeeklySummary(statsBlock: string): Promise<{
  summary: string;
  usedAi: boolean;
  warning: string | null;
}> {
  try {
    const summary = await generateText(
      `Write a short weekly briefing for the BIAI CRM team (Bangladesh). 3 short paragraphs plus 3 bullet action items.
Be concrete with the numbers given. Mention who still needs a follow-up. No fluff.

${statsBlock}`,
      false,
    );
    return { summary, usedAi: true, warning: null };
  } catch (err) {
    return {
      summary: statsBlock,
      usedAi: false,
      warning: `${friendlyAiError(err)} Showing the raw numbers instead.`,
    };
  }
}