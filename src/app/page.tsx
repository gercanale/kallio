"use client";

import Link from "next/link";
import { ArrowRight, Shield, Sparkles, Calendar, CheckCircle2, LogIn, ChevronDown } from "lucide-react";
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
  const router = useRouter();
  const t = useT();

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
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

  // Design tokens (light-only)
  const bg = "bg-gradient-to-br from-white via-teal-50 to-slate-100";
  const logoColor = "text-teal-700";
  const badgeBg = "bg-teal-100 border-teal-200 text-teal-700";
  const badgeDot = "bg-teal-500";
  const heroColor = "text-slate-900";
  const subtitleColor = "text-slate-500";
  const cardBg = "bg-white border-slate-200";
  const cardTitle = "text-slate-900";
  const cardDesc = "text-slate-500";
  const trustColor = "text-slate-400";
  const footerColor = "text-slate-400";
  const navBtnColor = "text-teal-600 hover:text-teal-800";
  const dropdownBg = "bg-white border-slate-200 shadow-lg";
  const dropdownItem = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
  const dropdownActive = "bg-teal-50 text-teal-700";
  const demoBtnBg = "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800";
  const welcomeCardBg = "bg-white border-slate-200 shadow-sm";
  const welcomeTitle = "text-slate-900";
  const welcomeSub = "text-slate-500";

  const featureIconColors = ["bg-teal-100 text-teal-600", "bg-emerald-100 text-emerald-600", "bg-amber-100 text-amber-600"];

  return (
    <div className={`min-h-screen ${bg} flex flex-col transition-colors duration-300`}>
      <header className="px-8 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <img src="/faviconnobg.png" alt="Kallio" className="w-7 h-7" />
          <span className={`font-bold text-xl tracking-tight ${logoColor}`}>Kallio</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Language dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((o) => !o)}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${navBtnColor}`}
            >
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span>{currentLang.short}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className={`absolute top-full right-0 mt-2 border rounded-xl overflow-hidden z-50 min-w-[150px] ${dropdownBg}`}>
                {LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                      lang.code === language ? dropdownActive : dropdownItem
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
            <button onClick={handleContinue} className={`text-sm font-medium transition-colors ${navBtnColor}`}>
              {t.landing.continueBtn}
            </button>
          ) : (
            <Link href="/login" className={`text-sm font-medium transition-colors ${navBtnColor}`}>
              {t.landing.access}
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-12 lg:py-0 lg:flex lg:items-center lg:gap-16">
        {/* Left column: hero */}
        <div className="flex-1 flex flex-col items-start text-left pb-12 lg:pb-0">
          <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-xs font-medium mb-8 ${badgeBg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`} />
            {t.landing.badge}
          </div>

          <h1 className={`text-5xl lg:text-6xl xl:text-7xl font-black leading-tight mb-4 ${heroColor}`}>
            {t.landing.hero}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              {t.landing.heroHighlight}
            </span>
          </h1>

          <p className={`text-xl lg:text-2xl font-semibold mb-5 text-slate-600`}>
            {t.landing.heroSub}
          </p>

          <p className={`text-base lg:text-lg leading-relaxed mb-10 max-w-lg ${subtitleColor}`}>
            {t.landing.subtitle}
          </p>

          {hasExistingAccount && (
            <div className="w-full max-w-sm mb-6">
              <div className={`border rounded-2xl p-4 flex items-center justify-between gap-4 ${welcomeCardBg}`}>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${welcomeTitle}`}>{t.landing.welcomeBack}</p>
                  <p className={`text-xs ${welcomeSub}`}>{profile.name} · {profile.activityType}</p>
                </div>
                <button
                  onClick={handleContinue}
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {t.landing.enter}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            {!hasExistingAccount && (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-lg"
              >
                {t.landing.startFree}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={handleDemo}
              className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all border ${demoBtnBg}`}
            >
              {t.landing.viewDemo}
            </button>
          </div>

          <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm ${trustColor}`}>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{t.landing.trust1}</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{t.landing.trust2}</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />{t.landing.trust3}</div>
          </div>
        </div>

        {/* Right column: feature cards */}
        <div className="w-full lg:w-96 xl:w-[440px] flex-shrink-0 flex flex-col gap-4 pb-12 lg:pb-0">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className={`border rounded-2xl p-6 ${cardBg}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${featureIconColors[i]} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-semibold text-base mb-1 ${cardTitle}`}>{title}</h3>
                  <p className={`text-sm leading-relaxed ${cardDesc}`}>{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className={`text-center pb-8 text-xs ${footerColor}`}>
        Kallio · MVP · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
