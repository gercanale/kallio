/**
 * Kallio Tax Explanations
 * Plain-language explanations of Spanish tax concepts in ES + EN.
 * Used by TaxTooltip, ExplainDrawer, and the Learn page.
 */

import type { Language } from "./i18n";
import type { Transaction, ExpenseCategory } from "./types";
import { formatCurrency, getCategoryDeductibilityPct, netFromGross, ivaAmount } from "./tax-engine";

// ─── Concept keys ─────────────────────────────────────────────────────────────

export type ConceptKey =
  | "iva_collected"
  | "iva_deductible"
  | "iva_payable"
  | "irpf_advance"
  | "irpf_gap"
  | "gjd"
  | "gross_income"
  | "net_income"
  | "spendable"
  | "deductible"
  | "tax_reserve"
  | "modelo_130"
  | "modelo_303"
  | "eds"
  | "irpf_retention";

export interface Explanation {
  title: string;
  body: string;
  example?: string;
}

// ─── Spanish explanations ─────────────────────────────────────────────────────

const ES: Record<ConceptKey, Explanation> = {
  iva_collected: {
    title: "IVA repercutido",
    body: "Es el IVA que cobras a tus clientes en tus facturas. No es tuyo: lo estás recaudando en nombre de Hacienda. Cada trimestre debes ingresarlo en el Modelo 303.",
    example: "Si facturas €5.000 netos al 21%, cobras €6.050. Los €1.050 de IVA van a Hacienda, no a tu bolsillo.",
  },
  iva_deductible: {
    title: "IVA soportado",
    body: "Es el IVA que tú pagas en tus compras de negocio (material, software, servicios…). Puedes restarlo del IVA que debes a Hacienda. Solo se recupera el IVA español — compras a proveedores extranjeros no llevan IVA español.",
    example: "Pagas €242 por una suscripción (€200 + 21% IVA). Los €42 de IVA los recuperas en el Modelo 303.",
  },
  iva_payable: {
    title: "IVA a pagar (Modelo 303)",
    body: "Es la diferencia entre el IVA que cobraste a clientes y el IVA que pagaste en tus gastos de negocio. Esta cantidad la ingresas en Hacienda cada trimestre.",
    example: "Cobraste €1.050 de IVA y recuperas €200 de gastos. Pagas €850 a Hacienda.",
  },
  irpf_advance: {
    title: "IRPF adelantado (Modelo 130)",
    body: "Como autónomo en Estimación Directa, pagas el 20% de tu beneficio neto cada trimestre como pago a cuenta del IRPF anual. Es como un adelanto: en junio se ajusta con tu declaración real.",
    example: "Ganas €10.000 netos este trimestre. Pagas €2.000 ahora. En junio se calcula tu tipo real y se ajusta.",
  },
  irpf_gap: {
    title: "Diferencia declaración anual",
    body: "El Modelo 130 solo paga un 20% adelantado, pero tu tipo real de IRPF puede ser mayor (según tus tramos). En junio, cuando hagas la declaración de la renta, pagas la diferencia. Kallio la estima para que reserves suficiente.",
    example: "Si tu tipo efectivo real es 28%, has pagado 20% durante el año. La diferencia del 8% la pagas en junio.",
  },
  gjd: {
    title: "Gastos de difícil justificación",
    body: "Un beneficio exclusivo de la Estimación Directa Simplificada: puedes deducir el 5% de tu rendimiento neto sin necesidad de justificarlo con facturas. Cubre pequeños gastos del día a día profesional. Máximo €2.000 al año.",
    example: "Si tu beneficio neto es €17.000, te deduces €850 automáticamente, sin aportar ningún recibo.",
  },
  gross_income: {
    title: "Total facturado (ingresos brutos)",
    body: "Es la suma de todo lo que has cobrado a tus clientes, incluyendo el IVA. Ojo: parte de este dinero (el IVA) no es tuyo — pertenece a Hacienda.",
    example: "Facturas €5.000 + 21% IVA = €6.050 brutos. Solo €5.000 son tus ingresos reales.",
  },
  net_income: {
    title: "Ingresos netos (sin IVA)",
    body: "Lo que realmente has ganado: el total facturado menos el IVA que has cobrado para Hacienda. Esta es la base sobre la que se calcula tu IRPF.",
    example: "De €6.050 brutos, €1.050 van a Hacienda como IVA. Tus ingresos netos son €5.000.",
  },
  spendable: {
    title: "Disponible real",
    body: "Después de apartar lo que debes a Hacienda (IVA + IRPF adelantado) y descontar tus gastos deducibles, esto es lo que puedes gastar sin preocuparte. Es tu dinero de verdad.",
    example: "Ingresas €5.000 netos, tienes €500 en gastos deducibles y debes €1.200 en impuestos. Tu disponible real es €3.300.",
  },
  deductible: {
    title: "Deducible",
    body: "Un gasto es deducible cuando la ley fiscal permite restarlo de tus ingresos para reducir la base del IRPF. Menos base = menos impuestos. Algunos gastos son deducibles al 100% (software, servicios) y otros solo en parte (comidas, transporte, teléfono).",
    example: "Pagas €200 netos en software al 100% deducible. Tu IRPF se reduce en €40 (20% de €200).",
  },
  tax_reserve: {
    title: "Reserva fiscal",
    body: "El dinero que Kallio te recomienda no tocar: la suma del IVA que debes a Hacienda y el IRPF adelantado que pagarás este trimestre. Si lo gastas, tendrás un problema el día de la declaración.",
    example: "IVA a pagar €850 + IRPF adelantado €2.000 = Reserva fiscal €2.850.",
  },
  modelo_130: {
    title: "Modelo 130",
    body: "El formulario trimestral del IRPF para autónomos en Estimación Directa. Declaras tus ingresos y gastos, y pagas el 20% del beneficio neto. Se presenta el 20 de abril, julio, octubre y el 30 de enero.",
    example: "Beneficio neto Q1: €10.000. Presentas el Modelo 130 antes del 20 de abril y pagas €2.000.",
  },
  modelo_303: {
    title: "Modelo 303",
    body: "El formulario trimestral del IVA. Declaras el IVA que has cobrado a clientes y el IVA que has pagado en gastos de negocio. La diferencia es lo que ingresas a Hacienda. Mismos plazos que el Modelo 130.",
    example: "IVA cobrado €1.050, IVA de gastos €200. Presentas el 303 y pagas €850.",
  },
  eds: {
    title: "Estimación Directa Simplificada",
    body: "El régimen fiscal estándar para la mayoría de autónomos con ingresos hasta €600.000/año. Declaras ingresos y gastos reales. A diferencia de 'Módulos', pagas impuestos según lo que realmente ganas. Incluye ventajas como la deducción por gastos de difícil justificación (5%).",
    example: "Si ganas €40.000 y tienes €8.000 en gastos, tributas sobre €32.000 (menos el 5% de GDJ).",
  },
  irpf_retention: {
    title: "Retención de IRPF en factura",
    body: "Algunos clientes (empresas) están obligados a retenerte un % del IRPF directamente en tu factura y pagarlo a Hacienda por ti. El tipo general es el 15% (o el 7% si eres nuevo autónomo). Esa retención ya no la tienes que pagar tú en el Modelo 130.",
    example: "Facturas €1.000 netos con 15% de retención. El cliente te paga €850 y los €150 restantes los ingresa él en Hacienda.",
  },
};

