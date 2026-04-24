"use client";

import Link from "next/link";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/useT";
import type { Language } from "@/lib/i18n";

// ─── Direction A tokens ───────────────────────────────────────────────────────
const C = {
  BG:     '#fdfaf3',
  INK:    '#1a1f2e',
  MUTED:  '#6b6456',
  BORDER: '#e8dfc8',
  IVA:    '#c44536',
  IRPF:   '#d4a017',
  OK:     '#5a7a3e',
  CARD:   '#ffffff',
};

const LANGS: { code: Language; flag: string; label: string; short: string }[] = [
  { code: "es", flag: "🇪🇸", label: "Español",  short: "ES" },
  { code: "en", flag: "🇬🇧", label: "English",  short: "EN" },
  { code: "it", flag: "🇮🇹", label: "Italiano", short: "IT" },
  { code: "de", flag: "🇩🇪", label: "Deutsch",  short: "DE" },
  { code: "fr", flag: "🇫🇷", label: "Français", short: "FR" },
];

export default function LandingPage() {
  const hydrated     = useHydrated();
  const profile      = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const activateSession = useKallioStore((s) => s.activateSession);
  const language     = useKallioStore((s) => s.language);
  const setLanguage  = useKallioStore((s) => s.setLanguage);
  const router       = useRouter();
  const t            = useT();

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const close = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [langOpen]);

  useEffect(() => {
    if (sessionActive) { router.replace("/dashboard"); return; }
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/dashboard");
    });
  }, [sessionActive, router]);

  const currentLang = LANGS.find((l) => l.code === language) ?? LANGS[0];
  const hasAccount  = hydrated && profile.onboardingComplete && !sessionActive;

  const handleDemo = () => {
    useKallioStore.getState().loadDemo();
    useKallioStore.getState().activateSession();
    router.push("/dashboard");
  };

  if (!hydrated) {
    return (
      <div style={{ minHeight: '100dvh', background: C.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${C.IVA}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK, display: 'flex', flexDirection: 'column' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 20 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C.IVA, display: 'inline-block' }} />
          Kallio
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Language picker */}
          <div style={{ position: 'relative' }} ref={langRef}>
            <button
              onClick={() => setLangOpen(o => !o)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: C.MUTED }}
            >
              <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
              <span>{currentLang.short}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
            </button>
            {langOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 12, overflow: 'hidden', minWidth: 150, boxShadow: '0 8px 24px rgba(26,31,46,0.08)', zIndex: 50 }}>
                {LANGS.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px', background: lang.code === language ? '#f5f0e8' : 'transparent',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 14, fontWeight: 500, color: lang.code === language ? C.INK : C.MUTED,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasAccount ? (
            <button
              onClick={() => { activateSession(); router.push('/dashboard'); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: C.INK }}
            >
              {t.landing.continueBtn} →
            </button>
          ) : (
            <Link
              href="/login"
              style={{ fontSize: 14, fontWeight: 600, color: C.INK, textDecoration: 'none' }}
            >
              {t.landing.access}
            </Link>
          )}

          <Link
            href="/login"
            style={{
              background: C.INK, color: 'white', borderRadius: 999,
              padding: '10px 22px', fontSize: 14, fontWeight: 500,
              textDecoration: 'none', display: 'inline-block',
            }}
          >
            {t.landing.startFree} →
          </Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '64px 48px 80px', boxSizing: 'border-box' }}>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${C.BORDER}`, borderRadius: 999, padding: '6px 16px', fontSize: 12, fontWeight: 500, color: C.MUTED, marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.OK, display: 'inline-block' }} />
          {t.landing.badge}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 80, alignItems: 'start' }}>

          {/* Left: headline + CTAs */}
          <div>
            <h1 style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20, margin: '0 0 20px' }}>
              {t.landing.hero}{' '}
              <span className="serif" style={{ fontWeight: 400 }}>{t.landing.heroHighlight}</span>
            </h1>

            <p style={{ fontSize: 20, fontWeight: 600, color: C.INK, marginBottom: 12, lineHeight: 1.4 }}>
              {t.landing.heroSub}
            </p>

            <p style={{ fontSize: 16, color: C.MUTED, lineHeight: 1.7, marginBottom: 40, maxWidth: 500 }}>
              {t.landing.subtitle}
            </p>

            {/* Welcome back card */}
            {hasAccount && (
              <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, maxWidth: 440 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{t.landing.welcomeBack}</div>
                  <div style={{ fontSize: 13, color: C.MUTED }}>{profile.name} · {profile.activityType}</div>
                </div>
                <button
                  onClick={() => { activateSession(); router.push('/dashboard'); }}
                  style={{ background: C.INK, color: 'white', border: 'none', borderRadius: 999, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  {t.landing.enter} →
                </button>
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 36, flexWrap: 'wrap' }}>
              {!hasAccount && (
                <Link
                  href="/login"
                  style={{ background: C.INK, color: 'white', borderRadius: 999, padding: '14px 32px', fontSize: 16, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {t.landing.startFree} →
                </Link>
              )}
              <button
                onClick={handleDemo}
                style={{ background: C.CARD, color: C.INK, border: `1px solid ${C.BORDER}`, borderRadius: 999, padding: '14px 32px', fontSize: 16, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {t.landing.viewDemo}
              </button>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[t.landing.trust1, t.landing.trust2, t.landing.trust3].map((txt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.MUTED }}>
                  <span style={{ color: C.OK, fontSize: 14 }}>✓</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>

          {/* Right: feature cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { dot: C.IVA,  label: 'IVA · Modelo 303',   title: t.landing.feature1Title, desc: t.landing.feature1Desc },
              { dot: C.IRPF, label: 'IRPF · Modelo 130',  title: t.landing.feature2Title, desc: t.landing.feature2Desc },
              { dot: C.OK,   label: 'RENTA · anual',       title: t.landing.feature3Title, desc: t.landing.feature3Desc },
            ].map(({ dot, label, title, desc }) => (
              <div key={label} style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: dot, display: 'inline-block' }} />
                  <span className="mono" style={{ fontSize: 10, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: C.MUTED, lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}

            {/* Mini tax preview card */}
            <div style={{ background: C.INK, color: 'white', borderRadius: 14, padding: '20px 24px' }}>
              <div className="mono" style={{ fontSize: 10, color: C.IRPF, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                Ejemplo · €5.000/mes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'IVA reservado',      amount: '€3.150', color: C.IVA  },
                  { label: 'IRPF adelantado',     amount: '€3.000', color: C.IRPF },
                  { label: 'Tuyo este trimestre', amount: '€8.850', color: '#9ec77c' },
                ].map(({ label, amount, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#c9bfa8' }}>{label}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color }}>{amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ textAlign: 'center', padding: '24px 48px', borderTop: `1px solid ${C.BORDER}` }}>
        <span className="mono" style={{ fontSize: 11, color: C.MUTED, letterSpacing: '0.08em' }}>
          KALLIO · MVP · {new Date().getFullYear()} · Para autónomos digitales en España
        </span>
      </footer>
    </div>
  );
}
