"use client";

import { useState, useMemo } from "react";
import { Calendar, Bell, FileDown, AlertTriangle, CheckCircle2, Lock, LockOpen } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { calculateTaxSnapshot, nextDeadline, formatCurrency, nowInSpain, getQuarterDeadlines } from "@/lib/tax-engine";
import { generateGestorPDF } from "@/lib/pdf-export";

export function QuarterlyCountdown() {
  const [exported, setExported] = useState(false);
  const transactions = useKallioStore((s) => s.transactions);
  const profile = useKallioStore((s) => s.profile);
  const language = useKallioStore((s) => s.language);
  const markQuarterFiled = useKallioStore((s) => s.markQuarterFiled);
  const getQuarterStatus = useKallioStore((s) => s.getQuarterStatus);
  const t = useT();

  const now = nowInSpain();
  const year = now.getFullYear();
  const deadline = useMemo(() => nextDeadline(year), [year]);
  const snap = useMemo(
    () => calculateTaxSnapshot(transactions, profile, deadline.quarter, deadline.year),
    [transactions, profile, deadline]
  );

  // Past quarters this year (where deadline has passed)
  const pastQuarters = useMemo(() => {
    const deadlines = getQuarterDeadlines(year);
    return deadlines
      .filter((d) => {
        const dl = new Date(d.modelo130Deadline);
        return dl < now;
      })
      .map((d) => ({
        ...d,
        status: getQuarterStatus(d.quarter, d.year),
        snap: calculateTaxSnapshot(transactions, profile, d.quarter, d.year),
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, transactions, profile, getQuarterStatus]);

  const urgencyColor =
    deadline.daysLeft <= 7
      ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900"
      : deadline.daysLeft <= 15
      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900"
      : "bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900";

  const urgencyText =
    deadline.daysLeft <= 7
      ? "text-red-600 dark:text-red-400"
      : deadline.daysLeft <= 15
      ? "text-amber-600 dark:text-amber-400"
      : "text-teal-600 dark:text-teal-400";

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
          <div className={`flex items-center gap-1.5 bg-white/60 dark:bg-slate-800/60 rounded-full px-3 py-1 ${urgencyText}`}>
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
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-0.5">
              Modelo 130 {language === "es" ? "y" : "&"} 303 – {deadline.label} {deadline.year}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {t.countdown.expiresOn} {new Date(deadline.modelo130Deadline).toLocaleDateString(language === "es" ? "es-ES" : "en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Liability breakdown */}
        <div className="bg-white/70 dark:bg-slate-800/70 rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-3">
            {t.countdown.estimatedPayment}
          </p>

          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.countdown.vatModel303}</p>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatCurrency(snap.ivaPayable)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.countdown.irpfModel130}</p>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatCurrency(snap.irpfAdvancePayable)}
            </span>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-600 pt-2.5 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.countdown.totalEstimated}</span>
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
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
              )}
              <span className={`text-xs ${triggered ? "text-slate-700 dark:text-slate-200 font-medium" : "text-slate-400 dark:text-slate-500"}`}>
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
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-xl transition-all shadow-sm text-sm font-medium"
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

      {/* Past quarters filing status */}
      {pastQuarters.length > 0 && (
        <div className="border-t border-slate-200/60 dark:border-slate-700/60 px-6 py-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            {t.countdown.pastQuartersTitle}
          </p>
          <div className="space-y-2">
            {pastQuarters.map((pq) => {
              const isFiled = pq.status === "filed";
              const totalTax = pq.snap.ivaPayable + pq.snap.irpfAdvancePayable;
              return (
                <div
                  key={`${pq.quarter}-${pq.year}`}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-colors ${
                    isFiled
                      ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                      : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isFiled ? (
                      <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <LockOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {pq.label} {pq.year}
                      </p>
                      <p className={`text-xs ${isFiled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                        {isFiled
                          ? t.countdown.filedStatus
                          : totalTax > 0
                          ? formatCurrency(totalTax)
                          : t.countdown.noTax}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => markQuarterFiled(pq.quarter, pq.year, !isFiled)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isFiled
                        ? "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                        : "text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50"
                    }`}
                  >
                    {isFiled ? t.countdown.markOpen : t.countdown.markFiled}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