// ─── English explanations ─────────────────────────────────────────────────────

const EN: Record<ConceptKey, Explanation> = {
  iva_collected: {
    title: "VAT collected (output VAT)",
    body: "The VAT you charge your clients on your invoices. This is not your money — you're collecting it on behalf of the tax authority (AEAT). You pay it to them each quarter via Modelo 303.",
    example: "You invoice €5,000 net at 21% VAT, so you collect €6,050. The €1,050 VAT goes to AEAT, not to you.",
  },
  iva_deductible: {
    title: "Recoverable VAT (input VAT)",
    body: "The VAT you pay on business purchases (software, supplies, services…). You can deduct this from the VAT you owe AEAT. Important: only Spanish VAT is recoverable — purchases from foreign providers (US, etc.) don't carry Spanish VAT.",
    example: "You pay €242 for a subscription (€200 + 21% VAT). The €42 VAT is recovered via Modelo 303.",
  },
  iva_payable: {
    title: "VAT payable (Modelo 303)",
    body: "The difference between VAT you collected from clients and VAT you paid on business expenses. This net amount goes to AEAT each quarter.",
    example: "You collected €1,050 VAT and recover €200 from expenses. You pay €850 to AEAT.",
  },
  irpf_advance: {
    title: "Income tax advance (Modelo 130)",
    body: "As a self-employed person under the simplified direct assessment method, you pay 20% of your net profit each quarter as an advance payment toward your annual income tax. Think of it as payroll tax withholding but you do it yourself.",
    example: "You earn €10,000 net this quarter. You pay €2,000 now. The final amount is adjusted in June with your annual tax return.",
  },
  irpf_gap: {
    title: "Annual declaration gap",
    body: "Modelo 130 only advances 20%, but your actual effective IRPF rate may be higher (depending on your tax brackets). When you file your annual return in June, you pay the difference. Kallio estimates this so you can reserve enough.",
    example: "If your real effective rate is 28%, you've been paying 20% advance all year. The 8% difference is due in June.",
  },
  gjd: {
    title: "Hard-to-justify expenses deduction",
    body: "An exclusive benefit of the Simplified Direct Assessment regime: you can deduct 5% of your net income without needing to justify it with receipts. It covers small day-to-day professional expenses. Maximum €2,000 per year.",
    example: "If your net profit is €17,000, you automatically deduct €850 — no receipts needed.",
  },
  gross_income: {
    title: "Total billed (gross income)",
    body: "The total you've charged clients, including VAT. Note: part of this money (the VAT portion) is not yours — it belongs to AEAT.",
    example: "You invoice €5,000 + 21% VAT = €6,050 gross. Only €5,000 is your actual income.",
  },
  net_income: {
    title: "Net income (excl. VAT)",
    body: "What you actually earned: total billed minus the VAT you collected for AEAT. This is the base on which your income tax is calculated.",
    example: "From €6,050 gross, €1,050 goes to AEAT as VAT. Your net income is €5,000.",
  },
  spendable: {
    title: "Real spendable",
    body: "After setting aside what you owe AEAT (VAT + income tax advance) and deducting business expenses, this is what you can freely spend. This is your actual money.",
    example: "€5,000 net income, €500 in deductible expenses, €1,200 in taxes. Your real spendable is €3,300.",
  },
  deductible: {
    title: "Deductible",
    body: "An expense is deductible when tax law allows you to subtract it from your income to reduce your income tax base. Lower base = less tax. Some expenses are 100% deductible (software, services) and others are only partially (meals, transport, phone).",
    example: "You pay €200 net for software (100% deductible). Your income tax reduces by €40 (20% of €200).",
  },
  tax_reserve: {
    title: "Tax reserve",
    body: "The money Kallio recommends you don't touch: the sum of VAT you owe AEAT and the income tax advance due this quarter. Spending it means trouble when tax deadlines arrive.",
    example: "VAT payable €850 + income tax advance €2,000 = Tax reserve €2,850.",
  },
  modelo_130: {
    title: "Modelo 130",
    body: "The quarterly income tax form for self-employed people under the Direct Assessment method. You declare income and expenses, and pay 20% of net profit. Due: April 20, July 20, October 20, January 30.",
    example: "Q1 net profit: €10,000. File Modelo 130 before April 20 and pay €2,000.",
  },
  modelo_303: {
    title: "Modelo 303",
    body: "The quarterly VAT form. You declare the VAT you charged clients and the VAT you paid on business expenses. The difference is what you pay to AEAT. Same deadlines as Modelo 130.",
    example: "VAT collected €1,050, VAT on expenses €200. File Modelo 303 and pay €850.",
  },
  eds: {
    title: "Simplified Direct Assessment",
    body: "The standard tax method for most self-employed people with income up to €600,000/year. You declare actual income and expenses. Unlike the 'modules' method, you pay tax based on what you actually earn. Includes perks like the 5% hard-to-justify expenses deduction.",
    example: "If you earn €40,000 and have €8,000 in expenses, you're taxed on €32,000 (minus the 5% GDJ deduction).",
  },
  irpf_retention: {
    title: "IRPF withholding on invoices",
    body: "Some clients (companies) are required to withhold a % of IRPF directly from your invoice and pay it to AEAT on your behalf. The standard rate is 15% (or 7% for new self-employed). This retained amount reduces what you owe via Modelo 130.",
    example: "You invoice €1,000 net with 15% retention. The client pays you €850 and pays the remaining €150 to AEAT.",
  },
};

