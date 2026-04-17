"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Info, TrendingUp, Shield, Wallet } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { calculateTaxSnapshot, formatCurrency, currentQuarter } from "@/lib/tax-engine";

export function TaxReserveMeter() {
  const [expanded, setExpanded] = useState<null | "gross" | "reserve" | "spendable">(null);
  const transactions = useKallioStore((s) => s.transactions);
  const profile = useKallioStore((s) => s.profile);
  const language = useKallioStore((s) => s.language);
  const t = useT();
  const snap = useMemo(
    () => calculateTaxSnapshot(transactions, profile, currentQuarter(), new Date().getFullYear()),
    [transactions, profile]
  );

  const toggle = (key: "gross" | "reserve" | "spendable") =>
    setExpanded((prev) => (prev === key ? null : key));

  const reservePct = snap.grossIncome > 0
    ? Math.round((snap.totalTaxReserve / snap.grossIncome) * 100)
    : 0;
  const spendablePct = snap.grossIncome > 0
    ? Math.round((snap.trueSpendableBalance / snap.grossIncome) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-5">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-teal-200" />
          <span className="text-teal-200 text-xs font-medium uppercase tracking-wider">
            {t.meter.reserveLabel} – {snap.quarterLabel}
          </span>
        </div>
        <p className="text-white/70 text-sm">
          {t.meter.subtitle}
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-5 pb-2">
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
          <div
            className="bg-emerald-400 h-full rounded-l-full transition-all duration-700"
            style={{ width: `${Math.max(0, spendablePct)}%` }}
          />
          <div
            className="bg-red-400 h-full transition-all duration-700"
            style={{ width: `${Math.max(0, reservePct)}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            {t.meter.available}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {t.meter.reservedForTax}
          </span>
        </div>
      </div>

      {/* Three figures */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        {/* Gross income */}
        <button
          onClick={() => toggle("gross")}
          className="p-4 text-left hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            {expanded === "gross" ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </div>
          <p className="text-lg font-bold text-slate-900 tabular-nums">
            {formatCurrency(snap.grossIncome)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{t.meter.grossIncome}</p>
        </button>

        {/* Tax reserve */}
        <button
          onClick={() => toggle("reserve")}
          className="p-4 text-left hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-1">
            <Shield className="w-3.5 h-3.5 text-red-400" />
            {expanded === "reserve" ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </div>
          <p className="text-lg font-bold text-red-600 tabular-nums">
            {formatCurrency(snap.totalTaxReserve)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{t.meter.taxReserve}</p>
        </button>

        {/* Spendable */}
        <button
          onClick={() => toggle("spendable")}
          className="p-4 text-left hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-1">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            {expanded === "spendable" ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </div>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">
            {formatCurrency(Math.max(0, snap.trueSpendableBalance))}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{t.meter.spendable}</p>
        </button>
      </div>

      {/* Year-end IRPF gap banner */}
      {snap.yearEndIRPFGap > 0 && (
        <div className="border-t border-slate-100 px-6 py-4 bg-amber-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                {t.meter.irpfGapTitle}
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {t.meter.irpfGapDesc.replace("{{rate}}", (snap.effectiveIRPFRate * 100).toFixed(1))}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-black text-amber-700 tabular-nums">
                {formatCurrency(snap.yearEndIRPFGap)}
              </p>
              <p className="text-xs text-amber-600">{t.meter.irpfGapExtra}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="bg-white/60 rounded-lg p-2 text-center">
              <p className="text-xs font-medium text-amber-600 tabular-nums">{formatCurrency(snap.projectedAnnualNetIncome)}</p>
              <p className="text-xs text-amber-500">{t.meter.irpfAnnualNet}</p>
            </div>
            <div className="bg-white/60 rounded-lg p-2 text-center">
              <p className="text-xs font-medium text-amber-600 tabular-nums">{formatCurrency(snap.estimatedAnnualIRPF)}</p>
              <p className="text-xs text-amber-500">{t.meter.irpfAnnualTotal}</p>
            </div>
            <div className="bg-white/60 rounded-lg p-2 text-center">
              <p className="text-xs font-medium text-amber-600 tabular-nums">−{formatCurrency(snap.irpfPaidViaAdvances)}</p>
              <p className="text-xs text-amber-500">{t.meter.irpfPaidMod130}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expandable breakdown */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm">
          {expanded === "gross" && (
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> {t.meter.howCalculated}
              </p>
              <p className="text-slate-600">
                {t.meter.grossDetail}
              </p>
              <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5">
                <Row label={t.meter.netWithoutVat} value={snap.grossIncome - snap.ivaCollected} />
                <Row label={t.meter.vatCollected} value={snap.ivaCollected} highlight />
                <RowTotal label={t.meter.totalBilled} value={snap.grossIncome} />
              </div>
            </div>
          )}

          {expanded === "reserve" && (
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> {t.meter.taxBreakdown}
              </p>
              <p className="text-slate-600">
                {t.meter.taxDetail}
              </p>
              <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5">
                <Row label={t.meter.vatPayable} value={snap.ivaPayable} />
                <p className="text-xs text-slate-400 pl-2">
                  {formatCurrency(snap.ivaCollected)} − {formatCurrency(snap.ivaDeductible)}
                </p>
                <Row label={t.meter.irpfAdvance} value={snap.irpfAdvancePayable} />
                <p className="text-xs text-slate-400 pl-2">
                  20% × {formatCurrency(snap.netTaxableIncome)}
                </p>
                <RowTotal label={t.meter.totalFiscalReserve} value={snap.totalTaxReserve} highlight />
              </div>
            </div>
          )}

          {expanded === "spendable" && (
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> {t.meter.yourMoney}
              </p>
              <p className="text-slate-600">
                {t.meter.spendableDetail}
              </p>
              <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5">
                <Row label={t.meter.netIncomeNoVat} value={snap.grossIncome - snap.ivaCollected} />
                <Row label={t.meter.deductibleExpenses} value={-snap.deductibleExpenses} />
                <Row label={t.meter.fiscalReserve} value={-snap.totalTaxReserve} />
                <RowTotal label={t.meter.realAvailable} value={snap.trueSpendableBalance} highlight />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-600 text-xs">{label}</span>
      <span className={`text-xs font-medium tabular-nums ${highlight ? "text-slate-900" : "text-slate-700"}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function RowTotal({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 mt-1.5">
      <span className="text-slate-800 text-xs font-semibold">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${highlight ? "text-teal-700" : "text-slate-900"}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}
