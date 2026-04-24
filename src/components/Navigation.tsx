"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Settings, BookOpen, LogOut } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { APP_VERSION } from "@/lib/version";
import type { Language } from "@/lib/i18n";

const C = {
  BG:     '#ffffff',
  INK:    '#1a1f2e',
  MUTED:  '#6b6456',
  BORDER: '#e8dfc8',
  IVA:    '#c44536',
};

const LANGS: { code: Language; flag: string; label: string; short: string }[] = [
  { code: "es", flag: "🇪🇸", label: "Español",  short: "ES" },
  { code: "en", flag: "🇬🇧", label: "English",  short: "EN" },
  { code: "it", flag: "🇮🇹", label: "Italiano", short: "IT" },
  { code: "de", flag: "🇩🇪", label: "Deutsch",  short: "DE" },
  { code: "fr", flag: "🇫🇷", label: "Français", short: "FR" },
];

export function Navigation() {
  const pathname  = usePathname();
  const router    = useRouter();
  const language  = useKallioStore((s) => s.language);
  const setLanguage = useKallioStore((s) => s.setLanguage);
  const signOut   = useKallioStore((s) => s.signOut);
  const t         = useT();

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

  const handleSignOut = async () => { await signOut(); router.push("/"); };
  const currentLang = LANGS.find((l) => l.code === language) ?? LANGS[0];
  const cycleLang = () => {
    const idx = LANGS.findIndex((l) => l.code === language);
    setLanguage(LANGS[(idx + 1) % LANGS.length].code);
  };

  const NAV_ITEMS = [
    { href: "/dashboard",     icon: LayoutDashboard, label: t.nav.dashboard    },
    { href: "/transactions",  icon: ArrowLeftRight,  label: t.nav.transactions },
    { href: "/settings",      icon: Settings,        label: t.nav.settings     },
    { href: "/learn",         icon: BookOpen,        label: t.nav.learn        },
  ];

  return (
    <>
      {/* ── Desktop / tablet top bar ─────────────────────────────────────── */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 40,
          background: C.BG, borderBottom: `1px solid ${C.BORDER}`,
          display: 'flex', alignItems: 'center',
          padding: '0 32px', gap: 32, fontFamily: 'Inter, sans-serif',
        }}
        className="hidden sm:flex"
      >
        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: C.IVA, display: 'inline-block' }} />
          <span style={{ fontWeight: 700, fontSize: 17, color: C.INK }}>Kallio</span>
          <span className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.08em', marginLeft: 4 }}>
            v{APP_VERSION}
          </span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                  textDecoration: 'none', transition: 'all 0.15s',
                  background: active ? C.INK : 'transparent',
                  color: active ? 'white' : C.MUTED,
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: language + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          {/* Language picker */}
          <div style={{ position: 'relative' }} ref={langRef}>
            <button
              onClick={() => setLangOpen(o => !o)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 13, fontWeight: 600, color: C.MUTED,
              }}
            >
              <span style={{ fontSize: 15 }}>{currentLang.flag}</span>
              <span>{currentLang.short}</span>
            </button>
            {langOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: C.BG, border: `1px solid ${C.BORDER}`, borderRadius: 12,
                overflow: 'hidden', minWidth: 140, boxShadow: '0 8px 24px rgba(26,31,46,0.08)', zIndex: 50,
              }}>
                {LANGS.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: 500, textAlign: 'left',
                      background: lang.code === language ? '#f5f0e8' : 'transparent',
                      color: lang.code === language ? C.INK : C.MUTED,
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSignOut}
            title={t.settings.signOut}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.MUTED, display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom bar ────────────────────────────────────────────── */}
      <nav
        className="sm:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, zIndex: 40,
          background: C.BG, borderTop: `1px solid ${C.BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '0 8px', fontFamily: 'Inter, sans-serif',
        }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
                fontSize: 10, fontWeight: 500,
                color: active ? C.INK : C.MUTED,
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          onClick={cycleLang}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 10, fontWeight: 600, color: C.MUTED, fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 17 }}>{currentLang.flag}</span>
          <span>{currentLang.short}</span>
        </button>
      </nav>
    </>
  );
}
