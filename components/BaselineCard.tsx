import Link from "next/link";
import { baseline } from "@/data/contributions";

export default function BaselineCard() {
  return (
    <article className="mb-10 overflow-hidden rounded-2xl border border-emerald-900/60 bg-emerald-950/30">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Baseline
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {baseline.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            {baseline.description}
          </p>
        </div>
        <Link
          href="/original"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-900/40"
        >
          View baseline →
        </Link>
      </div>
    </article>
  );
}