"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/useT";
import { formatCurrency } from "@/lib/tax-engine";

interface BeckhamCountdownProps {
  beckhamStartYear: number;
  annualNetIncome: number;
}

function estimateGeneralIRPF(net: number): number {
  let tax = 0;
  let remaining = net;
  if (remaining > 60000) { tax += (remaining - 60000) * 0.45; remaining = 60000; }
  if (remaining > 35200) { tax += (remaining - 35200) * 0.37; remaining = 35200; }
  if (remaining > 20200) { tax += (remaining - 20200) * 0.30; remaining = 20200; }
  if (remaining > 12450) { tax += (remaining - 12450) * 0.24; remaining = 12450; }
  if (remaining > 0) { tax += remaining * 0.19; }
  return Math.round(tax);
}

function interp(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, v),
    template
  );
}

export function BeckhamCountdown({ beckhamStartYear, annualNetIncome }: BeckhamCountdownProps) {
  const t = useT();
  const sv = t.simpleView;
  const [modalOpen, setModalOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearInRegime = currentYear - beckhamStartYear + 1;
  const yearsRemaining = Math.max(0, 6 - yearInRegime);

  const beckhamTax = Math.round(annualNetIncome * 0.24);
  const generalTax = estimateGeneralIRPF(annualNetIncome);
  const saving = Math.max(0, generalTax - beckhamTax);

  return (
    <>
      {/* Banner */}
      <button
        onClick={() => setModalOpen(true)}
        className="w-full bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-all"
      >
        <span className="text-sm font-semibold text-teal-800 dark:text-teal-300">
          {interp(sv.beckhamBanner, { year: String(yearInRegime) })}
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < yearInRegime
                  ? "bg-teal-500"
                  : "bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500"
              }`}
            />
          ))}
        </div>
      </button>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 pr-6">
              {sv.beckhamModalTitle}
            </h3>

            <div className="space-y-3">
              {/* Year progress */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {interp(sv.beckhamYear, { year: String(yearInRegime) })}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < yearInRegime
                          ? "bg-teal-500"
                          : "bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-500"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Years left */}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {interp(sv.beckhamYearsLeft, { years: String(yearsRemaining) })}
              </p>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
                {/* Beckham IRPF */}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">IRPF Beckham (24%)</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-300 tabular-nums">
                    {formatCurrency(beckhamTax)}
                  </span>
                </div>

                {/* General regime estimate */}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{sv.beckhamGeneralTax}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatCurrency(generalTax)}
                  </span>
                </div>

                {/* Savings */}
                <div className="flex justify-between text-sm border-t border-slate-100 dark:border-slate-700 pt-2">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{sv.beckhamSaving}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(saving)}
                  </span>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed pt-1">
                {sv.beckhamDisclaimer}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
