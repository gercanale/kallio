"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, HelpCircle, X, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import { Navigation } from "@/components/Navigation";
import { formatCurrency } from "@/lib/tax-engine";
import type { WizardProfile } from "@/lib/wizard-config";

// ─── Backtest calculation ──────────────────────────────────────────────────────

const EFFECTIVE_RATE = 0.262;    // 26.2% assumption for €50k–€80k range
const GDJ_RATE = 0.05;
const GDJ_CAP = 2000;

interface BacktestInput {
  gross: string;
  iva: string;
  expenses: string;
  mod130: string;
  renta: string;
}

interface BacktestResult {
  grossIncome: number;
  ivaCollected: number;
  netIncome: number;
  gjdDeduction: number;
  deductibleExpenses: number;
  taxableBase: number;
  irpfEstimated: number;
  mod130Paid: number;
  kallioPredicton: number;
  actualRenta: number;
  diff: number;
  absDiff: number;
  deductibilityRate: number;
  activityLabel: string;
}

function runBacktest(
  inputs: BacktestInput,
  wizardProfile: WizardProfile,
  activityLabel: string
): BacktestResult {
  const grossIncome = parseEuro(inputs.gross);
  const ivaCollected = parseEuro(inputs.iva) || Math.round((grossIncome / 1.21) * 0.21);
  const netIncome = Math.max(0, grossIncome - ivaCollected);
  const gjdDeduction = Math.min(netIncome * GDJ_RATE, GDJ_CAP);
  const declaredExpenses = parseEuro(inputs.expenses);
  const deductibleExpenses = declaredExpenses * wizardProfile.deductibilityRate;
  const taxableBase = Math.max(0, netIncome - gjdDeduction - deductibleExpenses);
  const irpfEstimated = taxableBase * EFFECTIVE_RATE;
  const mod130Paid = parseEuro(inputs.mod130);
  const kallioPredicton = irpfEstimated - mod130Paid;
  const actualRenta = parseEuro(inputs.renta);
  const diff = kallioPredicton - actualRenta;

  return {
    grossIncome,
    ivaCollected,
    netIncome,
    gjdDeduction,
    deductibleExpenses,
    taxableBase,
    irpfEstimated,
    mod130Paid,
    kallioPredicton,
    actualRenta,
    diff,
    absDiff: Math.abs(diff),
    deductibilityRate: wizardProfile.deductibilityRate,
    activityLabel,
  };
}

