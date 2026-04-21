"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2, LayoutGrid, Layers } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import {
  calculateTaxSnapshot,
  calculateYTDSnapshot,
  quarterDateRange,
  currentQuarter,
  nowInSpain,
} from "@/lib/tax-engine";
import { TaxReserveMeter } from "@/components/TaxReserveMeter";
import { FinancialBreakdown } from "@/components/FinancialBreakdown";
import { DeductionAssistant } from "@/components/DeductionAssistant";
import { QuarterlyCountdown } from "@/components/QuarterlyCountdown";
import { Navigation } from "@/components/Navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { SetupWizard } from "@/components/SetupWizard";
import { SimpleView } from "@/components/SimpleView";

type Period = "prev" | "curr" | "ytd";

export default function DashboardPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const transactions = useKallioStore((s) => s.transactions);
  const language = useKallioStore((s) => s.language);
  const wizardProfile = useKallioStore((s) => s.wizardProfile);
  const dashboardMode = useKallioStore((s) => s.dashboardMode);
  const setDashboardMode = useKallioStore((s) => s.setDashboardMode);
  const t = useT();

  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [period, setPeriod] = useState<Period>("curr");

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) router.replace("/");
    else if (!profile.onboardingComplete) router.replace("/onboarding");
  }, [hydrated, sessionActive, profile.onboardingComplete, router]);

  const now = useMemo(() => nowInSpain(), []);
  const currQ = currentQuarter(now);
  const currY = now.getFullYear();

  // Resolve which quarter to show (null = YTD)
  const resolvedQY = useMemo((): { quarter: number; year: number } | null => {
    if (period === "ytd") return null;
    if (period === "curr") return { quarter: currQ, year: currY };
    if (currQ === 1) return { quarter: 4, year: currY - 1 };
    return { quarter: currQ - 1, year: currY };
  }, [period, currQ, currY]);

  // Snapshot for the selected period
  const snapshot = useMemo(() => {
    if (resolvedQY) {
      return calculateTaxSnapshot(transactions, profile, resolvedQY.quarter, resolvedQY.year);
    }
    return calculateYTDSnapshot(transactions, profile, currY);
  }, [resolvedQY, transactions, profile, currY]);

  // Current-quarter snapshot always used for SimpleView
  const currSnapshot = useMemo(() => {
    return calculateTaxSnapshot(transactions, profile, currQ, currY);
  }, [transactions, profile, currQ, currY]);

  // Transactions filtered to the selected period (for FinancialBreakdown)
  const periodTransactions = useMemo(() => {
    if (resolvedQY) {
      const { start, end } = quarterDateRange(resolvedQY.quarter, resolvedQY.year);
      return transactions.filter((tx) => {
        const d = new Date(tx.date);
        return d >= start && d <= end;
      });
    }
    return transactions.filter((tx) => new Date(tx.date).getFullYear() === currY);
  }, [resolvedQY, transactions, currY]);

  // Human-readable period label
  const periodLabel = useMemo(() => {
    if (period === "ytd") return `${t.dashboard.periodYTD} ${currY}`;
    if (resolvedQY) return `${resolvedQY.quarter}T ${resolvedQY.year}`;
    return "";
  }, [period, resolvedQY, currY, t]);

  // Derived state: should we show the simple view?
  const isSimpleMode = dashboardMode === "simple" && wizardProfile?.wizardCompleted;

  if (!hydrated || !sessionActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile.onboardingComplete) return null;

  const hour = now.getHours();
  const greeting =
    hour < 13 ? t.dashboard.greetingMorning
    : hour < 20 ? t.dashboard.greetingAfternoon
    : t.dashboard.greetingEvening;

  const dateStr = now.toLocaleDateString(language === "es" ? "es-ES" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const periods: { key: Period; label: string }[] = [
    { key: "prev", label: t.dashboard.periodPrev },
    { key: "curr", label: t.dashboard.periodCurr },
    { key: "ytd",  label: t.dashboard.periodYTD  },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 sm:pb-0 transition-colors">
      <Navigation />

      <main className="lg:ml-56 px-4 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {greeting}, {profile.name.split(" ")[0]} 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Checker button */}
            <button
              onClick={() => router.push("/checker")}
              className="hidden sm:flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            >
              {t.checker.title}
            </button>

            {/* Backtest button */}
            <button
              onClick={() => router.push("/backtest")}
              className="hidden sm:flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            >
              {t.simpleView.backtest}
            </button>

            {/* Configurar / wizard button */}
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {t.simpleView.configure}
            </button>

            {/* View mode toggle — only show if wizard is complete */}
            {wizardProfile?.wizardCompleted && (
              <button
                onClick={() => setDashboardMode(isSimpleMode ? "full" : "simple")}
                className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                title={isSimpleMode ? t.simpleView.fullView : t.simpleView.simpleViewBtn}
              >
                {isSimpleMode ? (
                  <><LayoutGrid className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t.simpleView.fullView}</span></>
                ) : (
                  <><Layers className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t.simpleView.simpleViewBtn}</span></>
                )}
              </button>
            )}

            {/* Add transaction */}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t.dashboard.addButton}</span>
            </button>
          </div>
        </div>

        {/* ── Simple View ── */}
        {isSimpleMode && wizardProfile && (
          <SimpleView
            snapshot={currSnapshot}
            wizardProfile={wizardProfile}
            onAddTransaction={() => setShowForm(true)}
          />
        )}

        {/* ── Full View ── */}
        {!isSimpleMode && (
          <>
            {/* Period selector */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 w-full">
              {periods.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    period === key
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <TaxReserveMeter
                snapshot={snapshot}
                periodLabel={periodLabel}
                showGapBanner={period !== "ytd"}
              />
              <FinancialBreakdown
                transactions={periodTransactions}
                snapshot={snapshot}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DeductionAssistant />
                <QuarterlyCountdown />
              </div>
            </div>
          </>
        )}
      </main>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
      {showWizard && <SetupWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}
