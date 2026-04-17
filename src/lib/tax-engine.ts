/**
 * Kallio Tax Rules Engine
 * ──────────────────────────────────────────────────────────────────────────
 * Pure deterministic arithmetic based on Spanish fiscal rules (2025).
 * No LLM is used here. Every figure is rule-engine driven and traceable.
 *
 * References:
 *  - Ley 35/2006 del IRPF
 *  - Reglamento del IRPF (RD 439/2007)
 *  - Ley 37/1992 del IVA
 *  - AEAT – Modelo 130 (estimación directa simplificada)
 *  - AEAT – Modelo 303
 */

import {
  Transaction,
  TaxSnapshot,
  UserProfile,
  QuarterDeadline,
  DeductionPrompt,
  ExpenseCategory,
  IVARate,
} from "./types";


// ─── Constants ────────────────────────────────────────────────────────────────

/** Modelo 130: 20% of net income (estimación directa simplificada) */
const IRPF_ADVANCE_RATE = 0.2;

/** Deduction cap for "comidas de trabajo" per year (AEAT criterion) */
const MEALS_ANNUAL_CAP = 2000;

/** Hard maximum deduction for home office (% of home costs attributable) */
const HOME_OFFICE_DEDUCTION_PCT = 0.3;

// ─── Category deductibility rules ────────────────────────────────────────────

interface CategoryRule {
  fullyDeductible: boolean;
  partialRate?: number;          // e.g. 0.5 for 50%
  requiresJustification: boolean;
  irpfImpactRate: number;        // effective marginal rate for saving estimate
  note?: string;
}

const CATEGORY_RULES: Record<ExpenseCategory, CategoryRule> = {
  software_subscriptions:  { fullyDeductible: true,  requiresJustification: false, irpfImpactRate: 0.20 },
  hardware_equipment:      { fullyDeductible: true,  requiresJustification: true,  irpfImpactRate: 0.20, note: "Amortización anual posible" },
  office_supplies:         { fullyDeductible: true,  requiresJustification: false, irpfImpactRate: 0.20 },
  professional_services:   { fullyDeductible: true,  requiresJustification: false, irpfImpactRate: 0.20 },
  marketing_advertising:   { fullyDeductible: true,  requiresJustification: false, irpfImpactRate: 0.20 },
  travel_transport:        { fullyDeductible: false, partialRate: 0.7, requiresJustification: true, irpfImpactRate: 0.20, note: "70% si uso mixto" },
  meals_entertainment:     { fullyDeductible: false, partialRate: 0.5, requiresJustification: true, irpfImpactRate: 0.20, note: "Máx €2.000/año, con cliente" },
  phone_internet:          { fullyDeductible: false, partialRate: 0.5, requiresJustification: true, irpfImpactRate: 0.20, note: "50% uso profesional estimado" },
  training_education:      { fullyDeductible: true,  requiresJustification: false, irpfImpactRate: 0.20 },
  home_office:             { fullyDeductible: false, partialRate: HOME_OFFICE_DEDUCTION_PCT, requiresJustification: true, irpfImpactRate: 0.20 },
  rent_utilities:          { fullyDeductible: true,  requiresJustification: true,  irpfImpactRate: 0.20 },
  insurance:               { fullyDeductible: true,  requiresJustification: false, irpfImpactRate: 0.20 },
  bank_fees:               { fullyDeductible: true,  requiresJustification: false, irpfImpactRate: 0.20 },
  other_deductible:        { fullyDeductible: true,  requiresJustification: true,  irpfImpactRate: 0.20 },
  personal:                { fullyDeductible: false, requiresJustification: false, irpfImpactRate: 0 },
  unclear:                 { fullyDeductible: true,  requiresJustification: true,  irpfImpactRate: 0.20 },
};

// ─── Classification helpers ──────────────────────────────────────────────────

