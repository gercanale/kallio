"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import { Navigation } from "@/components/Navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { formatCurrency, formatDate } from "@/lib/tax-engine";
import type { Transaction, TransactionType } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  software_subscriptions: "bg-teal-100 text-teal-700",
  hardware_equipment: "bg-blue-100 text-blue-700",
  professional_services: "bg-teal-100 text-teal-700",
  marketing_advertising: "bg-pink-100 text-pink-700",
  travel_transport: "bg-amber-100 text-amber-700",
  meals_entertainment: "bg-orange-100 text-orange-700",
  phone_internet: "bg-cyan-100 text-cyan-700",
  training_education: "bg-teal-100 text-teal-700",
  other_deductible: "bg-slate-100 text-slate-700",
  personal: "bg-red-100 text-red-600",
  unclear: "bg-yellow-100 text-yellow-700",
};

export default function TransactionsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const transactions = useKallioStore((s) => s.transactions);
  const deleteTransaction = useKallioStore((s) => s.deleteTransaction);
  const t = useT();

  const [showForm, setShowForm] = useState(false);
  const [defaultType, setDefaultType] = useState<TransactionType>("expense");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) {
      router.replace("/");
    } else if (!profile.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [hydrated, sessionActive, profile.onboardingComplete, router]);

  if (!hydrated || !sessionActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile.onboardingComplete) return null;

  const filtered = transactions.filter(
    (tx) => filter === "all" || tx.type === filter
  );

  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((s, tx) => s + tx.amount, 0);
  const totalExpenses = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + tx.amount, 0);
  const deductibleCount = transactions.filter(
    (tx) => tx.type === "expense" && tx.isDeductible
  ).length;

  const openForm = (type: TransactionType) => {
    setDefaultType(type);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">{t.transactions.title}</h1>
          <button
            onClick={() => openForm("expense")}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            {t.transactions.addButton}
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-slate-500">{t.transactions.incomeLabel}</span>
            </div>
            <p className="text-sm font-bold text-emerald-600 tabular-nums">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-slate-500">{t.transactions.expenseLabel}</span>
            </div>
            <p className="text-sm font-bold text-red-600 tabular-nums">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs text-slate-500">{t.transactions.deductibleLabel}</span>
            </div>
            <p className="text-sm font-bold text-teal-700 tabular-nums">
              {deductibleCount}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
          {(["all", "income", "expense"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f === "all" ? t.transactions.filterAll : f === "income" ? t.transactions.filterIncome : t.transactions.filterExpense}
            </button>
          ))}
        </div>

        {/* Quick add buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => openForm("income")}
            className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            {t.transactions.addIncome}
          </button>
          <button
            onClick={() => openForm("expense")}
            className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            {t.transactions.addExpense}
          </button>
        </div>

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Filter className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t.transactions.emptyTitle}</p>
            <p className="text-xs mt-1">{t.transactions.emptySubtitle}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onDelete={() => setDeleteConfirm(tx.id)}
                categoryLabels={t.transactions.categories}
                vatLabel={t.transactions.vatLabel}
                deductibleBadge={t.transactions.deductibleBadge}
                pendingBadge={t.transactions.pendingBadge}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-2">{t.transactions.deleteTitle}</h3>
            <p className="text-slate-600 text-sm mb-5">{t.transactions.deleteBody}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => {
                  deleteTransaction(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-medium text-white transition-colors"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <TransactionForm
          onClose={() => setShowForm(false)}
          defaultType={defaultType}
        />
      )}
    </div>
  );
}

function TransactionRow({
  tx,
  onDelete,
  categoryLabels,
  vatLabel,
  deductibleBadge,
  pendingBadge,
}: {
  tx: Transaction;
  onDelete: () => void;
  categoryLabels: Record<string, string>;
  vatLabel: string;
  deductibleBadge: string;
  pendingBadge: string;
}) {
  const isIncome = tx.type === "income";
  const categoryColor =
    CATEGORY_COLORS[tx.category] ?? "bg-slate-100 text-slate-700";
  const categoryLabel = categoryLabels[tx.category] ?? tx.category;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isIncome ? "bg-emerald-50" : "bg-slate-100"
        }`}
      >
        {isIncome ? (
          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
        ) : (
          <ArrowDownLeft className="w-4 h-4 text-slate-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900 truncate">
            {tx.merchant ?? tx.description}
          </p>
          {!isIncome && (
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${categoryColor}`}>
              {categoryLabel}
            </span>
          )}
          {!isIncome && tx.isDeductible && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium bg-teal-50 text-teal-600 flex-shrink-0">
              {deductibleBadge}
            </span>
          )}
          {!isIncome && tx.confidence === "unclear" && !tx.deductionPromptAnswered && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium bg-yellow-50 text-yellow-700 flex-shrink-0">
              {pendingBadge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{formatDate(tx.date)}</p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold tabular-nums ${isIncome ? "text-emerald-600" : "text-slate-800"}`}>
          {isIncome ? "+" : "−"}{formatCurrency(tx.amount)}
        </p>
        <p className="text-xs text-slate-400">{vatLabel} {tx.ivaRate}%</p>
      </div>

      <button
        onClick={onDelete}
        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-500 transition-colors" />
      </button>
    </div>
  );
}
