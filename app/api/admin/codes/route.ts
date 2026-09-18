import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAdmin(req: NextRequest) {
  return req.cookies.get("invobridge_admin")?.value === "1";
}

function generateCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const part = () =>
    Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `${part()}-${part()}`;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data } = await supabase
    .from("access_codes")
    .select("code, label, active, created_at, last_used_at")
    .order("created_at", { ascending: false });
  return NextResponse.json({ codes: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { label } = await req.json().catch(() => ({}));

  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const { error } = await supabase
      .from("access_codes")
      .insert({ code, label: label || null });
    if (!error) return NextResponse.json({ code });
  }
  return NextResponse.json({ error: "Could not generate" }, { status: 500 });
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { code, active } = await req.json();
  const { error } = await supabase
    .from("access_codes")
    .update({ active })
    .eq("code", code);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}