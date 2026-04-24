"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKallioStore } from "@/lib/store";
import { createClient } from "@/lib/supabase";
import { REGIONS } from "@/lib/regional-tax";
import { DEDUCTIBILITY_RATES } from "@/lib/wizard-config";
import type { Language } from "@/lib/i18n";
import type { UserProfile } from "@/lib/types";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  BG:          '#fdfaf3',
  INK:         '#1a1f2e',
  MUTED:       '#6b6456',
  BORDER:      '#e8dfc8',
  BORDER_SOFT: '#f0e8d3',
  IVA:         '#c44536',
  IRPF:        '#d4a017',
  OK:          '#5a7a3e',
  OK_BG:       'rgba(90,122,62,0.08)',
  CARD:        '#ffffff',
  WARM:        '#c9bfa8',  // text on dark bg
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'lang' | 'fiscal' | 'activity' | 'clients' | 'summary' | 'income' | 'reveal' | 'next';
type RegimeKey = 'A' | 'B' | 'C' | 'D';
type ClientesKey = 'es' | 'fuera' | 'mix';

// ─── Static data ─────────────────────────────────────────────────────────────
const LANGS: { code: Language; flag: string; label: string }[] = [
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
];

const REGIME_OPTS: { k: RegimeKey; icon: string; t: string; s: string; note: string }[] = [
  { k: 'A', icon: '●', t: 'Soy autónomo español o residente',   s: 'Pago IRPF progresivo — el tipo sube con mis ingresos', note: 'El caso más común'          },
  { k: 'B', icon: '◆', t: 'Tengo Beckham o nómada digital',     s: 'Pago un tipo fijo del 24% — llegué a España desde fuera', note: 'Régimen especial'        },
  { k: 'C', icon: '▲', t: 'Soy empleado y también facturo',     s: 'Tengo nómina y hago trabajos por cuenta propia', note: 'Dos fuentes · cuidado con tramos' },
  { k: 'D', icon: '?', t: 'No estoy seguro',                    s: 'Te ayudamos a identificarlo en 2 preguntas', note: 'Te guiamos'                            },
];

const ACTIVITY_OPTS: { k: string; t: string; badge: string; color: string }[] = [
  { k: 'tech',   t: 'Consultoría / Tech',          badge: 'gastos 100%',            color: C.OK   },
  { k: 'design', t: 'Diseño / Creatividad',         badge: 'gastos 100%',            color: C.OK   },
  { k: 'teach',  t: 'Formación / Docencia',         badge: 'IVA exento (a veces)',   color: C.IRPF },
  { k: 'health', t: 'Salud / Bienestar',            badge: 'IVA exento (a veces)',   color: C.IRPF },
  { k: 'trade',  t: 'Comercio / Producto',          badge: 'gastos 60–70%',          color: C.IVA  },
  { k: 'build',  t: 'Construcción / Arquitectura',  badge: 'gastos 75%',             color: C.IVA  },
  { k: 'mkt',    t: 'Marketing / Comunicación',     badge: 'gastos 100%',            color: C.OK   },
  { k: 'other',  t: 'Otro',                         badge: 'lo configuramos juntos', color: C.MUTED},
];

const CLIENTES_OPTS: { k: ClientesKey; t: string; s: string }[] = [
  { k: 'es',    t: 'En España o la UE',                  s: 'Cobro IVA del 21% en mis facturas'       },
  { k: 'fuera', t: 'Fuera de la UE — empresas extranjeras', s: 'Facturo sin IVA a mis clientes'       },
  { k: 'mix',   t: 'Tengo clientes en los dos',          s: 'Mezcla de nacionales e internacionales'  },
];

const ACTIVITY_LABEL: Record<string, string> = {
  tech:   'Consultoría / Tech',
  design: 'Diseño / Creatividad',
  teach:  'Formación / Docencia',
  health: 'Salud / Bienestar',
  trade:  'Comercio / Producto',
  build:  'Construcción / Arquitectura',
  mkt:    'Marketing / Comunicación',
  other:  'Otro',
};

const CLIENTES_LABEL: Record<ClientesKey, string> = {
  es:    'España + EU · IVA 21%',
  fuera: 'Fuera UE · sin IVA',
  mix:   'Mezcla España + fuera UE · IVA mixto',
};

