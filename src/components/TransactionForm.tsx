"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { formatCurrency } from "@/lib/tax-engine";
import type { IVARate, TransactionType, ExpenseCategory } from "@/lib/types";

interface TransactionFormProps {
  onClose: () => void;
  defaultType?: TransactionType;
}

export function TransactionForm({ onClose, defaultType = "expense" }: TransactionFormProps) {
  const addTransaction = useKallioStore((s) => s.addTransaction);
  const t = useT();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [ivaRate, setIvaRate] = useState<IVARate>(21);
  const [amountIncludesVAT, setAmountIncludesVAT] = useState(true);
  const [category, setCategory] = useState<ExpenseCategory>("unclear");
  const [isDeductible, setIsDeductible] = useState(true);
  const [error, setError] = useState("");

  const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
    { value: "software_subscriptions", label: t.form.categories.software_subscriptions },
    { value: "hardware_equipment", label: t.form.categories.hardware_equipment },
    { value: "office_supplies", label: t.form.categories.office_supplies },
    { value: "professional_services", label: t.form.categories.professional_services },
    { value: "marketing_advertising", label: t.form.categories.marketing_advertising },
    { value: "travel_transport", label: t.form.categories.travel_transport },
    { value: "meals_entertainment", label: t.form.categories.meals_entertainment },
    { value: "phone_internet", label: t.form.categories.phone_internet },
    { value: "training_education", label: t.form.categories.training_education },
    { value: "home_office", label: t.form.categories.home_office },
    { value: "rent_utilities", label: t.form.categories.rent_utilities },
    { value: "insurance", label: t.form.categories.insurance },
    { value: "bank_fees", label: t.form.categories.bank_fees },
    { value: "other_deductible", label: t.form.categories.other_deductible },
    { value: "personal", label: t.form.categories.personal },
    { value: "unclear", label: t.form.categories.unclear },
  ];

  // Compute live VAT breakdown
  const parsed = parseFloat(amount.replace(",", "."));
  const hasVAT = ivaRate > 0 && !isNaN(parsed) && parsed > 0;

  let netAmount = 0;
  let vatAmount = 0;
  let grossAmount = 0;

  if (hasVAT) {
    if (amountIncludesVAT) {
      // Amount entered IS gross (VAT included)
      grossAmount = parsed;
      netAmount = parsed / (1 + ivaRate / 100);
      vatAmount = parsed - netAmount;
    } else {
      // Amount entered is net (VAT NOT included) → calculate gross
      netAmount = parsed;
      vatAmount = parsed * (ivaRate / 100);
      grossAmount = parsed + vatAmount;
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { setError(t.form.errorDescription); return; }
    if (isNaN(parsed) || parsed <= 0) { setError(t.form.errorAmount); return; }

    // Always store the gross (VAT-inclusive) amount
    const storedAmount = ivaRate > 0 && !amountIncludesVAT ? grossAmount : parsed;

    addTransaction({
      date: new Date(date).toISOString(),
      description: description.trim(),
      merchant: merchant.trim() || undefined,
      amount: storedAmount,
      type,
      ivaRate,
      category,
      isDeductible: type === "income" ? false : isDeductible,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-semibold text-slate-900">{t.form.title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            {(["income", "expense"] as TransactionType[]).map((txType) => (
              <button
                key={txType}
                type="button"
                onClick={() => setType(txType)}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  type === txType
                    ? txType === "income"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-red-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {txType === "income" ? t.form.income : t.form.expense}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.form.descriptionLabel}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "income" ? t.form.descriptionPlaceholderIncome : t.form.descriptionPlaceholderExpense}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
            />
          </div>

          {/* Merchant / client */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {type === "income" ? t.form.clientLabel : t.form.supplierLabel}
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder={type === "income" ? t.form.clientPlaceholder : t.form.supplierPlaceholder}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
            />
          </div>

          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.form.amountLabel}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.form.dateLabel}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              />
            </div>
          </div>

          {/* IVA rate */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.form.vatTypeLabel}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([21, 10, 4, 0] as IVARate[]).map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setIvaRate(rate)}
                  className={`py-2 rounded-xl text-sm font-medium transition-all border ${
                    ivaRate === rate
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {rate === 0 ? t.form.vatExempt : `${rate}%`}
                </button>
              ))}
            </div>
          </div>

          {/* VAT inclusion toggle — only shown when IVA rate > 0 */}
          {ivaRate > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                {t.form.vatIncludedLabel}
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAmountIncludesVAT(true)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    amountIncludesVAT
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.form.vatIncludedYes}
                </button>
                <button
                  type="button"
                  onClick={() => setAmountIncludesVAT(false)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    !amountIncludesVAT
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.form.vatIncludedNo}
                </button>
              </div>

              {/* Live VAT breakdown */}
              {hasVAT && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-200">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t.form.vatBreakdownNet}</span>
                    <span className="tabular-nums font-medium">{formatCurrency(netAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t.form.vatBreakdownVat} ({ivaRate}%)</span>
                    <span className="tabular-nums font-medium text-amber-600">{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-900 border-t border-slate-200 pt-1.5">
                    <span>{t.form.vatBreakdownTotal}</span>
                    <span className="tabular-nums">{formatCurrency(grossAmount)}</span>
                  </div>
                  {!amountIncludesVAT && (
                    <p className="text-xs text-slate-400 pt-0.5">{t.form.vatBreakdownNote}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Category (expenses only) */}
          {type === "expense" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.form.categoryLabel}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Deductible toggle (expenses only) */}
          {type === "expense" && category !== "personal" && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-800">{t.form.deductibleLabel}</p>
                <p className="text-xs text-slate-500">
                  {isDeductible ? t.form.deductibleYes : t.form.deductibleNo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeductible(!isDeductible)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isDeductible ? "bg-teal-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isDeductible ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            {t.form.submitButton}
          </button>
        </form>
      </div>
    </div>
  );
}