const MERCHANT_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  // Software / cloud
  adobe:       "software_subscriptions",
  figma:       "software_subscriptions",
  notion:      "software_subscriptions",
  slack:       "software_subscriptions",
  github:      "software_subscriptions",
  vercel:      "software_subscriptions",
  aws:         "software_subscriptions",
  google:      "software_subscriptions",
  microsoft:   "software_subscriptions",
  openai:      "software_subscriptions",
  anthropic:   "software_subscriptions",
  linear:      "software_subscriptions",
  loom:        "software_subscriptions",
  zoom:        "software_subscriptions",
  // Hardware
  apple:       "hardware_equipment",
  amazon:      "hardware_equipment",
  pccomponentes: "hardware_equipment",
  mediamarkt:  "hardware_equipment",
  // Meals / entertainment
  deliveroo:   "meals_entertainment",
  glovo:       "meals_entertainment",
  ubereats:    "meals_entertainment",
  // Transport
  renfe:       "travel_transport",
  iberia:      "travel_transport",
  vueling:     "travel_transport",
  cabify:      "travel_transport",
  uber:        "travel_transport",
  bolt:        "travel_transport",
  // Professional services
  despacho:    "professional_services",
  gestoría:    "professional_services",
  notaría:     "professional_services",
};

export function classifyTransaction(description: string, merchant?: string): {
  category: ExpenseCategory;
  confidence: "high" | "medium" | "low" | "unclear";
} {
  const text = `${description} ${merchant ?? ""}`.toLowerCase();

  // Check merchant map first
  for (const [key, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (text.includes(key)) {
      return { category, confidence: "high" };
    }
  }

  // Keyword patterns
  if (/suscripci[oó]n|subscripci[oó]n|licencia|software|saas|plan pro|premium/.test(text))
    return { category: "software_subscriptions", confidence: "medium" };
  if (/tel[eé]fono|m[oó]vil|internet|fibra|vodafone|movistar|orange/.test(text))
    return { category: "phone_internet", confidence: "medium" };
  if (/formaci[oó]n|curso|training|udemy|coursera|workshop|seminario/.test(text))
    return { category: "training_education", confidence: "high" };
  if (/marketing|publicidad|ads|campaign|newsletter/.test(text))
    return { category: "marketing_advertising", confidence: "medium" };
  if (/seguros?|insurance/.test(text))
    return { category: "insurance", confidence: "high" };
  if (/banco|comisi[oó]n|tarifa|fee bancario/.test(text))
    return { category: "bank_fees", confidence: "high" };
  if (/restaurante|caf[eé]|comida|almuerzo|cena|bar /.test(text))
    return { category: "meals_entertainment", confidence: "medium" };
  if (/vuelo|tren|taxi|transporte|parking|hotel/.test(text))
    return { category: "travel_transport", confidence: "medium" };

  return { category: "unclear", confidence: "unclear" };
}

// ─── IVA helpers ─────────────────────────────────────────────────────────────

/** Extract the net base from a gross amount given an IVA rate */
export function netFromGross(gross: number, ivaRate: IVARate): number {
  return gross / (1 + ivaRate / 100);
}

/** Get the IVA amount from a gross figure */
export function ivaAmount(gross: number, ivaRate: IVARate): number {
  return gross - netFromGross(gross, ivaRate);
}

// ─── Timezone helper ─────────────────────────────────────────────────────────

/** Returns a Date object whose local-time methods reflect Spain's timezone (Europe/Madrid). */
export function nowInSpain(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}

/** Returns "YYYY-MM-DD" for today in Spain's timezone. */
export function todayInSpain(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

// ─── Quarter helpers ──────────────────────────────────────────────────────────

export function currentQuarter(date: Date = new Date()): number {
  return Math.ceil((date.getMonth() + 1) / 3);
}

export function quarterDateRange(quarter: number, year: number): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3; // 0-indexed
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0, 23, 59, 59),
  };
}

