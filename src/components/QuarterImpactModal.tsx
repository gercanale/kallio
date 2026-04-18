"use client";

import { AlertTriangle, X } from "lucide-react";
import { useT } from "@/lib/useT";
import { formatCurrency } from "@/lib/tax-engine";
import type { TaxSnapshot } from "@/lib/types";

interface QuarterImpactModalProps {
  quarterLabel: string;   // e.g. "2T"
  year: number;
  before: TaxSnapshot;
  after: TaxSnapshot;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeltaRow({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {
  const diff = after - before;
  const sign = diff > 0 ? "+" : "";
  const color =
    diff === 0
      ? "text-slate-500"
      : diff > 0
      ? "text-red-600"
      : "text-emerald-600";

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-3 text-xs text-slate-600 w-1/3">{label}</td>
      <td className="py-2.5 px-2 text-xs text-right tabular-nums text-slate-700">
        {formatCurrency(before)}
      </td>
      <td className="py-2.5 px-2 text-xs text-right tabular-nums text-slate-700">
        {formatCurrency(after)}
      </td>
      <td className={`py-2.5 pl-2 text-xs text-right tabular-nums font-semibold ${color}`}>
        {diff === 0 ? "—" : `${sign}${formatCurrency(Math.abs(diff))}`}
      </td>
    </tr>
  );
}

export function QuarterImpactModal({
  quarterLabel,
  year,
  before,
  after,
  onConfirm,
  onCancel,
}: QuarterImpactModalProps) {
  const t = useT();

  const vatDiff = after.ivaPayable - before.ivaPayable;
  const irpfDiff = after.irpfAdvancePayable - before.irpfAdvancePayable;
  const netEffect = vatDiff + irpfDiff;
  const netSign = netEffect > 0 ? "+" : "";
  const netColor =
    netEffect === 0
      ? "text-slate-700"
      : netEffect > 0
      ? "text-red-600"
      : "text-emerald-600";

  const subtitle = t.pastQuarter.impactSubtitle
    .replace("{label}", quarterLabel)
    .replace("{year}", String(year));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                {t.pastQuarter.impactTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Delta table */}
        <div className="px-5 pb-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-slate-400 pb-2 w-1/3" />
                <th className="text-right text-xs font-medium text-slate-400 pb-2 px-2">
                  {t.pastQuarter.beforeLabel}
                </th>
                <th className="text-right text-xs font-medium text-slate-400 pb-2 px-2">
                  {t.pastQuarter.afterLabel}
                </th>
                <th className="text-right text-xs font-medium text-slate-400 pb-2 pl-2">
                  {t.pastQuarter.diffLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              <DeltaRow
                label={t.pastQuarter.vatRow}
                before={before.ivaPayable}
                after={after.ivaPayable}
              />
              <DeltaRow
                label={t.pastQuarter.irpfRow}
                before={before.irpfAdvancePayable}
                after={after.irpfAdvancePayable}
              />
            </tbody>
          </table>

          {/* Net effect */}
          <div className="mt-3 flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <span className="text-xs font-semibold text-slate-700">
              {t.pastQuarter.netEffect}
            </span>
            <span className={`text-sm font-bold tabular-nums ${netColor}`}>
              {netEffect === 0
                ? "—"
                : `${netSign}${formatCurrency(Math.abs(netEffect))}`}
            </span>
          </div>

          {/* Warning note */}
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-4 py-2.5 mt-3 leading-relaxed">
            ⚠ {t.pastQuarter.warningNote}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="py-3 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            {t.pastQuarter.cancelButton}
          </button>
          <button
            onClick={onConfirm}
            className="py-3 rounded-xl text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors"
          >
            {t.pastQuarter.confirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}
