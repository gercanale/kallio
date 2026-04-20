"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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

type Period = "prev" | "curr" | "ytd";

export default function DashboardPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const transactions = useKallioStore((s) => s.transactions);
  const language = useKallioStore((s) => s.language);
  const t = useT();

  const [showForm, setShowForm] = useState(false);
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
    // prev
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

  // Transactions filtered to the selected period (for FinancialBreakdown)
  const periodTransactions = useMemo(() => {
    if (resolvedQY) {
      const { start, end } = quarterDateRange(resolvedQY.quarter, resolvedQY.year);
      return transactions.filter((tx) => {
        const d = new Date(tx.date);
        return d >= start && d <= end;
      });
    }
    // YTD: Jan 1 to today
    return transactions.filter((tx) => new Date(tx.date).getFullYear() === currY);
  }, [resolvedQY, transactions, currY]);

  // Human-readable period label
  const periodLabel = useMemo(() => {
    if (period === "ytd") return `${t.dashboard.periodYTD} ${currY}`;
    if (resolvedQY) return `${resolvedQY.quarter}T ${resolvedQY.year}`;
    return "";
  }, [period, resolvedQY, currY, t]);

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
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t.dashboard.addButton}
          </button>
        </div>

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
          {/* Tax reserve meter — period-aware */}
          <TaxReserveMeter
            snapshot={snapshot}
            periodLabel={periodLabel}
            showGapBanner={period !== "ytd"}
          />

          {/* Income / Expense breakdown */}
          <FinancialBreakdown
            transactions={periodTransactions}
            snapshot={snapshot}
          />

          {/* Countdown + Deduction assistant */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DeductionAssistant />
            <QuarterlyCountdown />
          </div>
        </div>
      </main>

      {showForm && (
        <TransactionForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
