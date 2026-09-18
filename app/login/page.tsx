"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (res.ok) {
      router.push(from);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Invalid code");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          InvoBridge Presentation Lab
        </p>
        <h1 className="mt-3 text-2xl font-bold">Enter your access code</h1>
        <p className="mt-2 text-sm text-slate-400">
          Paste the code you received. You only need to do this once.
        </p>

        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="xxxx-xxxx"
          className="mt-6 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-mono tracking-widest text-center text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Enter"}
        </button>

        <p className="mt-6 text-center text-xs text-slate-500">
          Problems with your code? Ask in the WhatsApp group.
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginInner />
    </Suspense>
  );
}