export function getQuarterDeadlines(year: number): QuarterDeadline[] {
  // AEAT official deadlines: 1-20 of the month following the quarter end
  // Q4 deadline is January 30 of next year
  return [
    {
      quarter: 1, year,
      modelo130Deadline: `${year}-04-20`,
      modelo303Deadline: `${year}-04-20`,
      label: "1T",
    },
    {
      quarter: 2, year,
      modelo130Deadline: `${year}-07-20`,
      modelo303Deadline: `${year}-07-20`,
      label: "2T",
    },
    {
      quarter: 3, year,
      modelo130Deadline: `${year}-10-20`,
      modelo303Deadline: `${year}-10-20`,
      label: "3T",
    },
    {
      quarter: 4, year,
      modelo130Deadline: `${year + 1}-01-30`,
      modelo303Deadline: `${year + 1}-01-30`,
      label: "4T",
    },
  ];
}

export function daysUntilDeadline(deadlineISO: string): number {
  const today = nowInSpain();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineISO);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function nextDeadline(year: number): QuarterDeadline & { daysLeft: number } {
  const deadlines = getQuarterDeadlines(year);
  const today = nowInSpain();

  for (const d of deadlines) {
    const days = daysUntilDeadline(d.modelo130Deadline);
    if (days >= 0) return { ...d, daysLeft: days };
  }

  // If all passed, return Q4 of next year
  const nextYear = getQuarterDeadlines(year + 1);
  return { ...nextYear[0], daysLeft: daysUntilDeadline(nextYear[0].modelo130Deadline) };
}

// ─── Core tax snapshot calculation ───────────────────────────────────────────

