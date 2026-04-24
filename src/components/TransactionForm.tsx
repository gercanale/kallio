"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Plus, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { formatCurrency, classifyTransaction, netFromGross, ivaAmount, todayInSpain, currentQuarter, calculateTaxSnapshot, quarterOf } from "@/lib/tax-engine";
import type { IVARate, TransactionType, ExpenseCategory, Transaction, TaxSnapshot, ClientLocation } from "@/lib/types";
import { QuarterImpactModal } from "@/components/QuarterImpactModal";

const C = {
  BG: '#fdfaf3', INK: '#1a1f2e', MUTED: '#6b6456',
  BORDER: '#e8dfc8', IVA: '#c44536', IRPF: '#d4a017',
  OK: '#5a7a3e', CARD: '#ffffff',
};

interface TransactionFormProps {
  onClose: () => void;
  defaultType?: TransactionType;
  editTransaction?: Transaction;
}

const CATEGORY_DEDUCTIBILITY: Record<ExpenseCategory, { type: "full" | "partial" | "none" | "unclear"; rate?: number }> = {
  software_subscriptions: { type: "full" },
  hardware_equipment:     { type: "full" },
  office_supplies:        { type: "full" },
  professional_services:  { type: "full" },
  marketing_advertising:  { type: "full" },
  travel_transport:       { type: "partial", rate: 70 },
  meals_entertainment:    { type: "partial", rate: 50 },
  phone_internet:         { type: "partial", rate: 50 },
  training_education:     { type: "full" },
  home_office:            { type: "partial", rate: 30 },
  rent_utilities:         { type: "full" },
  insurance:              { type: "full" },
  bank_fees:              { type: "full" },
  other_deductible:       { type: "full" },
  personal:               { type: "none" },
  unclear:                { type: "unclear" },
};

const PARTIAL_RATES: Record<ExpenseCategory, number> = {
  software_subscriptions: 1, hardware_equipment: 1, office_supplies: 1,
  professional_services: 1, marketing_advertising: 1, travel_transport: 0.7,
  meals_entertainment: 0.5, phone_internet: 0.5, training_education: 1,
  home_office: 0.3, rent_utilities: 1, insurance: 1, bank_fees: 1,
  other_deductible: 1, personal: 0, unclear: 1,
};

// ─── Shared input style helpers ───────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: C.BG, border: `1px solid ${C.BORDER}`, borderRadius: 10,
  padding: '10px 12px', fontSize: 13, color: C.INK,
  fontFamily: 'Inter, sans-serif', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: C.MUTED,
  marginBottom: 6, letterSpacing: '0.04em',
};
const focusOn  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = C.INK; };
const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = C.BORDER; };

