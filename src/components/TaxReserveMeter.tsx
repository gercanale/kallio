"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Info, TrendingUp, Shield, Wallet } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { calculateTaxSnapshot, formatCurrency, currentQuarter } from "@/lib/tax-engine";
import { useT } from "@/i18n";

export function TaxReserveMeter() {
  const { t } = useT();
  const [expanded, setExpanded] = useState<null | "gross" | "reserve" | "spendable">(null);
  const transactions = useKallioStore((s) => s.transactions);
  const profile = useKallioStore((s) => s.profile);
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
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-indigo-200" />
          <span className="text-indigo-200 text-xs font-medium uppercase tracking-wider">
            {t("taxMeter.headerLabel")} – {snap.quarterLabel}
          </span>
        </div>
        <p className="text-white/70 text-sm">{t("taxMeter.headerSubtitle")}</p>
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
            {t("taxMeter.legendAvailable")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {t("taxMeter.legendReserved")}
          </span>
        </div>
      </div>

      {/* Three figures */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        <button
          onClick={() => toggle("gross")}
          className="p-4 text-left hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            {expanded === "gross" ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </div>
          <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(snap.grossIncome)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t("taxMeter.grossIncome")}</p>
        </button>

        <button
          onClick={() => toggle("reserve")}
          className="p-4 text-left hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-1">
            <Shield className="w-3.5 h-3.5 text-red-400" />
            {expanded === "reserve" ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </div>
          <p className="text-lg font-bold text-red-600 tabular-nums">{formatCurrency(snap.totalTaxReserve)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t("taxMeter.taxReserve")}</p>
        </button>

        <button
          onClick={() => toggle("spendable")}
          className="p-4 text-left hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center justify-between mb-1">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            {expanded === "spendable" ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </div>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">
            {formatCurrency(Math.max(0, snap.trueSpendableBalance))}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{t("taxMeter.available")}</p>
        </button>
      </div>

      {/* Expandable breakdown */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm">
          {expanded === "gross" && (
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> {t("taxMeter.grossDetailTitle")}
              </p>
              <p className="text-slate-600">{t("taxMeter.grossDetailText")}</p>
              <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5">
                <Row label={t("taxMeter.grossWithoutIva")} value={snap.grossIncome - snap.ivaCollected} />
                <Row label={t("taxMeter.ivaCharged")} value={snap.ivaCollected} highlight />
                <RowTotal label={t("taxMeter.totalInvoiced")} value={snap.grossIncome} />
              </div>
            </div>
          )}

          {expanded === "reserve" && (
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> {t("taxMeter.reserveDetailTitle")}
              </p>
              <p className="text-slate-600">{t("taxMeter.reserveDetailText")}</p>
              <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5">
                <Row label={t("taxMeter.ivaPayable303")} value={snap.ivaPayable} />
                <p className="text-xs text-slate-400 pl-2">
                  {t("taxMeter.ivaFormula", {
                    collected: formatCurrency(snap.ivaCollected),
                    deductible: formatCurrency(snap.ivaDeductible),
                  })}
                </p>
                <Row label={t("taxMeter.irpfAdvance130")} value={snap.irpfAdvancePayable} />
                <p className="text-xs text-slate-400 pl-2">
                  {t("taxMeter.irpfFormula", { net: formatCurrency(snap.netTaxableIncome) })}
                </p>
                <RowTotal label={t("taxMeter.totalReserve")} value={snap.totalTaxReserve} highlight />
              </div>
            </div>
          )}

          {expanded === "spendable" && (
            <div className="space-y-2">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> {t("taxMeter.spendableDetailTitle")}
              </p>
              <p className="text-slate-600">{t("taxMeter.spendableDetailText")}</p>
              <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-1.5">
                <Row label={t("taxMeter.netIncome")} value={snap.grossIncome - snap.ivaCollected} />
                <Row label={t("taxMeter.deductibleExpenses")} value={-snap.deductibleExpenses} />
                <Row label={t("taxMeter.reserveRow")} value={-snap.totalTaxReserve} />
                <RowTotal label={t("taxMeter.realAvailable")} value={snap.trueSpendableBalance} highlight />
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
      <span className={`text-sm font-bold tabular-nums ${highlight ? "text-indigo-700" : "text-slate-900"}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}
