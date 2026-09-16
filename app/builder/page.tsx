"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Document, Page, pdfjs } from "react-pdf";
import { contributions, baseline, SLIDE_ROLES } from "@/data/contributions";
import { getReviewerId } from "@/lib/reviewer";

// Lazy-load react-pdf (browser-only) the same way PdfViewer does
const DocumentLazy = dynamic(
  () => import("react-pdf").then((m) => m.Document),
  { ssr: false }
);
const PageLazy = dynamic(
  () => import("react-pdf").then((m) => m.Page),
  { ssr: false }
);

type Selection = {
  id: string;
  submission_id: string;
  slide_number: number;
  role: string | null;
};

function fileFor(submissionId: string): string | null {
  if (submissionId === "original") return baseline.file;
  const c = contributions.find((c) => c.id === submissionId);
  return c?.file ?? null;
}

export default function BuilderPage() {
  const [items, setItems] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notCarry, setNotCarry] = useState("");
  const [pdfReady, setPdfReady] = useState(false);

  const reviewerId = useMemo(
    () => (typeof window === "undefined" ? "" : getReviewerId()),
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const pdfjs = await import("react-pdf").then((m) => m.pdfjs);
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      await import("react-pdf/dist/Page/AnnotationLayer.css");
      await import("react-pdf/dist/Page/TextLayer.css");
      if (mounted) setPdfReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!reviewerId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/selections?reviewer_id=${reviewerId}`);
      const data = await res.json();
      if (cancelled) return;
      const sorted = (data.selections ?? []).sort(
        (a: Selection, b: Selection) =>
          a.submission_id.localeCompare(b.submission_id) ||
          a.slide_number - b.slide_number
      );
      setItems(sorted);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewerId]);

  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
  }

  async function removeItem(id: string) {
    await fetch(`/api/selections?id=${id}`, { method: "DELETE" });
    setItems((it) => it.filter((s) => s.id !== id));
  }

  async function updateRole(id: string, role: string) {
    setItems((it) =>
      it.map((s) => (s.id === id ? { ...s, role: role || null } : s))
    );
    await fetch("/api/selections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: role || null }),
    });
  }

  async function submit() {
    if (!items.length || submitting) return;
    setSubmitting(true);
    const res = await fetch("/api/combinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewer_id: reviewerId,
        not_carry_forward: notCarry || null,
        items: items.map((s) => ({
          submission_id: s.submission_id,
          slide_number: s.slide_number,
          role: s.role,
        })),
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Submit failed: ${data.error ?? res.status}`);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="text-3xl font-bold">Combination submitted 🎉</h1>
          <p className="mt-3 text-slate-300">
            Thank you. Your proposed version has been recorded.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/results"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              See results
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              Back to gallery
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Build my version</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          These are the slides you flagged while reviewing. Reorder them to
          describe your preferred version of the InvoBridge flyer, optionally
          tag a role per slide, and submit.
        </p>

        {loading ? (
          <p className="mt-10 text-slate-500">Loading your selections…</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-300">
              You haven&apos;t selected any slides yet.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Open a contribution and tick “Include this slide in my concept”.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Back to gallery
            </Link>
          </div>
        ) : (
          <>
            <ol className="mt-10 space-y-4">
              {items.map((item, idx) => {
                const file = fileFor(item.submission_id);
                return (
                  <li
                    key={item.id}
                    className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl font-bold text-slate-600">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <button
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(idx, 1)}
                        disabled={idx === items.length - 1}
                        className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="w-48 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                      {pdfReady && file ? (
                        <DocumentLazy file={file} loading={<div className="py-10" />}>
                          <PageLazy
                            pageNumber={item.slide_number}
                            width={180}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                          />
                        </DocumentLazy>
                      ) : (
                        <div className="flex h-32 items-center justify-center text-xs text-slate-600">
                          Loading…
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          Submission {item.submission_id} · Slide{" "}
                          {item.slide_number}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.submission_id === "original"
                            ? baseline.title
                            : `Contribution ${item.submission_id}`}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <select
                          value={item.role ?? ""}
                          onChange={(e) => updateRole(item.id, e.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
                        >
                          <option value="">Role…</option>
                          {SLIDE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-auto text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <label className="block text-sm font-semibold text-slate-200">
                What should we NOT carry forward?
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Optional. Anything you think would weaken the final flyer if it
                survived.
              </p>
              <textarea
                value={notCarry}
                onChange={(e) => setNotCarry(e.target.value)}
                rows={3}
                placeholder="e.g. The technical architecture is too detailed for an executive flyer."
                className="mt-3 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={submit}
                disabled={submitting || !items.length}
                className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit my combination"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}