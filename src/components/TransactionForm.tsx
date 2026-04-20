"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Plus, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { formatCurrency, classifyTransaction, netFromGross, ivaAmount, todayInSpain, currentQuarter, calculateTaxSnapshot, quarterOf } from "@/lib/tax-engine";
import type { IVARate, TransactionType, ExpenseCategory, Transaction, TaxSnapshot } from "@/lib/types";
import { QuarterImpactModal } from "@/components/QuarterImpactModal";

interface TransactionFormProps {
  onClose: () => void;
  defaultType?: TransactionType;
  editTransaction?: Transaction;
}

const CATEGORY_DEDUCTIBILITY: Record<ExpenseCategory, { type: "full" | "partial" | "none" | "unclear"; rate?: number }> = {
  software_subscriptions: { type: "full" },
  hardware_equipment: { type: "full" },
  office_supplies: { type: "full" },
  professional_services: { type: "full" },
  marketing_advertising: { type: "full" },
  travel_transport: { type: "partial", rate: 70 },
  meals_entertainment: { type: "partial", rate: 50 },
  phone_internet: { type: "partial", rate: 50 },
  training_education: { type: "full" },
  home_office: { type: "partial", rate: 30 },
  rent_utilities: { type: "full" },
  insurance: { type: "full" },
  bank_fees: { type: "full" },
  other_deductible: { type: "full" },
  personal: { type: "none" },
  unclear: { type: "unclear" },
};

const PARTIAL_RATES: Record<ExpenseCategory, number> = {
  software_subscriptions: 1, hardware_equipment: 1, office_supplies: 1,
  professional_services: 1, marketing_advertising: 1, travel_transport: 0.7,
  meals_entertainment: 0.5, phone_internet: 0.5, training_education: 1,
  home_office: 0.3, rent_utilities: 1, insurance: 1, bank_fees: 1,
  other_deductible: 1, personal: 0, unclear: 1,
};

