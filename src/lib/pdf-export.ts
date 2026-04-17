/**
 * Kallio – PDF export for gestor
 * Generates a structured quarterly report formatted for Spanish gestores.
 */

import { Transaction, TaxSnapshot, UserProfile, QuarterDeadline } from "./types";
import { formatCurrency, formatDate, netFromGross } from "./tax-engine";

// Dynamic import to avoid SSR issues
async function getJsPDF() {
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}

export async function generateGestorPDF(
  transactions: Transaction[],
  snap: TaxSnapshot,
  profile: UserProfile,
  deadline: QuarterDeadline & { daysLeft: number }
): Promise<void> {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const PRIMARY = [79, 70, 229] as [number, number, number]; // indigo-600
  const DARK = [15, 23, 42] as [number, number, number];     // slate-900
  const MID = [100, 116, 139] as [number, number, number];   // slate-500
  const LIGHT = [241, 245, 249] as [number, number, number]; // slate-100

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Kallio", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Informe trimestral de actividad para gestor", margin, 21);
  doc.text(
    `Generado el ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`,
    margin,
    27
  );

  y = 42;
  doc.setTextColor(...DARK);

  // ── Datos del autónomo ─────────────────────────────────────────────────────
  section(doc, "Datos del autónomo", y, margin, contentWidth, LIGHT, PRIMARY);
  y += 8;

  const profileData = [
    ["Nombre", profile.name || "—"],
    ["NIF", profile.nif || "—"],
    ["Régimen fiscal", regimeLabel(profile.fiscalRegime)],
    ["Actividad", profile.activityType || "—"],
    ["Retención IRPF", profile.ivaRetention ? `${(profile.irpfRetentionRate * 100).toFixed(0)}%` : "No aplica"],
  ];
  profileData.forEach(([label, value]) => {
    twoCol(doc, label, value, y, margin, contentWidth, MID);
    y += 6;
  });

  y += 6;

  // ── Período ────────────────────────────────────────────────────────────────
  section(doc, `Período: ${snap.quarterLabel}`, y, margin, contentWidth, LIGHT, PRIMARY);
  y += 8;

  const periodData = [
    ["Trimestre", snap.quarterLabel],
    ["Fecha límite declaración", new Date(deadline.modelo130Deadline).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })],
  ];
  periodData.forEach(([label, value]) => {
    twoCol(doc, label, value, y, margin, contentWidth, MID);
    y += 6;
  });

  y += 6;

  // ── Resumen fiscal ─────────────────────────────────────────────────────────
  section(doc, "Resumen fiscal estimado", y, margin, contentWidth, LIGHT, PRIMARY);
  y += 8;

  const fiscalData: [string, string, boolean][] = [
    ["Ingresos brutos (base + IVA)", formatCurrency(snap.grossIncome), false],
    ["Ingresos netos (sin IVA)", formatCurrency(snap.grossIncome - snap.ivaCollected), false],
    ["Gastos deducibles (neto)", formatCurrency(snap.deductibleExpenses), false],
    ["Rendimiento neto", formatCurrency(snap.netTaxableIncome), false],
    ["", "", false],
    ["IVA repercutido (cobrado)", formatCurrency(snap.ivaCollected), false],
    ["IVA soportado deducible", formatCurrency(snap.ivaDeductible), false],
    ["IVA a ingresar (Modelo 303)", formatCurrency(snap.ivaPayable), true],
    ["IRPF adelantado (Modelo 130)", formatCurrency(snap.irpfAdvancePayable), true],
    ["TOTAL A INGRESAR", formatCurrency(snap.totalTaxReserve), true],
  ];

  fiscalData.forEach(([label, value, bold]) => {
    if (!label) { y += 3; return; }
    twoCol(doc, label, value, y, margin, contentWidth, MID, bold);
    y += 6;
  });

  y += 8;

  // ── Ingresos ───────────────────────────────────────────────────────────────
  const income = transactions.filter((t) => t.type === "income");
  if (income.length > 0) {
    section(doc, `Ingresos (${income.length})`, y, margin, contentWidth, LIGHT, PRIMARY);
    y += 8;

    // Table header
    tableHeader(doc, ["Fecha", "Descripción / Cliente", "Base", "IVA", "Total"], y, margin, contentWidth);
    y += 7;

    income.forEach((t, i) => {
      if (y > 260) { doc.addPage(); y = margin; }
      const base = netFromGross(t.amount, t.ivaRate);
      const iva = t.amount - base;
      const bg = i % 2 === 0 ? ([248, 250, 252] as [number, number, number]) : ([255, 255, 255] as [number, number, number]);
      doc.setFillColor(...bg);
      doc.rect(margin, y - 4, contentWidth, 6, "F");
      tableRow(
        doc,
        [
          formatDate(t.date),
          t.description.length > 35 ? t.description.slice(0, 33) + "…" : t.description,
          formatCurrency(base),
          `${t.ivaRate}%`,
          formatCurrency(t.amount),
        ],
        y,
        margin,
        contentWidth
      );
      y += 6;
    });
    y += 6;
  }

  // ── Gastos deducibles ─────────────────────────────────────────────────────
  const deductible = transactions.filter((t) => t.type === "expense" && t.isDeductible);
  if (deductible.length > 0) {
    if (y > 220) { doc.addPage(); y = margin; }

    section(doc, `Gastos deducibles (${deductible.length})`, y, margin, contentWidth, LIGHT, PRIMARY);
    y += 8;

    tableHeader(doc, ["Fecha", "Descripción", "Categoría", "Base", "Total"], y, margin, contentWidth);
    y += 7;

    deductible.forEach((t, i) => {
      if (y > 260) { doc.addPage(); y = margin; }
      const base = netFromGross(t.amount, t.ivaRate);
      const bg = i % 2 === 0 ? ([248, 250, 252] as [number, number, number]) : ([255, 255, 255] as [number, number, number]);
      doc.setFillColor(...bg);
      doc.rect(margin, y - 4, contentWidth, 6, "F");
      tableRow(
        doc,
        [
          formatDate(t.date),
          t.description.length > 28 ? t.description.slice(0, 26) + "…" : t.description,
          categoryLabel(t.category as string),
          formatCurrency(base),
          formatCurrency(t.amount),
        ],
        y,
        margin,
        contentWidth
      );
      y += 6;
    });
    y += 6;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setTextColor(...MID);
  doc.text(
    "Generado por Kallio · Las cifras son estimadas basadas en los datos introducidos. Consulte con su gestor para la presentación oficial.",
    margin,
    287,
    { maxWidth: contentWidth }
  );

  // Save
  doc.save(`kallio-informe-${snap.quarterLabel.replace(" ", "-")}.pdf`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function section(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  title: string,
  y: number,
  margin: number,
  width: number,
  bg: [number, number, number],
  color: [number, number, number]
) {
  doc.setFillColor(...bg);
  doc.rect(margin, y - 4, width, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...color);
  doc.text(title, margin + 2, y + 0.5);
  doc.setTextColor(15, 23, 42);
}

function twoCol(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  label: string,
  value: string,
  y: number,
  margin: number,
  width: number,
  labelColor: [number, number, number],
  bold = false
) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...labelColor);
  doc.text(label, margin + 2, y);
  doc.setTextColor(15, 23, 42);
  doc.text(value, margin + width - 2, y, { align: "right" });
}

