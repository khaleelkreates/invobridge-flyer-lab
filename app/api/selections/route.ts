import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reviewer_id = searchParams.get("reviewer_id");
  const submission_id = searchParams.get("submission_id");
  const slide_number = searchParams.get("slide_number");

  // List mode — all selections for this reviewer
  if (reviewer_id && !submission_id) {
    const { data, error } = await supabase
      .from("slide_selections")
      .select("id, submission_id, slide_number, role")
      .eq("reviewer_id", reviewer_id)
      .order("submission_id", { ascending: true })
      .order("slide_number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ selections: data ?? [] });
  }

  if (!reviewer_id || !submission_id) {
    return NextResponse.json({ selected: false, role: null });
  }

  const { data } = await supabase
    .from("slide_selections")
    .select("role")
    .eq("reviewer_id", reviewer_id)
    .eq("submission_id", submission_id)
    .eq("slide_number", Number(slide_number))
    .maybeSingle();

  return NextResponse.json({
    selected: !!data,
    role: data?.role ?? null,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reviewer_id, submission_id, slide_number, role } = body;

  if (!reviewer_id || !submission_id || slide_number == null) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("slide_selections")
    .upsert(
      {
        reviewer_id,
        submission_id,
        slide_number: Number(slide_number),
        role: role || null,
      },
      { onConflict: "reviewer_id,submission_id,slide_number" }
    );

  if (error) {
    console.error("[selections POST] supabase error:", error);
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details, hint: error.hint },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, role } = body;

  if (!id) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("slide_selections")
    .update({ role: role ?? null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const reviewer_id = searchParams.get("reviewer_id");
  const submission_id = searchParams.get("submission_id");
  const slide_number = searchParams.get("slide_number");

  // Delete by row id
  if (id) {
    const { error } = await supabase
      .from("slide_selections")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Existing per-slide delete
  if (!reviewer_id || !submission_id || slide_number == null) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("slide_selections")
    .delete()
    .eq("reviewer_id", reviewer_id)
    .eq("submission_id", submission_id)
    .eq("slide_number", Number(slide_number));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}