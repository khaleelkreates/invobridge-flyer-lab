import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reviewer_id = searchParams.get("reviewer_id");
  const submission_id = searchParams.get("submission_id");
  const type = searchParams.get("type");
  const slide_number = searchParams.get("slide_number");

  if (!reviewer_id || !submission_id) {
    return NextResponse.json({ vote: null });
  }

  if (type === "slide") {
    const { data } = await supabase
      .from("slide_votes")
      .select("vote")
      .eq("reviewer_id", reviewer_id)
      .eq("submission_id", submission_id)
      .eq("slide_number", Number(slide_number))
      .maybeSingle();
    return NextResponse.json({ vote: data?.vote ?? null });
  }

  const { data } = await supabase
    .from("presentation_votes")
    .select("vote")
    .eq("reviewer_id", reviewer_id)
    .eq("submission_id", submission_id)
    .maybeSingle();
  return NextResponse.json({ vote: data?.vote ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, reviewer_id, submission_id, vote } = body;

  if (!reviewer_id || !submission_id || (vote !== 1 && vote !== -1)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const table = type === "slide" ? "slide_votes" : "presentation_votes";
  const row: Record<string, unknown> = { reviewer_id, submission_id, vote };
  if (type === "slide") row.slide_number = Number(body.slide_number);

  const conflictCols =
    type === "slide"
      ? "reviewer_id,submission_id,slide_number"
      : "reviewer_id,submission_id";

  const { error } = await supabase
    .from(table)
    .upsert(row, { onConflict: conflictCols });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}