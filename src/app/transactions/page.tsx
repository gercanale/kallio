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
import {
  getBucketsForActivity,
  GROUPS,
  groupBuckets,
  priceRangeLabel,
  deductibilityLabel,
  type GastoBucket,
} from "@/lib/gastos-data";

const C = {
  BG: '#fdfaf3', INK: '#1a1f2e', MUTED: '#6b6456',
  BORDER: '#e8dfc8', IVA: '#c44536', IRPF: '#d4a017',
  OK: '#5a7a3e', CARD: '#ffffff',
};

// Green = high deductibility (favorable), amber/orange = partial, muted = low
function deductibilityColor(pct: number): string {
  if (pct >= 90) return '#3a7d2e'; // strong green
  if (pct >= 65) return '#5a7a3e'; // olive green
  if (pct >= 40) return '#c09820'; // amber
  if (pct >= 15) return '#b87830'; // orange
  return '#8b6045';                 // muted brown
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  software_subscriptions: { bg: '#eef3eb', color: '#3d5a29' },
  hardware_equipment: { bg: '#f0ede8', color: '#4a3f35' },
  professional_services: { bg: '#eef3eb', color: '#3d5a29' },
  marketing_advertising: { bg: '#fdf0ee', color: '#8b2a1e' },
  travel_transport: { bg: '#fdf6e3', color: '#7a5a0a' },
  meals_entertainment: { bg: '#fdf3e8', color: '#8b5a20' },
  phone_internet: { bg: '#e8f0f3', color: '#1e5a6b' },
  training_education: { bg: '#eef3eb', color: '#3d5a29' },
  other_deductible: { bg: '#eef3eb', color: '#3d5a29' },
  personal: { bg: '#fdf0ee', color: '#c44536' },
  unclear: { bg: '#fdf7e3', color: '#7a6020' },
};

// Category mapping for bucket → transaction category
const BUCKET_CATEGORY_MAP: Record<string, Transaction["category"]> = {
  internet_casa:      'phone_internet',
  movil_datos:        'phone_internet',
  software_dev:       'software_subscriptions',
  software_general:   'software_subscriptions',
  adobe_cc:           'software_subscriptions',
  hosting_dominios:   'software_subscriptions',
  coworking:          'home_office',
  alquiler_oficina:   'home_office',
  suministros_oficina:'home_office',
  ordenador:          'hardware_equipment',
  monitor:            'hardware_equipment',
  silla_ergonomica:   'hardware_equipment',
  perifericos:        'hardware_equipment',
  camara:             'hardware_equipment',
  tablet:             'hardware_equipment',
  cursos_online:      'training_education',
  libros_tecnicos:    'training_education',
  conferencias:       'training_education',
  gestoria:           'professional_services',
  cuota_autonomos:    'professional_services',
  seguro_rc:          'insurance',
  cuenta_bancaria:    'bank_fees',
  ai_tools:           'software_subscriptions',
};

