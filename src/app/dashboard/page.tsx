"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import {
  calculateTaxSnapshot,
  quarterDateRange,
  currentQuarter,
  nowInSpain,
  getQuarterDeadlines,
  daysUntilDeadline,
} from "@/lib/tax-engine";
import { Navigation } from "@/components/Navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { SetupWizard } from "@/components/SetupWizard";
import { DeductionAssistant } from "@/components/DeductionAssistant";
import { BeckhamCountdown } from "@/components/BeckhamCountdown";
import { PreguntameButton } from "@/components/PreguntameButton";
import type { Transaction } from "@/lib/types";

// ─── Direction A tokens ───────────────────────────────────────────────────────
const C = {
  BG:          '#fdfaf3',
  INK:         '#1a1f2e',
  MUTED:       '#6b6456',
  BORDER:      '#e8dfc8',
  BORDER_SOFT: '#f0e8d3',
  IVA:         '#c44536',
  IRPF:        '#d4a017',
  OK:          '#5a7a3e',
  CARD:        '#ffffff',
  WARM:        '#c9bfa8',
};

// ─── Weekly bar chart helper ──────────────────────────────────────────────────
function weeklyIncomeHeights(txs: Transaction[], quarter: number, year: number): number[] {
  const { start } = quarterDateRange(quarter, year);
  const weeks = new Array(13).fill(0);
  for (const tx of txs) {
    if (tx.type !== "income") continue;
    const d = new Date(tx.date);
    const dayOffset = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
    if (dayOffset < 0 || dayOffset > 91) continue;
    const wi = Math.min(Math.floor(dayOffset / 7), 12);
    weeks[wi] += tx.amount / (1 + tx.ivaRate / 100);
  }
  const max = Math.max(...weeks, 1);
  return weeks.map(v => Math.round((v / max) * 100));
}

