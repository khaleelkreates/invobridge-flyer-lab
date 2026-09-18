import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const clean = code.trim().toLowerCase();

  const { data, error } = await supabase
    .from("access_codes")
    .select("code, active")
    .eq("code", clean)
    .maybeSingle();

  if (error || !data || !data.active) {
    return NextResponse.json({ error: "Invalid or inactive code" }, { status: 401 });
  }

  await supabase
    .from("access_codes")
    .update({ last_used_at: new Date().toISOString() })
    .eq("code", data.code);

  const reviewerId = `code_${data.code}`;

  const res = NextResponse.json({ ok: true, reviewerId });
  res.cookies.set(SESSION_COOKIE, signSession(reviewerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}