import { cookies } from "next/headers";
import crypto from "crypto";

const SECRET = process.env.LAB_SESSION_SECRET || "dev-insecure-secret";
const COOKIE_NAME = "invobridge_session";
const MAX_AGE = 60 * 60 * 24 * 15; // 15 days

function sign(value: string): string {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(value);
  return `${value}.${hmac.digest("hex")}`;
}

function verify(signed: string): string | null {
  const parts = signed.split(".");
  if (parts.length !== 2) return null;
  const [value, sig] = parts;
  const expected = sign(value).split(".")[1];
  if (expected.length !== sig.length) return null;
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig, "hex");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return value;
}

export function signSession(reviewerId: string) {
  return sign(reviewerId);
}

export function readSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  return verify(cookieValue);
}

export async function getSession(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return readSession(raw);
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = MAX_AGE;