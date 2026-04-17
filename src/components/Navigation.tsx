"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Movimientos" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-slate-200 z-40 sm:relative sm:border-t-0 sm:border-b">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around sm:justify-start sm:gap-1 h-16 sm:h-14">
          {/* Logo – desktop only */}
          <Link href="/dashboard" className="hidden sm:flex items-center gap-2 mr-6 font-bold text-indigo-700 text-lg">
            Kallio
          </Link>

          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  active
                    ? "text-indigo-700 sm:bg-indigo-50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-5 h-5 sm:w-4 sm:h-4 ${active ? "text-indigo-600" : ""}`} />
                <span>{label}</span>
              </Link>
            );
          })}

          <Link
            href="/settings"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-all"
          >
            <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
            <span>Ajustes</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
