"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import {
  calculateYTDSnapshot,
  calculateAnnualIRPF,
  effectiveIRPFRate,
  estimateMarginalRate,
  nowInSpain,
  formatCurrency,
} from "@/lib/tax-engine";
import { Navigation } from "@/components/Navigation";

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

// IRPF brackets (Spain 2025 combined state+regional)
const BRACKETS = [
  { from: 0,      to: 12450,    rate: 0.19, label: '0 – 12.450' },
  { from: 12450,  to: 20200,    rate: 0.24, label: '12.450 – 20.200' },
  { from: 20200,  to: 35200,    rate: 0.30, label: '20.200 – 35.200' },
  { from: 35200,  to: 60000,    rate: 0.37, label: '35.200 – 60.000' },
  { from: 60000,  to: 300000,   rate: 0.45, label: '60.000 – 300.000' },
  { from: 300000, to: Infinity, rate: 0.47, label: '> 300.000' },
];
const PERSONAL_ALLOWANCE = 5550;

interface BracketSlice {
  label: string;
  rate: number;
  taxable: number;  // amount in this bracket
  tax: number;      // tax from this bracket
  pct: number;      // % of total taxable base (for bar width)
}

function computeBrackets(annualNetIncome: number): BracketSlice[] {
  const taxable = Math.max(0, annualNetIncome - PERSONAL_ALLOWANCE);
  const slices: BracketSlice[] = [];
  let prev = 0;
  let remaining = taxable;
  for (const b of BRACKETS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.to - prev);
    if (slice > 0) {
      slices.push({
        label: b.label,
        rate: b.rate,
        taxable: slice,
        tax: slice * b.rate,
        pct: taxable > 0 ? (slice / taxable) * 100 : 0,
      });
    }
    remaining -= slice;
    prev = b.to;
  }
  return slices;
}

// Calendar deadlines
const DEADLINES = [
  { key: 'q1Deadline', year: 2026, month: 4,  day: 20, quarter: 1 },
  { key: 'q2Deadline', year: 2026, month: 7,  day: 20, quarter: 2 },
  { key: 'q3Deadline', year: 2026, month: 10, day: 20, quarter: 3 },
  { key: 'q4Deadline', year: 2027, month: 1,  day: 30, quarter: 4 },
  { key: 'rentaDeadline', year: 2027, month: 6, day: 30, quarter: 0 },
] as const;

