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
import type { Language } from "./i18n";
import { createClient } from "./supabase";
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

  // Session is intentionally NOT persisted — resets on every browser open
  sessionActive: boolean;
  activateSession: () => void;
  signOut: () => Promise<void>;
  resetAll: () => void;

  // Supabase auth
  loadUserData: () => Promise<void>;

  language: Language;
  setLanguage: (lang: Language) => void;

  profile: UserProfile;
  transactions: Transaction[];
  deductionPrompts: DeductionPrompt[];
  totalSavedThisYear: number;

  // Actions – profile
  setProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: (profile: UserProfile) => Promise<void>;

  // Actions – transactions
  addTransaction: (tx: Omit<Transaction, "id" | "confidence" | "deductionPromptShown" | "deductionPromptAnswered"> & { category?: Transaction["category"] }) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  importTransactions: (txs: (Omit<Transaction, "id" | "confidence" | "deductionPromptShown" | "deductionPromptAnswered"> & { category?: Transaction["category"] })[]) => void;

  // Actions – deductions
  answerDeductionPrompt: (transactionId: string, answer: "confirmed" | "rejected" | "later") => void;

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

      sessionActive: false,
      activateSession: () => set({ sessionActive: true }),
      signOut: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        set({ sessionActive: false, profile: DEFAULT_PROFILE, transactions: [], deductionPrompts: [], totalSavedThisYear: 0 });
      },
      resetAll: () => {
        set({
          profile: DEFAULT_PROFILE,
          transactions: [],
          deductionPrompts: [],
          totalSavedThisYear: 0,
          sessionActive: false,
          language: "es",
        });
        localStorage.removeItem("kallio-storage");
      },

      loadUserData: async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { set({ _hasHydrated: true }); return; }

        const [{ data: profileRow }, { data: txRows }, { data: promptRows }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false }),
          supabase.from("deduction_prompts").select("*").eq("user_id", user.id),
        ]);

        if (profileRow) {
          set({
            profile: {
              name: profileRow.name ?? "",
              nif: profileRow.nif ?? undefined,
              fiscalRegime: profileRow.fiscal_regime,
              activityType: profileRow.activity_type,
              ivaRetention: profileRow.iva_retention,
              irpfRetentionRate: profileRow.irpf_retention_rate,
              onboardingComplete: profileRow.onboarding_complete,
            },
            transactions: (txRows ?? []).map((r: any) => ({
              id: r.id, date: r.date, description: r.description,
              merchant: r.merchant ?? undefined, amount: r.amount, type: r.type,
              ivaRate: r.iva_rate, category: r.category, confidence: r.confidence,
              isDeductible: r.is_deductible, deductionPromptShown: r.deduction_prompt_shown,
              deductionPromptAnswered: r.deduction_prompt_answered, notes: r.notes ?? undefined,
            })),
            deductionPrompts: (promptRows ?? []).map((r: any) => ({
              transactionId: r.transaction_id, question: r.question,
              promptKey: r.prompt_key ?? undefined, promptVars: r.prompt_vars ?? undefined,
              projectedSaving: r.projected_saving, status: r.status,
            })),
            sessionActive: true,
            _hasHydrated: true,
          });
        } else {
          set({ _hasHydrated: true });
        }
      },

      language: "es" as Language,
      setLanguage: (lang) => set({ language: lang }),

      profile: DEFAULT_PROFILE,
      transactions: [],
      deductionPrompts: [],
      totalSavedThisYear: 0,

      // ── Profile ────────────────────────────────────────────────────────────
      setProfile: (updates) =>
        set((s) => ({ profile: { ...s.profile, ...updates } })),

      completeOnboarding: async (profile) => {
        const fullProfile = { ...profile, onboardingComplete: true };
        set({ profile: fullProfile });
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("profiles").upsert({
          id: user.id, name: fullProfile.name, nif: fullProfile.nif ?? null,
          fiscal_regime: fullProfile.fiscalRegime, activity_type: fullProfile.activityType,
          iva_retention: fullProfile.ivaRetention, irpf_retention_rate: fullProfile.irpfRetentionRate,
          onboarding_complete: true,
        });
      },

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

        // Sync to Supabase
        createClient().auth.getUser().then(({ data: { user } }) => {
          if (!user) return;
          const sb = createClient();
          sb.from("transactions").insert({
            id: tx.id, user_id: user.id, date: tx.date, description: tx.description,
            merchant: tx.merchant ?? null, amount: tx.amount, type: tx.type,
            iva_rate: tx.ivaRate, category: tx.category, confidence: tx.confidence,
            is_deductible: tx.isDeductible, deduction_prompt_shown: tx.deductionPromptShown,
            deduction_prompt_answered: tx.deductionPromptAnswered, notes: tx.notes ?? null,
          });
          if (prompt) {
            sb.from("deduction_prompts").insert({
              transaction_id: prompt.transactionId, user_id: user.id, question: prompt.question,
              prompt_key: prompt.promptKey ?? null, prompt_vars: prompt.promptVars ?? null,
              projected_saving: prompt.projectedSaving, status: prompt.status,
            });
          }
        });
      },

      updateTransaction: (id, updates) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      deleteTransaction: (id) => {
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
          deductionPrompts: s.deductionPrompts.filter(
            (p) => p.transactionId !== id
          ),
        }));
        createClient().auth.getUser().then(({ data: { user } }) => {
          if (!user) return;
          createClient().from("transactions").delete().eq("id", id);
        });
      },

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
      // Exclude sessionActive so it always resets to false on page load
      partialize: (state) => ({
        profile: state.profile,
        transactions: state.transactions,
        deductionPrompts: state.deductionPrompts,
        totalSavedThisYear: state.totalSavedThisYear,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    }
  )
);
