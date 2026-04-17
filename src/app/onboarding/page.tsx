"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, ArrowUpRight, ArrowDownLeft, CheckCircle2, Globe } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import type { FiscalRegime } from "@/lib/types";

type Step = 0 | 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useKallioStore((s) => s.completeOnboarding);
  const activateSession = useKallioStore((s) => s.activateSession);
  const language = useKallioStore((s) => s.language);
  const setLanguage = useKallioStore((s) => s.setLanguage);
  const t = useT();

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [activityType, setActivityType] = useState("");
  const [fiscalRegime, setFiscalRegime] = useState<FiscalRegime>(
    "estimacion_directa_simplificada"
  );
  const [ivaRetention, setIvaRetention] = useState(false);
  const [irpfRetentionRate, setIrpfRetentionRate] = useState(0.15);

  const progress = step === 0 ? 0 : (step / 3) * 100;

  const handleFinish = async () => {
    await completeOnboarding({
      name: name.trim(),
      nif: nif.trim() || undefined,
      activityType,
      fiscalRegime,
      ivaRetention,
      irpfRetentionRate,
      onboardingComplete: true,
    });
    activateSession();
    router.push("/dashboard");
  };

  const ACTIVITY_OPTIONS = [
    t.onboarding.actDev,
    t.onboarding.actDesign,
    t.onboarding.actCopy,
    t.onboarding.actMarketing,
    t.onboarding.actBusiness,
    t.onboarding.actPhoto,
    t.onboarding.actTranslator,
    t.onboarding.actTeacher,
    t.onboarding.actOther,
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-teal-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Language toggle */}
      <div className="flex justify-end px-6 pt-4">
        <button
          onClick={() => setLanguage(language === "es" ? "en" : "es")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm font-semibold transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span>{language === "es" ? "EN" : "ES"}</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Step indicator — only when step > 0 */}
          {step > 0 && (
            <div className="flex items-center gap-2 mb-8">
              {([1, 2, 3] as (1 | 2 | 3)[]).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      s < step
                        ? "bg-teal-600 text-white"
                        : s === step
                        ? "bg-teal-600 text-white ring-4 ring-teal-100"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-0.5 w-12 ${
                        s < step ? "bg-teal-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
              <span className="ml-2 text-xs text-slate-500">
                {t.onboarding.stepOf.replace("{{step}}", String(step))}
              </span>
            </div>
          )}

          {/* Step 0 – Intro slide */}
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1 text-center">
                {t.onboarding.introTitle}
              </h1>
              <p className="text-slate-500 text-sm mb-8 text-center">
                {t.onboarding.introSubtitle}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                    </div>
                    <span className="text-sm font-bold text-emerald-800">
                      {t.onboarding.introIncomeTitle}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    {t.onboarding.introIncomeDesc}
                  </p>
                  <p className="text-xs text-emerald-500 italic">
                    {t.onboarding.introIncomeExample}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <ArrowDownLeft className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      {t.onboarding.introExpenseTitle}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t.onboarding.introExpenseDesc}
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    {t.onboarding.introExpenseExample}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-all"
              >
                {t.onboarding.introContinue}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1 – Datos personales */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {t.onboarding.welcomeTitle}
              </h1>
              <p className="text-slate-600 text-sm mb-8">
                {t.onboarding.welcomeSubtitle}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t.onboarding.nameLabel}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.onboarding.namePlaceholder}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t.onboarding.nifLabel}
                  </label>
                  <input
                    type="text"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    placeholder={t.onboarding.nifPlaceholder}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t.onboarding.activityLabel}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setActivityType(opt)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all border ${
                          activityType === opt
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => setStep(2)}
                  disabled={!name.trim() || !activityType}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                >
                  {t.onboarding.next}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStep(0)}
                  className="w-full flex items-center justify-center gap-1.5 text-slate-500 text-sm hover:text-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" /> {t.onboarding.back}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 – Régimen fiscal */}
          {step === 2 && (
            <div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-slate-500 text-sm mb-6 hover:text-slate-700"
              >
                <ArrowLeft className="w-4 h-4" /> {t.onboarding.back}
              </button>

              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {t.onboarding.regimeTitle}
              </h1>
              <p className="text-slate-600 text-sm mb-8">
                {t.onboarding.regimeSubtitle}
              </p>

              <div className="space-y-3">
                {[
                  {
                    value: "estimacion_directa_simplificada" as FiscalRegime,
                    label: t.onboarding.regimeSimplified,
                    desc: t.onboarding.regimeSimplifiedDesc,
                    recommended: true,
                  },
                  {
                    value: "estimacion_directa_normal" as FiscalRegime,
                    label: t.onboarding.regimeNormal,
                    desc: t.onboarding.regimeNormalDesc,
                    recommended: false,
                  },
                  {
                    value: "estimacion_objetiva" as FiscalRegime,
                    label: t.onboarding.regimeObjective,
                    desc: t.onboarding.regimeObjectiveDesc,
                    recommended: false,
                  },
                ].map(({ value, label, desc, recommended }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFiscalRegime(value)}
                    className={`w-full p-4 rounded-xl text-left border transition-all ${
                      fiscalRegime === value
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-semibold ${
                          fiscalRegime === value ? "text-teal-700" : "text-slate-900"
                        }`}
                      >
                        {label}
                      </span>
                      {recommended && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          {t.onboarding.recommended}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full mt-8 flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-all"
              >
                {t.onboarding.next}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 3 – Retención IRPF */}
          {step === 3 && (
            <div>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-slate-500 text-sm mb-6 hover:text-slate-700"
              >
                <ArrowLeft className="w-4 h-4" /> {t.onboarding.back}
              </button>

              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {t.onboarding.irpfTitle}
              </h1>
              <p className="text-slate-600 text-sm mb-8">
                {t.onboarding.irpfSubtitle}
              </p>

              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => setIvaRetention(false)}
                  className={`w-full p-4 rounded-xl text-left border transition-all ${
                    !ivaRetention
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className={`text-sm font-semibold mb-1 ${!ivaRetention ? "text-teal-700" : "text-slate-900"}`}>
                    {t.onboarding.irpfNo}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.onboarding.irpfNoDesc}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setIvaRetention(true)}
                  className={`w-full p-4 rounded-xl text-left border transition-all ${
                    ivaRetention
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className={`text-sm font-semibold mb-1 ${ivaRetention ? "text-teal-700" : "text-slate-900"}`}>
                    {t.onboarding.irpfYes}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.onboarding.irpfYesDesc}
                  </p>
                </button>
              </div>

              {ivaRetention && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <p className="text-xs font-medium text-slate-700 mb-3">
                    {t.onboarding.irpfRateLabel}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { rate: 0.15, label: "15%", desc: t.onboarding.irpfGeneral },
                      { rate: 0.07, label: "7%", desc: t.onboarding.irpfFirst3 },
                    ].map(({ rate, label, desc }) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setIrpfRetentionRate(rate)}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          irpfRetentionRate === rate
                            ? "border-teal-500 bg-teal-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p className={`text-sm font-bold ${irpfRetentionRate === rate ? "text-teal-700" : "text-slate-900"}`}>
                          {label}
                        </p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-teal-50 to-teal-50 border border-teal-100 rounded-xl p-4 mb-6">
                <p className="text-xs font-semibold text-teal-700 mb-2">{t.onboarding.summaryTitle}</p>
                <div className="space-y-1 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.onboarding.summaryName}</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.onboarding.summaryActivity}</span>
                    <span className="font-medium">{activityType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.onboarding.summaryRegime}</span>
                    <span className="font-medium">EDS</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t.onboarding.goToDashboard}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