export function calculateTaxSnapshot(
  transactions: Transaction[],
  profile: UserProfile,
  quarter: number,
  year: number
): TaxSnapshot {
  const { start, end } = quarterDateRange(quarter, year);

  const quarterTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  const income = quarterTransactions.filter((t) => t.type === "income");
  const expenses = quarterTransactions.filter(
    (t) => t.type === "expense" && t.isDeductible
  );

  // ── Income ──────────────────────────────────────────────────────────────
  // Gross = what the client paid (including IVA if applicable)
  const grossIncome = income.reduce((sum, t) => sum + t.amount, 0);

  // IVA collected (on invoices issued with IVA – some autónomos exempt)
  const ivaCollected = income.reduce((sum, t) => {
    if (t.ivaRate === 0) return sum;
    return sum + ivaAmount(t.amount, t.ivaRate);
  }, 0);

  // Net income base (sin IVA)
  const netIncome = grossIncome - ivaCollected;

  // ── Expenses ─────────────────────────────────────────────────────────────
  // IVA soportado (recoverable from deductible business expenses)
  const ivaDeductible = expenses.reduce((sum, t) => {
    if (t.ivaRate === 0) return sum;
    const rule = CATEGORY_RULES[t.category];
    const deductiblePct = rule.partialRate ?? (rule.fullyDeductible ? 1 : 0);
    return sum + ivaAmount(t.amount, t.ivaRate) * deductiblePct;
  }, 0);

  // Net deductible expense base (sin IVA, applying partial rules)
  const deductibleExpenses = expenses.reduce((sum, t) => {
    const rule = CATEGORY_RULES[t.category];
    const deductiblePct = rule.partialRate ?? (rule.fullyDeductible ? 1 : 0);
    const base = netFromGross(t.amount, t.ivaRate);
    return sum + base * deductiblePct;
  }, 0);

  // ── IRPF (Modelo 130) ─────────────────────────────────────────────────────
  // Rendimiento neto = net income – deductible expenses
  const netTaxableIncome = Math.max(0, netIncome - deductibleExpenses);

  // Prior IRPF withheld by clients (retention already applied)
  const irpfAlreadyRetained = profile.ivaRetention
    ? netIncome * profile.irpfRetentionRate
    : 0;

  // Advance payment = 20% of net income – already retained
  const irpfAdvancePayable = Math.max(
    0,
    netTaxableIncome * IRPF_ADVANCE_RATE - irpfAlreadyRetained
  );

  // ── IVA (Modelo 303) ──────────────────────────────────────────────────────
  const ivaPayable = Math.max(0, ivaCollected - ivaDeductible);

  // ── Savings from deductions ───────────────────────────────────────────────
  const totalSavedByDeductions = deductibleExpenses * IRPF_ADVANCE_RATE + ivaDeductible;

  // ── Reserve & spendable ───────────────────────────────────────────────────
  const totalTaxReserve = ivaPayable + irpfAdvancePayable;
  const trueSpendableBalance = netIncome - deductibleExpenses - totalTaxReserve;

  // ── Year-end IRPF gap (Declaración de la Renta) ───────────────────────────
  // Modelo 130 only pays 20% as advance. At year-end the full bracket rate applies.
  // We project annual income from YTD data and estimate the gap to reserve.

  const yearIncome = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && t.type === "income";
  });
  const yearExpenses = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && t.type === "expense" && t.isDeductible;
  });

  const ytdGrossIncome = yearIncome.reduce((s, t) => s + t.amount, 0);
  const ytdIvaCollected = yearIncome.reduce((s, t) =>
    t.ivaRate === 0 ? s : s + ivaAmount(t.amount, t.ivaRate), 0);
  const ytdDeductibleExpenses = yearExpenses.reduce((s, t) => {
    const rule = CATEGORY_RULES[t.category];
    const pct = rule.partialRate ?? (rule.fullyDeductible ? 1 : 0);
    return s + netFromGross(t.amount, t.ivaRate) * pct;
  }, 0);

  const ytdNetIncome = ytdGrossIncome - ytdIvaCollected - ytdDeductibleExpenses;

  // Project to full year based on months elapsed
  const currentMonth = nowInSpain().getMonth() + 1; // 1-12
  const projectionFactor = currentMonth > 0 ? 12 / currentMonth : 1;
  const projectedAnnualNetIncome = Math.max(0, ytdNetIncome * projectionFactor);

  // Full IRPF bill at year-end (bracket calculation)
  const estimatedAnnualIRPF = calculateAnnualIRPF(projectedAnnualNetIncome);

  // What's already been paid via Modelo 130 (20% of YTD net)
  const irpfPaidViaAdvances = Math.max(0, ytdNetIncome * IRPF_ADVANCE_RATE);

  // Gap = what remains to pay at June declaration
  const yearEndIRPFGap = Math.max(0, estimatedAnnualIRPF - irpfPaidViaAdvances);

  const effRate = effectiveIRPFRate(projectedAnnualNetIncome);

  return {
    quarterLabel: `${quarter}T ${year}`,
    grossIncome,
    deductibleExpenses,
    netTaxableIncome,
    ivaCollected,
    ivaDeductible,
    ivaPayable,
    irpfAdvancePayable,
    totalTaxReserve,
    trueSpendableBalance,
    totalSavedByDeductions,
    ytdNetIncome,
    projectedAnnualNetIncome,
    estimatedAnnualIRPF,
    irpfPaidViaAdvances,
    yearEndIRPFGap,
    effectiveIRPFRate: effRate,
  };
}

// ─── Deduction prompt generator ──────────────────────────────────────────────

interface PromptTemplate {
  key: string;
  question: (t: Transaction) => string;
  applicableCategories: ExpenseCategory[];
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    key: "meals",
    applicableCategories: ["unclear", "meals_entertainment"],
    question: (t) =>
      `¿El pago de ${formatCurrency(t.amount)} en "${t.merchant ?? t.description}" fue para una reunión o comida de trabajo con un cliente o proveedor?`,
  },
  {
    key: "travel",
    applicableCategories: ["travel_transport"],
    question: (t) =>
      `¿El desplazamiento de ${formatCurrency(t.amount)} en "${t.merchant ?? t.description}" fue exclusivamente por motivos profesionales?`,
  },
  {
    key: "phone",
    applicableCategories: ["phone_internet"],
    question: (t) =>
      `¿Usas tu ${t.merchant ?? "teléfono/internet"} principalmente para el trabajo? Si es así, podemos deducir parte de este gasto de ${formatCurrency(t.amount)}.`,
  },
  {
    key: "hardware",
    applicableCategories: ["hardware_equipment"],
    question: (t) =>
      `¿El equipo de ${formatCurrency(t.amount)} en "${t.merchant ?? t.description}" lo usas exclusivamente o principalmente para tu actividad profesional?`,
  },
  {
    key: "homeOffice",
    applicableCategories: ["home_office"],
    question: (t) =>
      `¿Tienes una parte de tu vivienda dedicada como oficina profesional? Este gasto de ${formatCurrency(t.amount)} podría ser parcialmente deducible.`,
  },
  {
    key: "unclear",
    applicableCategories: ["unclear"],
    question: (t) =>
      `No hemos podido clasificar automáticamente el gasto de ${formatCurrency(t.amount)} en "${t.merchant ?? t.description}". ¿Es un gasto de tu actividad profesional?`,
  },
];

