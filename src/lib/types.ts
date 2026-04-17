// ─── Core domain types for Kallio ────────────────────────────────────────────

export type IVARate = 21 | 10 | 4 | 0; // 0 = exempt

export type TransactionType = "income" | "expense";

export type ExpenseCategory =
  | "software_subscriptions"   // Suscripciones SaaS / software
  | "hardware_equipment"        // Hardware, equipos informáticos
  | "office_supplies"           // Material de oficina
  | "professional_services"    // Servicios profesionales (gestor, abogado…)
  | "marketing_advertising"    // Marketing y publicidad
  | "travel_transport"         // Desplazamientos (70% deductible if mixed)
  | "meals_entertainment"      // Comidas de trabajo (limitado)
  | "phone_internet"           // Teléfono e internet (proporcional)
  | "training_education"       // Formación profesional
  | "home_office"              // Gastos de oficina en casa (proporcional)
  | "rent_utilities"           // Alquiler local / suministros
  | "insurance"                // Seguros profesionales
  | "bank_fees"                // Comisiones bancarias
  | "other_deductible"         // Otros gastos deducibles
  | "personal"                 // Gasto personal (no deducible)
  | "unclear";                 // Pendiente de clasificar

export type DeductionConfidence = "high" | "medium" | "low" | "unclear";

export interface Transaction {
  id: string;
  date: string;               // ISO date string
  description: string;
  merchant?: string;
  amount: number;             // Always positive
  type: TransactionType;
  ivaRate: IVARate;
  category: ExpenseCategory;
  confidence: DeductionConfidence;
  isDeductible: boolean;
  deductionPromptShown: boolean;
  deductionPromptAnswered: boolean;
  notes?: string;
}

export type FiscalRegime =
  | "estimacion_directa_simplificada"
  | "estimacion_directa_normal"
  | "estimacion_objetiva"; // módulos

export interface UserProfile {
  name: string;
  nif?: string;
  fiscalRegime: FiscalRegime;
  activityType: string;         // e.g. "Programador / Consultor IT"
  ivaRetention: boolean;        // ¿retención IRPF en facturas? (15% or 7%)
  irpfRetentionRate: number;    // 0.07 or 0.15
  onboardingComplete: boolean;
}

export interface TaxSnapshot {
  quarterLabel: string;         // e.g. "1T 2025"
  grossIncome: number;
  deductibleExpenses: number;
  netTaxableIncome: number;

  // IVA
  ivaCollected: number;         // IVA repercutido (on income)
  ivaDeductible: number;        // IVA soportado (on deductible expenses)
  ivaPayable: number;           // Net IVA to pay (Modelo 303)

  // IRPF pago fraccionado (Modelo 130 – estimación directa simplificada)
  irpfAdvancePayable: number;   // 20% of net taxable income – prior payments

  // Summary
  totalTaxReserve: number;      // ivaPayable + irpfAdvancePayable
  trueSpendableBalance: number; // grossIncome - deductibleExpenses base - totalTaxReserve
  totalSavedByDeductions: number; // tax impact of confirmed deductions

  // Year-end IRPF gap (Declaración de la Renta, filed ~June)
  // Modelo 130 only pays 20% advance — effective rate is typically 25-40%+
  ytdNetIncome: number;               // Net income across all quarters this year
  projectedAnnualNetIncome: number;   // YTD extrapolated to 12 months
  estimatedAnnualIRPF: number;        // Full IRPF bill (bracket calculation)
  irpfPaidViaAdvances: number;        // Already paid via Modelo 130 (20% × YTD)
  yearEndIRPFGap: number;             // Extra to reserve for June declaration
  effectiveIRPFRate: number;          // Blended rate (for display)
}

export interface DeductionPrompt {
  transactionId: string;
  question: string;             // Fallback pre-rendered question (legacy)
  promptKey?: string;           // i18n key: "meals" | "travel" | "phone" | "hardware" | "homeOffice" | "unclear"
  promptVars?: Record<string, string>; // Interpolation vars: { amount, merchant }
  projectedSaving: number;      // Tax impact if confirmed deductible
  status: "pending" | "confirmed" | "rejected" | "later";
}

export interface QuarterDeadline {
  quarter: number;              // 1–4
  year: number;
  modelo130Deadline: string;    // ISO date
  modelo303Deadline: string;    // ISO date
  label: string;
}
