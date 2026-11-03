import { z } from "zod";
import {
  INTERESTS,
  LANGUAGES,
  SOURCES,
  STATUSES,
} from "./types";

export const sourceSchema = z.enum(SOURCES);
export const interestSchema = z.enum(INTERESTS);
export const statusSchema = z.enum(STATUSES);
export const languageSchema = z.enum(LANGUAGES);

/** Query params accepted by GET /api/enquiries. */
export const listQuerySchema = z.object({
  status: statusSchema.optional(),
  source: sourceSchema.optional(),
  interest: interestSchema.optional(),
  q: z.string().trim().max(100).optional(),
  stale: z.literal("1").optional(),
});

/** Body for POST /api/enquiries. `force` bypasses the duplicate-phone check. */
export const createEnquirySchema = z.object({
  message: z.string().trim().min(1, "Message is required"),
  name: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  source: sourceSchema.default("whatsapp"),
  interest: interestSchema.nullable().optional(),
  status: statusSchema.default("new"),
  language: languageSchema.default("english"),
  intent: z.string().trim().max(200).nullable().optional(),
  notes: z.string().max(5000).optional(),
  needsReview: z.boolean().optional(),
  suggestedReply: z.string().max(4000).nullable().optional(),
  force: z.boolean().optional(),
});

/** Body for PATCH /api/enquiries/[id]. Absent fields are left unchanged. */
export const updateEnquirySchema = z.object({
  name: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  source: sourceSchema.optional(),
  interest: interestSchema.nullable().optional(),
  status: statusSchema.optional(),
  message: z.string().trim().min(1).optional(),
  language: languageSchema.optional(),
  intent: z.string().trim().max(200).nullable().optional(),
  notes: z.string().max(5000).optional(),
  needsReview: z.boolean().optional(),
  suggestedReply: z.string().max(4000).nullable().optional(),
  /** Bump lastActivityAt without changing status (staff followed up). */
  touch: z.boolean().optional(),
});

export const extractBodySchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(8000),
});

export const replyBodySchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(8000),
  name: z.string().trim().max(200).nullable().optional(),
  interest: interestSchema.nullable().optional(),
  language: languageSchema.optional(),
  replyLanguage: z.enum(["auto", "english", "banglish"]).optional(),
  intent: z.string().trim().max(200).nullable().optional(),
  notes: z.string().max(5000).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;
