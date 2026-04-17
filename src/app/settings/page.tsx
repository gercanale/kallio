"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, User } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { Navigation } from "@/components/Navigation";

export default function SettingsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const signOut = useKallioStore((s) => s.signOut);
  const resetAll = useKallioStore((s) => s.resetAll);

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) {
      router.replace("/");
    } else if (!profile.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [hydrated, sessionActive, profile.onboardingComplete, router]);

  if (!hydrated || !sessionActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  const handleDeleteAll = () => {
    if (confirm("¿Seguro que quieres borrar todos tus datos? Esta acción no se puede deshacer.")) {
      resetAll();
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 sm:pb-0 transition-colors">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Ajustes</h1>

        {/* Profile section */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                <User className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{profile.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile.activityType}</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            <SettingsRow label="Régimen fiscal" value="Estimación Directa Simplificada" />
            <SettingsRow
              label="Retención IRPF"
              value={profile.ivaRetention ? `${(profile.irpfRetentionRate * 100).toFixed(0)}%` : "Sin retención"}
            />
            <SettingsRow label="NIF" value={profile.nif ?? "—"} />
          </div>
        </div>

        {/* Pricing note */}
        <div className="bg-gradient-to-r from-teal-50 to-teal-50 dark:from-teal-900/30 dark:to-teal-900/30 border border-teal-100 dark:border-teal-800 rounded-2xl p-5 mb-4">
          <p className="text-sm font-semibold text-teal-800 dark:text-teal-300 mb-1">Plan gratuito – MVP</p>
          <p className="text-xs text-teal-600 dark:text-teal-400">
            Todas las funciones disponibles durante el período de validación.
            La versión Pro estará disponible próximamente desde €9/mes.
          </p>
        </div>

        {/* Session / account actions */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left border-b border-slate-100 dark:border-slate-700"
          >
            <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <div>
              <p className="text-sm font-medium">Cerrar sesión</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Tus datos se conservan. Puedes volver a entrar desde la pantalla de inicio.</p>
            </div>
          </button>

          {/* Delete all — permanent */}
          <button
            onClick={handleDeleteAll}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">Borrar todos mis datos</p>
              <p className="text-xs text-red-400">Permanente. No se puede deshacer.</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{value}</span>
    </div>
  );
}
