/**
 * Kallio – PDF export for gestor
 * Generates a structured quarterly report formatted for Spanish gestores.
 */

import { Transaction, TaxSnapshot, UserProfile, QuarterDeadline } from "./types";
import { formatCurrency, netFromGross } from "./tax-engine";

type TFunc = (key: string, vars?: Record<string, string | number>) => string;
type FormatPdfFn = (date: Date) => string;

// Dynamic import to avoid SSR issues
async function getJsPDF() {
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}

export async function generateGestorPDF(
  transactions: Transaction[],
  snap: TaxSnapshot,
  profile: UserProfile,
  deadline: QuarterDeadline & { daysLeft: number },
  t: TFunc,
  formatPdf: FormatPdfFn
): Promise<void> {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const PRIMARY = [79, 70, 229] as [number, number, number];
  const DARK = [15, 23, 42] as [number, number, number];
  const MID = [100, 116, 139] as [number, number, number];
  const LIGHT = [241, 245, 249] as [number, number, number];

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Kallio", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(t("pdf.reportSubtitle"), margin, 21);
  doc.text(t("pdf.generatedOn", { date: formatPdf(new Date()) }), margin, 27);

  y = 42;
  doc.setTextColor(...DARK);

  // ── Datos del autónomo ─────────────────────────────────────────────────────
  section(doc, t("pdf.autonomoSection"), y, margin, contentWidth, LIGHT, PRIMARY);
  y += 8;

  const profileData: [string, string][] = [
    [t("pdf.nameLabel"), profile.name || "—"],
    [t("pdf.nifLabel"), profile.nif || "—"],
    [t("pdf.regimeLabel"), t(`pdf.regimes.${profile.fiscalRegime}`) || profile.fiscalRegime],
    [t("pdf.activityLabel"), profile.activityType || "—"],
    [t("pdf.irpfRetentionLabel"), profile.ivaRetention ? `${(profile.irpfRetentionRate * 100).toFixed(0)}%` : t("pdf.notApplicable")],
  ];
  profileData.forEach(([label, value]) => {
    twoCol(doc, label, value, y, margin, contentWidth, MID);
    y += 6;
  });

  y += 6;

  // ── Período ────────────────────────────────────────────────────────────────
  section(doc, t("pdf.periodSection", { quarter: snap.quarterLabel }), y, margin, contentWidth, LIGHT, PRIMARY);
  y += 8;

  const periodData: [string, string][] = [
    [t("pdf.quarterLabel"), snap.quarterLabel],
    [t("pdf.deadlineLabel"), formatPdf(new Date(deadline.modelo130Deadline))],
  ];
  periodData.forEach(([label, value]) => {
    twoCol(doc, label, value, y, margin, contentWidth, MID);
    y += 6;
  });

  y += 6;

  // ── Resumen fiscal ─────────────────────────────────────────────────────────
  section(doc, t("pdf.fiscalSummary"), y, margin, contentWidth, LIGHT, PRIMARY);
  y += 8;

  const fiscalData: [string, string, boolean][] = [
    [t("pdf.grossIncomeLabel"), formatCurrency(snap.grossIncome), false],
    [t("pdf.netIncomeLabel"), formatCurrency(snap.grossIncome - snap.ivaCollected), false],
    [t("pdf.deductibleExpensesLabel"), formatCurrency(snap.deductibleExpenses), false],
    [t("pdf.netTaxableLabel"), formatCurrency(snap.netTaxableIncome), false],
    ["", "", false],
    [t("pdf.ivaCollectedLabel"), formatCurrency(snap.ivaCollected), false],
    [t("pdf.ivaDeductibleLabel"), formatCurrency(snap.ivaDeductible), false],
    [t("pdf.ivaPayableLabel"), formatCurrency(snap.ivaPayable), true],
    [t("pdf.irpfPayableLabel"), formatCurrency(snap.irpfAdvancePayable), true],
    [t("pdf.totalPayableLabel"), formatCurrency(snap.totalTaxReserve), true],
  ];

  fiscalData.forEach(([label, value, bold]) => {
    if (!label) { y += 3; return; }
    twoCol(doc, label, value, y, margin, contentWidth, MID, bold);
    y += 6;
  });

  y += 8;

  // ── Ingresos ───────────────────────────────────────────────────────────────
  const income = transactions.filter((tx) => tx.type === "income");
  if (income.length > 0) {
    section(doc, t("pdf.incomeSection", { count: income.length }), y, margin, contentWidth, LIGHT, PRIMARY);
    y += 8;

    tableHeader(doc, [t("pdf.colDate"), t("pdf.colDescription"), t("pdf.colBase"), t("pdf.colIva"), t("pdf.colTotal")], y, margin, contentWidth);
    y += 7;

    income.forEach((tx, i) => {
      if (y > 260) { doc.addPage(); y = margin; }
      const base = netFromGross(tx.amount, tx.ivaRate);
      const bg = i % 2 === 0 ? ([248, 250, 252] as [number, number, number]) : ([255, 255, 255] as [number, number, number]);
      doc.setFillColor(...bg);
      doc.rect(margin, y - 4, contentWidth, 6, "F");
      tableRow(
        doc,
        [
          formatPdf(new Date(tx.date)),
          tx.description.length > 35 ? tx.description.slice(0, 33) + "…" : tx.description,
          formatCurrency(base),
          `${tx.ivaRate}%`,
          formatCurrency(tx.amount),
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
  const deductible = transactions.filter((tx) => tx.type === "expense" && tx.isDeductible);
  if (deductible.length > 0) {
    if (y > 220) { doc.addPage(); y = margin; }

    section(doc, t("pdf.deductibleSection", { count: deductible.length }), y, margin, contentWidth, LIGHT, PRIMARY);
    y += 8;

    tableHeader(doc, [t("pdf.colDate"), t("pdf.colDescriptionShort"), t("pdf.colCategory"), t("pdf.colBase"), t("pdf.colTotal")], y, margin, contentWidth);
    y += 7;

    deductible.forEach((tx, i) => {
      if (y > 260) { doc.addPage(); y = margin; }
      const base = netFromGross(tx.amount, tx.ivaRate);
      const bg = i % 2 === 0 ? ([248, 250, 252] as [number, number, number]) : ([255, 255, 255] as [number, number, number]);
      doc.setFillColor(...bg);
      doc.rect(margin, y - 4, contentWidth, 6, "F");
      tableRow(
        doc,
        [
          formatPdf(new Date(tx.date)),
          tx.description.length > 28 ? tx.description.slice(0, 26) + "…" : tx.description,
          t(`pdf.categories.${tx.category}`) || tx.category,
          formatCurrency(base),
          formatCurrency(tx.amount),
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
  doc.text(t("pdf.footer"), margin, 287, { maxWidth: contentWidth });

  doc.save(t("pdf.filename", { quarter: snap.quarterLabel.replace(" ", "-") }));
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
