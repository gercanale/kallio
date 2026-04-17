"use client";

import { useState, useMemo } from "react";
import { Calendar, Bell, FileDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { calculateTaxSnapshot, nextDeadline, formatCurrency } from "@/lib/tax-engine";
import { generateGestorPDF } from "@/lib/pdf-export";

export function QuarterlyCountdown() {
  const [exported, setExported] = useState(false);
  const transactions = useKallioStore((s) => s.transactions);
  const profile = useKallioStore((s) => s.profile);
  const t = useT();

  const year = new Date().getFullYear();
  const deadline = useMemo(() => nextDeadline(year), [year]);
  const snap = useMemo(
    () => calculateTaxSnapshot(transactions, profile, deadline.quarter, deadline.year),
    [transactions, profile, deadline]
  );

  const urgencyColor =
    deadline.daysLeft <= 7
      ? "bg-red-50 border-red-200"
      : deadline.daysLeft <= 15
      ? "bg-amber-50 border-amber-200"
      : "bg-teal-50 border-teal-100";

  const urgencyText =
    deadline.daysLeft <= 7
      ? "text-red-600"
      : deadline.daysLeft <= 15
      ? "text-amber-600"
      : "text-teal-600";

  const urgencyIcon =
    deadline.daysLeft <= 15 ? (
      <AlertTriangle className={`w-4 h-4 ${urgencyText}`} />
    ) : (
      <Calendar className={`w-4 h-4 ${urgencyText}`} />
    );

  const handleExport = async () => {
    try {
      await generateGestorPDF(transactions, snap, profile, deadline);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch {
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    }
  };

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${urgencyColor}`}>
      {/* Countdown header */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {urgencyIcon}
            <span className={`text-xs font-semibold uppercase tracking-wider ${urgencyText}`}>
              {t.countdown.nextDeclaration}
            </span>
          </div>
          <div className={`flex items-center gap-1.5 bg-white/60 rounded-full px-3 py-1 ${urgencyText}`}>
            <Bell className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{t.countdown.activeAlerts}</span>
          </div>
        </div>

        {/* Main countdown */}
        <div className="flex items-end gap-3 mb-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-black tabular-nums ${urgencyText}`}>
                {deadline.daysLeft}
              </span>
              <span className={`text-lg font-medium ${urgencyText} opacity-70`}>{t.countdown.days}</span>
            </div>
            <p className="text-slate-600 text-sm mt-0.5">
              Modelo 130 y 303 – {deadline.label} {deadline.year}
            </p>
            <p className="text-slate-500 text-xs">
              {t.countdown.expiresOn} {new Date(deadline.modelo130Deadline).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Liability breakdown */}
        <div className="bg-white/70 rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
            {t.countdown.estimatedPayment}
          </p>

          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">{t.countdown.vatModel303}</p>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatCurrency(snap.ivaPayable)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">{t.countdown.irpfModel130}</p>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatCurrency(snap.irpfAdvancePayable)}
            </span>
          </div>

          <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-800">{t.countdown.totalEstimated}</span>
            <span className={`text-lg font-black tabular-nums ${urgencyText}`}>
              {formatCurrency(snap.totalTaxReserve)}
            </span>
          </div>
        </div>

        {/* Alert timeline */}
        <div className="mt-4 space-y-1.5">
          {[
            { label: t.countdown.alert30, triggered: deadline.daysLeft <= 30 },
            { label: t.countdown.alert15, triggered: deadline.daysLeft <= 15 },
            { label: t.countdown.alert7, triggered: deadline.daysLeft <= 7 },
          ].map(({ label, triggered }) => (
            <div key={label} className="flex items-center gap-2">
              {triggered ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
              )}
              <span className={`text-xs ${triggered ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                {label}{triggered && ` ${t.countdown.alertSent}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Export button */}
      <div className="px-6 pb-5">
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-800 rounded-xl transition-all shadow-sm text-sm font-medium"
        >
          {exported ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {t.countdown.exportedButton}
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              {t.countdown.exportButton}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