export function TransactionForm({ onClose, defaultType = "expense", editTransaction }: TransactionFormProps) {
  const addTransaction    = useKallioStore((s) => s.addTransaction);
  const updateTransaction = useKallioStore((s) => s.updateTransaction);
  const transactions      = useKallioStore((s) => s.transactions);
  const profile           = useKallioStore((s) => s.profile);
  const getQuarterStatus  = useKallioStore((s) => s.getQuarterStatus);
  const t = useT();

  const isEdit = !!editTransaction;

  const [type,          setType]          = useState<TransactionType>(editTransaction?.type ?? defaultType);
  const [description,   setDescription]   = useState(editTransaction?.description ?? "");
  const [merchant,      setMerchant]      = useState(editTransaction?.merchant ?? "");
  const [amount,        setAmount]        = useState(editTransaction ? String(editTransaction.amount) : "");
  const [date,          setDate]          = useState(editTransaction ? editTransaction.date.split("T")[0] : todayInSpain());
  const [ivaRate,       setIvaRate]       = useState<IVARate>(editTransaction?.ivaRate ?? 21);
  const [amountIncludesVAT, setAmountIncludesVAT] = useState(true);
  const [category,      setCategory]      = useState<ExpenseCategory>(editTransaction?.category ?? "unclear");
  const [isDeductible,  setIsDeductible]  = useState(editTransaction?.isDeductible ?? true);
  const [notes,         setNotes]         = useState(editTransaction?.notes ?? "");
  const [currency,      setCurrency]      = useState<string>(editTransaction?.currency ?? "EUR");
  const [clientLocation, setClientLocation] = useState<ClientLocation | undefined>(editTransaction?.clientLocation ?? undefined);
  const [error,         setError]         = useState("");
  const [categoryManuallySet, setCategoryManuallySet] = useState(isEdit);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [fullScreen,    setFullScreen]    = useState(false);

  const [pendingImpact, setPendingImpact] = useState<{
    quarterLabel: string; year: number;
    before: TaxSnapshot; after: TaxSnapshot;
    applyChanges: () => void;
  } | null>(null);

  const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
    { value: "software_subscriptions", label: t.form.categories.software_subscriptions },
    { value: "hardware_equipment",     label: t.form.categories.hardware_equipment },
    { value: "office_supplies",        label: t.form.categories.office_supplies },
    { value: "professional_services",  label: t.form.categories.professional_services },
    { value: "marketing_advertising",  label: t.form.categories.marketing_advertising },
    { value: "travel_transport",       label: t.form.categories.travel_transport },
    { value: "meals_entertainment",    label: t.form.categories.meals_entertainment },
    { value: "phone_internet",         label: t.form.categories.phone_internet },
    { value: "training_education",     label: t.form.categories.training_education },
    { value: "home_office",            label: t.form.categories.home_office },
    { value: "rent_utilities",         label: t.form.categories.rent_utilities },
    { value: "insurance",              label: t.form.categories.insurance },
    { value: "bank_fees",              label: t.form.categories.bank_fees },
    { value: "other_deductible",       label: t.form.categories.other_deductible },
    { value: "personal",               label: t.form.categories.personal },
    { value: "unclear",                label: t.form.categories.unclear },
  ];

  useEffect(() => {
    if (!isEdit) { setCategoryManuallySet(false); setSuggestionDismissed(false); }
  }, [type, isEdit]);

  const isPastQuarter = useMemo(() => {
    if (!editTransaction) return false;
    const txDate = new Date(editTransaction.date);
    const nowQ = currentQuarter(); const nowY = new Date().getFullYear();
    return txDate.getFullYear() < nowY || (txDate.getFullYear() === nowY && currentQuarter(txDate) < nowQ);
  }, [editTransaction]);

  const suggestion = useMemo(() => {
    if (type !== "expense" || description.length <= 3 || categoryManuallySet || suggestionDismissed) return null;
    const result = classifyTransaction(description, merchant);
    return result.confidence === "unclear" ? null : result;
  }, [type, description, merchant, categoryManuallySet, suggestionDismissed]);

  const parsed = parseFloat(amount.replace(",", "."));
  const hasVAT = ivaRate > 0 && !isNaN(parsed) && parsed > 0;
  let netAmount = 0, vatAmount = 0, grossAmount = 0;
  if (hasVAT) {
    if (amountIncludesVAT) {
      grossAmount = parsed; netAmount = parsed / (1 + ivaRate / 100); vatAmount = parsed - netAmount;
    } else {
      netAmount = parsed; vatAmount = parsed * (ivaRate / 100); grossAmount = parsed + vatAmount;
    }
  }

  const fiscalImpact = useMemo(() => {
    if (type !== "expense" || isNaN(parsed) || parsed <= 0 || category === "personal" || !isDeductible) return null;
    const gross = hasVAT ? (amountIncludesVAT ? parsed : parsed + parsed * (ivaRate / 100)) : parsed;
    const partialRate = PARTIAL_RATES[category];
    const vatRec = ivaRate > 0 ? ivaAmount(gross, ivaRate) * partialRate : 0;
    const net = ivaRate > 0 ? netFromGross(gross, ivaRate) : gross;
    return Math.round((vatRec + net * partialRate * 0.2) * 100) / 100;
  }, [type, parsed, category, isDeductible, hasVAT, amountIncludesVAT, ivaRate]);

  const deductibilityInfo = useMemo(() => (type === "expense" ? CATEGORY_DEDUCTIBILITY[category] : null), [type, category]);

  const getCategoryLabel = (cat: ExpenseCategory) => CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { setError(t.form.errorDescription); return; }
    if (isNaN(parsed) || parsed <= 0) { setError(t.form.errorAmount); return; }

    const storedAmount = ivaRate > 0 && !amountIncludesVAT ? grossAmount : parsed;
    const txDate = new Date(date).toISOString();

    const applyEdit = () => {
      if (!editTransaction) return;
      updateTransaction(editTransaction.id, {
        date: txDate, description: description.trim(), merchant: merchant.trim() || undefined,
        amount: storedAmount, type, ivaRate, category,
        isDeductible: type === "income" ? false : isDeductible,
        notes: notes.trim() || undefined,
        currency: currency !== "EUR" ? currency : undefined,
        clientLocation: type === "income" ? clientLocation : undefined,
      });
    };
    const applyAdd = () => {
      addTransaction({
        date: txDate, description: description.trim(), merchant: merchant.trim() || undefined,
        amount: storedAmount, type, ivaRate, category,
        isDeductible: type === "income" ? false : isDeductible,
        notes: notes.trim() || undefined,
        currency: currency !== "EUR" ? currency : undefined,
        clientLocation: type === "income" ? clientLocation : undefined,
      });
    };

    const { quarter: q, year: y } = quarterOf(txDate);
    const status = getQuarterStatus(q, y);

    if (status === "filed") {
      const before = calculateTaxSnapshot(transactions, profile, q, y);
      let simTxs: Transaction[];
      if (isEdit && editTransaction) {
        simTxs = transactions.map((tx) =>
          tx.id === editTransaction.id
            ? { ...tx, date: txDate, amount: storedAmount, type, ivaRate, category, isDeductible: type === "income" ? false : isDeductible }
            : tx
        );
      } else {
        simTxs = [{ id: "__pending__", date: txDate, description: description.trim(), merchant: merchant.trim() || undefined, amount: storedAmount, type, ivaRate, category, isDeductible: type === "income" ? false : isDeductible, confidence: "high", deductionPromptShown: false, deductionPromptAnswered: false, currency: currency !== "EUR" ? currency : undefined }, ...transactions];
      }
      const after = calculateTaxSnapshot(simTxs, profile, q, y);
      const quarterLabels = ["1T", "2T", "3T", "4T"];
      setPendingImpact({ quarterLabel: quarterLabels[q - 1], year: y, before, after, applyChanges: () => { if (isEdit && editTransaction) applyEdit(); else applyAdd(); onClose(); } });
      return;
    }

    if (isEdit && editTransaction) applyEdit(); else applyAdd();
    onClose();
  };

  const selectedDate = date ? new Date(date) : null;
  const selectedQY   = selectedDate ? quarterOf(selectedDate) : null;
  const selectedQuarterStatus = selectedQY ? getQuarterStatus(selectedQY.quarter, selectedQY.year) : "open";
  const quarterLabels = ["1T", "2T", "3T", "4T"];
  const selectedQuarterLabel = selectedQY ? `${quarterLabels[selectedQY.quarter - 1]} ${selectedQY.year}` : "";

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

      {/* Backdrop */}
      {!fullScreen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(26,31,46,0.4)' }}
          onClick={onClose}
        />
      )}

      {/* Side panel */}
      <div
        className={`fixed top-0 bottom-0 right-0 z-50 flex flex-col ${fullScreen ? "lg:left-56 left-0" : "w-full sm:w-[440px]"}`}
        style={{ background: C.CARD, borderLeft: `1px solid ${C.BORDER}`, boxShadow: '-4px 0 32px rgba(26,31,46,0.1)', fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.BORDER}`, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.INK, margin: 0 }}>
            {isEdit ? t.form.editTitle : t.form.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconBtn onClick={() => setFullScreen((f) => !f)} title={fullScreen ? "Panel" : "Pantalla completa"}>
              {fullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </IconBtn>
            <IconBtn onClick={onClose}>
              <X size={15} />
            </IconBtn>
          </div>
        </div>

        {/* Scrollable form */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={fullScreen ? { maxWidth: 640, margin: '0 auto' } : {}}>
            <form id="tx-form" onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Quarter banner */}
              {selectedQY && selectedQuarterStatus !== "open" && (
                <Banner
                  color={selectedQuarterStatus === "filed" ? "red" : "amber"}
                  text={selectedQuarterStatus === "filed"
                    ? `🔒 ${t.pastQuarter.impactSubtitle.replace("{label}", quarterLabels[(selectedQY.quarter - 1)]).replace("{year}", String(selectedQY.year))}`
                    : `📅 ${t.pastQuarter.pastNotFiledBanner.replace("{label}", quarterLabels[(selectedQY.quarter - 1)]).replace("{year}", String(selectedQY.year))}`
                  }
                />
              )}
              {isEdit && isPastQuarter && selectedQuarterStatus === "open" && (
                <Banner color="amber" text={t.form.pastQuarterWarning} />
              )}

              {/* Type toggle */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 4, background: C.BG, borderRadius: 12, border: `1px solid ${C.BORDER}` }}>
                  {(["income", "expense"] as TransactionType[]).map((txType) => (
                    <button
                      key={txType}
                      type="button"
                      onClick={() => setType(txType)}
                      style={{
                        padding: '9px 0', borderRadius: 8, border: 'none',
                        fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'background 0.15s, color 0.15s',
                        background: type === txType ? (txType === "income" ? C.OK : C.IVA) : 'transparent',
                        color: type === txType ? 'white' : C.MUTED,
                      }}
                    >
                      {txType === "income" ? t.form.incomeTypeLabel : t.form.expenseTypeLabel}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: C.MUTED, textAlign: 'center', marginTop: 6 }}>
                  {type === "income" ? t.form.incomeTypeHint : t.form.expenseTypeHint}
                </p>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>{t.form.descriptionLabel}</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === "income" ? t.form.descriptionPlaceholderIncome : t.form.descriptionPlaceholderExpense}
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
                {suggestion && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#eef3eb', border: `1px solid #c8ddc0`, borderRadius: 10 }}>
                    <Sparkles size={13} style={{ color: C.OK, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#3d5a29', flex: 1 }}>
                      <strong>{t.form.autoDetectedLabel}</strong>{" "}{getCategoryLabel(suggestion.category)}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setCategory(suggestion.category); setCategoryManuallySet(true); setSuggestionDismissed(true); }}
                      style={{ fontSize: 12, fontWeight: 600, color: C.OK, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
                    >
                      {t.form.autoDetectUse}
                    </button>
                  </div>
                )}
              </div>

              {/* Merchant / client */}
              <div>
                <label style={labelStyle}>{type === "income" ? t.form.clientLabel : t.form.supplierLabel}</label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder={type === "income" ? t.form.clientPlaceholder : t.form.supplierPlaceholder}
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              {/* Client location — income only */}
              {type === "income" && (
                <div>
                  <label style={labelStyle}>{t.form.clientLocationLabel}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(["spain_eu", "non_eu"] as ClientLocation[]).map((loc) => (
                      <ToggleBtn
                        key={loc}
                        selected={clientLocation === loc}
                        onClick={() => setClientLocation(clientLocation === loc ? undefined : loc)}
                        label={loc === "spain_eu" ? t.form.clientLocationSpainEU : t.form.clientLocationNonEU}
                      />
                    ))}
                  </div>
                  {clientLocation === "non_eu" && (
                    <div style={{ marginTop: 8 }}>
                      <Banner color="green" text={t.form.clientLocationNonEUNote} />
                    </div>
                  )}
                </div>
              )}

              {/* Amount + Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t.form.amountLabel}</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" min="0" step="0.01"
                    style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t.form.dateLabel}</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                  />
                </div>
              </div>

              {/* IVA rate */}
              <div>
                <label style={labelStyle}>{t.form.vatTypeLabel}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {([21, 10, 4, 0] as IVARate[]).map((rate) => (
                    <ToggleBtn
                      key={rate}
                      selected={ivaRate === rate}
                      onClick={() => setIvaRate(rate)}
                      label={rate === 0 ? t.form.vatExempt : `${rate}%`}
                    />
                  ))}
                </div>
              </div>

              {/* VAT inclusion toggle */}
              {ivaRate > 0 && (
                <div>
                  <label style={labelStyle}>{t.form.vatIncludedLabel}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 4, background: C.BG, borderRadius: 10, border: `1px solid ${C.BORDER}` }}>
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setAmountIncludesVAT(val)}
                        style={{
                          padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 500,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
                          background: amountIncludesVAT === val ? C.CARD : 'transparent',
                          color: amountIncludesVAT === val ? C.INK : C.MUTED,
                          boxShadow: amountIncludesVAT === val ? '0 1px 4px rgba(26,31,46,0.08)' : 'none',
                        }}
                      >
                        {val ? t.form.vatIncludedYes : t.form.vatIncludedNo}
                      </button>
                    ))}
                  </div>

                  {hasVAT && (
                    <div style={{ marginTop: 8, background: C.BG, border: `1px solid ${C.BORDER}`, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { label: t.form.vatBreakdownNet, value: formatCurrency(netAmount), color: C.INK },
                        { label: `${t.form.vatBreakdownVat} (${ivaRate}%)`, value: formatCurrency(vatAmount), color: C.IRPF },
                        { label: t.form.vatBreakdownTotal, value: formatCurrency(grossAmount), color: C.INK, bold: true },
                      ].map(({ label, value, color, bold }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: C.MUTED }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: bold ? 700 : 500, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                        </div>
                      ))}
                      {!amountIncludesVAT && (
                        <p style={{ fontSize: 11, color: C.MUTED, marginTop: 2 }}>{t.form.vatBreakdownNote}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Currency — expense only */}
              {type === "expense" && (
                <div>
                  <label style={labelStyle}>{t.form.currencyLabel}</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {["EUR", "USD", "GBP", "CHF"].map((cur) => (
                      <ToggleBtn
                        key={cur}
                        selected={currency === cur}
                        onClick={() => setCurrency(cur)}
                        label={cur}
                        small
                      />
                    ))}
                  </div>
                  {currency !== "EUR" && (
                    <div style={{ marginTop: 8 }}>
                      <Banner color="amber" text={`💱 ${t.form.currencyNote.replace("{{currency}}", currency)}`} />
                    </div>
                  )}
                  {currency !== "EUR" && category === "training_education" && ivaRate > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <Banner color="blue" text={t.form.vatHintInternational} />
                    </div>
                  )}
                </div>
              )}

              {/* Category */}
              <div style={{ visibility: type !== "expense" ? 'hidden' : 'visible' }}>
                <label style={labelStyle}>{t.form.categoryLabel}</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value as ExpenseCategory); setCategoryManuallySet(true); setSuggestionDismissed(true); }}
                  disabled={type !== "expense"}
                  style={{ ...inputStyle, appearance: 'auto' }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>

                {deductibilityInfo && (
                  <div style={{ marginTop: 8 }}>
                    {deductibilityInfo.type === "full"    && <Badge color="green">{t.form.categoryHintFull}</Badge>}
                    {deductibilityInfo.type === "partial" && <Badge color="amber">{deductibilityInfo.rate}% deducible</Badge>}
                    {deductibilityInfo.type === "none"    && <Badge color="red">{t.form.categoryHintNone}</Badge>}
                    {deductibilityInfo.type === "unclear" && <Badge color="muted">{t.form.categoryHintUnclear}</Badge>}
                    {category === "unclear" && (
                      <p style={{ fontSize: 11, color: C.MUTED, marginTop: 6 }}>{t.form.categoryHintUnclearNote}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Deductible toggle */}
              <div style={{ visibility: type !== "expense" || category === "personal" ? 'hidden' : 'visible' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.BG, borderRadius: 10, border: `1px solid ${C.BORDER}` }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: C.INK, margin: 0 }}>{t.form.deductibleLabel}</p>
                    <p style={{ fontSize: 11, color: C.MUTED, margin: '2px 0 0' }}>
                      {isDeductible ? t.form.deductibleYes : t.form.deductibleNo}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeductible(!isDeductible)}
                    disabled={type !== "expense"}
                    style={{
                      position: 'relative', width: 40, height: 22, borderRadius: 999,
                      border: 'none', cursor: 'pointer', transition: 'background 0.2s', padding: 0,
                      background: isDeductible ? C.OK : C.BORDER,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
                      background: C.CARD, boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s',
                      left: isDeductible ? 21 : 3,
                    }} />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>{t.form.notesLabel}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.form.notesPlaceholder}
                  rows={2}
                  style={{ ...inputStyle, resize: 'none' }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              {/* Fiscal impact */}
              {fiscalImpact !== null && fiscalImpact > 0 && (
                <Banner color="green" text={`${t.form.impactLabel} ${formatCurrency(fiscalImpact)}`} />
              )}

            </form>
          </div>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, borderTop: `1px solid ${C.BORDER}`, padding: '14px 20px' }}>
          <div style={fullScreen ? { maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 } : { display: 'flex', flexDirection: 'column', gap: 8 }}>
            {error && (
              <p style={{ fontSize: 12, color: C.IVA, background: '#fdf0ee', border: `1px solid #f5cdc8`, borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              form="tx-form"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', background: C.INK, color: 'white',
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Plus size={16} />
              {isEdit ? t.form.saveButton : t.form.submitButton}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function IconBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, border: 'none', cursor: 'pointer',
        background: hovered ? '#f0e8d3' : 'transparent', color: C.MUTED,
      }}
    >
      {children}
    </button>
  );
}

