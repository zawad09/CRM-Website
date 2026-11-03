import { GoogleGenAI } from "@google/genai";
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
  const key = process.env.GEMINI_API_KEY?.trim();
  return key ? key : null;
}

function modelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const fallbacks = ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"];
  return [...new Set([preferred, ...fallbacks].filter((m): m is string => Boolean(m)))];
}

function friendlyAiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY")) return "Add GEMINI_API_KEY in .env.local.";
  if (raw.includes("NOT_FOUND") || raw.includes("no longer available")) {
    return "The Gemini model name is outdated. Set GEMINI_MODEL=gemini-3.5-flash-lite.";
  }
  if (raw.includes("API_KEY_INVALID") || raw.includes("401") || raw.includes("403")) {
    return "The Gemini API key was rejected.";
  }
  return "Gemini did not respond.";
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
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;
  for (const model of modelCandidates()) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: json ? 0.2 : 0.6,
          maxOutputTokens: 1024,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      });
      const text = response.text?.trim();
      if (!text) throw new Error("Empty model response");
      return text;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("NOT_FOUND") && !msg.includes("no longer available") && !msg.includes("404")) {
        throw err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini did not respond.");
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