export function TransactionForm({ onClose, defaultType = "expense", editTransaction }: TransactionFormProps) {
  const addTransaction = useKallioStore((s) => s.addTransaction);
  const updateTransaction = useKallioStore((s) => s.updateTransaction);
  const transactions = useKallioStore((s) => s.transactions);
  const profile = useKallioStore((s) => s.profile);
  const getQuarterStatus = useKallioStore((s) => s.getQuarterStatus);
  const t = useT();

  const isEdit = !!editTransaction;

  const [type, setType] = useState<TransactionType>(editTransaction?.type ?? defaultType);
  const [description, setDescription] = useState(editTransaction?.description ?? "");
  const [merchant, setMerchant] = useState(editTransaction?.merchant ?? "");
  const [amount, setAmount] = useState(editTransaction ? String(editTransaction.amount) : "");
  const [date, setDate] = useState(editTransaction ? editTransaction.date.split("T")[0] : todayInSpain());
  const [ivaRate, setIvaRate] = useState<IVARate>(editTransaction?.ivaRate ?? 21);
  const [amountIncludesVAT, setAmountIncludesVAT] = useState(true);
  const [category, setCategory] = useState<ExpenseCategory>(editTransaction?.category ?? "unclear");
  const [isDeductible, setIsDeductible] = useState(editTransaction?.isDeductible ?? true);
  const [notes, setNotes] = useState(editTransaction?.notes ?? "");
  const [currency, setCurrency] = useState<string>(editTransaction?.currency ?? "EUR");
  const [error, setError] = useState("");
  const [categoryManuallySet, setCategoryManuallySet] = useState(isEdit);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  // Pending impact confirmation for filed quarters
  const [pendingImpact, setPendingImpact] = useState<{
    quarterLabel: string;
    year: number;
    before: TaxSnapshot;
    after: TaxSnapshot;
    applyChanges: () => void;
  } | null>(null);

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

  // Reset manual flag and suggestion when type changes (only for new transactions)
  useEffect(() => {
    if (!isEdit) {
      setCategoryManuallySet(false);
      setSuggestionDismissed(false);
    }
  }, [type, isEdit]);

  // Past quarter warning for edit mode
  const isPastQuarter = useMemo(() => {
    if (!editTransaction) return false;
    const txDate = new Date(editTransaction.date);
    const txYear = txDate.getFullYear();
    const txQuarter = currentQuarter(txDate);
    const nowYear = new Date().getFullYear();
    const nowQuarter = currentQuarter();
    return txYear < nowYear || (txYear === nowYear && txQuarter < nowQuarter);
  }, [editTransaction]);

  // Live auto-suggest
  const suggestion = useMemo(() => {
    if (type !== "expense") return null;
    if (description.length <= 3) return null;
    if (categoryManuallySet) return null;
    if (suggestionDismissed) return null;
    const result = classifyTransaction(description, merchant);
    if (result.confidence === "unclear") return null;
    return result;
  }, [type, description, merchant, categoryManuallySet, suggestionDismissed]);

  // Compute live VAT breakdown
  const parsed = parseFloat(amount.replace(",", "."));
  const hasVAT = ivaRate > 0 && !isNaN(parsed) && parsed > 0;

  let netAmount = 0;
  let vatAmount = 0;
  let grossAmount = 0;

  if (hasVAT) {
    if (amountIncludesVAT) {
      grossAmount = parsed;
      netAmount = parsed / (1 + ivaRate / 100);
      vatAmount = parsed - netAmount;
    } else {
      netAmount = parsed;
      vatAmount = parsed * (ivaRate / 100);
      grossAmount = parsed + vatAmount;
    }
  }

  // Fiscal impact preview
  const fiscalImpact = useMemo(() => {
    if (type !== "expense") return null;
    if (isNaN(parsed) || parsed <= 0) return null;
    if (category === "personal") return null;
    if (!isDeductible) return null;
    const gross = hasVAT ? (amountIncludesVAT ? parsed : parsed + parsed * (ivaRate / 100)) : parsed;
    const partialRate = PARTIAL_RATES[category];
    const vatRec = ivaRate > 0 ? ivaAmount(gross, ivaRate) * partialRate : 0;
    const net = ivaRate > 0 ? netFromGross(gross, ivaRate) : gross;
    const irpfSaving = net * partialRate * 0.2;
    return Math.round((vatRec + irpfSaving) * 100) / 100;
  }, [type, parsed, category, isDeductible, hasVAT, amountIncludesVAT, ivaRate]);

  // Deductibility badge info
  const deductibilityInfo = useMemo(() => {
    if (type !== "expense") return null;
    return CATEGORY_DEDUCTIBILITY[category];
  }, [type, category]);

  const getCategoryLabel = (cat: ExpenseCategory): string => {
    return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { setError(t.form.errorDescription); return; }
    if (isNaN(parsed) || parsed <= 0) { setError(t.form.errorAmount); return; }

    const storedAmount = ivaRate > 0 && !amountIncludesVAT ? grossAmount : parsed;
    const txDate = new Date(date).toISOString();

    // Build the actual update/add functions
    const applyEdit = () => {
      if (!editTransaction) return;
      updateTransaction(editTransaction.id, {
        date: txDate,
        description: description.trim(),
        merchant: merchant.trim() || undefined,
        amount: storedAmount,
        type,
        ivaRate,
        category,
        isDeductible: type === "income" ? false : isDeductible,
        notes: notes.trim() || undefined,
        currency: currency !== "EUR" ? currency : undefined,
      });
    };
    const applyAdd = () => {
      addTransaction({
        date: txDate,
        description: description.trim(),
        merchant: merchant.trim() || undefined,
        amount: storedAmount,
        type,
        ivaRate,
        category,
        isDeductible: type === "income" ? false : isDeductible,
        notes: notes.trim() || undefined,
        currency: currency !== "EUR" ? currency : undefined,
      });
    };

    // Check if the target quarter is filed
    const { quarter: q, year: y } = quarterOf(txDate);
    const status = getQuarterStatus(q, y);

    if (status === "filed") {
      // Compute before snapshot
      const before = calculateTaxSnapshot(transactions, profile, q, y);

      // Compute after snapshot (in-memory simulation)
      let simTxs: Transaction[];
      if (isEdit && editTransaction) {
        simTxs = transactions.map((tx) =>
          tx.id === editTransaction.id
            ? {
                ...tx,
                date: txDate,
                amount: storedAmount,
                type,
                ivaRate,
                category,
                isDeductible: type === "income" ? false : isDeductible,
              }
            : tx
        );
      } else {
        const fakeTx: Transaction = {
          id: "__pending__",
          date: txDate,
          description: description.trim(),
          merchant: merchant.trim() || undefined,
          amount: storedAmount,
          type,
          ivaRate,
          category,
          isDeductible: type === "income" ? false : isDeductible,
          confidence: "high",
          deductionPromptShown: false,
          deductionPromptAnswered: false,
          currency: currency !== "EUR" ? currency : undefined,
        };
        simTxs = [fakeTx, ...transactions];
      }
      const after = calculateTaxSnapshot(simTxs, profile, q, y);

      const quarterLabels = ["1T", "2T", "3T", "4T"];
      setPendingImpact({
        quarterLabel: quarterLabels[q - 1],
        year: y,
        before,
        after,
        applyChanges: () => {
          if (isEdit && editTransaction) applyEdit();
          else applyAdd();
          onClose();
        },
      });
      return;
    }

    // Open or past_not_filed: save normally
    if (isEdit && editTransaction) applyEdit();
    else applyAdd();
    onClose();
  };

  // Quarter context for the selected date
  const selectedDate = date ? new Date(date) : null;
  const selectedQY = selectedDate ? quarterOf(selectedDate) : null;
  const selectedQuarterStatus = selectedQY
    ? getQuarterStatus(selectedQY.quarter, selectedQY.year)
    : "open";
  const quarterLabels = ["1T", "2T", "3T", "4T"];
  const selectedQuarterLabel = selectedQY
    ? `${quarterLabels[selectedQY.quarter - 1]} ${selectedQY.year}`
    : "";

  return (
    <>
    {pendingImpact && (
      <QuarterImpactModal
        quarterLabel={pendingImpact.quarterLabel}
        year={pendingImpact.year}
        before={pendingImpact.before}
        after={pendingImpact.after}
        onConfirm={pendingImpact.applyChanges}
        onCancel={() => setPendingImpact(null)}
      />
    )}
    {/* Backdrop — only in panel (non-fullscreen) mode */}
    {!fullScreen && (
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
    )}

    {/* Side panel */}
    <div
      className={`fixed top-0 bottom-0 right-0 z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out ${
        fullScreen
          ? "lg:left-56 left-0"   // full screen: respect nav on desktop, full on mobile
          : "w-full sm:w-[440px]" // panel: full on mobile, 440px on sm+
      }`}
    >
      {/* Header — pinned */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          {isEdit ? t.form.editTitle : t.form.title}
        </h2>
        <div className="flex items-center gap-1">
          {/* Full-screen toggle */}
          <button
            onClick={() => setFullScreen((f) => !f)}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            title={fullScreen ? "Panel view" : "Full screen"}
          >
            {fullScreen
              ? <Minimize2 className="w-4 h-4 text-slate-500" />
              : <Maximize2 className="w-4 h-4 text-slate-500" />
            }
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Scrollable fields */}
      <div className="flex-1 overflow-y-auto">
        <div className={fullScreen ? "max-w-2xl mx-auto" : ""}>
        <form id="transaction-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Quarter context banner */}
          {selectedQY && selectedQuarterStatus !== "open" && (
            <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${
              selectedQuarterStatus === "filed"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              <span>
                {selectedQuarterStatus === "filed"
                  ? `🔒 ${t.pastQuarter.impactSubtitle
                      .replace("{label}", quarterLabels[(selectedQY.quarter - 1)])
                      .replace("{year}", String(selectedQY.year))}`
                  : `📅 ${t.pastQuarter.pastNotFiledBanner
                      .replace("{label}", quarterLabels[(selectedQY.quarter - 1)])
                      .replace("{year}", String(selectedQY.year))}`
                }
              </span>
            </div>
          )}

          {/* Past quarter edit warning (legacy) */}
          {isEdit && isPastQuarter && selectedQuarterStatus === "open" && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-xs text-amber-800">{t.form.pastQuarterWarning}</span>
            </div>
          )}

          {/* Type toggle */}
          <div>
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
                        : "bg-red-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {txType === "income" ? t.form.incomeTypeLabel : t.form.expenseTypeLabel}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 text-center">
              {type === "income" ? t.form.incomeTypeHint : t.form.expenseTypeHint}
            </p>
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
            {/* Auto-suggest chip */}
            {suggestion && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="text-xs text-teal-800 flex-1">
                  <span className="font-medium">{t.form.autoDetectedLabel}</span>{" "}
                  {getCategoryLabel(suggestion.category)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCategory(suggestion.category);
                    setCategoryManuallySet(true);
                    setSuggestionDismissed(true);
                  }}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors shrink-0"
                >
                  {t.form.autoDetectUse}
                </button>
              </div>
            )}
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

          {/* Currency selector — shown for expenses only */}
          {type === "expense" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.form.currencyLabel}
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {["EUR", "USD", "GBP", "CHF"].map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setCurrency(cur)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      currency === cur
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                        : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
              {currency !== "EUR" && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <span className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    💱 {t.form.currencyNote.replace("{{currency}}", currency)}
                  </span>
                </div>
              )}
              {currency !== "EUR" && category === "training_education" && ivaRate > 0 && (
                <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <span className="text-xs text-blue-800 dark:text-blue-300">
                    {t.form.vatHintInternational}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Category — always rendered; invisible for income to keep layout stable */}
          <div className={type !== "expense" ? "invisible" : ""}>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.form.categoryLabel}
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as ExpenseCategory);
                setCategoryManuallySet(true);
                setSuggestionDismissed(true);
              }}
              disabled={type !== "expense"}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            {deductibilityInfo && (
              <div className="mt-2">
                {deductibilityInfo.type === "full" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {t.form.categoryHintFull}
                  </span>
                )}
                {deductibilityInfo.type === "partial" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    {deductibilityInfo.rate}% deducible
                  </span>
                )}
                {deductibilityInfo.type === "none" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    {t.form.categoryHintNone}
                  </span>
                )}
                {deductibilityInfo.type === "unclear" && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {t.form.categoryHintUnclear}
                  </span>
                )}
                {category === "unclear" && (
                  <p className="text-xs text-slate-500 mt-1.5">{t.form.categoryHintUnclearNote}</p>
                )}
              </div>
            )}
          </div>

          {/* Deductible toggle — always rendered; invisible when not applicable */}
          <div className={type !== "expense" || category === "personal" ? "invisible" : ""}>
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
                disabled={type !== "expense"}
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
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.form.notesLabel}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.form.notesPlaceholder}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none"
            />
          </div>

          {/* Live fiscal impact preview */}
          {fiscalImpact !== null && fiscalImpact > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs text-emerald-800">
                {t.form.impactLabel}{" "}
                <span className="font-semibold">{formatCurrency(fiscalImpact)}</span>
              </span>
            </div>
          )}

        </form>
        </div>
      </div>

      {/* Footer — pinned */}
      <div className={`flex-shrink-0 border-t border-slate-100 dark:border-slate-700 space-y-2 ${fullScreen ? "" : ""}`}>
        <div className={`px-6 pb-5 pt-3 space-y-2 ${fullScreen ? "max-w-2xl mx-auto" : ""}`}>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            form="transaction-form"
            className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            {isEdit ? t.form.saveButton : t.form.submitButton}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
