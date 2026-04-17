"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import type { IVARate, TransactionType, ExpenseCategory } from "@/lib/types";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "software_subscriptions", label: "Software / SaaS" },
  { value: "hardware_equipment", label: "Hardware / Equipos" },
  { value: "office_supplies", label: "Material de oficina" },
  { value: "professional_services", label: "Servicios profesionales" },
  { value: "marketing_advertising", label: "Marketing / Publicidad" },
  { value: "travel_transport", label: "Viajes / Transporte" },
  { value: "meals_entertainment", label: "Comidas de trabajo" },
  { value: "phone_internet", label: "Teléfono / Internet" },
  { value: "training_education", label: "Formación" },
  { value: "home_office", label: "Oficina en casa" },
  { value: "rent_utilities", label: "Alquiler / Suministros" },
  { value: "insurance", label: "Seguros" },
  { value: "bank_fees", label: "Comisiones bancarias" },
  { value: "other_deductible", label: "Otros gastos profesionales" },
  { value: "personal", label: "Gasto personal (no deducible)" },
  { value: "unclear", label: "No estoy seguro" },
];

interface TransactionFormProps {
  onClose: () => void;
  defaultType?: TransactionType;
}

export function TransactionForm({ onClose, defaultType = "expense" }: TransactionFormProps) {
  const addTransaction = useKallioStore((s) => s.addTransaction);

  const [type, setType] = useState<TransactionType>(defaultType);
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [ivaRate, setIvaRate] = useState<IVARate>(21);
  const [category, setCategory] = useState<ExpenseCategory>("unclear");
  const [isDeductible, setIsDeductible] = useState(true);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(",", "."));
    if (!description.trim()) { setError("Añade una descripción"); return; }
    if (isNaN(parsed) || parsed <= 0) { setError("Importe no válido"); return; }

    addTransaction({
      date: new Date(date).toISOString(),
      description: description.trim(),
      merchant: merchant.trim() || undefined,
      amount: parsed,
      type,
      ivaRate,
      category,
      isDeductible: type === "income" ? false : isDeductible,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-semibold text-slate-900">Nuevo movimiento</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            {(["income", "expense"] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  type === t
                    ? t === "income"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-red-500 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "income" ? "Ingreso" : "Gasto"}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Descripción *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "income" ? "Ej: Proyecto web – Acme Corp" : "Ej: Suscripción Figma"}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>

          {/* Merchant / client */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {type === "income" ? "Cliente" : "Proveedor / Comercio"}
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder={type === "income" ? "Nombre del cliente" : "Nombre del comercio"}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>

          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Importe (€) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* IVA rate */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Tipo de IVA
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([21, 10, 4, 0] as IVARate[]).map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setIvaRate(rate)}
                  className={`py-2 rounded-xl text-sm font-medium transition-all border ${
                    ivaRate === rate
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {rate === 0 ? "Exento" : `${rate}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Category (expenses only) */}
          {type === "expense" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Deductible toggle (expenses only) */}
          {type === "expense" && category !== "personal" && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-800">¿Es deducible?</p>
                <p className="text-xs text-slate-500">
                  {isDeductible ? "Se descontará del IRPF" : "No se aplicará deducción"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeductible(!isDeductible)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isDeductible ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isDeductible ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Añadir movimiento
          </button>
        </form>
      </div>
    </div>
  );
}