export default function TransactionsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const transactions = useKallioStore((s) => s.transactions);
  const t = useT();

  const [activeTab, setActiveTab] = useState<"movimientos" | "gastos">("movimientos");
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
      <div style={{ minHeight: '100dvh', background: C.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${C.IVA}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK }}>
      <Navigation />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 88px', boxSizing: 'border-box' }}>
        {/* Header */}
        {activeTab === "movimientos" ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t.transactions.title}</h1>
              <button
                onClick={() => setActiveTab("gastos")}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: C.MUTED, fontFamily: 'inherit',
                  padding: 0, display: 'flex', alignItems: 'center', gap: 4,
                  textDecoration: 'none',
                }}
              >
                {t.transactions.tabGastosTipicos}
                <span style={{ fontSize: 11 }}>›</span>
              </button>
            </div>
            <button
              onClick={() => openForm("expense")}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: C.INK, color: 'white', border: 'none',
                borderRadius: 10, padding: '10px 16px', fontSize: 14,
                fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Plus size={16} />
              {t.transactions.addButton}
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <button
                onClick={() => setActiveTab("movimientos")}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: C.MUTED, fontFamily: 'inherit', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ fontSize: 14 }}>‹</span>
                {t.transactions.title}
              </button>
              <span style={{ fontSize: 13, color: C.BORDER }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.INK }}>
                {t.transactions.tabGastosTipicos}
              </span>
            </div>
          </div>
        )}

        {activeTab === "movimientos" && (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 24 }}>
              <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <TrendingUp size={13} style={{ color: C.OK, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.transactions.incomeLabel}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.OK, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <TrendingDown size={13} style={{ color: C.IVA, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.transactions.expenseLabel}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.IVA, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
              <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <Sparkles size={13} style={{ color: C.IRPF, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.transactions.deductibleLabel}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.INK, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {deductibleCount}
                </p>
              </div>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 4, padding: 4, background: '#f0e8d3', borderRadius: 12, marginBottom: 16 }}>
              {(["all", "income", "expense"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, border: 'none',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
                    background: filter === f ? C.CARD : 'transparent',
                    color: filter === f ? C.INK : C.MUTED,
                  }}
                >
                  {f === "all" ? t.transactions.filterAll : f === "income" ? t.transactions.filterIncome : t.transactions.filterExpense}
                </button>
              ))}
            </div>

            {/* Quick add buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => openForm("income")}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 0', background: C.OK, color: 'white', border: 'none',
                  borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <ArrowUpRight size={16} />
                {t.transactions.addIncome}
              </button>
              <button
                onClick={() => openForm("expense")}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 0', background: C.IVA, color: 'white', border: 'none',
                  borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <ArrowDownLeft size={16} />
                {t.transactions.addExpense}
              </button>
            </div>

            {/* Transaction list */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: C.MUTED }}>
                <Filter size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: 14, margin: 0 }}>{t.transactions.emptyTitle}</p>
                <p style={{ fontSize: 12, margin: '4px 0 0' }}>{t.transactions.emptySubtitle}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          </>
        )}

        {activeTab === "gastos" && <GastosTipicosPanel />}
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

// ─── GastosTipicosPanel ───────────────────────────────────────────────────────

