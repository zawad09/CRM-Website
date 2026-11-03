"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { INTEREST_META, LANGUAGE_META, SOURCE_META, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { SAMPLE_ENQUIRIES } from "@/lib/samples";
import type {
  EnquiryInterest,
  EnquiryLanguage,
  EnquirySource,
  EnquiryStatus,
} from "@/lib/types";
import { btnPrimary, btnSecondary, cardClass, inputClass, labelClass } from "@/lib/ui";

type Duplicate = {
  _id: string;
  name: string | null;
  phone: string | null;
  status: EnquiryStatus;
};

export default function NewEnquiryPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<EnquirySource>("whatsapp");
  const [interest, setInterest] = useState<EnquiryInterest | "">("");
  const [language, setLanguage] = useState<EnquiryLanguage>("english");
  const [intent, setIntent] = useState("");
  const [notes, setNotes] = useState("");
  const [suggestedReply, setSuggestedReply] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);

  function applySample(index: number) {
    const sample = SAMPLE_ENQUIRIES[index];
    if (!sample) return;
    setMessage(sample.message);
    setWarning("Sample loaded. Click Fill with AI to extract the fields.");
  }

  async function fillWithAi() {
    if (!message.trim()) {
      setError("Paste a message first.");
      return;
    }
    setExtracting(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not read the message");
      const extracted = data.data;
      if (extracted.name) setName(extracted.name);
      if (extracted.phone) setPhone(extracted.phone);
      if (extracted.source) setSource(extracted.source);
      if (extracted.interest) setInterest(extracted.interest);
      if (extracted.language) setLanguage(extracted.language);
      if (extracted.intent) setIntent(extracted.intent);
      if (extracted.suggestedReply) setSuggestedReply(extracted.suggestedReply);
      setNeedsReview(Boolean(extracted.needsReview));
      setWarning(
        data.usedAi
          ? "Check the fields, then save. You can edit anything the model got wrong."
          : data.warning,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the message");
    } finally {
      setExtracting(false);
    }
  }

  async function save(force = false) {
    setSaving(true);
    setError(null);
    setDuplicate(null);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          name: name || null,
          phone: phone || null,
          source,
          interest: interest || null,
          language,
          intent: intent || null,
          notes,
          needsReview,
          suggestedReply: suggestedReply || null,
          force,
        }),
      });
      const data = await res.json();
      if (data.duplicate) {
        setDuplicate(data.existing);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not save enquiry");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save enquiry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New enquiry</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          Paste the WhatsApp, Facebook, website or call note. AI fills name, phone,
          programme and a first reply in English or Banglish.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClass}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-medium">Pasted message</h2>
              <p className="mt-1 text-sm text-neutral-500">Keep the original wording.</p>
            </div>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) applySample(Number(e.target.value));
                e.target.value = "";
              }}
              className={`${inputClass} w-56`}
            >
              <option value="">Try a sample…</option>
              {SAMPLE_ENQUIRIES.map((s, i) => (
                <option key={s.label} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            required
            rows={12}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="bhai bootcamp er fee koto? 017…"
            className={`${inputClass} mt-4`}
          />
          <button
            type="button"
            disabled={extracting}
            onClick={() => void fillWithAi()}
            className={`${btnPrimary} mt-4`}
          >
            {extracting ? "Reading message…" : "Fill with AI"}
          </button>
        </section>

        <form
          className={cardClass}
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          <h2 className="text-[15px] font-medium">Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="name">
                Name
              </label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">
                Phone
              </label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="source">
                Came from
              </label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value as EnquirySource)}
                className={inputClass}
              >
                {(Object.keys(SOURCE_META) as EnquirySource[]).map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="interest">
                Wants
              </label>
              <select
                id="interest"
                value={interest}
                onChange={(e) => setInterest(e.target.value as EnquiryInterest | "")}
                className={inputClass}
              >
                <option value="">Unknown</option>
                {(Object.keys(INTEREST_META) as EnquiryInterest[]).map((s) => (
                  <option key={s} value={s}>
                    {INTEREST_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="language">
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as EnquiryLanguage)}
                className={inputClass}
              >
                {(Object.keys(LANGUAGE_META) as EnquiryLanguage[]).map((s) => (
                  <option key={s} value={s}>
                    {LANGUAGE_META[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="reply">
                Suggested reply
              </label>
              <textarea
                id="reply"
                rows={4}
                value={suggestedReply}
                onChange={(e) => setSuggestedReply(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={needsReview}
              onChange={(e) => setNeedsReview(e.target.checked)}
            />
            Flag for review
          </label>
          {warning ? <p className="mt-3 text-sm text-amber-800">{warning}</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
          {duplicate ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This number already exists: {duplicate.name ?? "Unnamed"} (
              {STATUS_META[duplicate.status].label}).
              <div className="mt-2 flex gap-2">
                <Link href="/" className={btnSecondary}>
                  Back to pipeline
                </Link>
                <button type="button" onClick={() => void save(true)} className={btnPrimary}>
                  Save as new anyway
                </button>
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving || !message.trim()} className={btnPrimary}>
              {saving ? "Saving…" : "Save enquiry"}
            </button>
            <span className="text-xs text-neutral-400">
              Starts in {STATUS_META[STATUS_ORDER[0]].label}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
