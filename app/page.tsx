"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EnquiryDrawer } from "@/components/EnquiryDrawer";
import { PipelineBoard } from "@/components/PipelineBoard";
import { INTEREST_META, SOURCE_META } from "@/lib/constants";
import { isStale } from "@/lib/stale";
import type {
  EnquiryInterest,
  EnquirySource,
  EnquiryStatus,
  SerializedEnquiry,
} from "@/lib/types";
import { btnPrimary, btnSecondary, cardClass, inputClass } from "@/lib/ui";

type ListState = {
  loading: boolean;
  error: string | null;
  items: SerializedEnquiry[];
};

export default function HomePage() {
  const [list, setList] = useState<ListState>({
    loading: true,
    error: null,
    items: [],
  });
  const [q, setQ] = useState("");
  const [source, setSource] = useState<EnquirySource | "">("");
  const [interest, setInterest] = useState<EnquiryInterest | "">("");
  const [staleOnly, setStaleOnly] = useState(false);
  const [selected, setSelected] = useState<SerializedEnquiry | null>(null);

  const load = useCallback(async () => {
    setList((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (source) params.set("source", source);
      if (interest) params.set("interest", interest);
      const res = await fetch(`/api/enquiries?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load enquiries");
      setList({ loading: false, error: null, items: data.enquiries ?? [] });
    } catch (err) {
      setList({
        loading: false,
        error: err instanceof Error ? err.message : "Could not load enquiries",
        items: [],
      });
    }
  }, [q, source, interest]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (staleOnly ? list.items.filter((e) => isStale(e)) : list.items),
    [list.items, staleOnly],
  );
  const staleCount = list.items.filter((e) => isStale(e)).length;

  async function move(id: string, status: EnquiryStatus) {
    const current = list.items.find((e) => e._id === id);
    if (!current || current.status === status) return;
    setList((s) => ({
      ...s,
      items: s.items.map((e) => (e._id === id ? { ...e, status } : e)),
    }));
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not move");
      setList((s) => ({
        ...s,
        items: s.items.map((e) => (e._id === id ? data.enquiry : e)),
      }));
      setSelected((sel) => (sel?._id === id ? data.enquiry : sel));
    } catch {
      void load();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-neutral-500">
            New → Contacted → Interested → Paid. Drag a card to change status.
            Anyone still New or Contacted after 48 hours is flagged.
          </p>
        </div>
        <Link href="/new" className={btnPrimary}>
          New enquiry
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or phone"
            className={inputClass}
          />
        </div>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as EnquirySource | "")}
          className={`${inputClass} w-40`}
        >
          <option value="">All sources</option>
          {(Object.keys(SOURCE_META) as EnquirySource[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_META[s].label}
            </option>
          ))}
        </select>
        <select
          value={interest}
          onChange={(e) => setInterest(e.target.value as EnquiryInterest | "")}
          className={`${inputClass} w-48`}
        >
          <option value="">All programmes</option>
          {(Object.keys(INTEREST_META) as EnquiryInterest[]).map((s) => (
            <option key={s} value={s}>
              {INTEREST_META[s].label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setStaleOnly((v) => !v)}
          className={
            staleOnly
              ? "inline-flex items-center justify-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 disabled:cursor-not-allowed disabled:opacity-60"
              : "inline-flex items-center justify-center gap-2 rounded-md border border-rose-300 bg-white px-3.5 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          Needs follow-up{staleCount ? ` (${staleCount})` : ""}
        </button>
      </div>

      {list.loading ? (
        <div className={`${cardClass} text-sm text-neutral-500`}>Loading pipeline…</div>
      ) : list.error ? (
        <div className={`${cardClass} border-rose-200`}>
          <p className="text-sm text-rose-700">{list.error}</p>
          <button type="button" onClick={() => void load()} className={`${btnPrimary} mt-3`}>
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className={`${cardClass} text-sm text-neutral-500`}>
          {staleOnly
            ? "Nobody is waiting more than 48 hours. Nice."
            : "No enquiries yet. Paste a WhatsApp message on the New enquiry page, or run npm run seed:demo."}
        </div>
      ) : (
        <PipelineBoard items={visible} onMove={(id, status) => void move(id, status)} onOpen={setSelected} />
      )}

      {selected ? (
        <EnquiryDrawer
          enquiry={selected}
          onClose={() => setSelected(null)}
          onUpdated={(enquiry) => {
            setSelected(enquiry);
            setList((s) => ({
              ...s,
              items: s.items.map((e) => (e._id === enquiry._id ? enquiry : e)),
            }));
          }}
          onDeleted={(id) => {
            setSelected(null);
            setList((s) => ({ ...s, items: s.items.filter((e) => e._id !== id) }));
          }}
        />
      ) : null}
    </div>
  );
}
