"use client";

import { useEffect, useState } from "react";

type Code = {
  code: string;
  label: string | null;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<Code[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/codes");
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes ?? []);
        setAuthed(true);
      }
      setChecking(false);
    })();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      await loadCodes();
    } else {
      setError("Wrong password");
    }
    setBusy(false);
  }

  async function loadCodes() {
    const res = await fetch("/api/admin/codes");
    if (res.ok) {
      const data = await res.json();
      setCodes(data.codes ?? []);
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label || null }),
    });
    if (res.ok) {
      setLabel("");
      await loadCodes();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to generate");
    }
    setBusy(false);
  }

  async function toggleActive(code: string, active: boolean) {
    await fetch("/api/admin/codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, active }),
    });
    loadCodes();
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code);
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <form
          onSubmit={login}
          className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <h1 className="text-2xl font-bold">Admin access</h1>
          <p className="mt-2 text-sm text-slate-400">
            For the review coordinator only.
          </p>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="mt-6 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
          />
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </main>
    );
  }

  const active = codes.filter((c) => c.active).length;
  const used = codes.filter((c) => c.last_used_at).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold">Access codes</h1>
        <p className="mt-2 text-slate-400">
          {codes.length} total · {active} active · {used} used at least once
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="block text-sm font-semibold text-slate-200">
            Generate a new code
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Optional: label it with the person&apos;s name so you can find it
            later.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Ada, Marketing, Reviewer 12"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <button
              onClick={generate}
              disabled={busy}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
            >
              {busy ? "Generating…" : "Generate"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Label</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Last used</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {codes.map((c) => (
                <tr key={c.code} className={c.active ? "" : "opacity-40"}>
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {c.code}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {c.label ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.active ? (
                      <span className="text-emerald-400">active</span>
                    ) : (
                      <span className="text-slate-500">disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.last_used_at
                      ? new Date(c.last_used_at).toLocaleString()
                      : "never"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => copy(c.code)}
                      className="mr-3 text-xs text-slate-400 hover:text-white"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => toggleActive(c.code, !c.active)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      {c.active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}