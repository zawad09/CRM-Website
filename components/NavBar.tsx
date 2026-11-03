"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Pipeline" },
  { href: "/new", label: "New enquiry" },
  { href: "/dashboard", label: "Dashboard" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-[88rem] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-neutral-900"
        >
          BIAI CRM
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-teal-50 font-medium text-teal-800"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
