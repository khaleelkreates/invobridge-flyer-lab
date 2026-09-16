"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { contributions, baseline, SLIDE_ROLES } from "@/data/contributions";
import { getReviewerId } from "@/lib/reviewer";

// ---- lazy-loaded react-pdf pieces (browser-only) ----
const Document = dynamic(
  () => import("react-pdf").then((m) => m.Document),
  { ssr: false }
);
const Page = dynamic(
  () => import("react-pdf").then((m) => m.Page),
  { ssr: false }
);

type Props = {
  id: string;
  readOnly?: boolean;
};

export default function PdfViewer({ id, readOnly = false }: Props) {
  const submission =
    id === "original"
      ? baseline
      : contributions.find((c) => c.id === id) ?? null;

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfReady, setPdfReady] = useState(false);

  const [slideVote, setSlideVote] = useState<number | null>(null);
  const [presVote, setPresVote] = useState<number | null>(null);
  const [selected, setSelected] = useState(false);
  const [role, setRole] = useState<string>("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<
    { id: string; body: string; slide_number: number | null; created_at: string }[]
  >([]);
  const [busy, setBusy] = useState(false);

  const reviewerId = useMemo(
    () => (typeof window === "undefined" ? "" : getReviewerId()),
    []
  );

  // ---- load worker + CSS only in browser ----
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

  // ---- load current state for this submission + slide ----
  useEffect(() => {
    if (!submission || readOnly || !reviewerId) return;
    let cancelled = false;

    async function load() {
      const [pv, sv, sel, cm] = await Promise.all([
        fetch(
          `/api/vote?reviewer_id=${reviewerId}&submission_id=${submission!.id}`
        ).then((r) => r.json()),
        fetch(
          `/api/vote?type=slide&reviewer_id=${reviewerId}&submission_id=${submission!.id}&slide_number=${pageNumber}`
        ).then((r) => r.json()),
        fetch(
          `/api/selections?reviewer_id=${reviewerId}&submission_id=${submission!.id}&slide_number=${pageNumber}`
        ).then((r) => r.json()),
        fetch(
          `/api/comments?submission_id=${submission!.id}&slide_number=${pageNumber}`
        ).then((r) => r.json()),
      ]);
      if (cancelled) return;
      setPresVote(pv.vote ?? null);
      setSlideVote(sv.vote ?? null);
      setSelected(!!sel.selected);
      setRole(sel.role ?? "");
      setComments(cm.comments ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [submission, pageNumber, reviewerId, readOnly]);

  if (!submission) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-3xl font-bold">Not found</h1>
          <p className="mt-3 text-slate-400">
            No submission with id <code>{id}</code>.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Back to gallery
          </Link>
        </section>
      </main>
    );
  }

  async function castPresVote(v: number) {
    if (readOnly || busy) return;
    setBusy(true);
    await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewer_id: reviewerId,
        submission_id: submission!.id,
        vote: v,
      }),
    });
    setPresVote(v);
    setBusy(false);
  }

  async function castSlideVote(v: number) {
    if (readOnly || busy) return;
    setBusy(true);
    await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "slide",
        reviewer_id: reviewerId,
        submission_id: submission!.id,
        slide_number: pageNumber,
        vote: v,
      }),
    });
    setSlideVote(v);
    setBusy(false);
  }

  async function toggleSelection() {
    if (readOnly || busy) return;
    setBusy(true);
    if (selected) {
      await fetch(
        `/api/selections?reviewer_id=${reviewerId}&submission_id=${submission!.id}&slide_number=${pageNumber}`,
        { method: "DELETE" }
      );
      setSelected(false);
    } else {
      await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewer_id: reviewerId,
          submission_id: submission!.id,
          slide_number: pageNumber,
          role: role || null,
        }),
      });
      setSelected(true);
    }
    setBusy(false);
  }

  async function updateRole(newRole: string) {
    setRole(newRole);
    if (!selected || readOnly) return;
    await fetch("/api/selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewer_id: reviewerId,
        submission_id: submission!.id,
        slide_number: pageNumber,
        role: newRole || null,
      }),
    });
  }

  async function submitComment() {
    if (readOnly || !comment.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewer_id: reviewerId,
        submission_id: submission!.id,
        slide_number: pageNumber,
        body: comment.trim(),
      }),
    });
    const data = await res.json();
    if (data.comment) {
      setComments((c) => [...c, data.comment]);
      setComment("");
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-sm font-medium text-slate-300 hover:text-white"
          >
            ← Back to gallery
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            {submission.title}
          </p>
          {id !== "original" ? (
            <Link
              href="/original"
              className="text-xs text-slate-400 hover:text-white"
            >
              View baseline
            </Link>
          ) : (
            <span className="text-xs text-slate-500">Baseline (read-only)</span>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {!readOnly && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-300">
                Overall, would you shortlist this submission?
              </span>
              <button
                onClick={() => castPresVote(1)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  presVote === 1
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-slate-700 text-slate-200 hover:bg-slate-800"
                }`}
              >
                👍 Yes
              </button>
              <button
                onClick={() => castPresVote(-1)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  presVote === -1
                    ? "bg-red-500 text-white"
                    : "border border-slate-700 text-slate-200 hover:bg-slate-800"
                }`}
              >
                👎 Not yet
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>

          <span className="text-sm text-slate-400">
            Slide <span className="font-semibold text-white">{pageNumber}</span>{" "}
            of {numPages || "…"}
          </span>

          <button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4">
          {!pdfReady ? (
            <p className="py-20 text-center text-slate-400">Preparing viewer…</p>
          ) : (
            <Document
              file={submission.file}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <p className="py-20 text-center text-slate-400">Loading PDF…</p>
              }
              error={
                <p className="py-20 text-center text-red-400">
                  Failed to load PDF.
                </p>
              }
            >
              <div className="flex justify-center">
                <Page
                  pageNumber={pageNumber}
                  width={1000}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </div>
            </Document>
          )}
        </div>

        {!readOnly && (
          <>
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-200">
                Slide {pageNumber}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => castSlideVote(1)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    slideVote === 1
                      ? "bg-emerald-500 text-slate-950"
                      : "border border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  👍 Strong slide
                </button>
                <button
                  onClick={() => castSlideVote(-1)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    slideVote === -1
                      ? "bg-red-500 text-white"
                      : "border border-slate-700 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  👎 Needs work
                </button>

                <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={toggleSelection}
                    className="h-4 w-4"
                  />
                  Include this slide in my concept
                </label>

                {selected && (
                  <select
                    value={role}
                    onChange={(e) => updateRole(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
                  >
                    <option value="">Role…</option>
                    {SLIDE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-200">
                Comments on slide {pageNumber}
              </p>

              <div className="space-y-3">
                {comments.length === 0 && (
                  <p className="text-sm text-slate-500">No comments yet.</p>
                )}
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm"
                  >
                    <p className="text-slate-200">{c.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What works, what doesn't, what should change…"
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                />
                <button
                  onClick={submitComment}
                  disabled={!comment.trim() || busy}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-40"
                >
                  Post
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}