function tableHeader(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  cols: string[],
  y: number,
  margin: number,
  width: number
) {
  doc.setFillColor(79, 70, 229);
  doc.rect(margin, y - 4, width, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  const colW = width / cols.length;
  cols.forEach((col, i) => {
    doc.text(col, margin + i * colW + 2, y);
  });
}

function tableRow(
  doc: InstanceType<Awaited<ReturnType<typeof getJsPDF>>>,
  cells: string[],
  y: number,
  margin: number,
  width: number
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const colW = width / cells.length;
  cells.forEach((cell, i) => {
    doc.text(cell, margin + i * colW + 2, y);
  });
}

function regimeLabel(regime: string): string {
  const map: Record<string, string> = {
    estimacion_directa_simplificada: "Estimación Directa Simplificada",
    estimacion_directa_normal: "Estimación Directa Normal",
    estimacion_objetiva: "Estimación Objetiva (Módulos)",
  };
  return map[regime] ?? regime;
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    software_subscriptions: "Software / SaaS",
    hardware_equipment: "Hardware",
    office_supplies: "Material oficina",
    professional_services: "Servicios prof.",
    marketing_advertising: "Marketing",
    travel_transport: "Transporte",
    meals_entertainment: "Comidas trabajo",
    phone_internet: "Teléfono/Internet",
    training_education: "Formación",
    home_office: "Oficina en casa",
    rent_utilities: "Alquiler/Suministros",
    insurance: "Seguros",
    bank_fees: "Comisiones bancarias",
    other_deductible: "Otros deducibles",
    personal: "Personal",
    unclear: "Sin clasificar",
  };
  return map[cat] ?? cat;
}
