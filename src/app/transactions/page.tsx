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

const C = {
  BG: '#fdfaf3', INK: '#1a1f2e', MUTED: '#6b6456',
  BORDER: '#e8dfc8', IVA: '#c44536', IRPF: '#d4a017',
  OK: '#5a7a3e', CARD: '#ffffff',
};

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

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '80px 24px 88px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t.transactions.title}</h1>
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
