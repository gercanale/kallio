"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { Navigation } from "@/components/Navigation";
import { PrivacyAmount, usePrivacyMask } from "@/components/PrivacyAmount";
import {
  calculateTaxSnapshot,
  currentQuarter,
  nowInSpain,
  getQuarterDeadlines,
  formatCurrency,
  quarterDateRange,
} from "@/lib/tax-engine";

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
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
        {weeks.map((w, i) => (
          <div key={i} style={{
            flex: 1,
            height: w.income > 0 ? `${Math.max((w.income / maxIncome) * 100, 8)}%` : '3px',
            background: w.isPast ? C.INK : `${C.IVA}99`,
            borderRadius: '2px 2px 0 0',
            transition: 'height 0.3s ease',
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TrimesterPage() {
  const router        = useRouter();
  const hydrated      = useHydrated();
  const profile       = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const transactions  = useKallioStore((s) => s.transactions);

  const now  = useMemo(() => nowInSpain(), []);
  const currY = now.getFullYear();
  const currQ = currentQuarter(now);

  const [selectedQ, setSelectedQ] = useState(currQ);

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) { router.replace("/"); return; }
    if (!profile.onboardingComplete) router.replace("/onboarding");
  }, [hydrated, sessionActive, profile.onboardingComplete, router]);

  const snap = useMemo(
    () => calculateTaxSnapshot(transactions, profile, selectedQ, currY),
    [transactions, profile, selectedQ, currY]
  );

  const { start: qStart, end: qEnd } = useMemo(
    () => quarterDateRange(selectedQ, currY),
    [selectedQ, currY]
  );

  const daysLeft = selectedQ === currQ
    ? Math.max(0, Math.ceil((qEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Next deadline for selected quarter
  const allDeadlines = getQuarterDeadlines(currY);
  const deadline = allDeadlines.find(d => d.quarter === selectedQ);
  const deadlineDate = deadline ? new Date(deadline.modelo130Deadline) : null;
  const deadlineLabel = deadlineDate
    ? deadlineDate.toLocaleDateString("es-ES", { day: "numeric", month: "long" })
    : null;
  const isPast = deadlineDate ? deadlineDate < now : false;

  const mask = usePrivacyMask();

  const totalDue    = snap.ivaPayable + snap.irpfAdvancePayable;
  const hasData     = snap.grossIncome > 0;
  const spendable   = Math.max(0, snap.trueSpendableBalance);
  const pctOf       = (n: number) => snap.grossIncome > 0 ? `${Math.round((n / snap.grossIncome) * 100)}%` : '—';

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

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px 40px', boxSizing: 'border-box' }}>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <span style={{ fontSize: 11, color: C.IVA, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              TRIMESTRE · {selectedQ}T {currY}
            </span>
            {selectedQ === currQ && daysLeft > 0 && (
              <span style={{ fontSize: 11, color: C.MUTED, marginLeft: 8 }}>· {daysLeft} días restantes</span>
            )}
            {isPast && (
              <span style={{ fontSize: 11, color: C.OK, marginLeft: 8, fontWeight: 600 }}>· cerrado</span>
            )}
          </div>

          {/* Quarter selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4].map(q => (
              <button
                key={q}
                onClick={() => setSelectedQ(q)}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${selectedQ === q ? C.INK : C.BORDER}`,
                  background: selectedQ === q ? C.INK : 'transparent',
                  color: selectedQ === q ? 'white' : C.MUTED,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {q}T
              </button>
            ))}
          </div>
        </div>

        {/* ── Facturado / tuyos headline ───────────────────────────────────── */}
        {hasData ? (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 17, color: C.INK, margin: '0 0 2px', lineHeight: 1.4 }}>
              Facturado este trimestre <strong>€{mask(fmt(snap.grossIncome))},</strong>
            </p>
            <p style={{ fontSize: 22, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>
              tuyos:{' '}
              <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400 }}>€{mask(fmt(spendable))}</span>
            </p>
          </div>
        ) : (
          <p style={{ fontSize: 15, color: C.MUTED, marginBottom: 20 }}>
            Sin facturas registradas en {selectedQ}T {currY}.
          </p>
        )}

        {/* ── Dark payment card ────────────────────────────────────────────── */}
        {deadlineLabel && (
          <div style={{ background: C.INK, color: 'white', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: C.WARM, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              {isPast ? `PAGADO EL ${deadlineLabel.toUpperCase()}` : `A PAGAR EL ${deadlineLabel.toUpperCase()}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  €{mask(fmt(totalDue))}
                </div>
                <div style={{ fontSize: 12, color: C.WARM, marginTop: 8 }}>
                  M303 · IVA <PrivacyAmount value={formatCurrency(snap.ivaPayable)} /> + M130 · IRPF <PrivacyAmount value={formatCurrency(snap.irpfAdvancePayable)} />
                </div>
              </div>
              {isPast && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="mono" style={{ fontSize: 9, color: C.OK, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                    TRIMESTRE CERRADO
                  </div>
                  <div style={{ fontSize: 13, color: C.OK, fontWeight: 600 }}>✓ presentado</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Weekly bar chart ─────────────────────────────────────────────── */}
        {hasData && (
          <div style={{ marginBottom: 24 }}>
            <div className="mono" style={{ fontSize: 10, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              INGRESOS POR SEMANA
            </div>
            <WeeklyBars transactions={transactions} qStart={qStart} qEnd={qEnd} now={now} />
          </div>
        )}

        {/* ── 4-row breakdown ──────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.BORDER}`, marginBottom: 20 }}>
          {[
            {
              dot: C.INK, dashed: false,
              label: 'Tuyo',
              value: spendable,
              pct: pctOf(spendable),
              sub: 'Neto disponible este trimestre tras impuestos y gastos.',
            },
            {
              dot: C.IVA, dashed: false,
              label: 'IVA (M303)',
              value: snap.ivaPayable,
              pct: pctOf(snap.ivaPayable),
              sub: 'IVA repercutido menos IVA soportado de gastos deducibles.',
            },
            {
              dot: C.IRPF, dashed: false,
              label: 'IRPF adelantado (M130)',
              value: snap.irpfAdvancePayable,
              pct: pctOf(snap.irpfAdvancePayable),
              sub: 'Pago fraccionado del trimestre al 20% del rendimiento neto.',
            },
            {
              dot: C.IRPF, dashed: true,
              label: 'IRPF acumulado a pagar en renta anual',
              value: snap.yearEndIRPFGap,
              pct: `~${pctOf(snap.yearEndIRPFGap)}`,
              sub: snap.yearEndIRPFGap > 0
                ? `Estimado al cierre del año. En la Renta ${currY} (jun ${currY + 1}) quedarán ~${mask(formatCurrency(snap.yearEndIRPFGap))} por regularizar.`
                : 'Tus anticipos cubren el IRPF estimado para este año.',
            },
          ].map(({ dot, dashed, label, value, pct, sub }, i) => (
            <div key={label} style={{
              display: 'grid', gridTemplateColumns: '16px 1fr auto auto', gap: '0 12px',
              padding: '14px 0', borderBottom: i < 3 ? `1px solid ${C.BORDER}` : 'none', alignItems: 'start',
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
              <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', paddingTop: 1, whiteSpace: 'nowrap' }}>
                <PrivacyAmount value={formatCurrency(value)} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Deductions panel ─────────────────────────────────────────────── */}
        {(snap.ivaDeductible > 0 || snap.deductibleExpenses > 0) && (
          <div style={{
            padding: '14px 18px', background: '#f0f5ed',
            border: `1px solid #c8ddc0`, borderRadius: 12, marginBottom: 20,
          }}>
            <div className="mono" style={{ fontSize: 10, color: C.OK, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
              DEDUCCIONES DE GASTOS ESTE TRIMESTRE
            </div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {snap.ivaDeductible > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: C.MUTED, marginBottom: 3 }}>IVA soportado recuperable</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.OK }}>−<PrivacyAmount value={formatCurrency(snap.ivaDeductible)} /></div>
                  <div style={{ fontSize: 10, color: C.MUTED, marginTop: 2 }}>reduce tu M303</div>
                </div>
              )}
              {snap.deductibleExpenses > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: C.MUTED, marginBottom: 3 }}>Gastos deducibles IRPF</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.OK }}>−<PrivacyAmount value={formatCurrency(snap.deductibleExpenses)} /></div>
                  <div style={{ fontSize: 10, color: C.MUTED, marginTop: 2 }}>reducen base M130</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/transactions')}
            style={{
              background: C.INK, color: 'white', border: 'none', borderRadius: 999,
              padding: '11px 22px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Ver facturas →
          </button>
          <button
            onClick={() => router.push('/renta')}
            style={{
              background: 'transparent', color: C.INK, border: `1px solid ${C.BORDER}`,
              borderRadius: 999, padding: '11px 22px', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Simular Renta {currY} →
          </button>
        </div>

      </main>
    </div>
  );
}
