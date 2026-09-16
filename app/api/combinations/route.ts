import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reviewer_id = searchParams.get("reviewer_id");

  if (!reviewer_id) {
    return NextResponse.json({ combinations: [] });
  }

  const { data, error } = await supabase
    .from("combinations")
    .select(
      "id, not_carry_forward, created_at, combination_items(id, position, submission_id, slide_number, role)"
    )
    .eq("reviewer_id", reviewer_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ combinations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reviewer_id, not_carry_forward, items } = body;

  if (!reviewer_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { data: combo, error: comboErr } = await supabase
    .from("combinations")
    .insert({ reviewer_id, not_carry_forward: not_carry_forward ?? null })
    .select("id")
    .single();

  if (comboErr || !combo) {
    return NextResponse.json(
      { error: comboErr?.message ?? "insert failed" },
      { status: 500 }
    );
  }

  const rows = items.map((it: any, idx: number) => ({
    combination_id: combo.id,
    position: idx + 1,
    submission_id: String(it.submission_id),
    slide_number: Number(it.slide_number),
    role: it.role ?? null,
  }));

  const { error: itemsErr } = await supabase
    .from("combination_items")
    .insert(rows);

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: combo.id });
}