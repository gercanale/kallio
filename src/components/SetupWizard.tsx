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
  type FiscalRegime,
  type WizardProfile,
} from "@/lib/wizard-config";

interface SetupWizardProps {
  onClose: () => void;
}

type StepId = 0 | '0.5' | 1 | 2 | 3 | 4;
type UnsureSubStep = 0 | 1 | 2 | null;

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

const CURRENT_YEAR = new Date().getFullYear();
const BECKHAM_YEARS = Array.from({ length: CURRENT_YEAR - 2019 + 1 }, (_, i) => 2019 + i);

export function SetupWizard({ onClose }: SetupWizardProps) {
  const t = useT();
  const w = t.wizard;
  const setWizardProfile = useKallioStore((s) => s.setWizardProfile);
  const existing = useKallioStore((s) => s.wizardProfile);

  const [step, setStep] = useState<StepId>(0);
  const [unsureSubStep, setUnsureSubStep] = useState<UnsureSubStep>(null);

  const [fiscalRegime, setFiscalRegime] = useState<FiscalRegime | null>(
    existing?.fiscalRegime ?? null
  );
  const [beckhamYear, setBeckhamYear] = useState<number | null>(
    existing?.beckhamStartYear ?? null
  );
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

  // Steps array depends on fiscal regime
  const stepsFlow: StepId[] = fiscalRegime === 'beckham'
    ? [0, '0.5', 1, 2, 3, 4]
    : [0, 1, 2, 3, 4];

  const currentStepIndex = stepsFlow.indexOf(step);
  const totalSteps = stepsFlow.length;

  const canAdvance: Record<string, boolean> = {
    '0': fiscalRegime !== null,
    '0.5': beckhamYear !== null,
    '1': incomeStructure !== null,
    '2': activity !== null,
    '3': incomeStability !== null,
    '4': expensesVolume !== null,
  };

  function handleNext() {
    if (unsureSubStep !== null) {
      if (unsureSubStep < 2) {
        setUnsureSubStep((s) => (s! + 1) as UnsureSubStep);
      }
      return;
    }
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < stepsFlow.length) {
      setStep(stepsFlow[nextIndex]);
    } else {
      handleFinish();
    }
  }

  function handleBack() {
    if (unsureSubStep !== null) {
      if (unsureSubStep === 0) {
        setUnsureSubStep(null);
      } else {
        setUnsureSubStep((s) => (s! - 1) as UnsureSubStep);
      }
      return;
    }
    if (currentStepIndex > 0) {
      setStep(stepsFlow[currentStepIndex - 1]);
    }
  }

  function handleFinish() {
    if (!fiscalRegime || !incomeStructure || !activity || !incomeStability || !expensesVolume) return;
    const profile: WizardProfile = {
      fiscalRegime,
      beckhamStartYear: beckhamYear,
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

  const isLastStep = currentStepIndex === stepsFlow.length - 1;
  const isFirstStep = currentStepIndex === 0;

  // Unsure sub-screen content
  const renderUnsureFlow = () => {
    if (unsureSubStep === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{w.unsureScreen1Title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{w.unsureScreen1Body}</p>
        </div>
      );
    }
    if (unsureSubStep === 1) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{w.unsureScreen2Title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{w.unsureScreen2Body}</p>
        </div>
      );
    }
    if (unsureSubStep === 2) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{w.unsureScreen3Title}</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                setFiscalRegime('beckham');
                setUnsureSubStep(null);
                setStep(0);
              }}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all"
            >
              {w.unsureYes}
            </button>
            <button
              onClick={() => {
                setFiscalRegime('eds');
                setUnsureSubStep(null);
                setStep(0);
              }}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              {w.unsureNo}
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const stepTitle = (() => {
    if (unsureSubStep !== null) return null;
    if (step === 0) return w.step0Title;
    if (step === '0.5') return w.step05Title;
    if (step === 1) return w.step1Title;
    if (step === 2) return w.step2Title;
    if (step === 3) return w.step3Title;
    if (step === 4) return w.step4Title;
    return null;
  })();

  const stepSubtitle = (() => {
    if (unsureSubStep !== null) return null;
    if (step === 0) return w.step0Subtitle;
    if (step === '0.5') return w.step05Subtitle;
    if (step === 1) return w.step1Subtitle;
    if (step === 2) return w.step2Subtitle;
    if (step === 3) return w.step3Subtitle;
    if (step === 4) return w.step4Subtitle;
    return null;
  })();

  // Progress bar: show steps in current flow (not counting unsure sub-steps)
  const progressSegments = totalSteps;

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
              {w.stepOf.replace("{{current}}", String(currentStepIndex + 1))}
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
          {Array.from({ length: progressSegments }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 flex-1 ${
                i === currentStepIndex
                  ? "bg-teal-500"
                  : i < currentStepIndex
                  ? "bg-teal-300 dark:bg-teal-700"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {unsureSubStep !== null ? (
            renderUnsureFlow()
          ) : (
            <>
              {stepTitle && (
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{stepTitle}</h3>
              )}
              {stepSubtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{stepSubtitle}</p>
              )}

              {/* ── Step 0: Fiscal Regime ── */}
              {step === 0 && (
                <div className="space-y-2">
                  <OptionCard
                    selected={fiscalRegime === "eds"}
                    onClick={() => setFiscalRegime("eds")}
                    label={w.regimeEdsLabel}
                    desc={w.regimeEdsDesc}
                  />
                  <OptionCard
                    selected={fiscalRegime === "beckham"}
                    onClick={() => setFiscalRegime("beckham")}
                    label={w.regimeBeckhamLabel}
                    desc={w.regimeBeckhamDesc}
                  />
                  <OptionCard
                    selected={false}
                    onClick={() => {}}
                    disabled
                    label={w.regimeSlLabel}
                    soonBadge={w.soon}
                  />
                  <OptionCard
                    selected={false}
                    onClick={() => setUnsureSubStep(0)}
                    label={w.regimeUnsureLabel}
                  />
                </div>
              )}

              {/* ── Step 0.5: Beckham year ── */}
              {step === '0.5' && (
                <div>
                  <div className="grid grid-cols-4 gap-2">
                    {BECKHAM_YEARS.map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => setBeckhamYear(year)}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                          beckhamYear === year
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60"
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                    selected={incomeStructure === "multi_client"}
                    onClick={() => setIncomeStructure("multi_client")}
                    label={w.income2Label}
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
                <div>
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
                  {fiscalRegime === 'beckham' && (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                      {w.beckhamNote}
                    </p>
                  )}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleBack}
            disabled={isFirstStep && unsureSubStep === null}
            className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
          >
            {w.back}
          </button>
          {/* In unsureSubStep 2 we show two buttons so hide Next */}
          {unsureSubStep !== 2 && (
            <button
              onClick={handleNext}
              disabled={
                unsureSubStep === null
                  ? !canAdvance[String(step)]
                  : false
              }
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              {isLastStep && unsureSubStep === null ? w.finish : w.next}
              {!(isLastStep && unsureSubStep === null) && <ChevronRight className="w-4 h-4" />}
              {isLastStep && unsureSubStep === null && <Check className="w-4 h-4" />}
            </button>
          )}
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
