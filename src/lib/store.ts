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
  FiledQuarter,
  QuarterStatus,
  ExpenseCategory,
  IVARate,
  TransactionType,
  CheckerRun,
  NifType,
} from "./types";
import type { WizardProfile } from "./wizard-config";
import type { Language } from "./i18n";
import { createClient } from "./supabase";
import {
  calculateTaxSnapshot,
  classifyTransaction,
  generateDeductionPrompt,
  generateId,
  currentQuarter,
  getQuarterDeadlines,
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
    reviewed: false,
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
    reviewed: false,
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
    reviewed: false,
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
    reviewed: false,
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
    reviewed: false,
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
    reviewed: false,
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
    reviewed: false,
  },
];

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  fiscalRegime: "estimacion_directa_simplificada",
  activityType: "",
  ivaRetention: false,
  irpfRetentionRate: 0.15,
  irpfAdvanceRate: undefined,
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
  clearSession: () => void;  // resets state only, no Supabase call
  resetAll: () => void;

  // Supabase auth
  loadUserData: () => Promise<void>;

  language: Language;
  setLanguage: (lang: Language) => void;

  profile: UserProfile;
  transactions: Transaction[];
  deductionPrompts: DeductionPrompt[];
  totalSavedThisYear: number;
  filedQuarters: FiledQuarter[];

  // Actions – profile
  setProfile: (profile: Partial<UserProfile>) => void;
  updateName: (name: string) => Promise<void>;
  updateNif: (nif: string | undefined, nifType: NifType | undefined) => Promise<void>;
  updateIrpfAdvanceRate: (rate: number | undefined) => Promise<void>;
  completeOnboarding: (profile: UserProfile) => Promise<void>;

  // Actions – transactions
  addTransaction: (tx: Omit<Transaction, "id" | "confidence" | "deductionPromptShown" | "deductionPromptAnswered"> & { category?: Transaction["category"] }) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  duplicateTransaction: (id: string) => void;
  markReviewed: (id: string, reviewed: boolean) => void;
  importTransactions: (txs: (Omit<Transaction, "id" | "confidence" | "deductionPromptShown" | "deductionPromptAnswered"> & { category?: Transaction["category"] })[]) => void;

  // Actions – deductions
  answerDeductionPrompt: (transactionId: string, answer: "confirmed" | "rejected" | "later") => void;

  // Actions – filed quarters
  markQuarterFiled: (quarter: number, year: number, filed: boolean) => void;

  // Wizard + dashboard mode
  wizardProfile: WizardProfile | null;
  dashboardMode: 'simple' | 'full';
  setWizardProfile: (p: WizardProfile) => void;
  setDashboardMode: (mode: 'simple' | 'full') => void;

  // Checker history
  checkerHistory: CheckerRun[];
  addCheckerRun: (run: CheckerRun) => void;

  // Derived selectors (computed on call)
  getTaxSnapshot: (quarter?: number, year?: number) => TaxSnapshot;
  getQuarterStatus: (quarter: number, year: number) => QuarterStatus;
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
      clearSession: () => set({ sessionActive: false, profile: DEFAULT_PROFILE, transactions: [], deductionPrompts: [], totalSavedThisYear: 0 }),
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
              nifType: (profileRow.nif_type as NifType) ?? undefined,
              fiscalRegime: profileRow.fiscal_regime,
              activityType: profileRow.activity_type,
              ivaRetention: profileRow.iva_retention,
              irpfRetentionRate: profileRow.irpf_retention_rate,
              irpfAdvanceRate: profileRow.irpf_advance_rate ?? undefined,
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
      filedQuarters: [],
      wizardProfile: null,
      dashboardMode: 'full' as const,
      setWizardProfile: (p) => set({ wizardProfile: p, dashboardMode: 'simple' }),
      setDashboardMode: (mode) => set({ dashboardMode: mode }),
      checkerHistory: [],
      addCheckerRun: (run) => set((s) => ({ checkerHistory: [run, ...s.checkerHistory] })),

      // ── Profile ────────────────────────────────────────────────────────────
      setProfile: (updates) =>
        set((s) => ({ profile: { ...s.profile, ...updates } })),

      updateName: async (name) => {
        set((s) => ({ profile: { ...s.profile, name } }));
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("profiles").update({ name }).eq("id", user.id);
      },

      updateNif: async (nif, nifType) => {
        set((s) => ({ profile: { ...s.profile, nif, nifType } }));
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("profiles").update({ nif: nif ?? null, nif_type: nifType ?? null }).eq("id", user.id);
      },

      updateIrpfAdvanceRate: async (rate) => {
        set((s) => ({ profile: { ...s.profile, irpfAdvanceRate: rate } }));
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("profiles").update({ irpf_advance_rate: rate ?? null }).eq("id", user.id);
      },

      completeOnboarding: async (profile) => {
        const fullProfile = { ...profile, onboardingComplete: true };
        set({ profile: fullProfile });
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("profiles").upsert({
          id: user.id, name: fullProfile.name, nif: fullProfile.nif ?? null, nif_type: fullProfile.nifType ?? null,
          fiscal_regime: fullProfile.fiscalRegime, activity_type: fullProfile.activityType,
          iva_retention: fullProfile.ivaRetention, irpf_retention_rate: fullProfile.irpfRetentionRate,
          irpf_advance_rate: fullProfile.irpfAdvanceRate ?? null,
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
          reviewed: false,
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
        createClient().auth.getUser().then(async ({ data: { user } }) => {
          if (!user) return;
          const sb = createClient();
          const { error: txError } = await sb.from("transactions").insert({
            id: tx.id, user_id: user.id, date: tx.date, description: tx.description,
            merchant: tx.merchant ?? null, amount: tx.amount, type: tx.type,
            iva_rate: tx.ivaRate, category: tx.category, confidence: tx.confidence,
            is_deductible: tx.isDeductible, deduction_prompt_shown: tx.deductionPromptShown,
            deduction_prompt_answered: tx.deductionPromptAnswered, notes: tx.notes ?? null,
          });
          if (txError) console.error("Transaction insert failed:", txError);
          if (prompt) {
            const { error: promptError } = await sb.from("deduction_prompts").insert({
              transaction_id: prompt.transactionId, user_id: user.id, question: prompt.question,
              prompt_key: prompt.promptKey ?? null, prompt_vars: prompt.promptVars ?? null,
              projected_saving: prompt.projectedSaving, status: prompt.status,
            });
            if (promptError) console.error("Deduction prompt insert failed:", promptError);
          }
        });
      },

      updateTransaction: (id, updates) => {
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
        createClient().auth.getUser().then(async ({ data: { user } }) => {
          if (!user) return;
          const mapped: Record<string, unknown> = {};
          if (updates.date !== undefined) mapped.date = updates.date;
          if (updates.description !== undefined) mapped.description = updates.description;
          if (updates.merchant !== undefined) mapped.merchant = updates.merchant ?? null;
          if (updates.amount !== undefined) mapped.amount = updates.amount;
          if (updates.type !== undefined) mapped.type = updates.type;
          if (updates.ivaRate !== undefined) mapped.iva_rate = updates.ivaRate;
          if (updates.category !== undefined) mapped.category = updates.category;
          if (updates.isDeductible !== undefined) mapped.is_deductible = updates.isDeductible;
          if (updates.notes !== undefined) mapped.notes = updates.notes ?? null;
          if (Object.keys(mapped).length > 0) {
            const { error } = await createClient().from("transactions").update(mapped).eq("id", id);
            if (error) console.error("Transaction update failed:", error);
          }
        });
      },

      deleteTransaction: (id) => {
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
          deductionPrompts: s.deductionPrompts.filter(
            (p) => p.transactionId !== id
          ),
        }));
        createClient().auth.getUser().then(async ({ data: { user } }) => {
          if (!user) return;
          const { error } = await createClient().from("transactions").delete().eq("id", id);
          if (error) console.error("Transaction delete failed:", error);
        });
      },

      duplicateTransaction: (id) => {
        const tx = get().transactions.find((t) => t.id === id);
        if (!tx) return;
        const newTx: Transaction = {
          ...tx,
          id: generateId(),
          date: new Date().toISOString(),
          reviewed: false,
          deductionPromptShown: false,
          deductionPromptAnswered: false,
        };
        set((s) => ({ transactions: [newTx, ...s.transactions] }));
      },

      markReviewed: (id, reviewed) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, reviewed } : t
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

      // ── Filed quarters ────────────────────────────────────────────────────
      markQuarterFiled: (quarter, year, filed) => {
        set((s) => {
          if (filed) {
            // Add if not already present
            const exists = s.filedQuarters.some(
              (fq) => fq.quarter === quarter && fq.year === year
            );
            if (exists) return {};
            return {
              filedQuarters: [
                ...s.filedQuarters,
                { quarter, year, filedAt: new Date().toISOString() },
              ],
            };
          } else {
            return {
              filedQuarters: s.filedQuarters.filter(
                (fq) => !(fq.quarter === quarter && fq.year === year)
              ),
            };
          }
        });
      },

      // ── Derived ────────────────────────────────────────────────────────────
      getTaxSnapshot: (quarter?, year?) => {
        const q = quarter ?? currentQuarter();
        const y = year ?? new Date().getFullYear();
        return calculateTaxSnapshot(get().transactions, get().profile, q, y);
      },

      getQuarterStatus: (quarter, year): QuarterStatus => {
        const now = new Date();
        const nowQ = currentQuarter(now);
        const nowY = now.getFullYear();

        // Current or future quarter → open
        if (year > nowY || (year === nowY && quarter >= nowQ)) return "open";

        // Check if filed
        const isFiled = get().filedQuarters.some(
          (fq) => fq.quarter === quarter && fq.year === year
        );
        if (isFiled) return "filed";

        // Past quarter deadline - check if filing window has passed
        const deadlines = getQuarterDeadlines(year);
        const deadline = deadlines.find((d) => d.quarter === quarter);
        if (!deadline) return "past_not_filed";

        const deadlineDate = new Date(deadline.modelo130Deadline);
        return now > deadlineDate ? "past_not_filed" : "open";
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
      // Persist language, filed quarters, wizard profile and dashboard mode
      partialize: (state) => ({
        language: state.language,
        filedQuarters: state.filedQuarters,
        wizardProfile: state.wizardProfile,
        dashboardMode: state.dashboardMode,
        checkerHistory: state.checkerHistory,
      }),
    }
  )
);
