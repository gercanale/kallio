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

const C = {
  BG: '#fdfaf3', INK: '#1a1f2e', MUTED: '#6b6456',
  BORDER: '#e8dfc8', IVA: '#c44536', OK: '#5a7a3e', CARD: '#ffffff',
};

interface SetupWizardProps {
  onClose: () => void;
}

type StepId = 0 | '0.5' | 1 | 2 | 3 | 4;
type UnsureSubStep = 0 | 1 | 2 | null;

const ACTIVITY_KEYS: ActivityKey[] = [
  "consultoria_tech", "diseno", "formacion", "salud",
  "construccion", "comercio", "transporte", "otro",
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

  const [fiscalRegime, setFiscalRegime] = useState<FiscalRegime | null>(existing?.fiscalRegime ?? null);
  const [beckhamYear, setBeckhamYear] = useState<number | null>(existing?.beckhamStartYear ?? null);
  const [incomeStructure, setIncomeStructure] = useState<IncomeStructure | null>(existing?.incomeStructure ?? null);
  const [activity, setActivity] = useState<ActivityKey | null>(existing?.activity ?? null);
  const [incomeStability, setIncomeStability] = useState<IncomeStability | null>(existing?.incomeStability ?? null);
  const [expensesVolume, setExpensesVolume] = useState<ExpensesVolume | null>(existing?.expensesVolume ?? null);

  const activityLabels: Record<ActivityKey, string> = {
    consultoria_tech: w.actConsultoria, diseno: w.actDiseno,
    formacion: w.actFormacion, salud: w.actSalud,
    construccion: w.actConstruccion, comercio: w.actComercio,
    transporte: w.actTransporte, otro: w.actOtro,
  };

  const stepsFlow: StepId[] = fiscalRegime === 'beckham' ? [0, '0.5', 1, 2, 3, 4] : [0, 1, 2, 3, 4];
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
      if (unsureSubStep < 2) setUnsureSubStep((s) => (s! + 1) as UnsureSubStep);
      return;
    }
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < stepsFlow.length) setStep(stepsFlow[nextIndex]);
    else handleFinish();
  }

  function handleBack() {
    if (unsureSubStep !== null) {
      if (unsureSubStep === 0) setUnsureSubStep(null);
      else setUnsureSubStep((s) => (s! - 1) as UnsureSubStep);
      return;
    }
    if (currentStepIndex > 0) setStep(stepsFlow[currentStepIndex - 1]);
  }

  function handleFinish() {
    if (!fiscalRegime || !incomeStructure || !activity || !incomeStability || !expensesVolume) return;
    const profile: WizardProfile = {
      fiscalRegime, beckhamStartYear: beckhamYear,
      incomeStructure, activity,
      deductibilityRate: DEDUCTIBILITY_RATES[activity],
      incomeStability, expensesVolume,
      wizardCompleted: true,
    };
    setWizardProfile(profile);
    onClose();
  }

  const isLastStep = currentStepIndex === stepsFlow.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const stepTitle = unsureSubStep !== null ? null : (
    { 0: w.step0Title, '0.5': w.step05Title, 1: w.step1Title, 2: w.step2Title, 3: w.step3Title, 4: w.step4Title }[String(step)] ?? null
  );
  const stepSubtitle = unsureSubStep !== null ? null : (
    { 0: w.step0Subtitle, '0.5': w.step05Subtitle, 1: w.step1Subtitle, 2: w.step2Subtitle, 3: w.step3Subtitle, 4: w.step4Subtitle }[String(step)] ?? null
  );

  const renderUnsureFlow = () => {
    if (unsureSubStep === 0) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.INK, margin: 0 }}>{w.unsureScreen1Title}</p>
        <p style={{ fontSize: 13, color: C.MUTED, lineHeight: 1.65, margin: 0 }}>{w.unsureScreen1Body}</p>
      </div>
    );
    if (unsureSubStep === 1) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.INK, margin: 0 }}>{w.unsureScreen2Title}</p>
        <p style={{ fontSize: 13, color: C.MUTED, lineHeight: 1.65, margin: 0 }}>{w.unsureScreen2Body}</p>
      </div>
    );
    if (unsureSubStep === 2) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.INK, marginBottom: 12 }}>{w.unsureScreen3Title}</p>
        <OptionCard
          selected={false}
          onClick={() => { setFiscalRegime('beckham'); setUnsureSubStep(null); setStep(0); }}
          label={w.unsureYes}
        />
        <OptionCard
          selected={false}
          onClick={() => { setFiscalRegime('eds'); setUnsureSubStep(null); setStep(0); }}
          label={w.unsureNo}
        />
      </div>
    );
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(26,31,46,0.5)' }} onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-lg flex flex-col rounded-t-2xl sm:rounded-2xl"
        style={{
          background: C.CARD,
          maxHeight: '90dvh',
          boxShadow: '0 -4px 40px rgba(26,31,46,0.15)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px', borderBottom: `1px solid ${C.BORDER}`,
        }}>
          <div>
            <p style={{ fontSize: 11, color: C.MUTED, fontWeight: 500, margin: '0 0 2px', letterSpacing: '0.06em' }}>
              {w.stepOf.replace("{{current}}", String(currentStepIndex + 1))}
            </p>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.INK, margin: 0 }}>{w.title}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'transparent', color: C.MUTED,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.BG; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 5, padding: '12px 20px', borderBottom: `1px solid ${C.BORDER}` }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 4, borderRadius: 999,
                transition: 'background 0.3s',
                background: i === currentStepIndex ? C.INK : i < currentStepIndex ? C.MUTED : C.BORDER,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {unsureSubStep !== null ? renderUnsureFlow() : (
            <>
              {stepTitle && (
                <p style={{ fontSize: 14, fontWeight: 700, color: C.INK, margin: '0 0 4px' }}>{stepTitle}</p>
              )}
              {stepSubtitle && (
                <p style={{ fontSize: 12, color: C.MUTED, margin: '0 0 16px' }}>{stepSubtitle}</p>
              )}

              {/* Step 0: Fiscal Regime */}
              {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <OptionCard selected={fiscalRegime === "eds"} onClick={() => setFiscalRegime("eds")} label={w.regimeEdsLabel} desc={w.regimeEdsDesc} />
                  <OptionCard selected={fiscalRegime === "beckham"} onClick={() => setFiscalRegime("beckham")} label={w.regimeBeckhamLabel} desc={w.regimeBeckhamDesc} />
                  <OptionCard selected={false} onClick={() => {}} disabled label={w.regimeSlLabel} soonBadge={w.soon} />
                  <OptionCard selected={false} onClick={() => setUnsureSubStep(0)} label={w.regimeUnsureLabel} />
                </div>
              )}

              {/* Step 0.5: Beckham year */}
              {step === '0.5' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {BECKHAM_YEARS.map((year) => (
                    <YearBtn
                      key={year}
                      selected={beckhamYear === year}
                      onClick={() => setBeckhamYear(year)}
                      label={String(year)}
                    />
                  ))}
                </div>
              )}

              {/* Step 1: Income structure */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <OptionCard selected={incomeStructure === "single_client"} onClick={() => setIncomeStructure("single_client")} label={w.income1Label} desc={w.income1Desc} />
                  <OptionCard selected={incomeStructure === "multi_client"} onClick={() => setIncomeStructure("multi_client")} label={w.income2Label} />
                  <OptionCard selected={false} onClick={() => {}} disabled label={w.income3Label} soonBadge={w.soon} />
                </div>
              )}

              {/* Step 2: Activity */}
              {step === 2 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
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
                    <p style={{
                      marginTop: 12, fontSize: 12, color: C.MUTED,
                      background: C.BG, border: `1px solid ${C.BORDER}`,
                      borderRadius: 10, padding: '8px 12px', lineHeight: 1.6,
                    }}>
                      {w.beckhamNote}
                    </p>
                  )}
                </div>
              )}

              {/* Step 3: Income stability */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <OptionCard selected={incomeStability === "stable"} onClick={() => setIncomeStability("stable")} label={w.stableLabel} desc={w.stableDesc} />
                  <OptionCard selected={incomeStability === "variable"} onClick={() => setIncomeStability("variable")} label={w.variableLabel} desc={w.variableDesc} />
                </div>
              )}

              {/* Step 4: Expenses volume */}
              {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <OptionCard selected={expensesVolume === "minimal"} onClick={() => setExpensesVolume("minimal")} label={w.expMinimal} desc={w.expMinimalDesc} />
                  <OptionCard selected={expensesVolume === "some"} onClick={() => setExpensesVolume("some")} label={w.expSome} desc={w.expSomeDesc} />
                  <OptionCard selected={expensesVolume === "many"} onClick={() => setExpensesVolume("many")} label={w.expMany} desc={w.expManyDesc} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 20px', borderTop: `1px solid ${C.BORDER}`, gap: 12,
        }}>
          <button
            onClick={handleBack}
            disabled={isFirstStep && unsureSubStep === null}
            style={{
              background: 'none', border: 'none', cursor: isFirstStep && unsureSubStep === null ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 500, color: C.MUTED, fontFamily: 'inherit',
              opacity: isFirstStep && unsureSubStep === null ? 0.3 : 1,
              padding: 0,
            }}
          >
            {w.back}
          </button>

          {unsureSubStep !== 2 && (
            <button
              onClick={handleNext}
              disabled={unsureSubStep === null ? !canAdvance[String(step)] : false}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: (unsureSubStep === null && !canAdvance[String(step)]) ? C.BORDER : C.INK,
                color: (unsureSubStep === null && !canAdvance[String(step)]) ? C.MUTED : 'white',
                border: 'none', borderRadius: 10, padding: '10px 20px',
                fontSize: 13, fontWeight: 600, cursor: (unsureSubStep === null && !canAdvance[String(step)]) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
              }}
            >
              {isLastStep && unsureSubStep === null ? w.finish : w.next}
              {!(isLastStep && unsureSubStep === null)
                ? <ChevronRight size={15} />
                : <Check size={15} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function OptionCard({
  selected, onClick, label, desc, disabled, soonBadge,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
  disabled?: boolean;
  soonBadge?: string;
}) {
  const [hovered, setHovered] = useState(false);

  const borderColor = disabled ? C.BORDER
    : selected ? C.INK
    : hovered ? '#c8bfa8'
    : C.BORDER;

  const bgColor = disabled ? C.BG
    : selected ? '#f5f0e8'
    : C.CARD;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', textAlign: 'left', padding: '12px 16px',
        borderRadius: 12, border: `2px solid ${borderColor}`,
        background: bgColor, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'border-color 0.15s, background 0.15s',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: disabled ? C.MUTED : C.INK, margin: 0 }}>
            {label}
          </p>
          {desc && !disabled && (
            <p style={{ fontSize: 12, color: C.MUTED, marginTop: 2, lineHeight: 1.5 }}>{desc}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {soonBadge && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999,
              background: C.BORDER, color: C.MUTED, fontWeight: 500,
            }}>
              {soonBadge}
            </span>
          )}
          {selected && !disabled && (
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: C.INK, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Check size={11} color="white" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function ActivityCard({
  selected, onClick, label, badge, deductibleWord,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  badge: string;
  deductibleWord: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', textAlign: 'left', padding: '12px 14px',
        borderRadius: 12,
        border: `2px solid ${selected ? C.INK : hovered ? '#c8bfa8' : C.BORDER}`,
        background: selected ? '#f5f0e8' : C.CARD,
        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: C.INK, margin: '0 0 6px' }}>{label}</p>
      <span style={{
        display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 500,
        background: selected ? C.BORDER : C.BG,
        color: C.MUTED,
      }}>
        {badge} {deductibleWord}
      </span>
    </button>
  );
}

function YearBtn({
  selected, onClick, label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 500,
        border: `2px solid ${selected ? C.INK : hovered ? '#c8bfa8' : C.BORDER}`,
        background: selected ? C.INK : C.CARD,
        color: selected ? 'white' : C.INK,
        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
