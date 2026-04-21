"use client";

import { useState, useMemo } from "react";
import { HelpCircle, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/useT";
import { formatCurrency, nextDeadline } from "@/lib/tax-engine";
import type { TaxSnapshot } from "@/lib/types";
import type { WizardProfile } from "@/lib/wizard-config";
import { BeckhamCountdown } from "./BeckhamCountdown";

interface SimpleViewProps {
  snapshot: TaxSnapshot;
  wizardProfile: WizardProfile;
  onAddTransaction: () => void;
}

// Simple template string interpolation
function interp(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, v),
    template
  );
}

// ─── Info Modal ──────────────────────────────────────────────────────────────

function InfoModal({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-5 max-w-sm w-full">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pr-4">{text}</p>
      </div>
    </div>
  );
}

// ─── InfoButton ──────────────────────────────────────────────────────────────

function InfoButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex-shrink-0"
        aria-label="Info"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && <InfoModal text={text} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Learn More Modal ────────────────────────────────────────────────────────

function LearnMoreModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const sv = t.simpleView;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-sm bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 pr-6">
          {sv.learnModalTitle}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {sv.learnModalBody}
        </p>
        <Link
          href="/learn"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline"
        >
          {sv.learnModalCta}
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ─── Main SimpleView ─────────────────────────────────────────────────────────

export function SimpleView({ snapshot, wizardProfile, onAddTransaction }: SimpleViewProps) {
  const t = useT();
  const sv = t.simpleView;

  const [showLearn, setShowLearn] = useState(false);

  const deadline = useMemo(() => nextDeadline(new Date().getFullYear()), []);

  const {
    trueSpendableBalance,
    totalTaxReserve,
    grossIncome,
    yearEndIRPFGap,
    projectedAnnualNetIncome,
  } = snapshot;

  const hasData = grossIncome > 0;
  const monthlyProjected = Math.round(projectedAnnualNetIncome / 12);

  // Bar widths
  const totalBar = Math.max(1, trueSpendableBalance + totalTaxReserve);
  const availablePct = Math.max(0, Math.min(100, (trueSpendableBalance / totalBar) * 100));
  const reservedPct = Math.max(0, Math.min(100, (totalTaxReserve / totalBar) * 100));

  // Projection range for variable income
  const gapLow = Math.round(yearEndIRPFGap * 0.8);
  const gapHigh = Math.round(yearEndIRPFGap * 1.2);

  // Deductions nudge visibility
  const { expensesVolume, deductibilityRate, activity } = wizardProfile;
  const activityLabel = (() => {
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
    return labels[activity] ?? activity;
  })();

  const showNudge =
    expensesVolume !== "minimal" ||
    deductibilityRate < 1.0;

  const nudgeProminent = expensesVolume === "many";

  // Deadline display
  const deadlineDate = new Date(deadline.modelo130Deadline).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-2xl font-bold text-slate-300 dark:text-slate-600 mb-2">{sv.noData}</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">{sv.noDataSub}</p>
        <button
          onClick={onAddTransaction}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          + {t.dashboard.addButton}
        </button>
      </div>
    );
  }

  return (
    <>
      {showLearn && <LearnMoreModal onClose={() => setShowLearn(false)} />}

      <div className="space-y-3">
        {/* ── Hero card ── */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{sv.heroTitle}</p>
              <InfoButton text={sv.heroModal} />
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 italic">{sv.heroSubtitle}</span>
          </div>

          {/* Hero number — min 28px = text-3xl */}
          <p className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mb-4">
            {formatCurrency(trueSpendableBalance)}
          </p>

          {/* Bar */}
          <div className="h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex mb-2">
            <div
              className="h-full bg-emerald-400 rounded-l-full transition-all duration-700"
              style={{ width: `${availablePct}%` }}
            />
            <div
              className="h-full bg-red-400 rounded-r-full transition-all duration-700"
              style={{ width: `${reservedPct}%` }}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {formatCurrency(trueSpendableBalance)} {sv.available}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {formatCurrency(totalTaxReserve)} {sv.reservedTax}
              </span>
            </div>
          </div>
        </div>

        {/* ── Beckham countdown banner ── */}
        {wizardProfile.fiscalRegime === 'beckham' && wizardProfile.beckhamStartYear && (
          <BeckhamCountdown
            beckhamStartYear={wizardProfile.beckhamStartYear}
            annualNetIncome={snapshot.projectedAnnualNetIncome}
          />
        )}

        {/* ── Two-column stat row ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Reserve card */}
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
            <div className="flex items-center gap-1 mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{sv.reserveTitle}</p>
              <InfoButton text={sv.reserveModal} />
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums mb-1">
              {formatCurrency(totalTaxReserve)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {wizardProfile.fiscalRegime === 'beckham' ? sv.reserveSubtextBeckham : sv.reserveSubtext}
            </p>
          </div>

          {/* Next payment card */}
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
            <div className="flex items-center gap-1 mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{sv.nextPayment}</p>
              <InfoButton text={sv.nextModal} />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mb-1">
              {deadlineDate}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {interp(sv.daysLeft, { days: String(deadline.daysLeft) })}
            </p>
          </div>
        </div>

        {/* ── Year-end projection band ── */}
        {yearEndIRPFGap > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4">
            <div className="flex items-start gap-1.5">
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <InfoButton text={sv.projectionModal} />
              </div>
              <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                {wizardProfile.fiscalRegime === 'beckham'
                  ? interp(sv.projectionBeckham, {
                      monthly: formatCurrency(monthlyProjected).replace("€", "").trim(),
                    })
                  : wizardProfile.incomeStability === "stable"
                  ? interp(sv.projectionStable, {
                      monthly: formatCurrency(monthlyProjected).replace("€", "").trim(),
                      gap: formatCurrency(yearEndIRPFGap).replace("€", "").trim(),
                    })
                  : interp(sv.projectionVariable, {
                      low: formatCurrency(gapLow).replace("€", "").trim(),
                      high: formatCurrency(gapHigh).replace("€", "").trim(),
                    })
                }
              </p>
            </div>
          </div>
        )}

        {/* ── Deductions nudge ── */}
        {showNudge && (
          <div className={`bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex ${
            nudgeProminent ? "border-l-amber-400" : ""
          }`}>
            <div className={`w-1 flex-shrink-0 ${nudgeProminent ? "bg-amber-400" : "bg-amber-200 dark:bg-amber-800"}`} />
            <div className="flex items-center justify-between p-4 flex-1 min-w-0">
              <p className={`text-sm ${nudgeProminent ? "font-medium text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"}`}>
                {interp(sv.deductionNudge, { activity: activityLabel })}
              </p>
              <Link
                href="/transactions"
                className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline flex-shrink-0 ml-3"
              >
                {sv.deductionNudgeCta}
              </Link>
            </div>
          </div>
        )}

        {/* ── Learn more ── */}
        <button
          onClick={() => setShowLearn(true)}
          className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-500 dark:text-slate-400 hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all font-medium"
        >
          {sv.learnLink}
        </button>
      </div>
    </>
  );
}