// ─── Quarter deadline label ───────────────────────────────────────────────────
function deadlineLabel(quarter: number, year: number): string {
  const deadlines = getQuarterDeadlines(year);
  const d = deadlines.find(x => x.quarter === quarter);
  if (!d) return "";
  const dt = new Date(d.modelo130Deadline);
  return dt.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// ─── Quarter months label for bar chart axis ──────────────────────────────────
function quarterMonthLabels(quarter: number): [string, string, string] {
  const months = [
    ["Ene","Feb","Mar"], ["Abr","May","Jun"],
    ["Jul","Ago","Sep"], ["Oct","Nov","Dic"],
  ];
  return months[quarter - 1] as [string, string, string];
}

export default function DashboardPage() {
  const router       = useRouter();
  const hydrated     = useHydrated();
  const profile      = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const transactions = useKallioStore((s) => s.transactions);
  const wizardProfile   = useKallioStore((s) => s.wizardProfile);
  const checkerHistory  = useKallioStore((s) => s.checkerHistory);
  const t            = useT();

  const [showForm,   setShowForm]   = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const now   = useMemo(() => nowInSpain(), []);
  const currQ = currentQuarter(now);
  const currY = now.getFullYear();

  // Quarter selection: 1–4
  const [selQ, setSelQ] = useState(currQ);
  const selY = currY; // always current year for MVP

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) router.replace("/");
    else if (!profile.onboardingComplete) router.replace("/onboarding");
  }, [hydrated, sessionActive, profile.onboardingComplete, router]);

  const snapshot = useMemo(
    () => calculateTaxSnapshot(transactions, profile, selQ, selY),
    [transactions, profile, selQ, selY]
  );

  const barHeights = useMemo(
    () => weeklyIncomeHeights(transactions, selQ, selY),
    [transactions, selQ, selY]
  );

  const fmt = (n: number) =>
    n.toLocaleString("es-ES", { maximumFractionDigits: 0 });

  // Derived display values
  const gross         = snapshot.grossIncome;
  const spendable     = Math.max(0, gross - snapshot.totalTaxReserve);
  const taxDue        = snapshot.ivaPayable + snapshot.irpfAdvancePayable;
  const ivaAmt        = snapshot.ivaPayable;
  const irpfAdv       = snapshot.irpfAdvancePayable;
  const irpfEnd       = snapshot.yearEndIRPFGap;
  const pctOf = (n: number) => gross > 0 ? Math.round((n / gross) * 100) : 0;

  // Quarter status
  const deadlineISO = getQuarterDeadlines(selY).find(d => d.quarter === selQ)?.modelo130Deadline ?? "";
  const daysLeft    = deadlineISO ? daysUntilDeadline(deadlineISO) : 0;
  const isPast      = daysLeft < 0;
  const isCurrent   = selQ === currQ;
  const statusLabel = isCurrent
    ? `en curso · ${daysLeft} días`
    : isPast ? "pasado" : "próximo";

  const dueLabel   = deadlineLabel(selQ, selY);
  const [m1, m2, m3] = quarterMonthLabels(selQ);

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

  return (
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK }}>
      <Navigation />

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '80px 24px 88px', boxSizing: 'border-box' }}>

        {/* ── Beckham banner ─────────────────────────────────────────────── */}
        {isBeckham && wizardProfile && wizardProfile.beckhamStartYear && (
          <div style={{ marginBottom: 24 }}>
            <BeckhamCountdown
              beckhamStartYear={wizardProfile.beckhamStartYear}
              annualNetIncome={snapshot.projectedAnnualNetIncome}
            />
          </div>
        )}

        {/* ── Quarter tabs + date ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map(q => {
              const active = selQ === q;
              const hasTxs = transactions.some(tx => {
                const d = new Date(tx.date);
                return currentQuarter(d) === q && d.getFullYear() === currY;
              });
              return (
                <button
                  key={q}
                  onClick={() => setSelQ(q)}
                  style={{
                    background: active ? C.INK : 'transparent',
                    color: active ? 'white' : hasTxs ? C.INK : C.MUTED,
                    border: `1px solid ${active ? C.INK : C.BORDER}`,
                    borderRadius: 999, padding: '7px 16px',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {q}T
                </button>
              );
            })}
          </div>

          {/* Date + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ fontSize: 11, color: C.MUTED, letterSpacing: '0.08em' }}>
              {now.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }).toUpperCase()}
            </span>
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

        {/* ── Status + headline ───────────────────────────────────────────── */}
        <div className="mono" style={{ fontSize: 11, color: C.IVA, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
          {selQ}T {selY} · {statusLabel}
        </div>

        {gross > 0 ? (
          <>
            <div style={{ fontSize: 20, color: C.MUTED, marginBottom: 4, lineHeight: 1.4 }}>
              Facturado este trimestre{' '}
              <strong style={{ color: C.INK }}>€{fmt(gross)}</strong>,
            </div>
            <div style={{ fontSize: 26, fontWeight: 500, marginBottom: 28 }}>
              tuyos:{' '}
              <span className="serif" style={{ fontSize: 30 }}>€{fmt(spendable)}</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 18, color: C.MUTED, marginBottom: 28, lineHeight: 1.5 }}>
            {selQ === currQ
              ? <>Sin facturas aún este trimestre. <button onClick={() => setShowForm(true)} style={{ background: 'none', border: 'none', color: C.IVA, cursor: 'pointer', fontFamily: 'inherit', fontSize: 18, fontWeight: 600, padding: 0 }}>Añade la primera →</button></>
              : <>Sin facturas registradas en {selQ}T {selY}.</>
            }
          </div>
        )}

        {/* ── Hero dark card ──────────────────────────────────────────────── */}
        <div style={{
          background: C.INK, color: 'white', borderRadius: 18,
          padding: '28px 32px', marginBottom: 28,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: C.IRPF, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>
              {isPast ? `Venció el ${dueLabel}` : `A pagar el ${dueLabel}`}
            </div>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.03em' }}>
              €{fmt(taxDue)}
            </div>
            <div className="mono" style={{ fontSize: 12, color: C.WARM, marginTop: 10, lineHeight: 1.6 }}>
              M303 · IVA €{fmt(ivaAmt)}{' '}+{' '}M130 · IRPF €{fmt(irpfAdv)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 10, color: C.WARM, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
              {gross > 0 ? 'Ya reservado' : 'Reserva estimada'}
            </div>
            {gross > 0 && taxDue <= gross ? (
              <div style={{ fontSize: 16, color: '#9ec77c', fontWeight: 600 }}>✓ 100% cubierto</div>
            ) : (
              <div style={{ fontSize: 13, color: C.WARM }}>Añade facturas para confirmar</div>
            )}
          </div>
        </div>

        {/* ── Weekly bar chart ────────────────────────────────────────────── */}
        <div className="mono" style={{ fontSize: 10, color: C.MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
          Ingresos por semana · {selQ}T {selY}
        </div>
        <div style={{ display: 'flex', gap: 4, height: 80, alignItems: 'flex-end', marginBottom: 6, borderBottom: `1px solid ${C.BORDER}`, paddingBottom: 4 }}>
          {barHeights.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(h, 4)}%`,
                background: i < Math.floor((now.getDate() + (now.getMonth() - ((selQ - 1) * 3)) * 30) / 7) && isCurrent
                  ? C.INK
                  : isCurrent ? C.IVA : (h > 0 ? C.INK : C.BORDER),
                borderRadius: '2px 2px 0 0',
                opacity: isCurrent && i > Math.floor((now.getDate() + (now.getMonth() - ((selQ - 1) * 3)) * 30) / 7) ? 0.4 : 0.85,
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
          <span className="mono" style={{ fontSize: 10, color: C.MUTED }}>S1 · {m1.toUpperCase()}</span>
          <span className="mono" style={{ fontSize: 10, color: C.MUTED }}>{m2.toUpperCase()}</span>
          <span className="mono" style={{ fontSize: 10, color: C.MUTED }}>{m3.toUpperCase()} · S13</span>
        </div>

        {/* ── 4-bucket table ──────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.BORDER}`, paddingTop: 20, marginBottom: 28 }}>
          {[
            { label: 'Tuyo',                     value: spendable, color: C.INK,  dashed: false },
            { label: 'IVA · Modelo 303',          value: ivaAmt,   color: C.IVA,  dashed: false },
            { label: 'IRPF adelantado · M130',    value: irpfAdv,  color: C.IRPF, dashed: false },
            { label: 'IRPF Renta estimado',       value: irpfEnd,  color: C.IRPF, dashed: true  },
          ].map(({ label, value, color, dashed }, i) => (
            <div
              key={label}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                borderBottom: i < 3 ? `1px solid ${C.BORDER_SOFT}` : 'none',
              }}
            >
              <div style={{
                width: 11, height: 11, borderRadius: 3, flexShrink: 0,
                background: dashed ? 'transparent' : color,
                border: dashed ? `2px dashed ${color}` : 'none',
              }} />
              <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{label}</div>
              <div className="mono" style={{ fontSize: 11, color: C.MUTED, width: 40, textAlign: 'right' }}>
                {gross > 0 ? pctOf(value) + '%' : '—'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 100, textAlign: 'right' }}>
                €{fmt(value)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick links ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {[
            { label: t.checker.title, onClick: () => router.push('/checker') },
            { label: t.simpleView.backtest, onClick: () => router.push('/backtest') },
          ].map(({ label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                background: 'transparent', border: `1px solid ${C.BORDER}`,
                borderRadius: 999, padding: '7px 16px', fontSize: 12,
                color: C.MUTED, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
          {wizardProfile && (
            <div style={{ marginLeft: 'auto' }}>
              <PreguntameButton
                snapshot={snapshot}
                wizardProfile={wizardProfile}
                checkerHistory={checkerHistory}
              />
            </div>
          )}
        </div>

        {/* ── Deduction assistant ──────────────────────────────────────────── */}
        <DeductionAssistant />

      </main>

      {showForm   && <TransactionForm onClose={() => setShowForm(false)} />}
      {showWizard && <SetupWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}
