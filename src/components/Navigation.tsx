"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Settings } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { APP_VERSION, APP_VARIANT } from "@/lib/version";

export function Navigation() {
  const pathname = usePathname();
  const language = useKallioStore((s) => s.language);
  const setLanguage = useKallioStore((s) => s.setLanguage);
  const t = useT();

  const NAV_ITEMS = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
    { href: "/transactions", icon: ArrowLeftRight, label: t.nav.transactions },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-slate-200 z-40 sm:relative sm:border-t-0 sm:border-b">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around sm:justify-start sm:gap-1 h-16 sm:h-14">
          {/* Logo – desktop only */}
          <Link href="/dashboard" className="hidden sm:flex items-center gap-2 mr-6">
            <span className="font-bold text-teal-700 text-lg">Kallio</span>
            <span className="text-xs font-medium bg-teal-50 text-teal-600 border border-teal-200 rounded-full px-2 py-0.5 tabular-nums">
              v{APP_VERSION} · {APP_VARIANT}
            </span>
          </Link>

          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  active
                    ? "text-teal-700 sm:bg-teal-50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-5 h-5 sm:w-4 sm:h-4 ${active ? "text-teal-600" : ""}`} />
                <span>{label}</span>
              </Link>
            );
          })}

          <Link
            href="/settings"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-all"
          >
            <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
            <span>{t.nav.settings}</span>
          </Link>

          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ml-auto sm:ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            title={language === "es" ? "Switch to English" : "Cambiar a Español"}
          >
            <span className="text-base leading-none">{language === "es" ? "🇪🇸" : "🇬🇧"}</span>
            <span className="hidden sm:inline">{language === "es" ? "ES" : "EN"}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
