"use client";

import { useState, useMemo } from "react";
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Sparkles, Tag } from "lucide-react";
import { useT } from "@/lib/useT";
import { formatCurrency, getCategoryDeductibilityPct, ivaAmount, netFromGross } from "@/lib/tax-engine";
import { TaxTooltip } from "@/components/TaxTooltip";
import type { Transaction, TaxSnapshot } from "@/lib/types";

interface FinancialBreakdownProps {
  transactions: Transaction[];   // already filtered to the selected period
  snapshot: TaxSnapshot;
}

// ─── Income tab ───────────────────────────────────────────────────────────────

function IncomeTab({ transactions, snapshot }: { transactions: Transaction[]; snapshot: TaxSnapshot }) {
  const t = useT();
  const tb = t.breakdown;

  const income = transactions.filter((tx) => tx.type === "income");
  const grossTotal = snapshot.grossIncome;
  const netTotal = grossTotal - snapshot.ivaCollected;
  const vatTotal = snapshot.ivaCollected;

  // Group by merchant / description
  const sources = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of income) {
      const key = tx.merchant?.trim() || tx.description;
      map.set(key, (map.get(key) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [income]);

  if (income.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <ArrowUpRight className="w-8 h-8 mb-3 opacity-30" />
        <p className="text-sm">{tb.noIncome}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label={tb.totalGross}
          value={grossTotal}
          color="text-slate-900 dark:text-slate-100"
          icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
          tooltip="gross_income"
        />
        <StatCard
          label={tb.netNoVat}
          value={netTotal}
          color="text-emerald-600 dark:text-emerald-400"
          icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
          tooltip="net_income"
        />
        <StatCard
          label={tb.vatCollected}
          value={vatTotal}
          color="text-amber-600 dark:text-amber-400"
          icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
          tooltip="iva_collected"
        />
      </div>

      {/* Top sources */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          {tb.topSources}
        </p>
        <div className="space-y-1.5">
          {sources.map(([name, amount]) => {
            const pct = grossTotal > 0 ? Math.round((amount / grossTotal) * 100) : 0;
            return (
              <div key={name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{name}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums flex-shrink-0">
                      {formatCurrency(amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Expenses tab ─────────────────────────────────────────────────────────────

function ExpensesTab({ transactions, snapshot }: { transactions: Transaction[]; snapshot: TaxSnapshot }) {
  const t = useT();
  const tb = t.breakdown;
  const catLabels = t.transactions.categories;

  const expenses = transactions.filter((tx) => tx.type === "expense");
  const totalExpenses = expenses.reduce((s, tx) => s + tx.amount, 0);
  const deductibleTotal = snapshot.deductibleExpenses; // net deductible base
  const nonDeductibleTotal = expenses
    .filter((tx) => !tx.isDeductible || tx.category === "personal")
    .reduce((s, tx) => s + tx.amount, 0);
  const vatRecoverable = snapshot.ivaDeductible;

  // Group by category (gross amounts)
  const byCategory = useMemo(() => {
    const map = new Map<string, { gross: number; deductibleNet: number; count: number }>();
    for (const tx of expenses) {
      const entry = map.get(tx.category) ?? { gross: 0, deductibleNet: 0, count: 0 };
      const pct = tx.isDeductible ? getCategoryDeductibilityPct(tx.category) : 0;
      const net = netFromGross(tx.amount, tx.ivaRate);
      entry.gross += tx.amount;
      entry.deductibleNet += net * pct;
      entry.count += 1;
      map.set(tx.category, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].gross - a[1].gross)
      .slice(0, 8);
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <ArrowDownLeft className="w-8 h-8 mb-3 opacity-30" />
        <p className="text-sm">{tb.noExpenses}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label={tb.totalExpenses}
          value={totalExpenses}
          color="text-red-600 dark:text-red-400"
          icon={<TrendingDown className="w-3.5 h-3.5 text-red-500" />}
        />
        <StatCard
          label={tb.deductible}
          value={deductibleTotal}
          color="text-teal-700 dark:text-teal-400"
          icon={<Sparkles className="w-3.5 h-3.5 text-teal-500" />}
          tooltip="deductible"
        />
        <StatCard
          label={tb.nonDeductible}
          value={nonDeductibleTotal}
          color="text-slate-600 dark:text-slate-300"
          icon={<TrendingDown className="w-3.5 h-3.5 text-slate-400" />}
        />
      </div>

      {/* By category */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          {tb.byCategory}
        </p>
        <div className="space-y-1.5">
          {byCategory.map(([cat, { gross, deductibleNet }]) => {
            const pct = totalExpenses > 0 ? Math.round((gross / totalExpenses) * 100) : 0;
            const deductPct = gross > 0 ? Math.round((deductibleNet / netFromGross(gross, 0)) * 100) : 0;
            const label = catLabels[cat as keyof typeof catLabels] ?? cat;
            const isFullDeductible = getCategoryDeductibilityPct(cat as any) === 1;
            const isPersonal = cat === "personal";
            return (
              <div key={cat} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{label}</p>
                      {!isPersonal && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${
                          isFullDeductible
                            ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                            : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        }`}>
                          {isFullDeductible ? "100%" : `${deductPct}%`}
                        </span>
                      )}
                      {isPersonal && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          {tb.nonDeductible}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums flex-shrink-0">
                      {formatCurrency(gross)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums">{pct}% {tb.ofTotal}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VAT recovered footer */}
      {vatRecoverable > 0 && (
        <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-900/20 rounded-xl px-4 py-3 border border-teal-100 dark:border-teal-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="text-xs text-teal-800 dark:text-teal-300 font-medium">{tb.vatRecovered}</span>
          </div>
          <span className="text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums">
            {formatCurrency(vatRecoverable)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Shared stat card ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon,
  tooltip,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  tooltip?: import("@/lib/tax-explanations").ConceptKey;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-1 mb-1.5">{icon}</div>
      <p className={`text-sm font-bold tabular-nums leading-tight ${color}`}>
        {formatCurrency(value)}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight flex items-center">
        {label}{tooltip && <TaxTooltip concept={tooltip} />}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FinancialBreakdown({ transactions, snapshot }: FinancialBreakdownProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<"income" | "expense">("income");

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      {/* Tab strip */}
      <div className="flex gap-1 p-1.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <button
          onClick={() => setActiveTab("income")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "income"
              ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          {t.breakdown.incomeTab}
        </button>
        <button
          onClick={() => setActiveTab("expense")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "expense"
              ? "bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          {t.breakdown.expenseTab}
        </button>
      </div>

      {/* Tab content */}
      <div className="px-4 py-4">
        {activeTab === "income" ? (
          <IncomeTab transactions={transactions} snapshot={snapshot} />
        ) : (
          <ExpensesTab transactions={transactions} snapshot={snapshot} />
        )}
      </div>
    </div>
  );
}
