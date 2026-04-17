"use client";

import { useState, useMemo } from "react";
import { Sparkles, Check, X, Clock, Euro } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { formatCurrency } from "@/lib/tax-engine";

export function DeductionAssistant() {
  const deductionPrompts = useKallioStore((s) => s.deductionPrompts);
  const pendingPrompts = useMemo(
    () => deductionPrompts.filter((p) => p.status === "pending"),
    [deductionPrompts]
  );
  const answerDeductionPrompt = useKallioStore((s) => s.answerDeductionPrompt);
  const totalSavedThisYear = useKallioStore((s) => s.totalSavedThisYear);
  const transactions = useKallioStore((s) => s.transactions);
  const language = useKallioStore((s) => s.language);
  const t = useT();

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
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{t.deduction.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.deduction.allReviewed}</p>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-sm">
          {t.deduction.noExpensesPending}
        </p>

        {totalSavedThisYear > 0 && (
          <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 flex items-center gap-3">
            <Euro className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">{t.deduction.savedThisYear}</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
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
  const pendingCount = pendingPrompts.length;

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{t.deduction.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pendingCount} {pendingCount !== 1 ? t.deduction.pendingPlural : t.deduction.pendingSingle}
              </p>
            </div>
          </div>
          {totalSavedThisYear > 0 && (
            <div className="text-right">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t.deduction.accumulatedSaving}</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
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
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-700/60 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 font-semibold text-sm flex-shrink-0">
              {(tx.merchant ?? tx.description).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {tx.merchant ?? tx.description}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(tx.date).toLocaleDateString(language === "es" ? "es-ES" : "en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums flex-shrink-0">
              {formatCurrency(tx.amount)}
            </span>
          </div>
        )}

        {/* Question — resolved from promptKey+vars for i18n, fallback to stored string */}
        <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed mb-4">
          {(() => {
            const key = current.promptKey as keyof typeof t.deduction.promptTemplates | undefined;
            if (key && t.deduction.promptTemplates[key] && current.promptVars) {
              return t.deduction.promptTemplates[key](
                current.promptVars.amount as string,
                current.promptVars.merchant as string
              );
            }
            return current.question;
          })()}
        </p>

        {/* Saving preview */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3 mb-5">
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-0.5">{t.deduction.ifDeductible}</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatCurrency(current.projectedSaving)}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">{t.deduction.taxThisQuarter}</p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleAnswer(current.transactionId, "confirmed")}
            className="flex flex-col items-center gap-1.5 py-3 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all"
          >
            <Check className="w-4 h-4" />
            <span className="text-xs font-medium">{t.deduction.confirmDeductible}</span>
          </button>
          <button
            onClick={() => handleAnswer(current.transactionId, "rejected")}
            className="flex flex-col items-center gap-1.5 py-3 px-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
            <span className="text-xs font-medium">{t.deduction.notDeductible}</span>
          </button>
          <button
            onClick={() => handleAnswer(current.transactionId, "later")}
            className="flex flex-col items-center gap-1.5 py-3 px-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
          >
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">{t.deduction.later}</span>
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
                  i === 0 ? "w-5 bg-teal-500" : "w-1.5 bg-slate-200"
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
