"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "@/components/StatusPill";
import {
  INTEREST_META,
  SOURCE_META,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/constants";
import type { DashboardStats } from "@/lib/dashboard";
import { relativeTime } from "@/lib/time";
import { btnPrimary, btnSecondary, cardClass } from "@/lib/ui";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [summaryWarning, setSummaryWarning] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load dashboard");
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateSummary() {
    setSummaryBusy(true);
    setSummaryWarning(null);
    try {
      const res = await fetch("/api/ai/summary", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not write summary");
      setSummary(data.summary ?? "");
      setSummaryWarning(data.warning);
    } catch (err) {
      setSummaryWarning(err instanceof Error ? err.message : "Could not write summary");
    } finally {
      setSummaryBusy(false);
    }
  }

  if (loading) {
    return <div className={`${cardClass} text-sm text-neutral-500`}>Loading dashboard…</div>;
  }
  if (error || !stats) {
    return (
      <div className={`${cardClass} border-rose-200`}>
        <p className="text-sm text-rose-700">{error ?? "No data"}</p>
        <button type="button" onClick={() => void load()} className={`${btnPrimary} mt-3`}>
          Try again
        </button>
      </div>
    );
  }

  const maxSource = Math.max(...Object.values(stats.bySource), 1);
  const maxInterest = Math.max(...Object.values(stats.byInterest), 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {stats.total} enquiries in the pipeline.
          {stats.conversionPct == null
            ? " Conversion shows once someone is Paid or Lost."
            : ` ${stats.conversionPct}% of closed leads paid.`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {STATUS_ORDER.map((status) => (
          <div key={status} className={cardClass}>
            <p className="text-xs font-medium text-neutral-500">{STATUS_META[status].label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.byStatus[status]}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClass}>
          <h2 className="text-[15px] font-medium">Where they came from</h2>
          <ul className="mt-4 space-y-2">
            {(Object.keys(SOURCE_META) as Array<keyof typeof SOURCE_META>).map((key) => (
              <Bar
                key={key}
                label={SOURCE_META[key].label}
                value={stats.bySource[key]}
                max={maxSource}
              />
            ))}
          </ul>
        </section>
        <section className={cardClass}>
          <h2 className="text-[15px] font-medium">What they want</h2>
          <ul className="mt-4 space-y-2">
            {(Object.keys(INTEREST_META) as Array<keyof typeof INTEREST_META>).map((key) => (
              <Bar
                key={key}
                label={INTEREST_META[key].label}
                value={stats.byInterest[key]}
                max={maxInterest}
              />
            ))}
            <Bar label="Unknown" value={stats.byInterest.unknown} max={maxInterest} />
          </ul>
        </section>
      </div>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-medium">Follow-up overdue (48 hours)</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Still New or Contacted, with no activity for two days.
            </p>
          </div>
          <Link href="/" className={btnSecondary}>
            Open pipeline
          </Link>
        </div>
        {stats.stale.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Nobody is waiting. Good week.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200 rounded-md border border-neutral-200">
            {stats.stale.map((item) => (
              <li key={item._id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <span className="min-w-36 text-sm font-medium">{item.name ?? "Unnamed"}</span>
                <span className="text-sm text-neutral-500">{item.phone ?? "No phone"}</span>
                <StatusPill status={item.status} />
                <span className="ml-auto text-xs text-neutral-400">
                  {relativeTime(item.lastActivityAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-medium">Weekly summary</h2>
            <p className="mt-1 text-sm text-neutral-500">
              A short briefing the team can paste into WhatsApp.
            </p>
          </div>
          <button type="button" disabled={summaryBusy} onClick={() => void generateSummary()} className={btnPrimary}>
            {summaryBusy ? "Writing…" : "Write with AI"}
          </button>
        </div>
        {summaryWarning ? <p className="mt-3 text-sm text-amber-800">{summaryWarning}</p> : null}
        {summary ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-md border border-neutral-200 bg-stone-50 px-3 py-3 text-sm text-neutral-800">
            {summary}
          </pre>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">Generate a summary after you have a few leads.</p>
        )}
      </section>
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.round((value / max) * 100);
  return (
    <li>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-neutral-700">{label}</span>
        <span className="text-neutral-500">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-teal-700" style={{ width: `${width}%` }} />
      </div>
    </li>
  );
}
