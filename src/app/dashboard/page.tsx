"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import {
  calculateTaxSnapshot,
  calculateYTDSnapshot,
  currentQuarter,
  nowInSpain,
  getQuarterDeadlines,
  daysUntilDeadline,
  formatCurrency,
  quarterDateRange,
} from "@/lib/tax-engine";
import { getBucketsForActivity, quarterlyDeductible } from "@/lib/gastos-data";
import type { ActivityKey } from "@/lib/wizard-config";
import { Navigation } from "@/components/Navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { SetupWizard } from "@/components/SetupWizard";
import { BeckhamCountdown } from "@/components/BeckhamCountdown";
import { PreguntameButton } from "@/components/PreguntameButton";

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

// ─── Weekly bar chart ─────────────────────────────────────────────────────────
function WeeklyBars({
  transactions,
  qStart,
  qEnd,
  now,
}: {
  transactions: Array<{ type: string; amount: number; date: string }>;
  qStart: Date;
  qEnd: Date;
  now: Date;
}) {
  const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const weeks: Array<{ income: number; isPast: boolean }> = [];
  let ws = new Date(qStart);
  while (ws < qEnd) {
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const income = transactions
      .filter(t => t.type === 'income')
      .filter(t => { const d = new Date(t.date); return d >= ws && d < we; })
      .reduce((s, t) => s + t.amount, 0);
    weeks.push({ income, isPast: we <= now });
    ws = new Date(we);
  }
  const maxIncome = Math.max(...weeks.map(w => w.income), 1);
  const firstMonth = MONTHS[qStart.getMonth()];
  const midMonth   = MONTHS[new Date((qStart.getTime() + qEnd.getTime()) / 2).getMonth()];
  const lastMonth  = MONTHS[qEnd.getMonth()];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 72 }}>
        {weeks.map((w, i) => (
          <div key={i} style={{
            flex: 1,
            height: w.income > 0 ? `${Math.max((w.income / maxIncome) * 100, 8)}%` : '3px',
            background: w.isPast ? C.INK : `${C.IVA}99`,
            borderRadius: '2px 2px 0 0',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.06em' }}>S1 · {firstMonth}</span>
        <span className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.06em' }}>{midMonth}</span>
        <span className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.06em' }}>{lastMonth} · S13</span>
      </div>
    </div>
  );
}

// ─── Next deadline helper ─────────────────────────────────────────────────────
function nextDeadline(year: number, now: Date) {
  const deadlines = getQuarterDeadlines(year);
  const upcoming = deadlines
    .map(d => ({ ...d, date: new Date(d.modelo130Deadline) }))
    .filter(d => d.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  if (upcoming.length === 0) return null;
  const d = upcoming[0];
  const label = d.date.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  return { quarter: d.quarter, label, date: d.date };
}

export default function DashboardPage() {
  const router        = useRouter();
  const hydrated      = useHydrated();
  const profile       = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const transactions  = useKallioStore((s) => s.transactions);
  const wizardProfile = useKallioStore((s) => s.wizardProfile);
  const checkerHistory      = useKallioStore((s) => s.checkerHistory);
  const activatedBuckets    = useKallioStore((s) => s.activatedBuckets);
  const t             = useT();

  const [showForm,   setShowForm]   = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [rentaOpen,  setRentaOpen]  = useState(false);
  const [aparted,    setAparted]    = useState(false);

  const now   = useMemo(() => nowInSpain(), []);
  const currQ = currentQuarter(now);
  const currY = now.getFullYear();

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) router.replace("/");
    else if (!profile.onboardingComplete) router.replace("/onboarding");
  }, [hydrated, sessionActive, profile.onboardingComplete, router]);

  // ── YTD snapshot (annual view) ──────────────────────────────────────────────
  const ytd = useMemo(
    () => calculateYTDSnapshot(transactions, profile, currY),
    [transactions, profile, currY]
  );

  // ── Current quarter snapshot (for "Próximo vencimiento" amount) ─────────────
  const currQSnap = useMemo(
    () => calculateTaxSnapshot(transactions, profile, currQ, currY),
    [transactions, profile, currQ, currY]
  );

  const isBeckham = wizardProfile?.fiscalRegime === "beckham";

  if (!hydrated || !sessionActive) {
    return (
      <div style={{ minHeight: '100dvh', background: C.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${C.IVA}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!profile.onboardingComplete) return null;

  // ── Derived values ────────────────────────────────────────────────────────
  const gross       = ytd.grossIncome;
  const spendable   = Math.max(0, ytd.trueSpendableBalance);
  const ivaRes      = ytd.ivaPayable;
  const irpfPaid    = ytd.irpfPaidViaAdvances;
  const irpfGap     = ytd.yearEndIRPFGap;
  const barTotal    = spendable + ivaRes + irpfPaid + irpfGap;
  const pctOf       = (n: number) => gross > 0 ? `${Math.round((n / gross) * 100)}%` : '—';
  const spendablePct = gross > 0 ? Math.round((spendable / gross) * 100) : 0;

  // Bar segment widths (relative to barTotal to fill 100%)
  const seg = (n: number) => barTotal > 0 ? `${(n / barTotal) * 100}%` : '0%';

  // Next deadline
  const nextDL = nextDeadline(currY, now);
  const nextDLAmt = currQSnap.ivaPayable + currQSnap.irpfAdvancePayable;

  // Quarter date range + days remaining
  const { start: qStart, end: qEnd } = quarterDateRange(currQ, currY);
  const daysLeft = Math.max(0, Math.ceil((qEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const qGross     = currQSnap.grossIncome;
  const qSpendable = currQSnap.trueSpendableBalance;
  const qHasData   = qGross > 0;
  const qTotal     = currQSnap.totalTaxReserve;
  const qPctOf     = (n: number) => qGross > 0 ? `${Math.round((n / qGross) * 100)}%` : '—';

  // Gastos nudge — how many potential buckets are not yet activated
  const allBuckets     = useMemo(() => getBucketsForActivity(wizardProfile?.activity ?? null), [wizardProfile]);
  const activeCount    = Object.keys(activatedBuckets).length;
  const untappedCount  = allBuckets.length - activeCount;
  const untappedSaving = useMemo(() => allBuckets.reduce((sum, b) => {
    if (b.id in activatedBuckets) return sum;
    return sum + quarterlyDeductible(b, b.defaultAmount);
  }, 0), [allBuckets, activatedBuckets]);

  // Renta projection
  const projectedYE   = ytd.projectedAnnualNetIncome;
  const effRate       = ytd.effectiveIRPFRate;
  const advRate       = 0.20; // Modelo 130 advance rate
  const rentaGap      = ytd.yearEndIRPFGap;

  const hasData = gross > 0;

  return (
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK, paddingBottom: 80 }}>
      <Navigation />

      <main style={{ maxWidth: 700, margin: '0 auto', padding: '72px 24px 40px', boxSizing: 'border-box' }}>

        {/* ── Beckham banner ─────────────────────────────────────────────── */}
        {isBeckham && wizardProfile?.beckhamStartYear && (
          <div style={{ marginBottom: 20 }}>
            <BeckhamCountdown
              beckhamStartYear={wizardProfile.beckhamStartYear}
              annualNetIncome={ytd.projectedAnnualNetIncome}
            />
          </div>
        )}

        {/* ── Header row: year + actions ──────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <span className="mono" style={{ fontSize: 11, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t.dashboard.yearLabel.replace('{{year}}', String(currY))}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowWizard(true)}
              style={{ background: 'transparent', border: `1px solid ${C.BORDER}`, borderRadius: 999, padding: '6px 12px', fontSize: 12, color: C.MUTED, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ⚙ {t.simpleView.configure}
            </button>
            <button
              onClick={() => setShowForm(true)}
              style={{ background: C.INK, color: 'white', border: 'none', borderRadius: 999, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + {t.dashboard.addButton}
            </button>
          </div>
        </div>

        {/* ── Hero headline + big number ──────────────────────────────────── */}
        {hasData ? (
          <>
            <p style={{ fontSize: 18, color: C.INK, margin: '0 0 4px', lineHeight: 1.4, fontWeight: 400 }}>
              {t.dashboard.billedThis.replace('{{amount}}', fmt(gross))}
            </p>
            <p style={{ fontSize: 22, fontWeight: 500, margin: '0 0 8px', lineHeight: 1.3 }}>
              {t.dashboard.yoursReally}{' '}
              <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400 }}>{t.dashboard.yoursReallyItalic}</span>
            </p>

            <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em', margin: '8px 0 6px', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(spendable)}€
            </div>

            <p style={{ fontSize: 13, color: C.MUTED, margin: '0 0 24px' }}>
              {t.dashboard.pctOfBilled.replace('{{pct}}', String(spendablePct))}
            </p>

            {/* ── Stacked color bar ─────────────────────────────────────── */}
            <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', display: 'flex', marginBottom: 28, background: C.BORDER }}>
              <div style={{ width: seg(spendable), background: C.INK,  transition: 'width 0.6s ease' }} />
              <div style={{ width: seg(ivaRes),    background: C.IVA,  transition: 'width 0.6s ease' }} />
              <div style={{ width: seg(irpfPaid),  background: C.IRPF, transition: 'width 0.6s ease' }} />
              <div style={{ width: seg(irpfGap),   background: `${C.IRPF}55`, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.06em' }}>€0</span>
              <span className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.06em' }}>€{fmt(gross)}</span>
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 20, color: C.MUTED, lineHeight: 1.5, margin: '0 0 16px' }}>
              {t.dashboard.noInvoicesYet}{' '}
              <button
                onClick={() => setShowForm(true)}
                style={{ background: 'none', border: 'none', color: C.IVA, cursor: 'pointer', fontFamily: 'inherit', fontSize: 20, fontWeight: 600, padding: 0 }}
              >
                {t.dashboard.addFirst}
              </button>
            </p>
          </div>
        )}

        {/* ── 4-bucket table ──────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.BORDER}`, marginBottom: 24 }}>
          {[
            {
              dot: C.INK, dashed: false,
              label: t.dashboard.bucketYours,
              value: spendable,
              pct: pctOf(spendable),
              sub: t.dashboard.bucketYoursSub,
              tag: null,
            },
            {
              dot: C.IVA, dashed: false,
              label: t.dashboard.bucketIva,
              value: ivaRes,
              pct: pctOf(ivaRes),
              sub: t.dashboard.bucketIvaSub,
              tag: null,
            },
            {
              dot: C.IRPF, dashed: false,
              label: t.dashboard.bucketIrpfPaid,
              value: irpfPaid,
              pct: pctOf(irpfPaid),
              sub: t.dashboard.bucketIrpfPaidSub,
              tag: t.dashboard.bucketIrpfPaidTag,
            },
            {
              dot: C.IRPF, dashed: true,
              label: t.dashboard.bucketIrpfGap,
              value: irpfGap,
              pct: t.dashboard.bucketIrpfGapPct.replace('{{pct}}', pctOf(irpfGap)),
              sub: irpfGap > 0
                ? t.dashboard.bucketIrpfGapSubBad
                    .replace('{{year}}', String(currY))
                    .replace('{{yearNext}}', String(currY + 1))
                    .replace('{{amount}}', formatCurrency(irpfGap))
                    .replace('{{rate}}', String(Math.round(effRate * 100)))
                : t.dashboard.bucketIrpfGapSubOk,
              tag: null,
            },
          ].map(({ dot, dashed, label, value, pct, sub, tag }, i) => (
            <div
              key={label}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px 1fr auto auto',
                gap: '0 12px',
                padding: '14px 0',
                borderBottom: i < 3 ? `1px solid ${C.BORDER}` : 'none',
                alignItems: 'start',
              }}
            >
              {/* Dot */}
              <div style={{
                width: 11, height: 11, borderRadius: 3, marginTop: 3, flexShrink: 0,
                background: dashed ? 'transparent' : dot,
                border: dashed ? `2px dashed ${dot}` : 'none',
              }} />

              {/* Label + description */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.INK }}>{label}</span>
                  {tag && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.OK, background: '#eef3eb', border: `1px solid #c8ddc0`, borderRadius: 999, padding: '2px 8px', letterSpacing: '0.04em' }}>
                      {tag}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: C.MUTED, margin: '3px 0 0', lineHeight: 1.55 }}>{sub}</p>
              </div>

              {/* Percentage */}
              <div className="mono" style={{ fontSize: 11, color: C.MUTED, textAlign: 'right', paddingTop: 2, whiteSpace: 'nowrap' }}>
                {pct}
              </div>

              {/* Amount */}
              <div style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', paddingTop: 1, whiteSpace: 'nowrap' }}>
                {formatCurrency(value)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Trimestre section ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>

          {/* Quarter header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: C.IVA, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {currQ}T {currY} · EN CURSO · {daysLeft} DÍAS RESTANTES
            </span>
            <button
              onClick={() => router.push('/renta')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.MUTED, fontFamily: 'inherit', padding: 0 }}
            >
              {t.dashboard.simulateRenta.replace('{{year}}', String(currY))}
            </button>
          </div>

          {/* Facturado este trimestre */}
          {qHasData ? (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 16, color: C.INK, margin: '0 0 2px', lineHeight: 1.4 }}>
                Facturado este trimestre <strong>€{fmt(qGross)},</strong>
              </p>
              <p style={{ fontSize: 20, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>
                tuyos:{' '}
                <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400 }}>€{fmt(Math.max(0, qSpendable))}</span>
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: C.MUTED, margin: '0 0 20px' }}>Sin facturas este trimestre aún.</p>
          )}

          {/* Dark payment card */}
          {nextDL && (
            <div style={{ background: C.INK, color: 'white', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.WARM, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                A PAGAR EL {nextDL.label.toUpperCase()}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    €{fmt(nextDLAmt)}
                  </div>
                  <div style={{ fontSize: 12, color: C.WARM, marginTop: 8 }}>
                    M303 · IVA {formatCurrency(currQSnap.ivaPayable)} + M130 · IRPF {formatCurrency(currQSnap.irpfAdvancePayable)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="mono" style={{ fontSize: 9, color: C.WARM, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                    YA RESERVADO
                  </div>
                  <div style={{ fontSize: 13, color: aparted ? C.OK : C.WARM, fontWeight: 600 }}>
                    {aparted ? '✓ 100% cubierto' : `${formatCurrency(nextDLAmt)} pendiente`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weekly bar chart */}
          {qHasData && (
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 10, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                INGRESOS POR SEMANA
              </div>
              <WeeklyBars transactions={transactions} qStart={qStart} qEnd={qEnd} now={now} />
            </div>
          )}

          {/* Quarterly 4-row breakdown */}
          <div style={{ borderTop: `1px solid ${C.BORDER}` }}>
            {[
              {
                dot: C.INK, dashed: false,
                label: 'Tuyo',
                value: Math.max(0, qSpendable),
                pct: qPctOf(Math.max(0, qSpendable)),
                sub: 'Neto disponible este trimestre tras impuestos y gastos.',
              },
              {
                dot: C.IVA, dashed: false,
                label: 'IVA (M303)',
                value: currQSnap.ivaPayable,
                pct: qPctOf(currQSnap.ivaPayable),
                sub: 'IVA repercutido menos IVA soportado de gastos deducibles.',
              },
              {
                dot: C.IRPF, dashed: false,
                label: 'IRPF adelantado (M130)',
                value: currQSnap.irpfAdvancePayable,
                pct: qPctOf(currQSnap.irpfAdvancePayable),
                sub: 'Pago fraccionado del trimestre al 20% del rendimiento neto.',
              },
              {
                dot: C.IRPF, dashed: true,
                label: 'IRPF acumulado a pagar en renta anual',
                value: irpfGap,
                pct: `~${pctOf(irpfGap)}`,
                sub: irpfGap > 0
                  ? `Estimado al cierre del año. En la Renta ${currY} (jun ${currY + 1}) quedarán ~${formatCurrency(irpfGap)} por regularizar.`
                  : 'Tus anticipos cubren el IRPF estimado para este año.',
              },
            ].map(({ dot, dashed, label, value, pct, sub }, i) => (
              <div key={label} style={{
                display: 'grid', gridTemplateColumns: '16px 1fr auto auto', gap: '0 12px',
                padding: '12px 0', borderBottom: i < 3 ? `1px solid ${C.BORDER}` : 'none', alignItems: 'start',
              }}>
                <div style={{
                  width: 11, height: 11, borderRadius: 3, marginTop: 3, flexShrink: 0,
                  background: dashed ? 'transparent' : dot,
                  border: dashed ? `2px dashed ${dot}` : 'none',
                }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.INK }}>{label}</span>
                  <p style={{ fontSize: 11, color: C.MUTED, margin: '2px 0 0', lineHeight: 1.5 }}>{sub}</p>
                </div>
                <div className="mono" style={{ fontSize: 11, color: C.MUTED, textAlign: 'right', paddingTop: 2, whiteSpace: 'nowrap' }}>{pct}</div>
                <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', paddingTop: 1, whiteSpace: 'nowrap' }}>
                  {formatCurrency(value)}
                </div>
              </div>
            ))}

            {/* Deductions summary */}
            {(currQSnap.ivaDeductible > 0 || currQSnap.deductibleExpenses > 0) && (
              <div style={{
                marginTop: 12, padding: '12px 16px', background: '#f0f5ed',
                border: `1px solid #c8ddc0`, borderRadius: 10,
              }}>
                <div className="mono" style={{ fontSize: 10, color: C.OK, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
                  DEDUCCIONES ACTIVADAS ESTE TRIMESTRE
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {currQSnap.ivaDeductible > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: C.MUTED, marginBottom: 2 }}>IVA soportado recuperable</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.OK }}>−{formatCurrency(currQSnap.ivaDeductible)}</div>
                      <div style={{ fontSize: 10, color: C.MUTED }}>reduce tu M303</div>
                    </div>
                  )}
                  {currQSnap.deductibleExpenses > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: C.MUTED, marginBottom: 2 }}>Gastos deducibles IRPF</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.OK }}>−{formatCurrency(currQSnap.deductibleExpenses)}</div>
                      <div style={{ fontSize: 10, color: C.MUTED }}>reducen base M130</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Proyección de Renta ─────────────────────────────────────────── */}
        {hasData && rentaGap > 0 && (
          <div style={{ border: `1px solid ${C.BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
            <button
              onClick={() => setRentaOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', background: '#fdf7e8', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono" style={{ fontSize: 10, color: C.IRPF, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {t.dashboard.rentaProjection.replace('{{year}}', String(currY))}
                </span>
              </div>
              <span style={{ fontSize: 14, color: C.MUTED, lineHeight: 1 }}>{rentaOpen ? '▲' : '▼'}</span>
            </button>

            {rentaOpen && (
              <div style={{ padding: '16px 20px 20px', background: C.CARD, borderTop: `1px solid ${C.BORDER}` }}>
                <p style={{ fontSize: 14, color: C.INK, lineHeight: 1.7, margin: '0 0 20px' }}>
                  {t.dashboard.rentaBody
                    .replace('{{amount}}', fmt(projectedYE))
                    .replace('{{year}}', String(currY))
                    .replace('{{yearNext}}', String(currY + 1))
                    .replace('~{{gap}}', `~${formatCurrency(rentaGap)}`)}
                </p>

                {/* Three metric chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: t.dashboard.rentaMetricYELabel, value: `€${fmt(projectedYE)}`, sub: t.dashboard.rentaMetricYESub, color: C.INK },
                    { label: t.dashboard.rentaMetricRateLabel, value: `~${Math.round(effRate * 100)}%`, sub: t.dashboard.rentaMetricRateSub.replace('{{pct}}', String(Math.round(advRate * 100))), color: C.IRPF },
                    { label: t.dashboard.rentaMetricOwedLabel, value: formatCurrency(rentaGap), sub: t.dashboard.rentaMetricOwedSub, color: C.IVA },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} style={{ background: '#fdfaf3', border: `1px solid ${C.BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
                      <div className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 10, color: C.MUTED, marginTop: 4 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { setAparted(true); }}
                    style={{
                      background: aparted ? C.OK : C.INK, color: 'white', border: 'none',
                      borderRadius: 999, padding: '11px 20px', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {aparted
                      ? t.dashboard.apartDone.replace('{{amount}}', formatCurrency(rentaGap))
                      : t.dashboard.apartAuto.replace('{{amount}}', formatCurrency(rentaGap))}
                  </button>
                  <button
                    onClick={() => router.push('/renta')}
                    style={{
                      background: 'transparent', color: C.INK, border: `1px solid ${C.BORDER}`,
                      borderRadius: 999, padding: '11px 20px', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {t.dashboard.otherScenarios}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Gastos nudge ─────────────────────────────────────────────── */}
        {untappedCount > 0 && (
          <div
            onClick={() => router.push('/gastos')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', background: C.CARD, border: `1px solid ${C.BORDER}`,
              borderRadius: 14, marginBottom: 16, cursor: 'pointer',
            }}
          >
            <div>
              <div className="mono" style={{ fontSize: 10, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                {t.dashboard.untappedLabel}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.INK }}>
                {t.dashboard.untappedDesc.replace('{{count}}', String(untappedCount))}
                {untappedSaving > 0 && (
                  <span style={{ color: C.OK, marginLeft: 8 }}>{t.dashboard.untappedSaving.replace('{{amount}}', fmt(untappedSaving))}</span>
                )}
              </div>
            </div>
            <span style={{ fontSize: 18, color: C.MUTED }}>→</span>
          </div>
        )}

        {/* ── Quick links + PreguntameButton ──────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
          {[
            { label: t.checker.title,      href: '/checker'  },
            { label: t.simpleView.backtest, href: '/backtest' },
          ].map(({ label, href }) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              style={{ background: 'transparent', border: `1px solid ${C.BORDER}`, borderRadius: 999, padding: '7px 16px', fontSize: 12, color: C.MUTED, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <PreguntameButton
              snapshot={ytd}
              wizardProfile={wizardProfile ?? {
                fiscalRegime: 'eds', beckhamStartYear: null,
                incomeStructure: 'multi_client', activity: 'consultoria_tech',
                deductibilityRate: 1, incomeStability: 'stable',
                expensesVolume: 'some', wizardCompleted: false,
              }}
              checkerHistory={checkerHistory}
            />
          </div>
        </div>

      </main>

      {showForm   && <TransactionForm onClose={() => setShowForm(false)} />}
      {showWizard && <SetupWizard     onClose={() => setShowWizard(false)} />}
    </div>
  );
}
