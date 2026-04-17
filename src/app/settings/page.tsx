"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, User, Pencil, Check, X } from "lucide-react";
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
  const updateName = useKallioStore((s) => s.updateName);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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

  const handleStartEditName = () => {
    setNameValue(profile.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === profile.name) { setEditingName(false); return; }
    setSavingName(true);
    await updateName(trimmed);
    setSavingName(false);
    setEditingName(false);
  };

  const handleCancelName = () => {
    setEditingName(false);
    setNameValue("");
  };

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  const handleDeleteAll = () => {
    if (deleteConfirmText !== "Eliminar") return;
    resetAll();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 sm:pb-0 transition-colors">
      <Navigation />

      <main className="lg:ml-56 px-4 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Ajustes</h1>

        {/* Profile section */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                <User className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={nameInputRef}
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") handleCancelName(); }}
                      className="text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-teal-500 w-40"
                      disabled={savingName}
                    />
                    <button onClick={handleSaveName} disabled={savingName} className="text-teal-600 dark:text-teal-400 hover:text-teal-700 disabled:opacity-50">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={handleCancelName} disabled={savingName} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={handleStartEditName} className="group flex items-center gap-1.5 text-left">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{profile.name}</p>
                    <Pencil className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
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
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mb-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <div>
              <p className="text-sm font-medium">Cerrar sesión</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Tus datos se conservan. Puedes volver a entrar desde la pantalla de inicio.</p>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-red-200 dark:border-red-900 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Danger Zone</p>
          </div>
          <div className="bg-white dark:bg-slate-800/60">
            <button
              onClick={() => { setDeleteConfirmText(""); setShowDeleteModal(true); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">Borrar todos mis datos y cerrar cuenta</p>
                <p className="text-xs text-red-400">Permanente. No se puede deshacer.</p>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Borrar cuenta</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Esta acción eliminará todos tus datos y cerrará tu cuenta de forma permanente. Para confirmar, escribe <span className="font-semibold text-slate-900 dark:text-slate-100">Eliminar</span>.
            </p>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleDeleteAll(); if (e.key === "Escape") setShowDeleteModal(false); }}
              placeholder="Eliminar"
              className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== "Eliminar"}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      )}
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