function parseEuro(s: string): number {
  if (!s.trim()) return 0;
  // Accept both comma and dot as decimal separator
  const cleaned = s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ─── Info modal ───────────────────────────────────────────────────────────────

function InfoModal({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-5 max-w-sm w-full">
        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pr-4">{text}</p>
      </div>
    </div>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────

function Field({
  label,
  helper,
  value,
  onChange,
  note,
  autoSuggest,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
  note?: string;
  autoSuggest?: string | null;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {label}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
        placeholder="0,00"
      />
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{helper}</p>
      {note && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">{note}</p>}
      {autoSuggest && (
        <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
          <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">{autoSuggest}</p>
        </div>
      )}
    </div>
  );
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({
  label,
  value,
  highlight,
  negative,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${
      highlight ? "font-bold" : ""
    }`}>
      <span className={`text-sm ${highlight ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"}`}>
        {label}
      </span>
      <span className={`text-sm tabular-nums font-semibold ${
        highlight
          ? "text-teal-700 dark:text-teal-300 text-base"
          : negative
          ? "text-slate-500 dark:text-slate-400"
          : "text-slate-800 dark:text-slate-200"
      }`}>
        {negative ? `−${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
      </span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function interp(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, v),
    template
  );
}

export default function BacktestPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const wizardProfile = useKallioStore((s) => s.wizardProfile);
  const t = useT();
  const bt = t.backtest;

  const [showWhyModal, setShowWhyModal] = useState(false);
  const [inputs, setInputs] = useState<BacktestInput>({
    gross: "",
    iva: "",
    expenses: "",
    mod130: "",
    renta: "",
  });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [ivaWasAutoSuggested, setIvaWasAutoSuggested] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) router.replace("/");
  }, [hydrated, sessionActive, router]);

  // IVA auto-suggest: if gross is filled but iva is empty, suggest 21% of net
  const ivaAutoSuggest = useMemo(() => {
    const gross = parseEuro(inputs.gross);
    if (gross > 0 && !inputs.iva.trim()) {
      const suggested = Math.round((gross / 1.21) * 0.21);
      return bt.ivaAutoSuggest + ` (${formatCurrency(suggested)})`;
    }
    return null;
  }, [inputs.gross, inputs.iva, bt.ivaAutoSuggest]);

  const activityLabel = useMemo(() => {
    if (!wizardProfile) return "";
    const labels: Record<string, string> = {
      consultoria_tech: t.wizard.actConsultoria,
      diseno: t.wizard.actDiseno,
      formacion: t.wizard.actFormacion,
      salud: t.wizard.actSalud,
      construccion: t.wizard.actConstruccion,
      comercio: t.wizard.actComercio,
      transporte: t.wizard.actTransporte,
      otro: t.wizard.actOtro,
    };
    return labels[wizardProfile.activity] ?? wizardProfile.activity;
  }, [wizardProfile, t.wizard]);

  const canCalculate = useMemo(() => {
    return (
      parseEuro(inputs.gross) > 0 &&
      parseEuro(inputs.expenses) >= 0 &&
      parseEuro(inputs.mod130) >= 0 &&
      inputs.renta.trim() !== ""
    );
  }, [inputs]);

  function handleCalculate() {
    if (!wizardProfile) return;
    const r = runBacktest(inputs, wizardProfile, activityLabel);
    setResult(r);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAdjust() {
    setResult(null);
  }

  if (!hydrated || !sessionActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 sm:pb-8 transition-colors">
      <Navigation />
      {showWhyModal && <InfoModal text={bt.whyText} onClose={() => setShowWhyModal(false)} />}

      <main className="lg:ml-56 px-4 lg:px-8 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{bt.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{bt.subtitle}</p>
          </div>
          <button
            onClick={() => setShowWhyModal(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* No wizard prompt */}
        {!wizardProfile?.wizardCompleted && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">{bt.noWizard}</p>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-amber-700 dark:text-amber-400 hover:underline font-medium"
              >
                {bt.noWizardCta}
              </button>
            </div>
          </div>
        )}

        {wizardProfile?.wizardCompleted && (
          <>
            {/* ── Results screen ── */}
            {result && (
              <div className="space-y-4">
                {/* Breakdown table */}
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{bt.calcBreakdown}</h2>
                  </div>
                  <div className="px-5 divide-y divide-slate-100 dark:divide-slate-700">
                    <ResultRow label={bt.netIncome} value={result.netIncome} />
                    <ResultRow label={bt.gjdApplied} value={result.gjdDeduction} negative />
                    <ResultRow
                      label={interp(bt.expensesDeducted, {
                        rate: String(Math.round(result.deductibilityRate * 100)),
                        activity: result.activityLabel,
                      })}
                      value={result.deductibleExpenses}
                      negative
                    />
                    <ResultRow label={bt.taxableBase} value={result.taxableBase} />
                    <ResultRow
                      label={interp(bt.irpfEstimated, { rate: String(Math.round(EFFECTIVE_RATE * 100)) })}
                      value={result.irpfEstimated}
                    />
                    <ResultRow label={bt.mod130Paid} value={result.mod130Paid} negative />
                    <ResultRow label={bt.kallioPredicton} value={result.kallioPredicton} highlight />
                  </div>
                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {interp(bt.rateAssumption, { rate: String(Math.round(EFFECTIVE_RATE * 100)) })}
                    </p>
                  </div>
                </div>

                {/* Comparison */}
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                    {interp(bt.comparison, {
                      actual: formatCurrency(Math.abs(result.actualRenta)),
                      direction: result.actualRenta >= 0 ? bt.toPay : bt.toRefund,
                      kallio: formatCurrency(result.kallioPredicton),
                      diff: formatCurrency(result.absDiff),
                    })}
                  </p>

                  {/* Accuracy interpretation */}
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${
                    result.absDiff < 500
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800"
                      : result.absDiff < 1500
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800"
                  }`}>
                    {result.absDiff < 500 ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${result.absDiff < 1500 ? "text-amber-500" : "text-red-500"}`} />
                    )}
                    <p className={`text-sm font-medium ${
                      result.absDiff < 500
                        ? "text-emerald-800 dark:text-emerald-300"
                        : result.absDiff < 1500
                        ? "text-amber-800 dark:text-amber-300"
                        : "text-red-800 dark:text-red-300"
                    }`}>
                      {result.absDiff < 500
                        ? bt.accuracyGood
                        : result.absDiff < 1500
                        ? bt.accuracyOk
                        : bt.accuracyOff}
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all text-center"
                  >
                    {bt.ctaPrimary}
                  </button>
                  <button
                    onClick={handleAdjust}
                    className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-5 py-3 rounded-xl text-sm font-medium transition-all text-center"
                  >
                    {bt.ctaAdjust}
                  </button>
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{bt.disclaimer}</p>
                </div>
              </div>
            )}

            {/* ── Input form ── */}
            {!result && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 space-y-5">
                  <Field
                    label={bt.grossLabel}
                    helper={bt.grossHelper}
                    value={inputs.gross}
                    onChange={(v) => setInputs((p) => ({ ...p, gross: v }))}
                  />
                  <Field
                    label={bt.ivaLabel}
                    helper={bt.ivaHelper}
                    value={inputs.iva}
                    onChange={(v) => setInputs((p) => ({ ...p, iva: v }))}
                    autoSuggest={ivaAutoSuggest}
                  />
                  <Field
                    label={bt.expensesLabel}
                    helper={bt.expensesHelper}
                    value={inputs.expenses}
                    onChange={(v) => setInputs((p) => ({ ...p, expenses: v }))}
                  />
                  <Field
                    label={bt.mod130Label}
                    helper={bt.mod130Helper}
                    value={inputs.mod130}
                    onChange={(v) => setInputs((p) => ({ ...p, mod130: v }))}
                  />
                  <Field
                    label={bt.rentaLabel}
                    helper={bt.rentaHelper}
                    value={inputs.renta}
                    onChange={(v) => setInputs((p) => ({ ...p, renta: v }))}
                    note={bt.rentaNote}
                  />
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={!canCalculate}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                  {bt.calculate}
                </button>

                {/* Disclaimer visible on form too */}
                <div className="flex items-start gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{bt.disclaimer}</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