function GastosTipicosPanel() {
  const t = useT();
  const gt = t.transactions.gt;

  const wizardProfile      = useKallioStore((s) => s.wizardProfile);
  const activatedBuckets   = useKallioStore((s) => s.activatedBuckets);
  const setActivatedBucket = useKallioStore((s) => s.setActivatedBucket);
  const customBuckets      = useKallioStore((s) => s.customBuckets);
  const hiddenBucketIds    = useKallioStore((s) => s.hiddenBucketIds);
  const addCustomBucket    = useKallioStore((s) => s.addCustomBucket);
  const hideBucket         = useKallioStore((s) => s.hideBucket);
  const removeCustomBucket = useKallioStore((s) => s.removeCustomBucket);
  const updateCustomBucket = useKallioStore((s) => s.updateCustomBucket);
  const bucketOverrides    = useKallioStore((s) => s.bucketOverrides);
  const setBucketOverride  = useKallioStore((s) => s.setBucketOverride);
  const addTransaction     = useKallioStore((s) => s.addTransaction);

  // Activation modal state
  const [activatingBucket, setActivatingBucket] = useState<GastoBucket | null>(null);
  const [modalAmount, setModalAmount] = useState("");
  const [modalPct, setModalPct] = useState("");

  // Edit modal state
  const [editingBucket, setEditingBucket] = useState<GastoBucket | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPct, setEditPct] = useState("");

  // Delete confirm state (id of bucket pending confirmation)
  const [deletingBucketId, setDeletingBucketId] = useState<string | null>(null);

  // Custom add form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  const activity = wizardProfile?.activity ?? null;
  const baseBuckets = getBucketsForActivity(activity).filter(
    (b) => !hiddenBucketIds.includes(b.id)
  );
  const allBuckets = [...baseBuckets, ...customBuckets];

  // Group standard buckets; custom buckets will appear separately at end
  const grouped = groupBuckets(baseBuckets);

  const isActive = (b: GastoBucket) => b.id in activatedBuckets;

  const isCustom = (b: GastoBucket) => b.id.startsWith('custom_');

  // Apply label/amount overrides for standard buckets
  const display = (b: GastoBucket): GastoBucket => {
    const ov = bucketOverrides[b.id];
    return ov ? { ...b, label: ov.label, defaultAmount: ov.defaultAmount } : b;
  };

  const suggestedPct = (bucket: GastoBucket) =>
    bucket.deductibility === 'full' ? 100 : Math.round((bucket.partialRate ?? 0.5) * 100);

  const handleToggle = (bucket: GastoBucket) => {
    if (deletingBucketId) { setDeletingBucketId(null); return; }
    if (isActive(bucket)) {
      setActivatedBucket(bucket.id, null);
    } else {
      const d = display(bucket);
      setModalAmount(String(d.defaultAmount || ""));
      setModalPct(String(suggestedPct(bucket)));
      setActivatingBucket(d);
    }
  };

  const handleOpenEdit = (bucket: GastoBucket) => {
    const d = display(bucket);
    setEditLabel(d.label);
    setEditAmount(String(d.defaultAmount || ""));
    setEditPct(String(suggestedPct(bucket)));
    setEditingBucket(bucket);
  };

  const handleEditSave = () => {
    if (!editingBucket) return;
    const newLabel = editLabel.trim() || display(editingBucket).label;
    const newAmount = parseFloat(editAmount) || display(editingBucket).defaultAmount;
    const newPct = Math.min(100, Math.max(0, parseFloat(editPct) || suggestedPct(editingBucket)));
    if (isCustom(editingBucket)) {
      updateCustomBucket(editingBucket.id, { label: newLabel, defaultAmount: newAmount });
    } else {
      setBucketOverride(editingBucket.id, { label: newLabel, defaultAmount: newAmount });
    }
    // Update activated amount if active
    if (isActive(editingBucket)) {
      setActivatedBucket(editingBucket.id, newAmount);
    }
    setEditingBucket(null);
  };

  const handleDeleteBucket = (bucket: GastoBucket) => {
    if (isCustom(bucket)) {
      removeCustomBucket(bucket.id);
    } else {
      hideBucket(bucket.id);
      if (isActive(bucket)) setActivatedBucket(bucket.id, null);
    }
    setDeletingBucketId(null);
  };

  const handleModalConfirm = () => {
    if (!activatingBucket) return;
    const amount = parseFloat(modalAmount) || activatingBucket.defaultAmount || 0;
    const pct = Math.min(100, Math.max(0, parseFloat(modalPct) || suggestedPct(activatingBucket)));
    addTransaction({
      type: "expense",
      description: activatingBucket.label,
      merchant: activatingBucket.label,
      amount,
      ivaRate: 21,
      isDeductible: true,
      deductibilityRate: pct / 100,
      category: BUCKET_CATEGORY_MAP[activatingBucket.id] ?? 'other_deductible',
      date: new Date().toISOString(),
    });
    setActivatedBucket(activatingBucket.id, amount);
    setActivatingBucket(null);
    setModalAmount("");
    setModalPct("");
  };

  const handleCustomAdd = () => {
    const label = customLabel.trim();
    const amount = parseFloat(customAmount);
    if (!label || isNaN(amount) || amount <= 0) return;

    const newBucket: GastoBucket = {
      id: `custom_${Date.now()}`,
      group: 'digital',
      groupDesc: '',
      label,
      priceRangeLow: amount,
      priceRangeHigh: amount,
      unit: 'mes',
      defaultAmount: amount,
      deductibility: 'full',
      activities: 'all',
    };

    addCustomBucket(newBucket);
    addTransaction({
      type: "expense",
      description: label,
      merchant: label,
      amount,
      ivaRate: 21,
      isDeductible: true,
      category: 'other_deductible',
      date: new Date().toISOString(),
    });

    setCustomLabel("");
    setCustomAmount("");
    setShowCustomForm(false);
  };

  const allHidden = allBuckets.length === 0;

  return (
    <div>
      {allHidden && !showCustomForm && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.MUTED }}>
          <p style={{ fontSize: 14, margin: 0 }}>{gt.emptyHidden}</p>
        </div>
      )}

      {/* Standard grouped buckets */}
      {GROUPS.map((group) => {
        const items = grouped.get(group.id) ?? [];
        if (items.length === 0) return null;

        return (
          <div key={group.id} style={{ marginBottom: 20 }}>
            {/* Group header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '10px 0 8px', borderBottom: `1px solid ${C.BORDER}`,
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.INK }}>{group.label}</span>
                <span style={{ fontSize: 11, color: C.MUTED, marginLeft: 8 }}>{group.desc}</span>
              </div>
              <span style={{ fontSize: 11, color: C.MUTED, fontWeight: 600 }}>
                {items.filter(b => isActive(b)).length}/{items.length}
              </span>
            </div>

            {/* Items */}
            <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
              {items.map((bucket, idx) => {
                const d = display(bucket);
                const active = isActive(bucket);
                const isLast = idx === items.length - 1;
                const confirmDelete = deletingBucketId === bucket.id;

                return (
                  <div
                    key={bucket.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 16px',
                      borderBottom: isLast ? 'none' : `1px solid ${C.BORDER}`,
                      background: active ? '#fafdf8' : C.CARD,
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Toggle */}
                    <Tip label={active ? gt.removeTooltip : gt.addedBadge}>
                      <BucketToggle on={active} onChange={() => handleToggle(bucket)} />
                    </Tip>

                    {/* Label */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: active ? C.INK : C.MUTED }}>
                          {d.label}
                        </span>
                        {active && (
                          <span style={{
                            fontSize: 10, background: '#eef3eb', color: C.OK,
                            borderRadius: 999, padding: '1px 7px', fontWeight: 600,
                          }}>
                            {gt.addedBadge}
                          </span>
                        )}
                        {bucket.hint && (
                          <Tip label={bucket.hint}>
                            <HelpCircle size={12} style={{ color: C.BORDER, cursor: 'help', flexShrink: 0 }} />
                          </Tip>
                        )}
                      </div>
                    </div>

                    {/* Price range */}
                    <div style={{ fontSize: 11, color: C.MUTED, textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {priceRangeLabel(d)}
                    </div>

                    {/* Deductibility badge */}
                    <div style={{
                      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                      color: deductibilityColor(bucket.deductibility === 'full' ? 100 : Math.round((bucket.partialRate ?? 0.5) * 100)),
                      minWidth: 36, textAlign: 'right',
                    }}>
                      {deductibilityLabel(bucket)}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      {confirmDelete ? (
                        <>
                          <Tip label={t.common.cancel}>
                            <IconBtn onClick={() => setDeletingBucketId(null)}><X size={13} /></IconBtn>
                          </Tip>
                          <Tip label={t.actions.delete}>
                            <IconBtn onClick={() => handleDeleteBucket(bucket)} activeStyle={{ color: C.IVA }}>
                              <Trash2 size={13} />
                            </IconBtn>
                          </Tip>
                        </>
                      ) : (
                        <>
                          <Tip label={t.actions.edit}>
                            <IconBtn onClick={() => handleOpenEdit(bucket)}><Pencil size={13} /></IconBtn>
                          </Tip>
                          <Tip label={t.actions.delete}>
                            <IconBtn onClick={() => setDeletingBucketId(bucket.id)}><Trash2 size={13} /></IconBtn>
                          </Tip>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Custom buckets */}
      {customBuckets.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '10px 0 8px', borderBottom: `1px solid ${C.BORDER}`,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.INK }}>Personalizados</span>
          </div>
          <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            {customBuckets.map((bucket, idx) => {
              const active = isActive(bucket);
              const isLast = idx === customBuckets.length - 1;
              const confirmDelete = deletingBucketId === bucket.id;
              return (
                <div
                  key={bucket.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px',
                    borderBottom: isLast ? 'none' : `1px solid ${C.BORDER}`,
                    background: active ? '#fafdf8' : C.CARD,
                    transition: 'background 0.15s',
                  }}
                >
                  <Tip label={active ? gt.removeTooltip : gt.addedBadge}>
                    <BucketToggle on={active} onChange={() => handleToggle(bucket)} />
                  </Tip>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: active ? C.INK : C.MUTED }}>
                      {bucket.label}
                    </span>
                    {active && (
                      <span style={{
                        fontSize: 10, background: '#eef3eb', color: C.OK,
                        borderRadius: 999, padding: '1px 7px', fontWeight: 600, marginLeft: 6,
                      }}>
                        {gt.addedBadge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.MUTED, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    €{bucket.defaultAmount}/mes
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: deductibilityColor(100), minWidth: 36, textAlign: 'right', flexShrink: 0 }}>
                    100%
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {confirmDelete ? (
                      <>
                        <Tip label={t.common.cancel}>
                          <IconBtn onClick={() => setDeletingBucketId(null)}><X size={13} /></IconBtn>
                        </Tip>
                        <Tip label={t.actions.delete}>
                          <IconBtn onClick={() => handleDeleteBucket(bucket)} activeStyle={{ color: C.IVA }}>
                            <Trash2 size={13} />
                          </IconBtn>
                        </Tip>
                      </>
                    ) : (
                      <>
                        <Tip label={t.actions.edit}>
                          <IconBtn onClick={() => handleOpenEdit(bucket)}><Pencil size={13} /></IconBtn>
                        </Tip>
                        <Tip label={t.actions.delete}>
                          <IconBtn onClick={() => setDeletingBucketId(bucket.id)}><Trash2 size={13} /></IconBtn>
                        </Tip>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom add button / form */}
      {!showCustomForm ? (
        <button
          onClick={() => setShowCustomForm(true)}
          style={{
            width: '100%', padding: '12px 0',
            background: 'transparent', border: `1px dashed ${C.BORDER}`,
            borderRadius: 12, fontSize: 13, fontWeight: 500, color: C.MUTED,
            cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
          }}
        >
          {gt.addCustom} +
        </button>
      ) : (
        <div style={{
          background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 12,
          padding: '16px', marginTop: 4,
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              placeholder={gt.customLabelPlaceholder}
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              style={{
                flex: 1, padding: '8px 12px', border: `1px solid ${C.BORDER}`,
                borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
                background: C.BG, color: C.INK, outline: 'none',
              }}
            />
            <input
              type="number"
              placeholder={gt.customAmountPlaceholder}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              style={{
                width: 110, padding: '8px 12px', border: `1px solid ${C.BORDER}`,
                borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
                background: C.BG, color: C.INK, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowCustomForm(false); setCustomLabel(""); setCustomAmount(""); }}
              style={{
                padding: '8px 16px', border: `1px solid ${C.BORDER}`,
                borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit', background: 'transparent', color: C.MUTED,
              }}
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleCustomAdd}
              style={{
                padding: '8px 16px', background: C.INK, color: 'white',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {gt.customSave}
            </button>
          </div>
        </div>
      )}

      {/* Edit bucket modal */}
      {editingBucket && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(26,31,46,0.45)',
          }}
          onClick={() => setEditingBucket(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.CARD, borderRadius: 16, padding: '24px',
              width: '100%', maxWidth: 360, margin: '0 16px',
              boxShadow: '0 16px 48px rgba(26,31,46,0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.INK, margin: 0 }}>
                {t.actions.edit}
              </p>
              <button
                onClick={() => setEditingBucket(null)}
                title={t.common.cancel}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.MUTED, padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.MUTED, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {gt.customLabelPlaceholder}
            </label>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', border: `1px solid ${C.BORDER}`,
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                background: C.BG, color: C.INK, outline: 'none', marginBottom: 14,
              }}
            />

            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.MUTED, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Importe (€)
            </label>
            <input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', border: `1px solid ${C.BORDER}`,
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                background: C.BG, color: C.INK, outline: 'none', marginBottom: 14,
              }}
            />

            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.MUTED, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              % deducible
            </label>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <input
                type="number"
                min={0}
                max={100}
                value={editPct}
                onChange={(e) => setEditPct(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 36px 10px 14px', border: `1px solid ${C.BORDER}`,
                  borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                  background: C.BG, color: C.INK, outline: 'none',
                }}
              />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.MUTED, pointerEvents: 'none' }}>%</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setEditingBucket(null)}
                title={t.common.cancel}
                style={{
                  flex: 1, padding: '10px 0', border: `1px solid ${C.BORDER}`,
                  borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit', background: 'transparent', color: C.MUTED,
                }}
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleEditSave}
                title={t.common.save}
                style={{
                  flex: 1, padding: '10px 0', background: C.INK, color: 'white',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activation modal */}
      {activatingBucket && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(26,31,46,0.45)',
          }}
          onClick={() => setActivatingBucket(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.CARD, borderRadius: 16, padding: '24px',
              width: '100%', maxWidth: 360, margin: '0 16px',
              boxShadow: '0 16px 48px rgba(26,31,46,0.18)',
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: C.MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
              {gt.activateTitle}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.INK, margin: '0 0 16px' }}>
              {activatingBucket.label}
            </p>

            {/* Amount */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.MUTED, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Importe (€)
            </label>
            <input
              type="number"
              value={modalAmount}
              onChange={(e) => setModalAmount(e.target.value)}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', border: `1px solid ${C.BORDER}`,
                borderRadius: 10, fontSize: 16, fontFamily: 'inherit',
                background: C.BG, color: C.INK, outline: 'none', marginBottom: 14,
              }}
            />

            {/* Deductibility percentage */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.MUTED, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              % deducible
            </label>
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <input
                type="number"
                min={0}
                max={100}
                value={modalPct}
                onChange={(e) => setModalPct(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 36px 10px 14px', border: `1px solid ${C.BORDER}`,
                  borderRadius: 10, fontSize: 16, fontFamily: 'inherit',
                  background: C.BG, color: C.INK, outline: 'none',
                }}
              />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: C.MUTED, pointerEvents: 'none' }}>%</span>
            </div>
            <p style={{ fontSize: 11, color: C.MUTED, margin: '0 0 16px', lineHeight: 1.5 }}>
              {activatingBucket.partialNote
                ? activatingBucket.partialNote
                : activatingBucket.deductibility === 'full'
                  ? '100% deducible · uso exclusivamente profesional'
                  : 'Ajusta según tu uso real profesional'}
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setActivatingBucket(null)}
                style={{
                  flex: 1, padding: '10px 0', border: `1px solid ${C.BORDER}`,
                  borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit', background: 'transparent', color: C.MUTED,
                }}
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleModalConfirm}
                style={{
                  flex: 1, padding: '10px 0', background: C.INK, color: 'white',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {gt.activateConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function BucketToggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        position: 'relative', width: 40, height: 22, borderRadius: 999, border: 'none',
        cursor: 'pointer', flexShrink: 0, padding: 0,
        background: on ? C.OK : C.BORDER,
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
        background: C.CARD, boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        left: on ? 21 : 3, transition: 'left 0.18s',
      }} />
    </button>
  );
}

// ─── TransactionRow ───────────────────────────────────────────────────────────

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
  const catColors = CATEGORY_COLORS[tx.category] ?? { bg: '#f0ede8', color: '#4a3f35' };
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

  return (
    <div style={{
      background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Type icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isIncome ? '#eef3eb' : '#fdf0ee',
      }}>
        {isIncome
          ? <ArrowUpRight size={16} style={{ color: C.OK }} />
          : <ArrowDownLeft size={16} style={{ color: C.IVA }} />}
      </div>

      {/* Description + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tx.merchant ?? tx.description}
          </p>
          {!isIncome && (
            <span style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 500, flexShrink: 0,
              background: catColors.bg, color: catColors.color,
            }}>
              {categoryLabel}
            </span>
          )}
          {!isIncome && tx.isDeductible && (
            <span style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 500, flexShrink: 0,
              background: '#eef3eb', color: C.OK,
            }}>
              {deductibleBadge}
            </span>
          )}
          {!isIncome && tx.confidence === "unclear" && !tx.deductionPromptAnswered && (
            <span style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 500, flexShrink: 0,
              background: '#fdf7e3', color: '#7a6020',
            }}>
              {pendingBadge}
            </span>
          )}
          {tx.reviewed && (
            <span style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 6, fontWeight: 500, flexShrink: 0,
              background: '#eef3eb', color: C.OK,
            }}>
              ✓ Revisado
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: C.MUTED, margin: '2px 0 0' }}>{formatDate(tx.date)}</p>
      </div>

      {/* Amount + VAT */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 700, margin: 0, fontVariantNumeric: 'tabular-nums',
          color: isIncome ? C.OK : C.IVA,
        }}>
          {isIncome ? "+" : "−"}{formatCurrency(tx.amount)}
        </p>
        <p style={{ fontSize: 12, color: C.MUTED, margin: '2px 0 0' }}>{vatLabel} {tx.ivaRate}%</p>
      </div>

      {/* Action icons — desktop: all actions */}
      <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 2, flexShrink: 0 }}>
        {deleteConfirm ? (
          <>
            <Tip label={t.actions.cancel}>
              <IconBtn onClick={() => setDeleteConfirm(false)}><X size={14} /></IconBtn>
            </Tip>
            <Tip label={t.actions.delete}>
              <IconBtn onClick={() => deleteTransaction(tx.id)} activeStyle={{ background: C.IVA, color: 'white' }}>
                <Trash2 size={14} />
              </IconBtn>
            </Tip>
          </>
        ) : (
          <>
            <Tip label={t.actions.explain ?? "¿Por qué?"}>
              <IconBtn onClick={onExplain}><HelpCircle size={14} /></IconBtn>
            </Tip>
            <Tip label={t.actions.edit}>
              <IconBtn onClick={onEdit}><Pencil size={14} /></IconBtn>
            </Tip>
            <Tip label={t.actions.duplicate}>
              <IconBtn onClick={() => duplicateTransaction(tx.id)}><Copy size={14} /></IconBtn>
            </Tip>
            <Tip label={tx.reviewed ? t.actions.markPending : t.actions.markReviewed}>
              <IconBtn onClick={() => markReviewed(tx.id, !tx.reviewed)} activeStyle={tx.reviewed ? { color: C.OK } : undefined}>
                {tx.reviewed ? <Clock size={14} /> : <CheckCircle size={14} />}
              </IconBtn>
            </Tip>
            <Tip label={tx.attachmentName ? t.actions.viewAttachment : t.actions.attachment}>
              <IconBtn
                onClick={() => tx.attachmentName && tx.attachmentData ? window.open(tx.attachmentData, "_blank") : fileInputRef.current?.click()}
                activeStyle={tx.attachmentName ? { color: C.OK } : undefined}
              >
                <Paperclip size={14} />
              </IconBtn>
            </Tip>
            <Tip label={t.actions.delete}>
              <IconBtn onClick={() => setDeleteConfirm(true)}><Trash2 size={14} /></IconBtn>
            </Tip>
          </>
        )}
      </div>

      {/* Action icons — mobile: edit + delete only */}
      <div className="flex sm:hidden" style={{ alignItems: 'center', gap: 2, flexShrink: 0 }}>
        {deleteConfirm ? (
          <>
            <IconBtn onClick={() => setDeleteConfirm(false)}><X size={14} /></IconBtn>
            <IconBtn onClick={() => deleteTransaction(tx.id)} activeStyle={{ background: C.IVA, color: 'white' }}>
              <Trash2 size={14} />
            </IconBtn>
          </>
        ) : (
          <>
            <IconBtn onClick={onEdit}><Pencil size={14} /></IconBtn>
            <IconBtn onClick={() => setDeleteConfirm(true)}><Trash2 size={14} /></IconBtn>
          </>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

function IconBtn({
  onClick,
  children,
  activeStyle,
}: {
  onClick: () => void;
  children: React.ReactNode;
  activeStyle?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 28, height: 28, borderRadius: 8, border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s, color 0.15s',
        background: hovered ? '#f0ede8' : 'transparent',
        color: C.MUTED,
        ...activeStyle,
      }}
    >
      {children}
    </button>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div title={label}>
      {children}
    </div>
  );
}
