"use client";

import { useEffect, useState } from "react";
import {
  INTEREST_META,
  INTENT_META,
  LANGUAGE_META,
  SOURCE_META,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/constants";
import { isStale } from "@/lib/stale";
import { relativeTime } from "@/lib/time";
import type {
  EnquiryInterest,
  EnquiryLanguage,
  EnquirySource,
  EnquiryStatus,
  ReplyLanguage,
  SerializedEnquiry,
} from "@/lib/types";
import { btnDanger, btnPrimary, btnSecondary, inputClass, labelClass } from "@/lib/ui";
import { StatusPill } from "./StatusPill";

type Props = {
  enquiry: SerializedEnquiry;
  onClose: () => void;
  onUpdated: (enquiry: SerializedEnquiry) => void;
  onDeleted: (id: string) => void;
};

export function EnquiryDrawer({ enquiry, onClose, onUpdated, onDeleted }: Props) {
  const [draft, setDraft] = useState(enquiry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyLang, setReplyLang] = useState<ReplyLanguage>("auto");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyWarning, setReplyWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(enquiry);
    setError(null);
    setCopied(false);
  }, [enquiry]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/enquiries/${enquiry._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update");
      onUpdated(data.enquiry);
      setDraft(data.enquiry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setSaving(false);
    }
  }

  async function saveFields() {
    await patch({
      name: draft.name || null,
      phone: draft.phone || null,
      source: draft.source,
      interest: draft.interest,
      language: draft.language,
      intent: draft.intent,
      notes: draft.notes,
      needsReview: draft.needsReview,
      suggestedReply: draft.suggestedReply,
    });
  }

  async function suggestReply() {
    setReplyBusy(true);
    setReplyWarning(null);
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: draft.message,
          name: draft.name,
          interest: draft.interest,
          language: draft.language,
          replyLanguage: replyLang,
          intent: draft.intent,
          notes: draft.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not suggest a reply");
      setDraft((d) => ({ ...d, suggestedReply: data.reply }));
      setReplyWarning(data.warning);
      await fetch(`/api/enquiries/${enquiry._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestedReply: data.reply }),
      });
    } catch (err) {
      setReplyWarning(err instanceof Error ? err.message : "Could not suggest a reply");
    } finally {
      setReplyBusy(false);
    }
  }

  async function copyReply() {
    if (!draft.suggestedReply) return;
    await navigator.clipboard.writeText(draft.suggestedReply);
    setCopied(true);
  }

  async function remove() {
    if (!confirm("Delete this enquiry?")) return;
    const res = await fetch(`/api/enquiries/${enquiry._id}`, { method: "DELETE" });
    if (res.ok) onDeleted(enquiry._id);
  }

  const stale = isStale(draft);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" className="absolute inset-0 bg-neutral-900/30" onClick={onClose} aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{draft.name ?? "Unnamed enquiry"}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              <StatusPill status={draft.status} />
              {stale ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Needs follow-up
                </span>
              ) : null}
              <span>{relativeTime(draft.lastActivityAt)}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Close
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <p className={labelClass}>Original message</p>
            <p className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-stone-50 px-3 py-2 text-sm">
              {draft.message}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                value={draft.name ?? ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value || null })}
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                value={draft.phone ?? ""}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value || null })}
                className={inputClass}
              />
            </Field>
            <Field label="Came from">
              <select
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value as EnquirySource })}
                className={inputClass}
              >
                {(Object.keys(SOURCE_META) as EnquirySource[]).map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Wants">
              <select
                value={draft.interest ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    interest: (e.target.value || null) as EnquiryInterest | null,
                  })
                }
                className={inputClass}
              >
                <option value="">Unknown</option>
                {(Object.keys(INTEREST_META) as EnquiryInterest[]).map((s) => (
                  <option key={s} value={s}>
                    {INTEREST_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Language">
              <select
                value={draft.language}
                onChange={(e) =>
                  setDraft({ ...draft, language: e.target.value as EnquiryLanguage })
                }
                className={inputClass}
              >
                {(Object.keys(LANGUAGE_META) as EnquiryLanguage[]).map((s) => (
                  <option key={s} value={s}>
                    {LANGUAGE_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) => void patch({ status: e.target.value as EnquiryStatus })}
                className={inputClass}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={draft.needsReview}
              onChange={(e) => setDraft({ ...draft, needsReview: e.target.checked })}
            />
            Needs a human check
          </label>

          <Field label="Notes">
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className={inputClass}
              placeholder="What you told them, next step…"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={() => void saveFields()} className={btnPrimary}>
              {saving ? "Saving…" : "Save details"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void patch({ touch: true })}
              className={btnSecondary}
            >
              Mark followed up
            </button>
          </div>

          <section className="rounded-lg border border-teal-100 bg-teal-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-teal-900">Suggested reply</h3>
              <select
                value={replyLang}
                onChange={(e) => setReplyLang(e.target.value as ReplyLanguage)}
                className="rounded-md border border-teal-200 bg-white px-2 py-1 text-xs"
              >
                <option value="auto">Match how they wrote</option>
                <option value="banglish">Banglish</option>
                <option value="english">English</option>
              </select>
            </div>
            <p className="mt-1 text-xs text-teal-800/80">
              English if they wrote English; Banglish otherwise (including Bangla script).
            </p>
            <textarea
              rows={6}
              value={draft.suggestedReply ?? ""}
              onChange={(e) => setDraft({ ...draft, suggestedReply: e.target.value || null })}
              className={`${inputClass} mt-3`}
              placeholder="Generate a reply, then copy it into WhatsApp."
            />
            {replyWarning ? <p className="mt-2 text-xs text-amber-800">{replyWarning}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={replyBusy} onClick={() => void suggestReply()} className={btnPrimary}>
                {replyBusy ? "Writing…" : "Suggest reply"}
              </button>
              <button
                type="button"
                disabled={!draft.suggestedReply}
                onClick={() => void copyReply()}
                className={btnSecondary}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              {copied ? (
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => void patch({ status: "contacted" })}
                >
                  Mark as Contacted
                </button>
              ) : null}
            </div>
          </section>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <p className="text-xs text-neutral-400">
            Intent:{" "}
            {draft.intent && draft.intent in INTENT_META
              ? INTENT_META[draft.intent as keyof typeof INTENT_META].label
              : draft.intent ?? "—"}
          </p>

          <button type="button" onClick={() => void remove()} className={btnDanger}>
            Delete enquiry
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}