export default function RentaPage() {
  const router        = useRouter();
  const hydrated      = useHydrated();
  const profile       = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const transactions  = useKallioStore((s) => s.transactions);
  const wizardProfile = useKallioStore((s) => s.wizardProfile);
  const t             = useT();

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) { router.replace("/"); return; }
    if (!profile.onboardingComplete) router.replace("/onboarding");
  }, [hydrated, sessionActive, profile.onboardingComplete, router]);

  const year = nowInSpain().getFullYear();

  const snapshot = useMemo(() => {
    if (!hydrated) return null;
    return calculateYTDSnapshot(transactions, profile, year);
  }, [transactions, profile, year, hydrated]);

  const isBeckham = wizardProfile?.fiscalRegime === "beckham";

  // Bracket slices for current projected income
  const bracketSlices = useMemo(() => {
    if (!snapshot) return [];
    return computeBrackets(snapshot.projectedAnnualNetIncome);
  }, [snapshot]);

  // Calendar: which deadlines have passed?
  const now = nowInSpain();
  const filedQuarters = useKallioStore((s) => s.filedQuarters);

  if (!hydrated || !sessionActive) {
    return (
      <div style={{ minHeight: '100dvh', background: C.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${C.IRPF}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!profile.onboardingComplete) return null;

  const hasData = snapshot && snapshot.grossIncome > 0;
  const currentMonth = now.getMonth() + 1;
  const isProjection = currentMonth < 12;

  return (
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK, paddingBottom: 80 }}>
      <Navigation />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px 40px', boxSizing: 'border-box' }}>

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              {t.renta.title}
            </h1>
            {isProjection && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#fdf3e0', color: C.IRPF, border: `1px solid ${C.IRPF}33`, borderRadius: 999, padding: '3px 10px', letterSpacing: '0.06em' }}>
                {t.renta.projectionBadge}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: C.MUTED, margin: 0 }}>
            {t.renta.subtitle} · {t.renta.yearLabel} {year}
          </p>
        </div>

        {!hasData ? (
          /* ── Empty state ──────────────────────────────────────────── */
          <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{t.renta.noData}</p>
            <button
              onClick={() => router.push("/transactions")}
              style={{ background: C.INK, color: 'white', border: 'none', borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}
            >
              {t.renta.noDataCta}
            </button>
          </div>
        ) : (
          <>
            {/* ── Section 1: Income & taxable base ────────────────────── */}
            <Section title={t.renta.incomeSectionTitle}>
              <Row label={t.renta.grossIncome}      value={formatCurrency(snapshot.grossIncome)}                      />
              <Row label={t.renta.ivaCollected}     value={`−\u2009${formatCurrency(snapshot.ivaCollected)}`}         muted />
              <Row label={t.renta.netIncome}        value={formatCurrency(snapshot.ytdNetIncome)}                     bold />
              {snapshot.deductibleExpenses > 0 && (
                <Row label={t.renta.deductibleExpenses} value={`−\u2009${formatCurrency(snapshot.deductibleExpenses)}`} muted />
              )}
              {snapshot.gjdDeduction > 0 && (
                <Row label={t.renta.gjdDeduction}   value={`−\u2009${formatCurrency(snapshot.gjdDeduction)}`}         muted />
              )}
              {snapshot.projectedAnnualNetIncome !== snapshot.netTaxableIncome && (
                <div style={{ fontSize: 11, color: C.MUTED, padding: '6px 0 2px', fontStyle: 'italic' }}>
                  {isProjection ? `${t.renta.projectionBadge}: ` : ''}
                </div>
              )}
              <Row
                label={t.renta.taxableBase}
                value={formatCurrency(isProjection ? snapshot.projectedAnnualNetIncome : snapshot.netTaxableIncome)}
                highlight
                accentColor={C.IRPF}
              />
              {PERSONAL_ALLOWANCE > 0 && (
                <Row label={t.renta.personalAllowance} value={`−\u2009${formatCurrency(PERSONAL_ALLOWANCE)}`} muted small />
              )}
            </Section>

            {/* ── Section 2: IRPF brackets ────────────────────────────── */}
            <Section title={isBeckham ? t.renta.beckhamTitle : t.renta.bracketsSectionTitle}>
              {isBeckham ? (
                <>
                  <div style={{ background: '#fdf3e0', border: `1px solid ${C.IRPF}33`, borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
                    <p style={{ fontSize: 13, color: C.INK, margin: 0, lineHeight: 1.6 }}>{t.renta.beckhamNote}</p>
                  </div>
                  <Row
                    label={t.renta.beckhamFlat}
                    value={formatCurrency(snapshot.projectedAnnualNetIncome * 0.24)}
                    highlight
                    accentColor={C.IRPF}
                  />
                </>
              ) : (
                <>
                  {/* Bracket waterfall */}
                  {bracketSlices.map((slice, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="mono" style={{ fontSize: 11, color: C.MUTED, letterSpacing: '0.06em', minWidth: 28 }}>
                            {Math.round(slice.rate * 100)}%
                          </span>
                          <span style={{ fontSize: 12, color: C.MUTED }}>€{slice.label}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.INK }}>{formatCurrency(slice.tax)}</span>
                      </div>
                      {/* Bar */}
                      <div style={{ height: 6, background: '#f0e8d3', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.max(slice.pct, 1)}%`,
                          background: i === 0 ? C.OK : i === 1 ? '#8a9e6a' : i === 2 ? C.IRPF : i === 3 ? '#c87d12' : C.IVA,
                          borderRadius: 999,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  ))}

                  {/* Rates summary */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    <RateBadge label={t.renta.effectiveRate} value={`${(snapshot.effectiveIRPFRate * 100).toFixed(1)}%`} color={C.IRPF} />
                    <RateBadge label={t.renta.marginalRate}  value={`${(estimateMarginalRate(snapshot.projectedAnnualNetIncome) * 100).toFixed(0)}%`} color={C.IVA} />
                  </div>

                  {/* Total */}
                  <div style={{ borderTop: `1px solid ${C.BORDER}`, marginTop: 16, paddingTop: 12 }}>
                    <Row
                      label={t.renta.totalIRPF}
                      value={formatCurrency(snapshot.estimatedAnnualIRPF)}
                      highlight
                      accentColor={C.IRPF}
                    />
                  </div>
                </>
              )}
            </Section>

            {/* ── Section 3: Modelo 130 advances ─────────────────────── */}
            <Section title={t.renta.advancesSectionTitle}>
              <Row label={t.renta.paidYTD}           value={formatCurrency(snapshot.irpfPaidViaAdvances)} />
              {isProjection && (
                <Row label={t.renta.projectedAdvances} value={formatCurrency(snapshot.irpfPaidViaAdvances * (12 / currentMonth))} muted />
              )}
            </Section>

            {/* ── Section 4: Year-end result (dark card) ───────────────── */}
            <div style={{ background: C.INK, borderRadius: 16, padding: '28px 28px 24px', marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 10, color: C.IRPF, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
                {t.renta.gapSectionTitle}
              </div>

              {snapshot.yearEndIRPFGap > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: '#c9bfa8', marginBottom: 6 }}>{t.renta.gapPositive}</div>
                  <div style={{ fontSize: 48, fontWeight: 700, color: C.IVA, lineHeight: 1, marginBottom: 4, letterSpacing: '-0.03em' }}>
                    {formatCurrency(snapshot.yearEndIRPFGap)}
                  </div>
                  <div style={{ fontSize: 12, color: '#8a8070', marginTop: 12, lineHeight: 1.6 }}>{t.renta.gapNote}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: '#c9bfa8', marginBottom: 6 }}>{t.renta.gapNegative}</div>
                  <div style={{ fontSize: 48, fontWeight: 700, color: '#9ec77c', lineHeight: 1, marginBottom: 4, letterSpacing: '-0.03em' }}>
                    {formatCurrency(Math.abs(snapshot.irpfPaidViaAdvances - snapshot.estimatedAnnualIRPF))}
                  </div>
                  <div style={{ fontSize: 12, color: '#8a8070', marginTop: 12, lineHeight: 1.6 }}>{t.renta.gapNote}</div>
                </>
              )}
            </div>

            {/* ── Section 5: Fiscal calendar ───────────────────────────── */}
            <Section title={t.renta.checklistTitle}>
              {DEADLINES.map((d) => {
                const deadline = new Date(d.year, d.month - 1, d.day);
                const isPast    = now > deadline;
                const isFiled   = d.quarter > 0 && filedQuarters.some(fq => fq.quarter === d.quarter && fq.year === year);
                const isDone    = isPast || isFiled;
                const label     = (t.renta as Record<string, string>)[d.key] ?? d.key;
                return (
                  <div
                    key={d.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0',
                      borderBottom: `1px solid ${C.BORDER}`,
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isFiled ? C.OK : isPast ? '#f0e8d3' : C.CARD,
                      border: `1.5px solid ${isFiled ? C.OK : isPast ? C.BORDER : C.BORDER}`,
                    }}>
                      {isFiled ? (
                        <span style={{ fontSize: 11, color: 'white', fontWeight: 700 }}>✓</span>
                      ) : isPast ? (
                        <span style={{ fontSize: 10, color: C.MUTED }}>·</span>
                      ) : (
                        <span style={{ fontSize: 9, color: C.BORDER }}>○</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 13,
                      color: isFiled ? C.OK : isPast ? C.MUTED : C.INK,
                      textDecoration: isPast && !isFiled ? 'line-through' : 'none',
                      flex: 1,
                    }}>
                      {label}
                    </span>
                    {d.quarter === 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.IRPF }}>★</span>
                    )}
                  </div>
                );
              })}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
      <div className="mono" style={{ fontSize: 10, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  bold = false,
  muted = false,
  highlight = false,
  accentColor,
  small = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  highlight?: boolean;
  accentColor?: string;
  small?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: highlight ? '10px 0 6px' : '5px 0',
      borderTop: highlight ? `1px solid ${C.BORDER}` : undefined,
      marginTop: highlight ? 8 : 0,
    }}>
      <span style={{
        fontSize: small ? 11 : 13,
        color: highlight ? C.INK : muted ? C.MUTED : C.INK,
        fontWeight: bold ? 600 : 400,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: small ? 12 : highlight ? 17 : 14,
        fontWeight: highlight ? 700 : bold ? 600 : 500,
        color: accentColor ?? (muted ? C.MUTED : C.INK),
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  );
}

function RateBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f4ec', border: `1px solid ${C.BORDER}`, borderRadius: 10, padding: '8px 14px' }}>
      <span style={{ fontSize: 12, color: C.MUTED }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