// ─── Public accessor ──────────────────────────────────────────────────────────

export function getExplanation(key: ConceptKey, language: Language): Explanation {
  const map = language === "es" ? ES : EN;
  return map[key];
}

export function getAllExplanations(language: Language): Record<ConceptKey, Explanation> {
  return language === "es" ? ES : EN;
}

// ─── Transaction-specific explain content ─────────────────────────────────────

export interface TransactionExplain {
  headline: string;
  sections: { title: string; body: string; highlight?: "good" | "warn" | "neutral" }[];
}

const CATEGORY_REASON_ES: Partial<Record<ExpenseCategory, string>> = {
  software_subscriptions: "Software y suscripciones SaaS son 100% deducibles como herramientas profesionales.",
  hardware_equipment: "El hardware es deducible al 100% si se usa para tu actividad profesional.",
  office_supplies: "El material de oficina es 100% deducible.",
  professional_services: "Los servicios profesionales (gestor, abogado, consultor…) son 100% deducibles.",
  marketing_advertising: "Los gastos de marketing y publicidad son 100% deducibles.",
  travel_transport: "Los gastos de transporte son deducibles al 70% cuando tienen uso mixto profesional/personal. Al 100% si son exclusivamente profesionales.",
  meals_entertainment: "Las comidas de trabajo son deducibles al 50%, hasta un máximo de €2.000/año, y deben estar relacionadas con un cliente o proveedor.",
  phone_internet: "El teléfono e internet son deducibles al 50% como estimación del uso profesional.",
  training_education: "La formación relacionada con tu actividad profesional es 100% deducible.",
  home_office: "Los gastos del hogar son deducibles al 30% de la parte proporcional al espacio de trabajo.",
  rent_utilities: "El alquiler de un local de negocio y sus suministros son 100% deducibles.",
  insurance: "Los seguros profesionales son 100% deducibles.",
  bank_fees: "Las comisiones bancarias relacionadas con la actividad son 100% deducibles.",
  other_deductible: "Clasificado como gasto deducible. Guarda la factura para justificarlo ante Hacienda.",
  personal: "Los gastos personales no tienen relación con tu actividad profesional, por lo que no son deducibles.",
  unclear: "Sin clasificar. Kallio lo cuenta como deducible hasta que lo clasifiques. El asistente de deducciones te preguntará pronto.",
};

