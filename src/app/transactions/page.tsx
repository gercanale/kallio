"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Pencil,
  Copy,
  CheckCircle,
  Clock,
  Paperclip,
  Trash2,
  X,
  HelpCircle,
} from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import { Navigation } from "@/components/Navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { ExplainDrawer } from "@/components/ExplainDrawer";
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
  const t = useT();

  const [showForm, setShowForm] = useState(false);
  const [defaultType, setDefaultType] = useState<TransactionType>("expense");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [editFor, setEditFor] = useState<Transaction | null>(null);
  const [explainFor, setExplainFor] = useState<Transaction | null>(null);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 sm:pb-0 transition-colors">
      <Navigation />

      <main className="lg:ml-56 px-4 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.transactions.title}</h1>
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
          <div className="bg-white dark:bg-slate-800/60 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.transactions.incomeLabel}</span>
            </div>
            <p className="text-sm font-bold text-emerald-600 tabular-nums">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/60 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.transactions.expenseLabel}</span>
            </div>
            <p className="text-sm font-bold text-red-600 tabular-nums">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/60 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.transactions.deductibleLabel}</span>
            </div>
            <p className="text-sm font-bold text-teal-700 tabular-nums">
              {deductibleCount}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
          {(["all", "income", "expense"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
            className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            {t.transactions.addExpense}
          </button>
        </div>

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Filter className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm dark:text-slate-400">{t.transactions.emptyTitle}</p>
            <p className="text-xs mt-1 dark:text-slate-500">{t.transactions.emptySubtitle}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onEdit={() => setEditFor(tx)}
                onExplain={() => setExplainFor(tx)}
                categoryLabels={t.transactions.categories}
                vatLabel={t.transactions.vatLabel}
                deductibleBadge={t.transactions.deductibleBadge}
                pendingBadge={t.transactions.pendingBadge}
              />
            ))}
          </div>
        )}
      </main>

      {explainFor && (
        <ExplainDrawer tx={explainFor} onClose={() => setExplainFor(null)} />
      )}

      {editFor && (
        <TransactionForm
          onClose={() => setEditFor(null)}
          editTransaction={editFor}
        />
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
  onEdit,
  onExplain,
  categoryLabels,
  vatLabel,
  deductibleBadge,
  pendingBadge,
}: {
  tx: Transaction;
  onEdit: () => void;
  onExplain: () => void;
  categoryLabels: Record<string, string>;
  vatLabel: string;
  deductibleBadge: string;
  pendingBadge: string;
}) {
  const duplicateTransaction = useKallioStore((s) => s.duplicateTransaction);
  const markReviewed = useKallioStore((s) => s.markReviewed);
  const deleteTransaction = useKallioStore((s) => s.deleteTransaction);
  const updateTransaction = useKallioStore((s) => s.updateTransaction);
  const t = useT();

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isIncome = tx.type === "income";
  const categoryColor = CATEGORY_COLORS[tx.category] ?? "bg-slate-100 text-slate-700";
  const categoryLabel = categoryLabels[tx.category] ?? tx.category;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1048576) { e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      updateTransaction(tx.id, { attachmentName: file.name, attachmentData: evt.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const iconBtn = "w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0";
  const iconBtnBase = `${iconBtn} text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200`;

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isIncome ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-slate-100 dark:bg-slate-700"}`}>
        {isIncome ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownLeft className="w-4 h-4 text-slate-500" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
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
          {tx.reviewed && (
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium bg-emerald-50 text-emerald-700 flex-shrink-0">
              ✓ Revisado
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(tx.date)}</p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold tabular-nums ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {isIncome ? "+" : "−"}{formatCurrency(tx.amount)}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{vatLabel} {tx.ivaRate}%</p>
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {deleteConfirm ? (
          <>
            <Tip label={t.actions.cancel}>
              <button onClick={() => setDeleteConfirm(false)} className={iconBtnBase}>
                <X className="w-3.5 h-3.5" />
              </button>
            </Tip>
            <Tip label={t.actions.delete}>
              <button onClick={() => deleteTransaction(tx.id)} className={`${iconBtn} bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tip>
          </>
        ) : (
          <>
            <Tip label={t.actions.explain ?? "¿Por qué?"}>
              <button onClick={onExplain} className={`${iconBtnBase} hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-600 dark:hover:text-teal-400`}>
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </Tip>
            <Tip label={t.actions.edit}>
              <button onClick={onEdit} className={iconBtnBase}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </Tip>
            <Tip label={t.actions.duplicate}>
              <button onClick={() => duplicateTransaction(tx.id)} className={iconBtnBase}>
                <Copy className="w-3.5 h-3.5" />
              </button>
            </Tip>
            <Tip label={tx.reviewed ? t.actions.markPending : t.actions.markReviewed}>
              <button
                onClick={() => markReviewed(tx.id, !tx.reviewed)}
                className={tx.reviewed ? `${iconBtn} text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30` : iconBtnBase}
              >
                {tx.reviewed ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
              </button>
            </Tip>
            <Tip label={tx.attachmentName ? t.actions.viewAttachment : t.actions.attachment}>
              <button
                onClick={() => tx.attachmentName && tx.attachmentData ? window.open(tx.attachmentData, "_blank") : fileInputRef.current?.click()}
                className={tx.attachmentName ? `${iconBtn} text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30` : iconBtnBase}
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            </Tip>
            <Tip label={t.actions.delete}>
              <button onClick={() => setDeleteConfirm(true)} className={`${iconBtn} text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tip>
          </>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity z-20">
        {label}
      </span>
    </div>
  );
}