const REGIME_LABEL: Record<RegimeKey, string> = {
  A: 'Autónomo español · IRPF progresivo',
  B: 'Beckham · Tipo fijo 24%',
  C: 'Empleado + freelance · IRPF progresivo',
  D: 'Por determinar · IRPF progresivo',
};

// Screen 01–06 for progress counter (04=summary and 07=next don't show counter)
const SCREEN_NUMBER: Partial<Record<Screen, number>> = {
  fiscal: 1, activity: 2, clients: 3, income: 5, reveal: 6,
};

// ─── Layout wrapper ───────────────────────────────────────────────────────────
function Frame({
  step, total = 6, showStep = true, children,
}: {
  step?: number; total?: number; showStep?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100dvh', background: C.BG, display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', color: C.INK }}>
      {/* top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 18 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: C.IVA, display: 'inline-block' }} />
          Kallio
        </div>
        {showStep && step != null && (
          <div className="mono" style={{ fontSize: 11, color: C.MUTED, letterSpacing: '0.1em' }}>
            ONBOARDING · {String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
        )}
      </div>
      {/* content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px 48px', maxWidth: 680, margin: '0 auto', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Pill({ onClick, disabled, children, variant = 'primary' }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; variant?: 'primary' | 'ghost';
}) {
  if (variant === 'ghost') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{ background: 'transparent', border: 'none', color: C.MUTED, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: '10px 0' }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#d0c9bc' : C.INK,
        color: 'white',
        border: 'none',
        borderRadius: 999,
        padding: '14px 28px',
        fontSize: 15,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function NavRow({ onBack, onNext, nextLabel = 'Siguiente →', nextDisabled = false }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
      {onBack
        ? <Pill variant="ghost" onClick={onBack}>← Atrás</Pill>
        : <span />}
      <Pill onClick={onNext} disabled={nextDisabled}>{nextLabel}</Pill>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useKallioStore(s => s.completeOnboarding);
  const setProfile = useKallioStore(s => s.setProfile);
  const setWizardProfile = useKallioStore(s => s.setWizardProfile);
  const activateSession = useKallioStore(s => s.activateSession);
  const language = useKallioStore(s => s.language);
  const setLanguage = useKallioStore(s => s.setLanguage);
  const profile = useKallioStore(s => s.profile);

  // Re-prompt: existing users missing region or ingresoMensual
  const isRePrompt = profile.onboardingComplete && (!profile.region || !profile.ingresoMensual);

  const [screen, setScreen] = useState<Screen>(isRePrompt ? 'clients' : 'lang');

  // Form state
  const [regimeKey, setRegimeKey] = useState<RegimeKey>('A');
  const currentYear = new Date().getFullYear();
  const [beckhamYear, setBeckhamYear] = useState<number>(currentYear);
  const [activityKey, setActivityKey] = useState<string>('tech');
  const [clientesKey, setClientesKey] = useState<ClientesKey>('mix');
  const [region, setRegion] = useState<string>(profile.region ?? '');
  const [ingresoStr, setIngresoStr] = useState<string>(
    profile.ingresoMensual ? String(profile.ingresoMensual) : ''
  );
  const [finishing, setFinishing] = useState(false);

  // Derived calculations for reveal screen
  const ingresoMensual = parseFloat(ingresoStr.replace(/\./g, '').replace(',', '.')) || 0;
  const quarterly = ingresoMensual * 3;
  const ivaFactor = clientesKey === 'es' ? 1 : clientesKey === 'fuera' ? 0 : 0.5;
  const ivaReserve = Math.round(quarterly * ivaFactor * 0.21);
  const irpfReserve = Math.round(quarterly * 0.20);
  const total = ivaReserve + irpfReserve;
  const disponible = quarterly - total;

  const fmt = (n: number) => n.toLocaleString('es-ES');

  // Current quarter label
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const quarterLabel = `${q}T ${now.getFullYear()}`;

  const handleSave = async () => {
    if (finishing) return;
    setFinishing(true);

    const clientesVal: UserProfile['clientes'] =
      clientesKey === 'es' ? 'es_only' : clientesKey === 'fuera' ? 'non_eu' : 'mix';
    const regionVal = region || undefined;
    const ingresoVal = ingresoMensual || undefined;

    if (isRePrompt) {
      // Partial update: only new fields
      setProfile({ clientes: clientesVal, region: regionVal, ingresoMensual: ingresoVal });
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          await sb.from("profiles").update({
            clientes: clientesVal ?? null,
            region: regionVal ?? null,
            ingreso_mensual: ingresoVal ?? null,
          }).eq("id", user.id);
        }
      } catch (_) { /* graceful fail if columns don't exist yet */ }
    } else {
      // Full first-time onboarding
      const activityType = ACTIVITY_LABEL[activityKey] ?? activityKey;

      await completeOnboarding({
        name: profile.name || '',
        nif: profile.nif,
        nifType: profile.nifType,
        activityType,
        fiscalRegime: 'estimacion_directa_simplificada',
        ivaRetention: false,
        irpfRetentionRate: 0.15,
        irpfAdvanceRate: 0.20,
        onboardingComplete: true,
        clientes: clientesVal,
        region: regionVal,
        ingresoMensual: ingresoVal,
      });

      // Set wizard profile so Beckham-specific dashboard UI activates
      const actKeyMap: Record<string, import('@/lib/wizard-config').ActivityKey> = {
        tech: 'consultoria_tech', design: 'diseno', teach: 'formacion',
        health: 'salud', trade: 'comercio', build: 'construccion',
        mkt: 'diseno', other: 'otro',
      };
      const ak = actKeyMap[activityKey] ?? 'otro';
      setWizardProfile({
        fiscalRegime: regimeKey === 'B' ? 'beckham' : 'eds',
        beckhamStartYear: regimeKey === 'B' ? beckhamYear : null,
        incomeStructure: regimeKey === 'C' ? 'single_client' : 'multi_client',
        activity: ak,
        deductibilityRate: DEDUCTIBILITY_RATES[ak],
        incomeStability: 'stable',
        expensesVolume: 'some',
        wizardCompleted: true,
      });

      activateSession();

      // Try to save new fields to Supabase (graceful fail)
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          await sb.from("profiles").update({
            clientes: clientesVal ?? null,
            region: regionVal ?? null,
            ingreso_mensual: ingresoVal ?? null,
          }).eq("id", user.id);

          if (user.email) {
            fetch("/api/welcome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: user.email, lang: language }),
            }).catch(() => {});
          }
        }
      } catch (_) { /* graceful fail */ }
    }

    setFinishing(false);
    setScreen('next');
  };

  // ─── SCREEN: lang ──────────────────────────────────────────────────────────
  if (screen === 'lang') {
    return (
      <Frame showStep={false}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌍</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>
            Choose your language
          </h1>
          <p style={{ fontSize: 14, color: C.MUTED, marginBottom: 32, lineHeight: 1.6 }}>
            Elige el idioma · Scegli la lingua · Wähle die Sprache · Choisissez la langue
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {LANGS.map(({ code, flag, label }) => {
              const active = language === code;
              return (
                <button
                  key={code}
                  onClick={() => { setLanguage(code); setScreen('fiscal'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', borderRadius: 12, textAlign: 'left',
                    border: `1px solid ${active ? C.INK : C.BORDER}`,
                    background: active ? C.INK : C.CARD,
                    color: active ? 'white' : C.INK,
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 16, fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{flag}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Frame>
    );
  }

  // ─── SCREEN: fiscal ────────────────────────────────────────────────────────
  if (screen === 'fiscal') {
    const beckhamYears = [currentYear - 1, currentYear, currentYear + 1];
    return (
      <Frame step={1}>
        <h1 style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 8 }}>
          ¿Cuál es tu <span className="serif">situación</span> en España?
        </h1>
        <p style={{ fontSize: 15, color: C.MUTED, lineHeight: 1.6, marginBottom: 28 }}>
          Esto determina cómo te calculo los impuestos. Si te equivocas, todo lo que te muestre después estará mal.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {REGIME_OPTS.map(o => {
            const active = regimeKey === o.k;
            return (
              <button
                key={o.k}
                onClick={() => setRegimeKey(o.k)}
                style={{
                  textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                  background: active ? C.INK : C.CARD,
                  color: active ? 'white' : C.INK,
                  border: `1px solid ${active ? C.INK : C.BORDER}`,
                  borderRadius: 14, padding: '18px 20px',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: active ? 'rgba(212,160,23,0.18)' : C.BG,
                  border: `1px solid ${active ? 'transparent' : C.BORDER}`,
                  color: active ? C.IRPF : C.IVA,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700,
                }}>{o.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5, lineHeight: 1.3 }}>{o.t}</div>
                  <div style={{ fontSize: 12, color: active ? C.WARM : C.MUTED, lineHeight: 1.5, marginBottom: 6 }}>{o.s}</div>
                  <div className="mono" style={{ fontSize: 10, color: active ? C.IRPF : C.MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{o.note}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Beckham year picker — inline when B is selected */}
        {regimeKey === 'B' && (
          <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 12, padding: '16px 20px', marginBottom: 4 }}>
            <div className="mono" style={{ fontSize: 10, color: C.IVA, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              Beckham · año de inicio
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
              ¿En qué año empezaste el régimen Beckham?
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {beckhamYears.map(y => {
                const active = beckhamYear === y;
                return (
                  <button
                    key={y}
                    onClick={() => setBeckhamYear(y)}
                    style={{
                      fontFamily: 'inherit', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                      background: active ? C.INK : C.BG,
                      color: active ? 'white' : C.INK,
                      border: `1px solid ${active ? C.INK : C.BORDER}`,
                      borderRadius: 999, padding: '7px 16px',
                    }}
                  >{y}</button>
                );
              })}
            </div>
          </div>
        )}

        <NavRow
          onBack={() => setScreen('lang')}
          onNext={() => setScreen('activity')}
        />
      </Frame>
    );
  }

  // ─── SCREEN: activity ──────────────────────────────────────────────────────
  if (screen === 'activity') {
    return (
      <Frame step={2}>
        <h1 style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 8 }}>
          ¿A qué te <span className="serif">dedicas</span> principalmente?
        </h1>
        <p style={{ fontSize: 15, color: C.MUTED, lineHeight: 1.6, marginBottom: 28 }}>
          Tu actividad cambia qué puedes deducir y si debes cobrar IVA a tus clientes.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ACTIVITY_OPTS.map(o => {
            const active = activityKey === o.k;
            return (
              <button
                key={o.k}
                onClick={() => setActivityKey(o.k)}
                style={{
                  textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                  background: active ? C.INK : C.CARD,
                  color: active ? 'white' : C.INK,
                  border: `1px solid ${active ? C.INK : C.BORDER}`,
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600 }}>{o.t}</div>
                <div className="mono" style={{
                  fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: o.color,
                  background: active ? 'rgba(255,255,255,0.08)' : C.BG,
                  border: `1px solid ${active ? 'transparent' : C.BORDER}`,
                  borderRadius: 999, padding: '4px 8px',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>{o.badge}</div>
              </button>
            );
          })}
        </div>

        <NavRow
          onBack={() => setScreen('fiscal')}
          onNext={() => setScreen('clients')}
        />
      </Frame>
    );
  }

  // ─── SCREEN: clients + region ─────────────────────────────────────────────
  if (screen === 'clients') {
    return (
      <Frame step={3}>
        <h1 style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 8 }}>
          ¿Dónde están tus <span className="serif">clientes</span>?
        </h1>
        <p style={{ fontSize: 15, color: C.MUTED, lineHeight: 1.6, marginBottom: 24 }}>
          Esto decide si cobras IVA. Para clientes fuera de la UE, tus facturas van sin IVA — y eso cambia mucho tu reserva.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {CLIENTES_OPTS.map(o => {
            const active = clientesKey === o.k;
            return (
              <button
                key={o.k}
                onClick={() => setClientesKey(o.k)}
                style={{
                  textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                  background: active ? C.INK : C.CARD,
                  color: active ? 'white' : C.INK,
                  border: `1px solid ${active ? C.INK : C.BORDER}`,
                  borderRadius: 12, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                {/* Radio dot */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${active ? C.IRPF : C.BORDER}`,
                  background: active ? C.IRPF : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.INK }} />}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{o.t}</div>
                  <div style={{ fontSize: 13, color: active ? C.WARM : C.MUTED }}>{o.s}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Region picker */}
        <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 12, padding: '18px 20px', marginBottom: 4 }}>
          <div className="mono" style={{ fontSize: 10, color: C.IVA, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            Una cosa más · 10 segundos
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>¿En qué comunidad autónoma resides?</div>
          <div style={{ fontSize: 13, color: C.MUTED, marginBottom: 14, lineHeight: 1.5 }}>
            Cada comunidad tiene sus propias deducciones en la Renta. Las aplico automáticamente.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REGIONS.map(r => {
              const active = region === r.code;
              return (
                <button
                  key={r.code}
                  onClick={() => setRegion(active ? '' : r.code)}
                  style={{
                    fontFamily: 'inherit', cursor: 'pointer', fontSize: 13,
                    background: active ? C.INK : C.BG,
                    color: active ? 'white' : C.INK,
                    border: `1px solid ${active ? C.INK : C.BORDER}`,
                    borderRadius: 999, padding: '6px 12px',
                  }}
                >{r.name}</button>
              );
            })}
          </div>
        </div>

        <NavRow
          onBack={isRePrompt ? undefined : () => setScreen('activity')}
          onNext={() => setScreen('summary')}
        />
      </Frame>
    );
  }

  // ─── SCREEN: summary ──────────────────────────────────────────────────────
  if (screen === 'summary') {
    const regionName = REGIONS.find(r => r.code === region)?.name ?? (region || 'No seleccionada');
    const rows = isRePrompt
      ? [
          ['Clientes', CLIENTES_LABEL[clientesKey]],
          ['Región', `${regionName} · deducciones autonómicas activas`],
        ]
      : [
          ['Régimen',   REGIME_LABEL[regimeKey]],
          ['Actividad', `${ACTIVITY_LABEL[activityKey]} · gastos deducibles`],
          ['Clientes',  CLIENTES_LABEL[clientesKey]],
          ['Región',    `${regionName} · deducciones autonómicas activas`],
        ];

    return (
      <Frame showStep={false}>
        <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.OK, display: 'inline-block' }} />
          <span className="mono" style={{ letterSpacing: '0.14em', color: C.OK, textTransform: 'uppercase' }}>Perfecto.</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 32 }}>
          Esto es lo que <span className="serif">entiendo</span> de ti.
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
          {rows.map(([k, v], i) => (
            <div key={i} style={{
              background: C.CARD, border: `1px solid ${C.BORDER}`,
              borderRadius: 12, padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div className="mono" style={{ fontSize: 10, color: C.MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', width: 80, flexShrink: 0 }}>{k}</div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{v}</div>
              <span style={{ color: C.OK, fontSize: 15 }}>✓</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 16, color: C.INK, lineHeight: 1.55, marginBottom: 24 }}>
          Ahora necesito <strong>un dato</strong> para mostrarte cuánto deberías reservar este trimestre.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Pill onClick={() => setScreen('income')}>Vamos →</Pill>
          <Pill variant="ghost" onClick={() => setScreen('clients')}>Corregir algo</Pill>
        </div>
      </Frame>
    );
  }

  // ─── SCREEN: income ────────────────────────────────────────────────────────
  if (screen === 'income') {
    return (
      <Frame step={5}>
        <div className="mono" style={{ fontSize: 11, color: C.IVA, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
          Una pregunta
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 14 }}>
          ¿Cuánto <span className="serif">facturas</span> aproximadamente al mes?
        </h1>
        <p style={{ fontSize: 15, color: C.MUTED, lineHeight: 1.6, marginBottom: 32 }}>
          Si varía mucho, usa una estimación de los últimos 3 meses. No tiene que ser exacto.
        </p>

        {/* Big € input */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8,
          paddingBottom: 10, borderBottom: `2px solid ${C.INK}`, maxWidth: 520,
        }}>
          <div style={{ fontSize: 64, fontWeight: 700, color: C.MUTED, flexShrink: 0 }}>€</div>
          <input
            type="text"
            inputMode="numeric"
            value={ingresoStr}
            onChange={e => setIngresoStr(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="5.000"
            autoFocus
            style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 64, fontWeight: 700, color: C.INK,
              fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em', padding: 0,
            }}
          />
          <div className="mono" style={{ fontSize: 18, color: C.MUTED, flexShrink: 0 }}>/ mes</div>
        </div>

        <div style={{ fontSize: 13, color: C.MUTED, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: C.IRPF, flexShrink: 0 }}>⟡</span>
          <span>
            <strong style={{ color: C.INK }}>¿Por qué pregunto esto?</strong>{' '}
            Con este dato ya calculo tu reserva — sin esperar a que añadas todas tus facturas.
          </span>
        </div>

        <NavRow
          onBack={() => setScreen('summary')}
          onNext={() => setScreen('reveal')}
          nextLabel="Ver mi reserva →"
          nextDisabled={!ingresoStr || ingresoMensual <= 0}
        />
      </Frame>
    );
  }

  // ─── SCREEN: reveal ────────────────────────────────────────────────────────
  if (screen === 'reveal') {
    return (
      <Frame step={6}>
        <div className="mono" style={{ fontSize: 11, color: C.IVA, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          Tu reserva · {quarterLabel}
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.3, marginBottom: 4, color: C.INK }}>
          Este trimestre deberías <span className="serif">reservar</span>:
        </div>

        {/* Hero number */}
        <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.04em', marginBottom: 10, color: C.INK }}>
          {fmt(total)}<span style={{ color: C.MUTED, fontWeight: 400 }}>€</span>
        </div>
        <div className="mono" style={{ fontSize: 14, color: C.MUTED, marginBottom: 28 }}>
          de los €{fmt(quarterly)} que estimas facturar
        </div>

        {/* Split card */}
        <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.BORDER_SOFT}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: C.IVA }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>IVA · Modelo 303</div>
              </div>
              <div style={{ fontSize: 12, color: C.MUTED, paddingLeft: 16, lineHeight: 1.4 }}>
                Lo que devuelves a Hacienda{clientesKey === 'mix' ? ' · sólo sobre facturas ES' : ''}
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.IVA }}>{clientesKey === 'fuera' ? '—' : `€${fmt(ivaReserve)}`}</div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: C.IRPF }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>IRPF · Modelo 130</div>
              </div>
              <div style={{ fontSize: 12, color: C.MUTED, paddingLeft: 16, lineHeight: 1.4 }}>
                Adelanto del 20% · tu impuesto sobre la renta
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.IRPF }}>€{fmt(irpfReserve)}</div>
          </div>
        </div>

        {/* Spendable dark card */}
        <div style={{
          background: C.INK, color: 'white', borderRadius: 14,
          padding: '18px 22px', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: C.OK, textTransform: 'uppercase', marginBottom: 4 }}>
              Tu dinero disponible
            </div>
            <div style={{ fontSize: 13, color: C.WARM }}>Lo que queda para vivir, ahorrar o invertir</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#9ec77c' }}>€{fmt(disponible)}</div>
        </div>

        <div className="mono" style={{ fontSize: 11, color: C.MUTED, marginBottom: 24, fontStyle: 'italic' }}>
          Estimación basada en €{fmt(ingresoMensual)}/mes. Se actualiza cuando añadas tus facturas reales.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pill variant="ghost" onClick={() => setScreen('income')}>← Atrás</Pill>
          <Pill
            onClick={async () => { await handleSave(); }}
            disabled={finishing}
          >
            {finishing ? 'Guardando…' : 'Entendido — ir al dashboard →'}
          </Pill>
        </div>
      </Frame>
    );
  }

  // ─── SCREEN: next ──────────────────────────────────────────────────────────
  if (screen === 'next') {
    return (
      <Frame showStep={false}>
        <div style={{ paddingTop: 20 }}>
          <div className="mono" style={{ fontSize: 11, color: C.IVA, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            Una cosa más
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Ahora mismo trabajo con una <span className="serif">estimación</span>.
          </h1>
          <p style={{ fontSize: 17, color: C.INK, lineHeight: 1.6, marginBottom: 36, maxWidth: 520 }}>
            Para que los números sean exactos, añade tu primera factura real. Te lleva menos de un minuto.
          </p>

          {/* Big CTA */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: C.INK, color: 'white', border: 'none', borderRadius: 14,
              padding: '20px 24px', fontSize: 17, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', textAlign: 'left', marginBottom: 12,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(212,160,23,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: C.IRPF, flexShrink: 0,
            }}>+</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>Añadir mi primera factura</div>
              <div style={{ fontSize: 13, color: C.WARM }}>PDF, email, o añade el importe directamente · 30 segundos</div>
            </div>
            <div style={{ fontSize: 18 }}>→</div>
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'transparent', color: C.MUTED, border: 'none',
              padding: '10px 0', fontSize: 14, cursor: 'pointer',
              fontFamily: 'inherit', display: 'block',
            }}
          >
            Explorar el dashboard primero
          </button>
        </div>
      </Frame>
    );
  }

  return null;
}