const CATEGORY_REASON_EN: Partial<Record<ExpenseCategory, string>> = {
  software_subscriptions: "Software and SaaS subscriptions are 100% deductible as professional tools.",
  hardware_equipment: "Hardware is 100% deductible when used for your professional activity.",
  office_supplies: "Office supplies are 100% deductible.",
  professional_services: "Professional services (accountant, lawyer, consultant…) are 100% deductible.",
  marketing_advertising: "Marketing and advertising expenses are 100% deductible.",
  travel_transport: "Transport expenses are 70% deductible for mixed personal/professional use, 100% if exclusively professional.",
  meals_entertainment: "Business meals are 50% deductible, up to €2,000/year, and must be related to a client or supplier.",
  phone_internet: "Phone and internet are 50% deductible as an estimate of professional use.",
  training_education: "Training related to your professional activity is 100% deductible.",
  home_office: "Home expenses are deductible at 30% of the proportional workspace area.",
  rent_utilities: "Business premises rent and utilities are 100% deductible.",
  insurance: "Professional insurance is 100% deductible.",
  bank_fees: "Banking fees related to your business activity are 100% deductible.",
  other_deductible: "Classified as deductible. Keep the invoice to justify it with AEAT.",
  personal: "Personal expenses are unrelated to your professional activity and therefore not deductible.",
  unclear: "Unclassified. Kallio counts it as deductible until you classify it. The deduction assistant will ask you about it soon.",
};

