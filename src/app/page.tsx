"use client";

import Link from "next/link";
import { ArrowRight, Shield, Sparkles, Calendar, CheckCircle2, LogIn, Globe, Moon, Sun } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/useT";

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

  useEffect(() => {
    if (sessionActive) { router.replace("/dashboard"); return; }
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/dashboard");
    });
  }, [sessionActive, router]);

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

  // Theme tokens
  const bg = dark
    ? "bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900"
    : "bg-gradient-to-br from-white via-teal-50 to-slate-100";
  const logoColor = dark ? "text-white" : "text-teal-700";
  const badgeBg = dark ? "bg-teal-500/20 border-teal-500/30 text-teal-300" : "bg-teal-100 border-teal-200 text-teal-700";
  const badgeDot = dark ? "bg-teal-400" : "bg-teal-500";
  const heroColor = dark ? "text-white" : "text-slate-900";
  const subtitleColor = dark ? "text-slate-400" : "text-slate-500";
  const cardBg = dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200";
  const cardTitle = dark ? "text-white" : "text-slate-900";
  const cardDesc = dark ? "text-slate-400" : "text-slate-500";
  const trustColor = dark ? "text-slate-500" : "text-slate-400";
  const footerColor = dark ? "text-slate-700" : "text-slate-400";
  const navBtnColor = dark ? "text-teal-300 hover:text-white" : "text-teal-600 hover:text-teal-800";
  const themeToggleColor = dark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800";
  const demoBtnBg = dark ? "bg-white/10 hover:bg-white/20 border-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800";
  const welcomeCardBg = dark ? "bg-white/10 border-white/20" : "bg-white border-slate-200 shadow-sm";
  const welcomeTitle = dark ? "text-white" : "text-slate-900";
  const welcomeSub = dark ? "text-slate-400" : "text-slate-500";

  const featureIconColors = dark
    ? ["bg-teal-500/20 text-teal-400", "bg-emerald-500/20 text-emerald-400", "bg-amber-500/20 text-amber-400"]
    : ["bg-teal-100 text-teal-600", "bg-emerald-100 text-emerald-600", "bg-amber-100 text-amber-600"];

  return (
    <div className={`min-h-screen ${bg} flex flex-col transition-colors duration-300`}>
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className={`font-bold text-xl tracking-tight ${logoColor}`}>Kallio</span>
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(dark ? "light" : "dark")}
            className={`${themeToggleColor} transition-colors`}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${navBtnColor}`}
          >
            <Globe className="w-4 h-4" />
            <span>{language === "es" ? "EN" : "ES"}</span>
          </button>
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

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-16">
        <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-xs font-medium mb-8 ${badgeBg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`} />
          {t.landing.badge}
        </div>

        <h1 className={`text-4xl sm:text-6xl font-black leading-tight max-w-3xl mb-6 ${heroColor}`}>
          {t.landing.hero}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
            {t.landing.heroHighlight}
          </span>
        </h1>

        <p className={`text-lg max-w-xl mb-10 leading-relaxed ${subtitleColor}`}>
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

        <div className="flex flex-col sm:flex-row gap-3 mb-16">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className={`border rounded-2xl p-5 text-left ${cardBg}`}>
              <div className={`w-10 h-10 rounded-xl ${featureIconColors[i]} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className={`font-semibold text-sm mb-1.5 ${cardTitle}`}>{title}</h3>
              <p className={`text-xs leading-relaxed ${cardDesc}`}>{desc}</p>
            </div>
          ))}
        </div>

        <div className={`mt-12 flex flex-col sm:flex-row items-center gap-6 text-xs ${trustColor}`}>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{t.landing.trust1}</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{t.landing.trust2}</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{t.landing.trust3}</div>
        </div>
      </main>

      <footer className={`text-center pb-8 text-xs ${footerColor}`}>
        Kallio · MVP · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
