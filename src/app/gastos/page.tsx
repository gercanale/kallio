"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { Navigation } from "@/components/Navigation";
import {
  BUCKETS,
  GROUPS,
  getBucketsForActivity,
  groupBuckets,
  annualDeductible,
  quarterlyDeductible,
  priceRangeLabel,
  deductibilityLabel,
  ACTIVITY_LABELS,
  type GastoBucket,
} from "@/lib/gastos-data";
import type { ActivityKey } from "@/lib/wizard-config";

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
  WARM:   '#c9bfa8',
};

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 });

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        position: 'relative', width: 40, height: 22, borderRadius: 999, border: 'none',
        cursor: 'pointer', flexShrink: 0, padding: 0,
        background: on ? C.OK : C.BORDER,
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
        background: C.CARD, boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        left: on ? 21 : 3, transition: 'left 0.18s',
      }} />
    </button>
  );
}

// ─── Amount editor ────────────────────────────────────────────────────────────
function AmountCell({
  bucket, amount, active, onChange,
}: {
  bucket: GastoBucket;
  amount: number;
  active: boolean;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(amount));

  if (!active) {
    return (
      <span style={{ fontSize: 13, color: C.IVA, fontWeight: 500, whiteSpace: 'nowrap' }}>+ activar</span>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          const v = parseFloat(draft);
          if (!isNaN(v) && v > 0) onChange(v);
          setEditing(false);
        }}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{
          width: 72, fontSize: 13, fontWeight: 600, color: C.INK,
          border: `1px solid ${C.INK}`, borderRadius: 6, padding: '3px 6px',
          fontFamily: 'Inter, sans-serif', textAlign: 'right',
          background: C.CARD, outline: 'none',
        }}
      />
    );
  }

  const unitLabel = bucket.unit === 'mes' ? '/mes' : bucket.unit === 'año' ? '/año' : '';
  return (
    <button
      onClick={() => { setDraft(String(amount)); setEditing(true); }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: 13, fontWeight: 600, color: C.INK, fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
      title="Editar importe"
    >
      €{fmt(amount)}{unitLabel}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GastosPage() {
  const router         = useRouter();
  const hydrated       = useHydrated();
  const profile        = useKallioStore((s) => s.profile);
  const sessionActive  = useKallioStore((s) => s.sessionActive);
  const wizardProfile  = useKallioStore((s) => s.wizardProfile);
  const activatedBuckets   = useKallioStore((s) => s.activatedBuckets);
  const setActivatedBucket = useKallioStore((s) => s.setActivatedBucket);
  const transactions   = useKallioStore((s) => s.transactions);

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) { router.replace("/"); return; }
    if (!profile.onboardingComplete) router.replace("/onboarding");
  }, [hydrated, sessionActive, profile.onboardingComplete, router]);

  // Activity from wizardProfile (typed) or fallback from profile string
  const activity = wizardProfile?.activity ?? null;
  const activityLabel = activity ? ACTIVITY_LABELS[activity] : profile.activityType || 'Autónomo';

  // Relevant buckets for this user
  const buckets = useMemo(() => getBucketsForActivity(activity), [activity]);
  const grouped = useMemo(() => groupBuckets(buckets), [buckets]);

  // Count active buckets and compute quarterly deductible
  const activeCount = Object.keys(activatedBuckets).length;
  const totalBuckets = buckets.length;

  const quarterlyTotal = useMemo(() => {
    return buckets.reduce((sum, b) => {
      if (!(b.id in activatedBuckets)) return sum;
      const amt = activatedBuckets[b.id] || b.defaultAmount;
      return sum + quarterlyDeductible(b, amt);
    }, 0);
  }, [buckets, activatedBuckets]);

  // Cross-reference: auto-suggest from existing transactions
  const txDescriptions = useMemo(
    () => transactions.map(t => (t.description + ' ' + (t.merchant ?? '')).toLowerCase()),
    [transactions]
  );

  const isInTransactions = (bucket: GastoBucket) => {
    const keywords: Record<string, string[]> = {
      gestoria:      ['gestor', 'asesor', 'fiscal'],
      cuota_autonomos: ['reta', 'autónom', 'seguridad social'],
      internet_casa: ['internet', 'fibra', 'movistar', 'vodafone', 'orange', 'jazztel'],
      movil_datos:   ['móvil', 'movil', 'tarifa', 'telefónica'],
      ordenador:     ['macbook', 'laptop', 'portátil', 'apple', 'lenovo', 'dell'],
      software_dev:  ['figma', 'notion', 'cursor', 'github', 'vercel', 'netlify'],
      adobe_cc:      ['adobe', 'creative cloud'],
      hosting_dominios: ['hosting', 'dominio', 'aws', 'gcp', 'digitalocean'],
    };
    const kws = keywords[bucket.id];
    if (!kws) return false;
    return txDescriptions.some(d => kws.some(k => d.includes(k)));
  };

  const getAmount = (b: GastoBucket) => activatedBuckets[b.id] ?? b.defaultAmount;
  const isActive  = (b: GastoBucket) => b.id in activatedBuckets;

  const handleToggle = (b: GastoBucket, on: boolean) => {
    setActivatedBucket(b.id, on ? (b.defaultAmount || null) : null);
  };
  const handleAmount = (b: GastoBucket, v: number) => {
    setActivatedBucket(b.id, v);
  };

  if (!hydrated || !sessionActive) {
    return (
      <div style={{ minHeight: '100dvh', background: C.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${C.IVA}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!profile.onboardingComplete) return null;

  return (
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK, paddingBottom: 80 }}>
      <Navigation />

      <main style={{ maxWidth: 700, margin: '0 auto', padding: '72px 24px 40px', boxSizing: 'border-box' }}>

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.IVA, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ¿QUÉ PUEDES DEDUCIR?
          </span>
          <span className="mono" style={{ fontSize: 10, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            AUTÓNOMO · {activityLabel.toUpperCase()}
          </span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.25 }}>
          Estos son los gastos{' '}
          <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400 }}>típicos</span>
          {' '}de alguien como tú.
        </h1>

        <p style={{ fontSize: 13, color: C.MUTED, margin: '0 0 20px', lineHeight: 1.7 }}>
          Eres <strong style={{ color: C.INK }}>{activityLabel}</strong>
          {profile.region ? `, en ${profile.region}` : ''}.
          {' '}Marca lo que ya tienes — la factura la subes después, o nunca. Te pre-relleno importes razonables.
        </p>

        {/* ── Progress bar ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', background: C.CARD, border: `1px solid ${C.BORDER}`,
          borderRadius: 12, marginBottom: 28,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.INK, whiteSpace: 'nowrap' }}>
            {activeCount} / {totalBuckets} activados
          </span>
          <div style={{ flex: 1, height: 6, background: '#e8dfc8', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: totalBuckets > 0 ? `${(activeCount / totalBuckets) * 100}%` : '0%',
              background: C.OK, borderRadius: 999, transition: 'width 0.4s ease',
            }} />
          </div>
          {quarterlyTotal > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: C.OK, whiteSpace: 'nowrap' }}>
              +€{fmt(quarterlyTotal)} deducidas/trimestre
            </span>
          )}
        </div>

        {/* ── Groups ───────────────────────────────────────────────────── */}
        {GROUPS.map(group => {
          const items = grouped.get(group.id) ?? [];
          if (items.length === 0) return null;
          const groupActive = items.filter(b => isActive(b)).length;

          return (
            <div key={group.id} style={{ marginBottom: 20 }}>
              {/* Group header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '10px 0 8px', borderBottom: `1px solid ${C.BORDER}`,
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.INK }}>{group.label}</span>
                  <span style={{ fontSize: 11, color: C.MUTED, marginLeft: 8 }}>{group.desc}</span>
                </div>
                <span className="mono" style={{ fontSize: 11, color: groupActive > 0 ? C.OK : C.MUTED, fontWeight: 600 }}>
                  {groupActive}/{items.length}
                </span>
              </div>

              {/* Items */}
              <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                {items.map((bucket, idx) => {
                  const active  = isActive(bucket);
                  const amount  = getAmount(bucket);
                  const inTx    = isInTransactions(bucket);
                  const isLast  = idx === items.length - 1;

                  return (
                    <div
                      key={bucket.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px',
                        borderBottom: isLast ? 'none' : `1px solid ${C.BORDER}`,
                        background: active ? '#fafdf8' : C.CARD,
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Toggle */}
                      <Toggle on={active} onChange={(v) => handleToggle(bucket, v)} />

                      {/* Label + hint */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: active ? C.INK : C.MUTED }}>
                            {bucket.label}
                          </span>
                          {inTx && !active && (
                            <span style={{ fontSize: 10, background: '#fdf3e0', color: C.IRPF, border: `1px solid ${C.IRPF}44`, borderRadius: 999, padding: '1px 7px', fontWeight: 600 }}>
                              detectado
                            </span>
                          )}
                          {bucket.amortizable && (
                            <span style={{ fontSize: 10, color: C.MUTED, border: `1px solid ${C.BORDER}`, borderRadius: 999, padding: '1px 7px' }}>
                              amortizable
                            </span>
                          )}
                        </div>
                        {bucket.hint && (
                          <div style={{ fontSize: 11, color: C.MUTED, marginTop: 2 }}>{bucket.hint}</div>
                        )}
                      </div>

                      {/* Price range */}
                      <div style={{ fontSize: 11, color: C.MUTED, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {priceRangeLabel(bucket)}
                      </div>

                      {/* Deductibility badge */}
                      <div style={{
                        fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                        color: bucket.deductibility === 'full' ? C.IVA : C.IRPF,
                        minWidth: 64, textAlign: 'right',
                      }}>
                        {deductibilityLabel(bucket)}
                      </div>

                      {/* Amount (editable when active) */}
                      <div style={{ minWidth: 72, textAlign: 'right', flexShrink: 0 }}>
                        <AmountCell
                          bucket={bucket}
                          amount={amount}
                          active={active}
                          onChange={(v) => handleAmount(bucket, v)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        {activeCount > 0 && (
          <div style={{
            background: C.INK, color: 'white', borderRadius: 14,
            padding: '20px 24px', marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 13, color: C.WARM, marginBottom: 4 }}>
                {activeCount} gastos activados
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                +€{fmt(quarterlyTotal)}{' '}
                <span style={{ fontSize: 14, fontWeight: 400, color: C.WARM }}>deducibles/trimestre</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/transactions')}
              style={{
                background: C.CARD, color: C.INK, border: 'none',
                borderRadius: 999, padding: '11px 22px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              Añadir facturas →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
