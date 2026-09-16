import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { contributions, baseline } from "@/data/contributions";

function titleFor(id: string) {
  if (id === "original") return baseline.title;
  const c = contributions.find((c) => c.id === id);
  return c ? c.title : `Submission ${id}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "csv";

  const [
    { data: selections },
    { data: presVotes },
    { data: slideVotes },
    { data: comments },
    { data: combos },
    { data: comboItems },
  ] = await Promise.all([
    supabase.from("slide_selections").select("submission_id, slide_number, role"),
    supabase.from("presentation_votes").select("submission_id, vote"),
    supabase.from("slide_votes").select("submission_id, slide_number, vote"),
    supabase
      .from("comments")
      .select("submission_id, slide_number, body, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("combinations").select("id, not_carry_forward, created_at"),
    supabase
      .from("combination_items")
      .select("combination_id, position, submission_id, slide_number, role")
      .order("position", { ascending: true }),
  ]);

  // ---- aggregate ----
  const slideCounts = new Map<string, number>();
  for (const s of selections ?? []) {
    const k = `${s.submission_id}|${s.slide_number}`;
    slideCounts.set(k, (slideCounts.get(k) ?? 0) + 1);
  }

  const voteNet = new Map<string, { up: number; down: number; net: number }>();
  for (const v of presVotes ?? []) {
    const cur = voteNet.get(v.submission_id) ?? { up: 0, down: 0, net: 0 };
    if (v.vote === 1) cur.up += 1;
    if (v.vote === -1) cur.down += 1;
    cur.net = cur.up - cur.down;
    voteNet.set(v.submission_id, cur);
  }

  const itemsByCombo = new Map<string, typeof comboItems>();
  for (const it of comboItems ?? []) {
    const arr = itemsByCombo.get(it.combination_id) ?? [];
    arr.push(it);
    itemsByCombo.set(it.combination_id, arr);
  }

  if (format === "md") {
    const lines: string[] = [];
    lines.push("# InvoBridge Flyer Lab — Review Summary\n");
    lines.push(`Generated: ${new Date().toISOString()}\n`);

    lines.push("\n## Top selected slides\n");
    lines.push("| Submission | Slide | # Selected |\n|---|---|---|");
    [...slideCounts.entries()]
      .map(([k, n]) => {
        const [s, sl] = k.split("|");
        return { s, sl: Number(sl), n };
      })
      .sort((a, b) => b.n - a.n)
      .slice(0, 30)
      .forEach(({ s, sl, n }) => {
        lines.push(`| ${titleFor(s)} | ${sl} | ${n} |`);
      });

    lines.push("\n## Shortlist votes\n");
    lines.push("| Submission | 👍 | 👎 | Net |\n|---|---|---|---|");
    [...voteNet.entries()]
      .sort((a, b) => b[1].net - a[1].net)
      .forEach(([s, t]) => {
        lines.push(`| ${titleFor(s)} | ${t.up} | ${t.down} | ${t.net} |`);
      });

    lines.push("\n## Submitted combinations\n");
    for (const c of combos ?? []) {
      lines.push(`\n### Combination ${c.id}`);
      if (c.not_carry_forward) {
        lines.push(`**Not carry forward:** ${c.not_carry_forward}`);
      }
      const items = (itemsByCombo.get(c.id) ?? []).sort(
        (a, b) => a.position - b.position
      );
      items.forEach((it) => {
        lines.push(
          `${it.position}. ${titleFor(it.submission_id)} · Slide ${it.slide_number}${
            it.role ? ` (${it.role})` : ""
          }`
        );
      });
    }

    lines.push("\n## All comments\n");
    for (const c of comments ?? []) {
      lines.push(
        `- **${titleFor(c.submission_id)} · Slide ${c.slide_number}** — ${c.body}`
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="invobridge-review.md"`,
      },
    });
  }

  // default: CSV — one row per (submission, slide) with aggregate counts
  const header = [
    "submission_id",
    "submission_title",
    "slide_number",
    "times_selected",
  ];
  const rows: string[][] = [header];
  [...slideCounts.entries()]
    .map(([k, n]) => {
      const [s, sl] = k.split("|");
      return { s, sl, n };
    })
    .sort((a, b) => b.n - a.n)
    .forEach(({ s, sl, n }) => {
      rows.push([s, titleFor(s), sl, String(n)]);
    });

  const csv = rows
    .map((r) =>
      r.map((v) => (v.includes(",") ? `"${v.replace(/"/g, '""')}"` : v)).join(",")
    )
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invobridge-review.csv"`,
    },
  });
}