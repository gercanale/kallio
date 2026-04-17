/**
 * Kallio global state – Zustand store
 * Persisted to localStorage for MVP (no backend yet).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Transaction,
  UserProfile,
  DeductionPrompt,
  ExpenseCategory,
  IVARate,
  TransactionType,
} from "./types";
import type { Locale } from "@/i18n";
import {
  calculateTaxSnapshot,
  classifyTransaction,
  generateDeductionPrompt,
  generateId,
  currentQuarter,
} from "./tax-engine";
import type { TaxSnapshot } from "./types";

// ─── Seed data for demo ────────────────────────────────────────────────────

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "t1",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString(),
    description: "Factura cliente - Proyecto web",
    merchant: "Acme Corp SL",
    amount: 4840,  // 4000 + 21% IVA
    type: "income",
    ivaRate: 21,
    category: "other_deductible",
    confidence: "high",
    isDeductible: false,
    deductionPromptShown: false,
    deductionPromptAnswered: false,
  },
  {
    id: "t2",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 8).toISOString(),
    description: "GitHub Copilot",
    merchant: "GitHub",
    amount: 11.99,
    type: "expense",
    ivaRate: 21,
    category: "software_subscriptions",
    confidence: "high",
    isDeductible: true,
    deductionPromptShown: false,
    deductionPromptAnswered: true,
  },
  {
    id: "t3",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString(),
    description: "Notion Pro",
    merchant: "Notion",
    amount: 9.99,
    type: "expense",
    ivaRate: 21,
    category: "software_subscriptions",
    confidence: "high",
    isDeductible: true,
    deductionPromptShown: false,
    deductionPromptAnswered: true,
  },
  {
    id: "t4",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 12).toISOString(),
    description: "Factura cliente - Consultoría mensual",
    merchant: "StartupXYZ",
    amount: 3025,  // 2500 + 21% IVA
    type: "income",
    ivaRate: 21,
    category: "other_deductible",
    confidence: "high",
    isDeductible: false,
    deductionPromptShown: false,
    deductionPromptAnswered: false,
  },
  {
    id: "t5",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString(),
    description: "Almuerzo con cliente",
    merchant: "Restaurante La Pepita",
    amount: 67.50,
    type: "expense",
    ivaRate: 10,
    category: "unclear",
    confidence: "low",
    isDeductible: false,
    deductionPromptShown: true,
    deductionPromptAnswered: false,
  },
  {
    id: "t6",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 18).toISOString(),
    description: "Figma Professional",
    merchant: "Figma",
    amount: 15,
    type: "expense",
    ivaRate: 21,
    category: "software_subscriptions",
    confidence: "high",
    isDeductible: true,
    deductionPromptShown: false,
    deductionPromptAnswered: true,
  },
  {
    id: "t7",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 20).toISOString(),
    description: "Compra MacBook Pro",
    merchant: "Apple",
    amount: 1999,
    type: "expense",
    ivaRate: 21,
    category: "hardware_equipment",
    confidence: "medium",
    isDeductible: false,
    deductionPromptShown: true,
    deductionPromptAnswered: false,
  },
];

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  fiscalRegime: "estimacion_directa_simplificada",
  activityType: "",
  ivaRetention: false,
  irpfRetentionRate: 0.15,
  onboardingComplete: false,
};

// ─── Store interface ──────────────────────────────────────────────────────────

interface KallioState {
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;

  profile: UserProfile;
  transactions: Transaction[];
  deductionPrompts: DeductionPrompt[];
  totalSavedThisYear: number;

  // Actions – profile
  setProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: (profile: UserProfile) => void;

  // Actions – transactions
  addTransaction: (tx: Omit<Transaction, "id" | "confidence" | "deductionPromptShown" | "deductionPromptAnswered"> & { category?: Transaction["category"] }) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  importTransactions: (txs: (Omit<Transaction, "id" | "confidence" | "deductionPromptShown" | "deductionPromptAnswered"> & { category?: Transaction["category"] })[]) => void;

  // Actions – deductions
  answerDeductionPrompt: (transactionId: string, answer: "confirmed" | "rejected" | "later") => void;

  // i18n
  locale: Locale;
  setLocale: (locale: Locale) => void;

  // Derived selectors (computed on call)
  getTaxSnapshot: (quarter?: number, year?: number) => TaxSnapshot;
  getPendingPrompts: () => DeductionPrompt[];
  loadDemo: () => void;
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useKallioStore = create<KallioState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      profile: DEFAULT_PROFILE,
      transactions: [],
      deductionPrompts: [],
      totalSavedThisYear: 0,
      locale: "es",
      setLocale: (locale) => set({ locale }),

      // ── Profile ────────────────────────────────────────────────────────────
      setProfile: (updates) =>
        set((s) => ({ profile: { ...s.profile, ...updates } })),

      completeOnboarding: (profile) =>
        set({ profile: { ...profile, onboardingComplete: true } }),

      // ── Transactions ───────────────────────────────────────────────────────
      addTransaction: (rawTx) => {
        const { category, confidence } = classifyTransaction(
          rawTx.description,
          rawTx.merchant
        );
        const tx: Transaction = {
          ...rawTx,
          id: generateId(),
          category: rawTx.category ?? category,
          confidence,
          isDeductible: rawTx.isDeductible ?? (category !== "personal" && category !== "unclear"),
          deductionPromptShown: false,
          deductionPromptAnswered: false,
        };

        const profile = get().profile;
        const prompt = generateDeductionPrompt(tx, profile);
        const newPrompts = prompt
          ? [...get().deductionPrompts, prompt]
          : get().deductionPrompts;

        if (prompt) tx.deductionPromptShown = true;

        set((s) => ({
          transactions: [tx, ...s.transactions],
          deductionPrompts: newPrompts,
        }));
      },

      updateTransaction: (id, updates) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
          deductionPrompts: s.deductionPrompts.filter(
            (p) => p.transactionId !== id
          ),
        })),

      importTransactions: (rawTxs) => {
        const profile = get().profile;
        const newTxs: Transaction[] = rawTxs.map((rawTx) => {
          const { category, confidence } = classifyTransaction(
            rawTx.description,
            rawTx.merchant
          );
          return {
            ...rawTx,
            id: generateId(),
            category: rawTx.category ?? category,
            confidence,
            isDeductible: rawTx.isDeductible ?? (category !== "personal" && category !== "unclear"),
            deductionPromptShown: false,
            deductionPromptAnswered: false,
          };
        });

        const newPrompts: DeductionPrompt[] = [];
        for (const tx of newTxs) {
          const prompt = generateDeductionPrompt(tx, profile);
          if (prompt) {
            newPrompts.push(prompt);
            tx.deductionPromptShown = true;
          }
        }

        set((s) => ({
          transactions: [...newTxs, ...s.transactions],
          deductionPrompts: [...newPrompts, ...s.deductionPrompts],
        }));
      },

      // ── Deduction prompts ──────────────────────────────────────────────────
      answerDeductionPrompt: (transactionId, answer) => {
        set((s) => {
          const prompt = s.deductionPrompts.find(
            (p) => p.transactionId === transactionId
          );
          if (!prompt) return s;

          const updatedPrompts = s.deductionPrompts.map((p) =>
            p.transactionId === transactionId
              ? { ...p, status: answer }
              : p
          );

          let updatedTransactions = s.transactions;
          let savedDelta = 0;

          if (answer === "confirmed") {
            savedDelta = prompt.projectedSaving;
            updatedTransactions = s.transactions.map((t) =>
              t.id === transactionId
                ? {
                    ...t,
                    isDeductible: true,
                    confidence: "high" as const,
                    deductionPromptAnswered: true,
                    category:
                      t.category === "unclear"
                        ? ("other_deductible" as ExpenseCategory)
                        : t.category,
                  }
                : t
            );
          } else if (answer === "rejected") {
            updatedTransactions = s.transactions.map((t) =>
              t.id === transactionId
                ? {
                    ...t,
                    isDeductible: false,
                    confidence: "high" as const,
                    deductionPromptAnswered: true,
                    category: "personal" as ExpenseCategory,
                  }
                : t
            );
          }

          return {
            deductionPrompts: updatedPrompts,
            transactions: updatedTransactions,
            totalSavedThisYear: s.totalSavedThisYear + savedDelta,
          };
        });
      },

      // ── Derived ────────────────────────────────────────────────────────────
      getTaxSnapshot: (quarter?, year?) => {
        const q = quarter ?? currentQuarter();
        const y = year ?? new Date().getFullYear();
        return calculateTaxSnapshot(get().transactions, get().profile, q, y);
      },

      getPendingPrompts: () =>
        get().deductionPrompts.filter((p) => p.status === "pending"),

      // ── Demo ───────────────────────────────────────────────────────────────
      loadDemo: () => {
        const profile: UserProfile = {
          name: "Facundo",
          fiscalRegime: "estimacion_directa_simplificada",
          activityType: "Programador / Consultor IT",
          ivaRetention: false,
          irpfRetentionRate: 0.15,
          onboardingComplete: true,
        };

        const prompts: DeductionPrompt[] = [];
        const processedTxs = DEMO_TRANSACTIONS.map((tx) => {
          const p = generateDeductionPrompt(tx, profile);
          if (p) prompts.push(p);
          return tx;
        });

        set({
          profile,
          transactions: processedTxs,
          deductionPrompts: prompts,
          totalSavedThisYear: 47.30,
        });
      },
    }),
    {
      name: "kallio-storage",
      version: 1,
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    }
  )
);