function ToggleBtn({ selected, onClick, label, small }: { selected: boolean; onClick: () => void; label: string; small?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: small ? '6px 12px' : '8px 0',
        borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 500,
        border: `1px solid ${selected ? C.INK : hovered ? '#c8bfa8' : C.BORDER}`,
        background: selected ? '#f5f0e8' : C.CARD,
        color: selected ? C.INK : C.MUTED,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function Badge({ color, children }: { color: "green" | "amber" | "red" | "muted"; children: React.ReactNode }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    green: { bg: '#eef3eb', color: '#3d5a29', border: '#c8ddc0' },
    amber: { bg: '#fdf6e3', color: '#7a5a0a', border: '#e8d4a0' },
    red:   { bg: '#fdf0ee', color: C.IVA,    border: '#f5cdc8' },
    muted: { bg: '#f5f0e8', color: C.MUTED,  border: C.BORDER  },
  };
  const s = styles[color];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {children}
    </span>
  );
}

function Banner({ color, text }: { color: "green" | "amber" | "red" | "blue"; text: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    green: { bg: '#eef3eb', color: '#3d5a29', border: '#c8ddc0' },
    amber: { bg: '#fdf6e3', color: '#7a5a0a', border: '#e8d4a0' },
    red:   { bg: '#fdf0ee', color: C.IVA,    border: '#f5cdc8' },
    blue:  { bg: '#e8f0f3', color: '#1e5a6b', border: '#b8d4dc' },
  };
  const s = styles[color];
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10, fontSize: 12, lineHeight: 1.6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {text}
    </div>
  );
}
