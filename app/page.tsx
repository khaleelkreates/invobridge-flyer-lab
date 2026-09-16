import Link from "next/link";
import { contributions } from "@/data/contributions";
import BaselineCard from "@/components/BaselineCard";
import SlideThumb from "@/components/SlideThumb";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            InvoBridge — Flyer Lab
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Presentation Review
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-300">
            We received 16 presentation contributions from the recent
            InvoBridge call for inputs.
          </p>

          <p className="mt-3 text-slate-400">
            Don&apos;t just vote for a favourite. Tell us which slides should
            survive into the final InvoBridge flyer. You can pull slides from
            different submissions into one combined concept.
          </p>
        </div>

        <div className="mt-12">
          <BaselineCard />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {contributions.map((contribution) => (
            <article
              key={contribution.id}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition hover:border-slate-700"
            >
              <div className="aspect-[16/10] overflow-hidden bg-slate-800">
                <SlideThumb file={contribution.file} width={400} />
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {contribution.title}
                  </h2>
                  <span className="text-xs font-bold text-slate-500">
                    #{contribution.id}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  Review this submission and its individual slides.
                </p>

                <Link
                  href={`/contributions/${contribution.id}`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Review presentation
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}