import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const submission_id = searchParams.get("submission_id");
  const slide_number = searchParams.get("slide_number");

  if (!submission_id) {
    return NextResponse.json({ comments: [] });
  }

  let query = supabase
    .from("comments")
    .select("id, body, slide_number, created_at")
    .eq("submission_id", submission_id)
    .order("created_at", { ascending: true });

  if (slide_number !== null) {
    query = query.eq("slide_number", Number(slide_number));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reviewer_id, submission_id, slide_number, body: text } = body;

  if (!reviewer_id || !submission_id || !text?.trim()) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      reviewer_id,
      submission_id,
      slide_number: slide_number ?? null,
      body: text.trim(),
    })
    .select("id, body, slide_number, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comment: data });
}