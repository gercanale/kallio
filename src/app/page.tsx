"use client";

import Link from "next/link";
import { Shield, Sparkles, Calendar, CheckCircle2, LogIn, Moon, Sun, ChevronDown } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/useT";
import type { Language } from "@/lib/i18n";

const LANGS: { code: Language; flag: string; label: string; short: string }[] = [
  { code: "es", flag: "🇪🇸", label: "Español", short: "ES" },
  { code: "en", flag: "🇬🇧", label: "English", short: "EN" },
  { code: "it", flag: "🇮🇹", label: "Italiano", short: "IT" },
  { code: "de", flag: "🇩🇪", label: "Deutsch", short: "DE" },
  { code: "fr", flag: "🇫🇷", label: "Français", short: "FR" },
];

export default function LandingPage() {
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const activateSession = useKallioStore((s) => s.activateSession);
  const language = useKallioStore((s) => s.language);
  const setLanguage = useKallioStore((s) => s.setLanguage);
  const theme = useKallioStore((s) => s.theme);
  const setTheme = useKallioStore((s) => s.setTheme);
  const router = useRouter();
  const t = useT();

  const dark = theme === "dark";

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [langOpen]);

  useEffect(() => {
    if (sessionActive) { router.replace("/dashboard"); return; }
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/dashboard");
    });
  }, [sessionActive, router]);

  const currentLang = LANGS.find((l) => l.code === language) ?? LANGS[0];

  const handleDemo = () => {
    useKallioStore.getState().loadDemo();
    useKallioStore.getState().activateSession();
    router.push("/dashboard");
  };

  const handleContinue = () => {
    activateSession();
    router.push("/dashboard");
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasExistingAccount = hydrated && profile.onboardingComplete && !sessionActive;

  const features = [
    { icon: Shield, title: t.landing.feature1Title, desc: t.landing.feature1Desc },
    { icon: Sparkles, title: t.landing.feature2Title, desc: t.landing.feature2Desc },
    { icon: Calendar, title: t.landing.feature3Title, desc: t.landing.feature3Desc },
  ];

  const featureIconColors = [
    "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <img src="/faviconnobg.png" alt="Kallio" className="w-7 h-7" />
          <span className="font-bold text-xl tracking-tight text-teal-700 dark:text-white">Kallio</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm font-semibold transition-colors text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200"
            >
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span>{currentLang.short}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-2 border rounded-xl overflow-hidden z-50 min-w-[150px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-lg">
                {LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                      lang.code === language
                        ? "bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {hasExistingAccount ? (
            <button
              onClick={handleContinue}
              className="text-sm font-medium transition-colors text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200"
            >
              {t.landing.continueBtn}
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium transition-colors text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200"
            >
              {t.landing.access}
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-0 lg:flex lg:items-center lg:gap-16">
        <div className="flex-1 flex flex-col items-start text-left pb-8 lg:pb-0">
          <div className="inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-xs font-medium mb-8 bg-teal-100 border-teal-200 text-teal-700 dark:bg-teal-500/20 dark:border-teal-500/30 dark:text-teal-300">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400" />
            {t.landing.badge}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight mb-4 text-slate-900 dark:text-white">
            {t.landing.hero}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500 dark:from-teal-400 dark:to-emerald-400">
              {t.landing.heroHighlight}
            </span>
          </h1>

          <p className="text-lg sm:text-xl lg:text-2xl font-semibold mb-5 text-slate-600 dark:text-slate-300">
            {t.landing.heroSub}
          </p>

          <p className="text-base lg:text-lg leading-relaxed mb-10 max-w-lg text-slate-500 dark:text-slate-400">
            {t.landing.subtitle}
          </p>

          {hasExistingAccount && (
            <div className="w-full max-w-sm mb-6">
              <div className="border rounded-2xl p-4 flex items-center justify-between gap-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.landing.welcomeBack}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{profile.name} · {profile.activityType}</p>
                </div>
                <button
                  onClick={handleContinue}
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {t.landing.enter}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mb-10 w-full sm:w-auto">
            <button
              onClick={handleDemo}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              {t.landing.viewDemo}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{t.landing.trust1}</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{t.landing.trust2}</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{t.landing.trust3}</div>
          </div>
        </div>

        <div className="w-full lg:w-96 xl:w-[440px] flex-shrink-0 flex flex-col gap-3 pb-8 lg:pb-0">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="border rounded-2xl p-4 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${featureIconColors[i]} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1 text-slate-900 dark:text-slate-100">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center pb-8 text-xs text-slate-400 dark:text-slate-700">
        Kallio · MVP · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
