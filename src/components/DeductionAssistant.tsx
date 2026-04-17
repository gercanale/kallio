"use client";

import { useState, useMemo } from "react";
import { Sparkles, Check, X, Clock, Euro } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { formatCurrency } from "@/lib/tax-engine";
import { useT } from "@/i18n";
import { useFormatDate } from "@/i18n/useFormatDate";

export function DeductionAssistant() {
  const { t } = useT();
  const { formatDayMonth } = useFormatDate();
  const deductionPrompts = useKallioStore((s) => s.deductionPrompts);
  const pendingPrompts = useMemo(
    () => deductionPrompts.filter((p) => p.status === "pending"),
    [deductionPrompts]
  );
  const answerDeductionPrompt = useKallioStore((s) => s.answerDeductionPrompt);
  const totalSavedThisYear = useKallioStore((s) => s.totalSavedThisYear);
  const transactions = useKallioStore((s) => s.transactions);

  const [animating, setAnimating] = useState<string | null>(null);

  const handleAnswer = (
    txId: string,
    answer: "confirmed" | "rejected" | "later"
  ) => {
    setAnimating(txId);
    setTimeout(() => {
      answerDeductionPrompt(txId, answer);
      setAnimating(null);
    }, 300);
  };

  if (pendingPrompts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">{t("deductions.title")}</h2>
            <p className="text-xs text-slate-500">{t("deductions.allReviewed")}</p>
          </div>
        </div>

        <p className="text-slate-600 text-sm">{t("deductions.noExpenses")}</p>

        {totalSavedThisYear > 0 && (
          <div className="mt-4 bg-emerald-50 rounded-xl p-3 flex items-center gap-3">
            <Euro className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-emerald-700">{t("deductions.savedThisYear")}</p>
              <p className="text-lg font-bold text-emerald-700 tabular-nums">
                {formatCurrency(totalSavedThisYear)}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const current = pendingPrompts[0];
  const tx = transactions.find((t) => t.id === current.transactionId);

  const question = current.promptKey
    ? t(`deductionPrompts.${current.promptKey}`, current.promptVars)
    : current.question;

  const pendingLabel =
    pendingPrompts.length === 1
      ? t("deductions.pendingSingular", { count: 1 })
      : t("deductions.pendingPlural", { count: pendingPrompts.length });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">{t("deductions.title")}</h2>
              <p className="text-xs text-slate-500">{pendingLabel}</p>
            </div>
          </div>
          {totalSavedThisYear > 0 && (
            <div className="text-right">
              <p className="text-xs text-emerald-600 font-medium">{t("deductions.accumulatedSaving")}</p>
              <p className="text-sm font-bold text-emerald-700 tabular-nums">
                {formatCurrency(totalSavedThisYear)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Current prompt */}
      <div
        className={`px-6 py-5 transition-opacity duration-300 ${
          animating === current.transactionId ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Transaction info */}
        {tx && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0">
              {(tx.merchant ?? tx.description).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {tx.merchant ?? tx.description}
              </p>
              <p className="text-xs text-slate-500">{formatDayMonth(tx.date)}</p>
            </div>
            <span className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0">
              {formatCurrency(tx.amount)}
            </span>
          </div>
        )}

        {/* Question */}
        <p className="text-slate-800 text-sm leading-relaxed mb-4">{question}</p>

        {/* Saving preview */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-3 mb-5">
          <p className="text-xs text-emerald-700 mb-0.5">{t("deductions.ifDeductible")}</p>
          <p className="text-xl font-bold text-emerald-700 tabular-nums">
            {formatCurrency(current.projectedSaving)}
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">{t("deductions.inTaxesThisQuarter")}</p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleAnswer(current.transactionId, "confirmed")}
            className="flex flex-col items-center gap-1.5 py-3 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all"
          >
            <Check className="w-4 h-4" />
            <span className="text-xs font-medium">{t("deductions.confirm")}</span>
          </button>
          <button
            onClick={() => handleAnswer(current.transactionId, "rejected")}
            className="flex flex-col items-center gap-1.5 py-3 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
            <span className="text-xs font-medium">{t("deductions.reject")}</span>
          </button>
          <button
            onClick={() => handleAnswer(current.transactionId, "later")}
            className="flex flex-col items-center gap-1.5 py-3 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl transition-all"
          >
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">{t("deductions.later")}</span>
          </button>
        </div>
      </div>

      {/* Queue indicator */}
      {pendingPrompts.length > 1 && (
        <div className="px-6 pb-4">
          <div className="flex gap-1.5 justify-center">
            {pendingPrompts.slice(0, 5).map((p, i) => (
              <span
                key={p.transactionId}
                className={`h-1.5 rounded-full transition-all ${
                  i === 0 ? "w-5 bg-violet-500" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
            {pendingPrompts.length > 5 && (
              <span className="text-xs text-slate-400">+{pendingPrompts.length - 5}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
