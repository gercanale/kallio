"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, User } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { Navigation } from "@/components/Navigation";

export default function SettingsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [hydrated, profile.onboardingComplete, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleReset = () => {
    if (confirm("¿Seguro que quieres borrar todos tus datos? Esta acción no se puede deshacer.")) {
      localStorage.removeItem("kallio-storage");
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 mb-6">Ajustes</h1>

        {/* Profile section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{profile.name}</p>
                <p className="text-xs text-slate-500">{profile.activityType}</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <SettingsRow label="Régimen fiscal" value="Estimación Directa Simplificada" />
            <SettingsRow
              label="Retención IRPF"
              value={profile.ivaRetention ? `${(profile.irpfRetentionRate * 100).toFixed(0)}%` : "Sin retención"}
            />
            <SettingsRow label="NIF" value={profile.nif ?? "—"} />
          </div>
        </div>

        {/* Pricing note */}
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5 mb-4">
          <p className="text-sm font-semibold text-indigo-800 mb-1">Plan gratuito – MVP</p>
          <p className="text-xs text-indigo-600">
            Todas las funciones disponibles durante el período de validación.
            La versión Pro estará disponible próximamente desde €9/mes.
          </p>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Borrar todos mis datos</span>
          </button>
        </div>
      </main>
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
