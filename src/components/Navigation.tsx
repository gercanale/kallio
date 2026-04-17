"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Settings, LogOut, Moon, Sun } from "lucide-react";
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
  const t = useT();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const NAV_ITEMS = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
    { href: "/transactions", icon: ArrowLeftRight, label: t.nav.transactions },
    { href: "/settings", icon: Settings, label: t.nav.settings },
  ];

  const btnInactive = "text-slate-400 dark:text-slate-500";
  const sidebarBtn = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all";

  return (
    <>
      {/* ── Mobile bottom bar ──────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active ? "text-teal-600 dark:text-teal-400" : btnInactive
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${btnInactive}`}
          >
            <span className="text-base leading-none">{language === "es" ? "🇪🇸" : "🇬🇧"}</span>
            <span>{language === "es" ? "ES" : "EN"}</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${btnInactive}`}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </nav>

      {/* ── Desktop sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex-col z-40">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/faviconnobg.png" alt="Kallio" className="w-7 h-7" />
            <span className="font-bold text-teal-700 dark:text-teal-400 text-xl">Kallio</span>
          </Link>
          <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums mt-0.5 block">
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
                    ? "bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-5 space-y-1 border-t border-slate-100 dark:border-slate-700 pt-3">
          <button onClick={() => setLanguage(language === "es" ? "en" : "es")} className={sidebarBtn}>
            <span className="text-base leading-none">{language === "es" ? "🇪🇸" : "🇬🇧"}</span>
            <span>{language === "es" ? "Español" : "English"}</span>
          </button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={sidebarBtn}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? (language === "es" ? "Modo claro" : "Light mode") : (language === "es" ? "Modo oscuro" : "Dark mode")}</span>
          </button>
          <button onClick={handleSignOut} className={sidebarBtn}>
            <LogOut className="w-4 h-4" />
            <span>{language === "es" ? "Cerrar sesión" : "Sign out"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