export function getTransactionExplain(tx: Transaction, language: Language): TransactionExplain {
  const isES = language === "es";
  const isIncome = tx.type === "income";
  const hasIVA = tx.ivaRate > 0;
  const isForeign = !!tx.currency && tx.currency !== "EUR";
  const deductPct = getCategoryDeductibilityPct(tx.category);
  const net = netFromGross(tx.amount, tx.ivaRate);
  const iva = hasIVA ? ivaAmount(tx.amount, tx.ivaRate) : 0;
  const irpfSaving = net * deductPct * 0.2;
  const ivaRecovery = hasIVA && !isForeign ? iva * deductPct : 0;

  const sections: TransactionExplain["sections"] = [];

  if (isIncome) {
    // ── Income ──
    const headline = isES
      ? `Ingreso de ${formatCurrency(tx.amount)}`
      : `Income of ${formatCurrency(tx.amount)}`;

    if (hasIVA) {
      sections.push({
        title: isES ? "IVA repercutido" : "VAT collected",
        body: isES
          ? `Has cobrado ${formatCurrency(iva)} de IVA al ${tx.ivaRate}% en nombre de Hacienda. Este dinero no es tuyo — lo ingresarás en el Modelo 303 al final del trimestre. Tus ingresos reales son ${formatCurrency(net)}.`
          : `You collected ${formatCurrency(iva)} VAT at ${tx.ivaRate}% on behalf of AEAT. This money is not yours — you'll pay it via Modelo 303 at quarter end. Your actual income is ${formatCurrency(net)}.`,
        highlight: "warn",
      });
    } else {
      sections.push({
        title: isES ? "Sin IVA" : "No VAT",
        body: isES
          ? `Esta factura está exenta de IVA (0%). No hay IVA que ingresar a Hacienda. Tus ingresos netos son el total: ${formatCurrency(tx.amount)}.`
          : `This invoice is VAT-exempt (0%). No VAT to pay to AEAT. Your net income equals the total: ${formatCurrency(tx.amount)}.`,
        highlight: "good",
      });
    }

    sections.push({
      title: isES ? "IRPF" : "Income tax",
      body: isES
        ? `Este ingreso forma parte de tu base imponible del IRPF. Pagarás el 20% como adelanto trimestral (Modelo 130). Esto equivale a ${formatCurrency(net * 0.2)} de este ingreso.`
        : `This income is part of your IRPF taxable base. You'll pay 20% as a quarterly advance (Modelo 130) — equivalent to ${formatCurrency(net * 0.2)} from this income.`,
      highlight: "neutral",
    });

    return { headline, sections };
  }

  // ── Expense ──
  const headline = isES
    ? `Gasto de ${formatCurrency(tx.amount)}`
    : `Expense of ${formatCurrency(tx.amount)}`;

  const catReason = (isES ? CATEGORY_REASON_ES : CATEGORY_REASON_EN)[tx.category];

  if (tx.isDeductible && tx.category !== "personal") {
    sections.push({
      title: isES ? "Deducibilidad" : "Deductibility",
      body: catReason ?? (isES ? "Gasto deducible." : "Deductible expense."),
      highlight: deductPct === 1 ? "good" : "warn",
    });

    if (deductPct < 1 && deductPct > 0) {
      sections.push({
        title: isES ? "Porcentaje aplicado" : "Rate applied",
        body: isES
          ? `Solo el ${Math.round(deductPct * 100)}% de este gasto se deduce. Base deducible: ${formatCurrency(net * deductPct)}.`
          : `Only ${Math.round(deductPct * 100)}% of this expense is deductible. Deductible base: ${formatCurrency(net * deductPct)}.`,
        highlight: "warn",
      });
    }

    sections.push({
      title: isES ? "Ahorro en IRPF" : "Income tax saving",
      body: isES
        ? `Reduce tu base imponible en ${formatCurrency(net * deductPct)}, lo que te ahorra aprox. ${formatCurrency(irpfSaving)} en el pago del Modelo 130.`
        : `Reduces your taxable base by ${formatCurrency(net * deductPct)}, saving you approx. ${formatCurrency(irpfSaving)} on your Modelo 130 payment.`,
      highlight: "good",
    });

    // IVA section for expenses
    if (hasIVA && !isForeign) {
      sections.push({
        title: isES ? "IVA recuperable" : "Recoverable VAT",
        body: isES
          ? `Has pagado ${formatCurrency(iva)} de IVA al ${tx.ivaRate}%. Puedes recuperar ${formatCurrency(ivaRecovery)} en tu Modelo 303 trimestral.`
          : `You paid ${formatCurrency(iva)} VAT at ${tx.ivaRate}%. You can recover ${formatCurrency(ivaRecovery)} in your quarterly Modelo 303.`,
        highlight: "good",
      });
    } else if (isForeign) {
      sections.push({
        title: isES ? "IVA extranjero" : "Foreign VAT",
        body: isES
          ? `Pagaste en ${tx.currency}. Los proveedores extranjeros no cobran IVA español, así que no hay IVA que recuperar en el Modelo 303. El gasto sigue siendo deducible para el IRPF.`
          : `You paid in ${tx.currency}. Foreign providers don't charge Spanish VAT, so there's no VAT to recover in Modelo 303. The expense is still deductible for income tax purposes.`,
        highlight: "warn",
      });
    } else if (!hasIVA) {
      sections.push({
        title: isES ? "Sin IVA" : "No VAT",
        body: isES
          ? `Este gasto tiene IVA al 0% — no hay IVA soportado que recuperar.`
          : `This expense has 0% VAT — no input VAT to recover.`,
        highlight: "neutral",
      });
    }
  } else {
    // Non-deductible
    sections.push({
      title: isES ? "No deducible" : "Not deductible",
      body: catReason ?? (isES
        ? "Este gasto no reduce tu base imponible del IRPF ni te permite recuperar IVA."
        : "This expense does not reduce your IRPF taxable base or allow VAT recovery."),
      highlight: "warn",
    });
    if (hasIVA) {
      sections.push({
        title: isES ? "IVA no recuperable" : "VAT not recoverable",
        body: isES
          ? `Aunque has pagado ${formatCurrency(iva)} de IVA, al ser un gasto no deducible no puedes compensarlo con el IVA de tus facturas de venta.`
          : `Although you paid ${formatCurrency(iva)} VAT, since this is a non-deductible expense you cannot offset it against the VAT on your sales invoices.`,
        highlight: "warn",
      });
    }
  }

  return { headline, sections };
}

// ─── Learn page grouped content ───────────────────────────────────────────────

export type LearnGroup = {
  key: string;
  titleES: string;
  titleEN: string;
  icon: string;
  concepts: ConceptKey[];
};

export const LEARN_GROUPS: LearnGroup[] = [
  {
    key: "taxes",
    titleES: "Tus impuestos",
    titleEN: "Your taxes",
    icon: "🏛️",
    concepts: ["iva_collected", "iva_deductible", "iva_payable", "irpf_advance", "irpf_gap"],
  },
  {
    key: "income",
    titleES: "Tus ingresos",
    titleEN: "Your income",
    icon: "📈",
    concepts: ["gross_income", "net_income", "spendable", "irpf_retention"],
  },
  {
    key: "expenses",
    titleES: "Tus gastos",
    titleEN: "Your expenses",
    icon: "🧾",
    concepts: ["deductible", "gjd", "tax_reserve"],
  },
  {
    key: "forms",
    titleES: "Los modelos",
    titleEN: "Tax forms",
    icon: "📋",
    concepts: ["modelo_130", "modelo_303", "eds"],
  },
];