export function generateDeductionPrompt(
  transaction: Transaction,
  profile: UserProfile
): DeductionPrompt | null {
  // Only expenses can be deductible — never fire on income invoices
  if (transaction.type !== "expense") return null;
  if (transaction.confidence !== "unclear" && transaction.confidence !== "low") {
    return null;
  }
  if (transaction.deductionPromptAnswered) return null;

  // Find best matching template
  const template =
    PROMPT_TEMPLATES.find((p) =>
      p.applicableCategories.includes(transaction.category)
    ) ?? PROMPT_TEMPLATES[PROMPT_TEMPLATES.length - 1];

  const rule = CATEGORY_RULES[transaction.category];
  const base = netFromGross(transaction.amount, transaction.ivaRate);
  const deductiblePct = rule.partialRate ?? (rule.fullyDeductible ? 1 : 0.5);
  const projectedSaving = base * deductiblePct * (rule.irpfImpactRate + transaction.ivaRate / 100);

  return {
    transactionId: transaction.id,
    question: template.question(transaction),
    promptKey: template.key,
    promptVars: {
      amount: formatCurrency(transaction.amount),
      merchant: transaction.merchant ?? transaction.description,
    },
    projectedSaving: Math.round(projectedSaving * 100) / 100,
    status: "pending",
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** Estimate the IRPF marginal tax bracket for a given annual net income */
export function estimateMarginalRate(annualNetIncome: number): number {
  // Spain 2025 IRPF brackets (general scale)
  if (annualNetIncome <= 12450) return 0.19;
  if (annualNetIncome <= 20200) return 0.24;
  if (annualNetIncome <= 35200) return 0.30;
  if (annualNetIncome <= 60000) return 0.37;
  if (annualNetIncome <= 300000) return 0.45;
  return 0.47;
}

/**
 * Calculate total IRPF due on an annual net income using Spain 2025 brackets.
 * Applies the personal allowance (mínimo personal €5,550) before brackets.
 * Combined state + average regional scale.
 */
export function calculateAnnualIRPF(annualNetIncome: number): number {
  const PERSONAL_ALLOWANCE = 5550;
  const taxable = Math.max(0, annualNetIncome - PERSONAL_ALLOWANCE);

  const BRACKETS = [
    { limit: 12450,   rate: 0.19 },
    { limit: 20200,   rate: 0.24 },
    { limit: 35200,   rate: 0.30 },
    { limit: 60000,   rate: 0.37 },
    { limit: 300000,  rate: 0.45 },
    { limit: Infinity, rate: 0.47 },
  ];

  let tax = 0;
  let prev = 0;
  let remaining = taxable;

  for (const bracket of BRACKETS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, bracket.limit - prev);
    tax += slice * bracket.rate;
    remaining -= slice;
    prev = bracket.limit;
  }

  return tax;
}

/**
 * Effective (blended) IRPF rate — tax due / gross income.
 * Useful for showing "you pay X% overall".
 */
export function effectiveIRPFRate(annualNetIncome: number): number {
  if (annualNetIncome <= 0) return 0;
  return calculateAnnualIRPF(annualNetIncome) / annualNetIncome;
}
