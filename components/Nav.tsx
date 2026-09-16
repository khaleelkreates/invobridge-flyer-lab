"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Gallery" },
  { href: "/original", label: "Baseline" },
  { href: "/builder", label: "My version" },
  { href: "/results", label: "Results" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-3">
        <Link
          href="/"
          className="mr-4 text-sm font-semibold tracking-tight text-emerald-400"
        >
          InvoBridge · Flyer Lab
        </Link>

        {items.map((it) => {
          const active =
            it.href === "/"
              ? pathname === "/"
              : pathname.startsWith(it.href);

          return (
            <Link
              key={it.href}
              href={it.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}