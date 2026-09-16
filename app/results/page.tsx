import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { contributions, baseline } from "@/data/contributions";

export const dynamic = "force-dynamic";

function titleFor(submissionId: string) {
  if (submissionId === "original") return baseline.title;
  const c = contributions.find((c) => c.id === submissionId);
  return c ? c.title : `Submission ${submissionId}`;
}

type SlideKey = string; // "submission_id|slide_number"
const keyOf = (s: string, n: number) => `${s}|${n}`;

export default async function ResultsPage() {
  // ---------- raw data ----------
  const [
    { data: rawSelections },
    { data: presVotes },
    { data: recentComments },
    { data: combos },
    { data: comboItems },
  ] = await Promise.all([
    supabase.from("slide_selections").select("submission_id, slide_number"),
    supabase.from("presentation_votes").select("submission_id, vote"),
    supabase
      .from("comments")
      .select("id, submission_id, slide_number, body, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("combinations").select("id"),
    supabase
      .from("combination_items")
      .select("combination_id, position, submission_id, slide_number, role"),
  ]);

  // ---------- most selected slides ----------
  const slideCounts = new Map<SlideKey, number>();
  for (const s of rawSelections ?? []) {
    const k = keyOf(s.submission_id, s.slide_number);
    slideCounts.set(k, (slideCounts.get(k) ?? 0) + 1);
  }
  const topSlides = [...slideCounts.entries()]
    .map(([k, count]) => {
      const [submission_id, slide_number] = k.split("|");
      return { submission_id, slide_number: Number(slide_number), count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // ---------- presentation votes ----------
  const voteTotals = new Map<string, { up: number; down: number; net: number }>();
  for (const v of presVotes ?? []) {
    const cur = voteTotals.get(v.submission_id) ?? { up: 0, down: 0, net: 0 };
    if (v.vote === 1) cur.up += 1;
    else if (v.vote === -1) cur.down += 1;
    cur.net = cur.up - cur.down;
    voteTotals.set(v.submission_id, cur);
  }
  const topVoted = [...voteTotals.entries()]
    .map(([submission_id, t]) => ({ submission_id, ...t }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 10);

  // ---------- common slide pairs across combinations ----------
  // Group items by combination_id
  const byCombo = new Map<string, typeof comboItems>();
  for (const it of comboItems ?? []) {
    const arr = byCombo.get(it.combination_id) ?? [];
    arr.push(it);
    byCombo.set(it.combination_id, arr);
  }

  // Count every unordered pair of slides that co-occur in a combination
  const pairCounts = new Map<string, number>();
  for (const [, items] of byCombo) {
    const keys = items.map((it) => keyOf(it.submission_id, it.slide_number));
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const [a, b] = [keys[i], keys[j]].sort();
        const k = `${a}__${b}`;
        pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1);
      }
    }
  }
  const topPairs = [...pairCounts.entries()]
    .map(([k, count]) => {
      const [a, b] = k.split("__");
      const [sa, na] = a.split("|");
      const [sb, nb] = b.split("|");
      return {
        count,
        a: { submission_id: sa, slide_number: Number(na) },
        b: { submission_id: sb, slide_number: Number(nb) },
      };
    })
    .sort((x, y) => y.count - x.count)
    .slice(0, 10);

  // ---------- role distribution across all selections ----------
  const roleCounts = new Map<string, number>();
  for (const it of comboItems ?? []) {
    if (!it.role) continue;
    roleCounts.set(it.role, (roleCounts.get(it.role) ?? 0) + 1);
  }
  const topRoles = [...roleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // ---------- header counts ----------
  const totalSelections = rawSelections?.length ?? 0;
  const totalCombos = combos?.length ?? 0;
  const totalComments = recentComments?.length ?? 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Human Review Summary
            </h1>
            <p className="mt-2 text-slate-400">
              {totalSelections} slide selections · {totalCombos} combined
              versions · {totalComments} recent comments
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/api/export?format=csv"
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Export CSV
            </a>
            <a
              href="/api/export?format=md"
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Export Markdown
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Top selected slides */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Most selected slides</h2>
            {topSlides.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No selections yet.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {topSlides.map((s, i) => (
                  <li
                    key={`${s.submission_id}-${s.slide_number}`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="mr-3 text-xs text-slate-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Link
                        href={`/contributions/${s.submission_id}`}
                        className="font-medium text-slate-200 hover:text-white"
                      >
                        {titleFor(s.submission_id)}
                      </Link>
                      <span className="ml-2 text-slate-500">
                        · Slide {s.slide_number}
                      </span>
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {s.count}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Top voted */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Top shortlisted submissions</h2>
            {topVoted.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No votes yet.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {topVoted.map((v, i) => (
                  <li
                    key={v.submission_id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="mr-3 text-xs text-slate-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Link
                        href={`/contributions/${v.submission_id}`}
                        className="font-medium text-slate-200 hover:text-white"
                      >
                        {titleFor(v.submission_id)}
                      </Link>
                    </span>
                    <span className="text-slate-400">
                      <span className="text-emerald-400">👍 {v.up}</span>
                      <span className="mx-2">·</span>
                      <span className="text-red-400">👎 {v.down}</span>
                      <span className="ml-3 font-semibold text-white">
                        net {v.net > 0 ? `+${v.net}` : v.net}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ---------- COMMON COMBINATIONS ---------- */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">
              Most common slide pairs
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Slides that reviewers independently placed together in the same
              combined version.
            </p>
            {topPairs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No combined versions submitted yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {topPairs.map((p, i) => (
                  <li
                    key={`${p.a.submission_id}-${p.a.slide_number}-${p.b.submission_id}-${p.b.slide_number}`}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {p.count} reviewer{p.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-200">
                      <span className="font-medium">
                        {p.a.submission_id === "original"
                          ? "Baseline"
                          : `Sub ${p.a.submission_id}`}{" "}
                        · Slide {p.a.slide_number}
                      </span>
                      <span className="mx-2 text-slate-500">+</span>
                      <span className="font-medium">
                        {p.b.submission_id === "original"
                          ? "Baseline"
                          : `Sub ${p.b.submission_id}`}{" "}
                        · Slide {p.b.slide_number}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Role distribution</h2>
            <p className="mt-1 text-xs text-slate-500">
              How reviewers tagged the slides they carried forward.
            </p>
            {topRoles.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No roles tagged yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {topRoles.map(([role, count]) => (
                  <li
                    key={role}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-200">{role}</span>
                    <span className="font-semibold text-emerald-400">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ---------- Recent comments ---------- */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Recent comments</h2>
          {!recentComments || recentComments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No comments yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentComments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/contributions/${c.submission_id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-emerald-400 hover:text-emerald-300"
                    >
                      {titleFor(c.submission_id)} · Slide {c.slide_number}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-200">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}