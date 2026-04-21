"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, User, Pencil, Check, X, Crown } from "lucide-react";
import type { NifType } from "@/lib/types";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import { Navigation } from "@/components/Navigation";

export default function SettingsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const signOut = useKallioStore((s) => s.signOut);
  const resetAll = useKallioStore((s) => s.resetAll);
  const updateName = useKallioStore((s) => s.updateName);
  const updateIrpfAdvanceRate = useKallioStore((s) => s.updateIrpfAdvanceRate);
  const updateNif = useKallioStore((s) => s.updateNif);
  const t = useT();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [editingIrpf, setEditingIrpf] = useState(false);
  const [irpfRateValue, setIrpfRateValue] = useState<number | undefined>(undefined);
  const [savingIrpf, setSavingIrpf] = useState(false);

  const [editingNif, setEditingNif] = useState(false);
  const [nifValue, setNifValue] = useState("");
  const [nifTypeValue, setNifTypeValue] = useState<NifType>("NIF");
  const [savingNif, setSavingNif] = useState(false);

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
    if (deleteConfirmText !== t.settings.deleteAccountConfirmWord) return;
    resetAll();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 sm:pb-0 transition-colors">
      <Navigation />

      <main className="lg:ml-56 px-4 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t.settings.title}</h1>

        {/* Profile section */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-4">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleStartEditName} className="group flex items-center gap-1.5 text-left">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{profile.name}</p>
                      <Pencil className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <span className="relative group cursor-help">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <Crown className="w-3 h-3" />
                        Pro MVP
                      </span>
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[180px] rounded-lg bg-slate-800 dark:bg-slate-700 px-2.5 py-1.5 text-xs text-white text-center leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
                        {t.settings.planTooltip}
                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
                      </span>
                    </span>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">{profile.activityType}</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden rounded-b-2xl">
            <SettingsRow label={t.settings.fiscalRegime} value={t.settings.fiscalRegimeValue} />
            <SettingsRow
              label={t.settings.irpfRetention}
              value={profile.ivaRetention ? `${(profile.irpfRetentionRate * 100).toFixed(0)}%` : t.settings.noRetention}
            />
            {!editingNif ? (
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {profile.nifType ?? "NIF"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                    {profile.nif ?? "—"}
                  </span>
                  <button
                    onClick={() => {
                      setNifValue(profile.nif ?? "");
                      setNifTypeValue(profile.nifType ?? "NIF");
                      setEditingNif(true);
                    }}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    {t.settings.nifEdit}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.settings.nifDocType}</p>
                <div className="flex gap-2">
                  {(["NIF", "NIE", "CIF", "DNI"] as NifType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNifTypeValue(type)}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                        nifTypeValue === type
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                          : "border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <input
                  autoFocus
                  value={nifValue}
                  onChange={(e) => setNifValue(e.target.value.toUpperCase())}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      setSavingNif(true);
                      await updateNif(nifValue.trim() || undefined, nifValue.trim() ? nifTypeValue : undefined);
                      setSavingNif(false);
                      setEditingNif(false);
                    }
                    if (e.key === "Escape") setEditingNif(false);
                  }}
                  placeholder="12345678A"
                  className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                  disabled={savingNif}
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setSavingNif(true);
                      await updateNif(nifValue.trim() || undefined, nifValue.trim() ? nifTypeValue : undefined);
                      setSavingNif(false);
                      setEditingNif(false);
                    }}
                    disabled={savingNif}
                    className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {t.common.save}
                  </button>
                  <button
                    onClick={() => setEditingNif(false)}
                    disabled={savingNif}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* IRPF Advance Rate */}
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-4 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.settings.irpfAdvanceRateLabel}</p>
            {!editingIrpf && (
              <button
                onClick={() => { setIrpfRateValue(profile.irpfAdvanceRate); setEditingIrpf(true); }}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
              >
                {t.settings.irpfAdvanceRateEdit}
              </button>
            )}
          </div>

          {!editingIrpf ? (
            <div className="px-5 py-3.5">
              {profile.irpfAdvanceRate === undefined ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">{t.settings.irpfAdvanceRateNotSet}</p>
              ) : (
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{(profile.irpfAdvanceRate * 100).toFixed(0)}%</p>
              )}
            </div>
          ) : (
            <div className="px-5 py-4 space-y-2">
              {[
                { rate: 0.2, label: "20%" },
                { rate: 0.25, label: "25%" },
                { rate: 0.3, label: "30%" },
              ].map(({ rate, label }) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setIrpfRateValue(rate)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    irpfRateValue === rate
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                      : "border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  {label}
                  {irpfRateValue === rate && <Check className="w-4 h-4" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIrpfRateValue(undefined)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  irpfRateValue === undefined
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                    : "border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                {t.settings.irpfAdvanceRateNotSet}
                {irpfRateValue === undefined && <Check className="w-4 h-4" />}
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => {
                    setSavingIrpf(true);
                    await updateIrpfAdvanceRate(irpfRateValue);
                    setSavingIrpf(false);
                    setEditingIrpf(false);
                  }}
                  disabled={savingIrpf}
                  className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {t.settings.irpfAdvanceRateSave}
                </button>
                <button
                  onClick={() => setEditingIrpf(false)}
                  disabled={savingIrpf}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t.settings.irpfAdvanceRateCancel}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Session / account actions — solo mobile, desktop usa sidebar */}
        <div className="lg:hidden bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mb-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <div>
              <p className="text-sm font-medium">{t.settings.signOut}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{t.settings.signOutSubtitle}</p>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-red-200 dark:border-red-900 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t.settings.dangerZone}</p>
          </div>
          <div className="bg-white dark:bg-slate-800/60">
            <button
              onClick={() => { setDeleteConfirmText(""); setShowDeleteModal(true); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t.settings.deleteAccountButton}</p>
                <p className="text-xs text-red-400">{t.settings.deleteAccountPermanent}</p>
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
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t.settings.deleteAccountModalTitle}</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t.settings.deleteAccountModalDesc}{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{t.settings.deleteAccountConfirmWord}</span>.
            </p>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleDeleteAll(); if (e.key === "Escape") setShowDeleteModal(false); }}
              placeholder={t.settings.deleteAccountConfirmWord}
              className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== t.settings.deleteAccountConfirmWord}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {t.settings.deleteAccountConfirmButton}
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
