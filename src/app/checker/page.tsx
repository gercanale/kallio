"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import {
  calculateTaxSnapshot,
  formatCurrency,
  quarterDateRange,
  currentQuarter,
  generateId,
} from "@/lib/tax-engine";
import { Navigation } from "@/components/Navigation";
import type { CheckerRun } from "@/lib/types";

type Phase = "form" | "results";

function parseEuro(s: string): number {
  const cleaned = s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function getLastFiveQuarters(now: Date): { quarter: number; year: number }[] {
  const q = currentQuarter(now);
  const y = now.getFullYear();
  const result: { quarter: number; year: number }[] = [];
  let curQ = q;
  let curY = y;
  for (let i = 0; i < 5; i++) {
    result.push({ quarter: curQ, year: curY });
    curQ--;
    if (curQ < 1) { curQ = 4; curY--; }
  }
  return result;
}

export default function CheckerPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const t = useT();
  const ck = t.checker;

  const profile = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const transactions = useKallioStore((s) => s.transactions);
  const wizardProfile = useKallioStore((s) => s.wizardProfile);
  const checkerHistory = useKallioStore((s) => s.checkerHistory);
  const addCheckerRun = useKallioStore((s) => s.addCheckerRun);

  const now = useMemo(() => new Date(), []);
  const quarters = useMemo(() => getLastFiveQuarters(now), [now]);

  const [phase, setPhase] = useState<Phase>("form");
  const [selectedQ, setSelectedQ] = useState(quarters[0].quarter);
  const [selectedY, setSelectedY] = useState(quarters[0].year);
  const [saved, setSaved] = useState(false);

  // Modelo 303 fields
  const [f303Base, setF303Base] = useState("");
  const [f303Cuota, setF303Cuota] = useState("");
  const [f303Soportada, setF303Soportada] = useState("");
  const [f303Resultado, setF303Resultado] = useState("");

  // Modelo 130 fields
  const [f130Ingresos, setF130Ingresos] = useState("");
  const [f130Gastos, setF130Gastos] = useState("");
  const [f130Rto, setF130Rto] = useState("");
  const [f130Cuota, setF130Cuota] = useState("");
  const [pagadoReal, setPagadoReal] = useState("");

  const [result, setResult] = useState<CheckerRun | null>(null);

  if (!hydrated || !sessionActive) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile.onboardingComplete) {
    router.replace("/onboarding");
    return null;
  }

  if (!wizardProfile?.wizardCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 sm:pb-0">
        <Navigation />
        <main className="lg:ml-56 px-4 lg:px-8 py-6 flex items-center justify-center">
          <div className="max-w-sm w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{ck.noWizard}</p>
            <Link
              href="/dashboard"
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              {ck.noWizardCta}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  function handleSubmit() {
    const { start, end } = quarterDateRange(selectedQ, selectedY);
    const filteredTxs = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= start && d <= end;
    });

    const snapshot = calculateTaxSnapshot(filteredTxs, profile, selectedQ, selectedY);

    const kallio = {
      ivaRepercutido: snapshot.ivaCollected,
      ivaSoportado: snapshot.ivaDeductible,
      ivaResult: snapshot.ivaPayable,
      ingresosBrutos: snapshot.grossIncome,
      gastosDeducibles: snapshot.deductibleExpenses,
      rendimientoNeto: snapshot.netTaxableIncome,
      irpfAdvance: snapshot.irpfAdvancePayable,
    };

    const gestor = {
      baseImponible: parseEuro(f303Base),
      cuotaRepercutida: parseEuro(f303Cuota),
      cuotaSoportada: parseEuro(f303Soportada),
      resultadoLiquidacion: parseEuro(f303Resultado),
      ingresosComputables: parseEuro(f130Ingresos),
      gastosDeducibles: parseEuro(f130Gastos),
      rendimientoNeto: parseEuro(f130Rto),
      cuotaIngresada: parseEuro(f130Cuota),
      pagadoReal: parseEuro(pagadoReal),
    };

    const diff = {
      ivaResult: kallio.ivaResult - gestor.resultadoLiquidacion,
      irpfAdvance: kallio.irpfAdvance - gestor.cuotaIngresada,
      gastosDeducibles: kallio.gastosDeducibles - gestor.gastosDeducibles,
      totalDiff: (kallio.ivaResult - gestor.resultadoLiquidacion) + (kallio.irpfAdvance - gestor.cuotaIngresada),
    };

    const totalBase = Math.max(1, kallio.ivaResult + kallio.irpfAdvance);
    const pct = Math.abs(diff.totalDiff) / totalBase;
    const verdict: CheckerRun["verdict"] = pct < 0.03 ? "green" : pct < 0.10 ? "amber" : "red";

    const run: CheckerRun = {
      id: generateId(),
      period: `${selectedQ}T${selectedY}`,
      quarter: selectedQ,
      year: selectedY,
      createdAt: new Date().toISOString(),
      kallio,
      gestor,
      diff,
      verdict,
    };

    setResult(run);
    setPhase("results");
    setSaved(false);
  }

  function handleSave() {
    if (!result) return;
    addCheckerRun(result);
    setSaved(true);
  }

  const verdictColors = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    red: "bg-red-50 border-red-200 text-red-800",
  };

  const verdictText = {
    green: ck.verdictGreen,
    amber: ck.verdictAmber,
    red: ck.verdictRed,
  };

  // Dominant interpretation
  const getInterpretation = (run: CheckerRun): string => {
    const absDiffs = [
      { key: "iva", val: Math.abs(run.diff.ivaResult) },
      { key: "irpf", val: Math.abs(run.diff.irpfAdvance) },
      { key: "gastos", val: Math.abs(run.diff.gastosDeducibles) },
    ];
    absDiffs.sort((a, b) => b.val - a.val);
    const dominant = absDiffs[0].key;

    if (dominant === "gastos") {
      return run.diff.gastosDeducibles < 0 ? ck.interpGestorMore : ck.interpKallioMore;
    }
    if (dominant === "iva") return ck.interpIvaDiff;
    return ck.interpIrpfDiff;
  };

  const tableRows = result ? [
    { label: ck.rowIvaRep, kallio: result.kallio.ivaRepercutido, gestor: result.gestor.cuotaRepercutida },
    { label: ck.rowIvaSop, kallio: result.kallio.ivaSoportado, gestor: result.gestor.cuotaSoportada },
    { label: ck.rowIvaResult, kallio: result.kallio.ivaResult, gestor: result.gestor.resultadoLiquidacion },
    { label: ck.rowIngresos, kallio: result.kallio.ingresosBrutos, gestor: result.gestor.ingresosComputables },
    { label: ck.rowGastos, kallio: result.kallio.gastosDeducibles, gestor: result.gestor.gastosDeducibles },
    { label: ck.rowRto, kallio: result.kallio.rendimientoNeto, gestor: result.gestor.rendimientoNeto },
    { label: ck.rowIrpf, kallio: result.kallio.irpfAdvance, gestor: result.gestor.cuotaIngresada },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 sm:pb-0 transition-colors">
      <Navigation />

      <main className="lg:ml-56 px-4 lg:px-8 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{ck.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{ck.subtitle}</p>
        </div>

        {phase === "form" && (
          <div className="space-y-6">
            {/* Quarter selector */}
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">{ck.selectQuarter}</p>
              <div className="flex flex-wrap gap-2">
                {quarters.map(({ quarter, year }) => (
                  <button
                    key={`${quarter}-${year}`}
                    onClick={() => { setSelectedQ(quarter); setSelectedY(year); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      selectedQ === quarter && selectedY === year
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {quarter}T {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Modelo 303 */}
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{ck.mod303Title}</h2>
              <FieldInput label={ck.field303Base} hint={ck.field303BaseHint} value={f303Base} onChange={setF303Base} />
              <FieldInput label={ck.field303Cuota} hint={ck.field303CuotaHint} value={f303Cuota} onChange={setF303Cuota} />
              <FieldInput label={ck.field303Soportada} hint={ck.field303SoportadaHint} value={f303Soportada} onChange={setF303Soportada} />
              <FieldInput label={ck.field303Resultado} hint={ck.field303ResultadoHint} value={f303Resultado} onChange={setF303Resultado} />
            </div>

            {/* Modelo 130 */}
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{ck.mod130Title}</h2>
              <FieldInput label={ck.field130Ingresos} hint={ck.field130IngresosHint} value={f130Ingresos} onChange={setF130Ingresos} />
              <FieldInput label={ck.field130Gastos} hint={ck.field130GastosHint} value={f130Gastos} onChange={setF130Gastos} />
              <FieldInput label={ck.field130Rto} hint={ck.field130RtoHint} value={f130Rto} onChange={setF130Rto} />
              <FieldInput label={ck.field130Cuota} hint={ck.field130CuotaHint} value={f130Cuota} onChange={setF130Cuota} />
              <FieldInput label={ck.fieldPagado} hint={ck.fieldPagadoHint} value={pagadoReal} onChange={setPagadoReal} />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              {ck.runChecker}
            </button>
          </div>
        )}

        {phase === "results" && result && (
          <div className="space-y-6">
            {/* Verdict banner */}
            <div className={`border rounded-2xl p-4 ${verdictColors[result.verdict]}`}>
              <p className="text-sm font-semibold">{verdictText[result.verdict]}</p>
            </div>

            {/* Comparison table */}
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{ck.tableConcepto}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{ck.tableKallio}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{ck.tableGestor}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => {
                    const diff = row.gestor !== 0 ? Math.abs((row.kallio - row.gestor) / Math.max(1, row.gestor)) : 0;
                    const highlight = diff > 0.05;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-slate-50 dark:border-slate-800 last:border-0 ${
                          highlight ? "bg-amber-50 dark:bg-amber-900/10" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">{row.label}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums text-right">{formatCurrency(row.kallio)}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums text-right">{formatCurrency(row.gestor)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Interpretation */}
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed px-1">
              {getInterpretation(result)}
            </p>

            {/* Disclaimer */}
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{ck.disclaimer}</p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saved}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                  saved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-teal-500 bg-teal-600 hover:bg-teal-700 text-white"
                }`}
              >
                {saved ? (
                  <><Check className="w-4 h-4" />{ck.savedOk}</>
                ) : (
                  ck.saveRun
                )}
              </button>
              <button
                onClick={() => { setPhase("form"); setResult(null); }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                {ck.backToForm}
              </button>
            </div>

            {/* Multi-quarter history */}
            {saved && checkerHistory.length >= 1 && (
              <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">{ck.historyTitle}</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left pb-2 font-semibold text-slate-500 dark:text-slate-400">{ck.historyPeriod}</th>
                      <th className="text-right pb-2 font-semibold text-slate-500 dark:text-slate-400">{ck.historyKallio}</th>
                      <th className="text-right pb-2 font-semibold text-slate-500 dark:text-slate-400">{ck.historyGestor}</th>
                      <th className="text-right pb-2 font-semibold text-slate-500 dark:text-slate-400">{ck.historyDiff}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkerHistory.map((run) => (
                      <tr key={run.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <td className="py-2 text-slate-700 dark:text-slate-300 font-medium">{run.period}</td>
                        <td className="py-2 text-slate-600 dark:text-slate-400 tabular-nums text-right">
                          {formatCurrency(run.kallio.ivaResult + run.kallio.irpfAdvance)}
                        </td>
                        <td className="py-2 text-slate-600 dark:text-slate-400 tabular-nums text-right">
                          {formatCurrency(run.gestor.resultadoLiquidacion + run.gestor.cuotaIngresada)}
                        </td>
                        <td className={`py-2 tabular-nums text-right font-medium ${
                          run.verdict === 'green' ? 'text-emerald-600 dark:text-emerald-400'
                          : run.verdict === 'amber' ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(Math.abs(run.diff.totalDiff))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pattern insight if 2+ quarters */}
                {checkerHistory.length >= 2 && (() => {
                  const gestorMoreCount = checkerHistory.filter((r) => r.diff.gastosDeducibles < 0).length;
                  const kallioMoreCount = checkerHistory.filter((r) => r.diff.gastosDeducibles > 0).length;
                  const dominant = gestorMoreCount >= 2 ? ck.patternGestorMore
                    : kallioMoreCount >= 2 ? ck.patternKallioMore
                    : null;
                  if (!dominant) return null;
                  const totalAccum = checkerHistory.reduce((sum, r) => sum + Math.abs(r.diff.totalDiff), 0);
                  return (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {ck.patternInsight
                        .replace("{{count}}", String(checkerHistory.length))
                        .replace("{{direction}}", dominant)
                        .replace("{{total}}", formatCurrency(totalAccum))}
                    </p>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Field Input sub-component ────────────────────────────────────────────────

function FieldInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        min="0"
        step="0.01"
        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
      />
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hint}</p>
    </div>
  );
}
