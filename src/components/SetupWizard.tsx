"use client";

import { useState } from "react";
import { X, Check, ChevronRight } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import {
  DEDUCTIBILITY_RATES,
  ACTIVITY_DEDUCTIBILITY_BADGE,
  type ActivityKey,
  type IncomeStructure,
  type IncomeStability,
  type ExpensesVolume,
  type WizardProfile,
} from "@/lib/wizard-config";

interface SetupWizardProps {
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4;

const ACTIVITY_KEYS: ActivityKey[] = [
  "consultoria_tech",
  "diseno",
  "formacion",
  "salud",
  "construccion",
  "comercio",
  "transporte",
  "otro",
];

export function SetupWizard({ onClose }: SetupWizardProps) {
  const t = useT();
  const w = t.wizard;
  const setWizardProfile = useKallioStore((s) => s.setWizardProfile);
  const existing = useKallioStore((s) => s.wizardProfile);

  const [step, setStep] = useState<Step>(1);
  const [incomeStructure, setIncomeStructure] = useState<IncomeStructure | null>(
    existing?.incomeStructure ?? null
  );
  const [activity, setActivity] = useState<ActivityKey | null>(existing?.activity ?? null);
  const [incomeStability, setIncomeStability] = useState<IncomeStability | null>(
    existing?.incomeStability ?? null
  );
  const [expensesVolume, setExpensesVolume] = useState<ExpensesVolume | null>(
    existing?.expensesVolume ?? null
  );

  // Activity label map from i18n
  const activityLabels: Record<ActivityKey, string> = {
    consultoria_tech: w.actConsultoria,
    diseno: w.actDiseno,
    formacion: w.actFormacion,
    salud: w.actSalud,
    construccion: w.actConstruccion,
    comercio: w.actComercio,
    transporte: w.actTransporte,
    otro: w.actOtro,
  };

  const canAdvance: Record<Step, boolean> = {
    1: incomeStructure !== null,
    2: activity !== null,
    3: incomeStability !== null,
    4: expensesVolume !== null,
  };

  function handleNext() {
    if (step < 4) {
      setStep((s) => (s + 1) as Step);
    } else {
      handleFinish();
    }
  }

  function handleBack() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  function handleFinish() {
    if (!incomeStructure || !activity || !incomeStability || !expensesVolume) return;
    const profile: WizardProfile = {
      incomeStructure,
      activity,
      deductibilityRate: DEDUCTIBILITY_RATES[activity],
      incomeStability,
      expensesVolume,
      wizardCompleted: true,
    };
    setWizardProfile(profile);
    onClose();
  }

  const stepTitle = [w.step1Title, w.step2Title, w.step3Title, w.step4Title][step - 1];
  const stepSubtitle = [w.step1Subtitle, w.step2Subtitle, w.step3Subtitle, w.step4Subtitle][step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium tabular-nums">
              {w.stepOf.replace("{{current}}", String(step))}
            </p>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{w.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step progress dots */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? "flex-1 bg-teal-500"
                  : s < step
                  ? "flex-1 bg-teal-300 dark:bg-teal-700"
                  : "flex-1 bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{stepTitle}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{stepSubtitle}</p>

          {/* ── Step 1: Income structure ── */}
          {step === 1 && (
            <div className="space-y-2">
              <OptionCard
                selected={incomeStructure === "single_client"}
                onClick={() => setIncomeStructure("single_client")}
                label={w.income1Label}
                desc={w.income1Desc}
              />
              <OptionCard
                selected={false}
                onClick={() => {}}
                disabled
                label={w.income2Label}
                soonBadge={w.soon}
              />
              <OptionCard
                selected={false}
                onClick={() => {}}
                disabled
                label={w.income3Label}
                soonBadge={w.soon}
              />
            </div>
          )}

          {/* ── Step 2: Activity ── */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_KEYS.map((key) => (
                <ActivityCard
                  key={key}
                  selected={activity === key}
                  onClick={() => setActivity(key)}
                  label={activityLabels[key]}
                  badge={ACTIVITY_DEDUCTIBILITY_BADGE[key]}
                  deductibleWord={w.deductibleRate}
                />
              ))}
            </div>
          )}

          {/* ── Step 3: Income stability ── */}
          {step === 3 && (
            <div className="space-y-2">
              <OptionCard
                selected={incomeStability === "stable"}
                onClick={() => setIncomeStability("stable")}
                label={w.stableLabel}
                desc={w.stableDesc}
              />
              <OptionCard
                selected={incomeStability === "variable"}
                onClick={() => setIncomeStability("variable")}
                label={w.variableLabel}
                desc={w.variableDesc}
              />
            </div>
          )}

          {/* ── Step 4: Expenses volume ── */}
          {step === 4 && (
            <div className="space-y-2">
              <OptionCard
                selected={expensesVolume === "minimal"}
                onClick={() => setExpensesVolume("minimal")}
                label={w.expMinimal}
                desc={w.expMinimalDesc}
              />
              <OptionCard
                selected={expensesVolume === "some"}
                onClick={() => setExpensesVolume("some")}
                label={w.expSome}
                desc={w.expSomeDesc}
              />
              <OptionCard
                selected={expensesVolume === "many"}
                onClick={() => setExpensesVolume("many")}
                label={w.expMany}
                desc={w.expManyDesc}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
          >
            {w.back}
          </button>
          <button
            onClick={handleNext}
            disabled={!canAdvance[step]}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            {step === 4 ? w.finish : w.next}
            {step < 4 && <ChevronRight className="w-4 h-4" />}
            {step === 4 && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function OptionCard({
  selected,
  onClick,
  label,
  desc,
  disabled,
  soonBadge,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
  disabled?: boolean;
  soonBadge?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
        disabled
          ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed opacity-60"
          : selected
          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${
            disabled ? "text-slate-400 dark:text-slate-500" :
            selected ? "text-teal-700 dark:text-teal-300" : "text-slate-800 dark:text-slate-200"
          }`}>
            {label}
          </p>
          {desc && !disabled && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {soonBadge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
              {soonBadge}
            </span>
          )}
          {selected && !disabled && (
            <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function ActivityCard({
  selected,
  onClick,
  label,
  badge,
  deductibleWord,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  badge: string;
  deductibleWord: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-xl border-2 transition-all ${
        selected
          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60"
      }`}
    >
      <p className={`text-sm font-semibold mb-1.5 ${
        selected ? "text-teal-700 dark:text-teal-300" : "text-slate-800 dark:text-slate-200"
      }`}>
        {label}
      </p>
      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
        selected
          ? "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300"
          : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
      }`}>
        {badge} {deductibleWord}
      </span>
    </button>
  );
}
