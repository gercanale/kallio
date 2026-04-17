"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Settings, House, Moon, Sun } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { APP_VERSION, APP_VARIANT } from "@/lib/version";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const language = useKallioStore((s) => s.language);
  const setLanguage = useKallioStore((s) => s.setLanguage);
  const theme = useKallioStore((s) => s.theme);
  const setTheme = useKallioStore((s) => s.setTheme);
  const signOut = useKallioStore((s) => s.signOut);
  const resetAll = useKallioStore((s) => s.resetAll);
  const t = useT();

  const handleGoHome = async () => {
    await signOut();
    resetAll();
    router.push("/");
  };

  const NAV_ITEMS = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
    { href: "/transactions", icon: ArrowLeftRight, label: t.nav.transactions },
    { href: "/settings", icon: Settings, label: t.nav.settings },
  ];

  return (
    <>
      {/* ── Mobile bottom bar ──────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active ? "text-teal-700" : "text-slate-400"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-teal-600" : ""}`} />
                <span>{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 transition-all"
          >
            <span className="text-base leading-none">{language === "es" ? "🇪🇸" : "🇬🇧"}</span>
            <span>{language === "es" ? "ES" : "EN"}</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 transition-all"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button
            onClick={handleGoHome}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 transition-all"
          >
            <House className="w-5 h-5" />
            <span>{language === "es" ? "Inicio" : "Home"}</span>
          </button>
        </div>
      </nav>

      {/* ── Desktop sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-56 bg-white border-r border-slate-200 flex-col z-40">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-teal-700 text-xl">Kallio</span>
          </Link>
          <span className="text-xs text-slate-400 tabular-nums mt-0.5 block">
            v{APP_VERSION} · {APP_VARIANT}
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${active ? "text-teal-600" : ""}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-5 space-y-1 border-t border-slate-100 pt-3">
          <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all"
          >
            <span className="text-base leading-none">{language === "es" ? "🇪🇸" : "🇬🇧"}</span>
            <span>{language === "es" ? "Español" : "English"}</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? (language === "es" ? "Modo claro" : "Light mode") : (language === "es" ? "Modo oscuro" : "Dark mode")}</span>
          </button>
          <button
            onClick={handleGoHome}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all"
          >
            <House className="w-4 h-4" />
            <span>{language === "es" ? "Volver al inicio" : "Back to home"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
