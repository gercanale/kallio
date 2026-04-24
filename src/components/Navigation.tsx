"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Settings, LogOut, ChevronDown, BookOpen } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { APP_VERSION, APP_VARIANT } from "@/lib/version";
import type { Language } from "@/lib/i18n";

const LANGS: { code: Language; flag: string; label: string; short: string }[] = [
  { code: "es", flag: "🇪🇸", label: "Español", short: "ES" },
  { code: "en", flag: "🇬🇧", label: "English", short: "EN" },
  { code: "it", flag: "🇮🇹", label: "Italiano", short: "IT" },
  { code: "de", flag: "🇩🇪", label: "Deutsch", short: "DE" },
  { code: "fr", flag: "🇫🇷", label: "Français", short: "FR" },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const language = useKallioStore((s) => s.language);
  const setLanguage = useKallioStore((s) => s.setLanguage);
  const signOut = useKallioStore((s) => s.signOut);
  const t = useT();

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const currentLang = LANGS.find((l) => l.code === language) ?? LANGS[0];
  const cycleLang = () => {
    const idx = LANGS.findIndex((l) => l.code === language);
    setLanguage(LANGS[(idx + 1) % LANGS.length].code);
  };

  const NAV_ITEMS = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
    { href: "/transactions", icon: ArrowLeftRight, label: t.nav.transactions },
    { href: "/settings", icon: Settings, label: t.nav.settings },
    { href: "/learn", icon: BookOpen, label: t.nav.learn },
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
            onClick={cycleLang}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${btnInactive}`}
          >
            <span className="text-base leading-none">{currentLang.flag}</span>
            <span>{currentLang.short}</span>
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
          {/* Language dropdown */}
          <div className="relative" ref={langRef}>
            <button onClick={() => setLangOpen((o) => !o)} className={sidebarBtn}>
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span className="flex-1 text-left">{currentLang.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
                {LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                      lang.code === language
                        ? "bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSignOut} className={sidebarBtn}>
            <LogOut className="w-4 h-4" />
            <span>{t.settings.signOut}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
