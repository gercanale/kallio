"use client";

import { X, ArrowUpRight, ArrowDownLeft, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/tax-engine";
import { getTransactionExplain } from "@/lib/tax-explanations";
import type { Transaction } from "@/lib/types";
import Link from "next/link";

interface ExplainDrawerProps {
  tx: Transaction;
  onClose: () => void;
}

export function ExplainDrawer({ tx, onClose }: ExplainDrawerProps) {
  const language = useKallioStore((s) => s.language);
  const isES = language === "es";

  const explain = getTransactionExplain(tx, language === "es" ? "es" : "en");
  const isIncome = tx.type === "income";

  const highlightStyles = {
    good: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    warn: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    neutral: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
  };

  const highlightIcon = {
    good: <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />,
    warn: <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />,
    neutral: <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 bottom-0 right-0 z-50 flex flex-col w-full sm:w-[420px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isIncome ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-slate-100 dark:bg-slate-700"
            }`}>
              {isIncome
                ? <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                : <ArrowDownLeft className="w-4 h-4 text-slate-500" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isES ? "¿Por qué esto?" : "Why this?"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isES ? "Explicación fiscal" : "Tax explanation"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Transaction summary pill */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {tx.merchant ?? tx.description}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {formatDate(tx.date)}
                  {tx.currency && tx.currency !== "EUR" && (
                    <span className="ml-1.5 text-amber-600 dark:text-amber-400">· {tx.currency}</span>
                  )}
                </p>
              </div>
              <p className={`text-base font-bold tabular-nums flex-shrink-0 ml-4 ${
                isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}>
                {isIncome ? "+" : "−"}{formatCurrency(tx.amount)}
              </p>
            </div>
            {tx.ivaRate > 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                IVA {tx.ivaRate}%
                {tx.ivaRate > 0 && (
                  <span className="ml-1 text-slate-500 dark:text-slate-400">
                    · {isES ? "Neto" : "Net"}: {formatCurrency(tx.amount / (1 + tx.ivaRate / 100))}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Explanation sections */}
          {explain.sections.map((section, i) => {
            const style = highlightStyles[section.highlight ?? "neutral"];
            const icon = highlightIcon[section.highlight ?? "neutral"];
            return (
              <div key={i} className={`rounded-2xl p-4 border ${style}`}>
                <div className="flex items-start gap-2">
                  {icon}
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {section.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {section.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Link to learn */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
              {isES ? "¿Quieres entender más sobre impuestos?" : "Want to understand more about taxes?"}
            </p>
            <Link
              href="/learn"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            >
              {isES ? "Ir al glosario fiscal →" : "Go to tax glossary →"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
