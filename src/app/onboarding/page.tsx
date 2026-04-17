"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import type { FiscalRegime } from "@/lib/types";
import { useT } from "@/i18n";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const { t } = useT();
  const router = useRouter();
  const completeOnboarding = useKallioStore((s) => s.completeOnboarding);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [activityType, setActivityType] = useState("");
  const [fiscalRegime, setFiscalRegime] = useState<FiscalRegime>(
    "estimacion_directa_simplificada"
  );
  const [ivaRetention, setIvaRetention] = useState(false);
  const [irpfRetentionRate, setIrpfRetentionRate] = useState(0.15);

  const progress = (step / 3) * 100;

  const handleFinish = () => {
    completeOnboarding({
      name: name.trim(),
      nif: nif.trim() || undefined,
      activityType,
      fiscalRegime,
      ivaRetention,
      irpfRetentionRate,
      onboardingComplete: true,
    });
    router.push("/dashboard");
  };

  const ACTIVITY_OPTIONS = [
    { key: "dev", label: t("onboarding.activities.dev") },
    { key: "design", label: t("onboarding.activities.design") },
    { key: "copy", label: t("onboarding.activities.copy") },
    { key: "marketing", label: t("onboarding.activities.marketing") },
    { key: "consultant", label: t("onboarding.activities.consultant") },
    { key: "photo", label: t("onboarding.activities.photo") },
    { key: "translator", label: t("onboarding.activities.translator") },
    { key: "teacher", label: t("onboarding.activities.teacher") },
    { key: "other", label: t("onboarding.activities.other") },
  ];

  const REGIME_OPTIONS = [
    {
      value: "estimacion_directa_simplificada" as FiscalRegime,
      label: t("onboarding.regime_eds_label"),
      desc: t("onboarding.regime_eds_desc"),
      recommended: true,
    },
    {
      value: "estimacion_directa_normal" as FiscalRegime,
      label: t("onboarding.regime_edn_label"),
      desc: t("onboarding.regime_edn_desc"),
      recommended: false,
    },
    {
      value: "estimacion_objetiva" as FiscalRegime,
      label: t("onboarding.regime_eo_label"),
      desc: t("onboarding.regime_eo_desc"),
      recommended: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {([1, 2, 3] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s < step
                      ? "bg-indigo-600 text-white"
                      : s === step
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-0.5 w-12 ${
                      s < step ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
            <span className="ml-2 text-xs text-slate-500">
              {t("onboarding.stepOf", { step, total: 3 })}
            </span>
          </div>

          {/* Step 1 – Personal data */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {t("onboarding.step1Title")}
              </h1>
              <p className="text-slate-600 text-sm mb-8">
                {t("onboarding.step1Subtitle")}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t("onboarding.nameLabel")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("onboarding.namePlaceholder")}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t("onboarding.nifLabel")}
                  </label>
                  <input
                    type="text"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    placeholder={t("onboarding.nifPlaceholder")}
                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {t("onboarding.activityLabel")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACTIVITY_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActivityType(label)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all border ${
                          activityType === label
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!name.trim() || !activityType}
                className="w-full mt-8 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
              >
                {t("onboarding.next")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2 – Fiscal regime */}
          {step === 2 && (
            <div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-slate-500 text-sm mb-6 hover:text-slate-700"
              >
                <ArrowLeft className="w-4 h-4" /> {t("onboarding.back")}
              </button>

              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {t("onboarding.step2Title")}
              </h1>
              <p className="text-slate-600 text-sm mb-8">
                {t("onboarding.step2Subtitle")}
              </p>

              <div className="space-y-3">
                {REGIME_OPTIONS.map(({ value, label, desc, recommended }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFiscalRegime(value)}
                    className={`w-full p-4 rounded-xl text-left border transition-all ${
                      fiscalRegime === value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-semibold ${
                          fiscalRegime === value ? "text-indigo-700" : "text-slate-900"
                        }`}
                      >
                        {label}
                      </span>
                      {recommended && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          {t("onboarding.recommended")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full mt-8 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all"
              >
                {t("onboarding.next")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 3 – IRPF retention */}
          {step === 3 && (
            <div>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-slate-500 text-sm mb-6 hover:text-slate-700"
              >
                <ArrowLeft className="w-4 h-4" /> {t("onboarding.back")}
              </button>

              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {t("onboarding.step3Title")}
              </h1>
              <p className="text-slate-600 text-sm mb-8">
                {t("onboarding.step3Subtitle")}
              </p>

              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => setIvaRetention(false)}
                  className={`w-full p-4 rounded-xl text-left border transition-all ${
                    !ivaRetention
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className={`text-sm font-semibold mb-1 ${!ivaRetention ? "text-indigo-700" : "text-slate-900"}`}>
                    {t("onboarding.noRetentionLabel")}
                  </p>
                  <p className="text-xs text-slate-500">{t("onboarding.noRetentionDesc")}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIvaRetention(true)}
                  className={`w-full p-4 rounded-xl text-left border transition-all ${
                    ivaRetention
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className={`text-sm font-semibold mb-1 ${ivaRetention ? "text-indigo-700" : "text-slate-900"}`}>
                    {t("onboarding.yesRetentionLabel")}
                  </p>
                  <p className="text-xs text-slate-500">{t("onboarding.yesRetentionDesc")}</p>
                </button>
              </div>

              {ivaRetention && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <p className="text-xs font-medium text-slate-700 mb-3">
                    {t("onboarding.retentionRateQuestion")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { rate: 0.15, label: "15%", desc: t("onboarding.rate15Desc") },
                      { rate: 0.07, label: "7%", desc: t("onboarding.rate7Desc") },
                    ].map(({ rate, label, desc }) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setIrpfRetentionRate(rate)}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          irpfRetentionRate === rate
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <p className={`text-sm font-bold ${irpfRetentionRate === rate ? "text-indigo-700" : "text-slate-900"}`}>
                          {label}
                        </p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4 mb-6">
                <p className="text-xs font-semibold text-indigo-700 mb-2">{t("onboarding.summaryTitle")}</p>
                <div className="space-y-1 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("onboarding.summaryName")}</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("onboarding.summaryActivity")}</span>
                    <span className="font-medium">{activityType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("onboarding.summaryRegime")}</span>
                    <span className="font-medium">EDS</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t("onboarding.goToDashboard")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
