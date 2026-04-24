"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, User, Pencil, Check, X, Crown } from "lucide-react";
import type { NifType } from "@/lib/types";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import { Navigation } from "@/components/Navigation";

const C = {
  BG: '#fdfaf3', INK: '#1a1f2e', MUTED: '#6b6456',
  BORDER: '#e8dfc8', IVA: '#c44536', IRPF: '#d4a017',
  OK: '#5a7a3e', CARD: '#ffffff',
};

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
      <div style={{ minHeight: '100dvh', background: C.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${C.IVA}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  const inputStyle: React.CSSProperties = {
    background: C.BG,
    border: `1px solid ${C.BORDER}`,
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    color: C.INK,
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const primaryBtnStyle: React.CSSProperties = {
    background: C.INK,
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '10px 0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flex: 1,
  };

  const secondaryBtnStyle: React.CSSProperties = {
    background: 'transparent',
    color: C.MUTED,
    border: `1px solid ${C.BORDER}`,
    borderRadius: 10,
    padding: '10px 0',
    fontSize: 14,
    fontFamily: 'inherit',
    cursor: 'pointer',
    flex: 1,
  };

  const cardStyle: React.CSSProperties = {
    background: C.CARD,
    border: `1px solid ${C.BORDER}`,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  };

  const cardHeaderStyle: React.CSSProperties = {
    borderBottom: `1px solid ${C.BORDER}`,
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: `1px solid ${C.BORDER}`,
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK }}>
      <Navigation />

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '80px 24px 88px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: C.INK }}>{t.settings.title}</h1>

        {/* Profile section */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: '#eef3eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User style={{ width: 24, height: 24, color: C.INK }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      ref={nameInputRef}
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") handleCancelName(); }}
                      style={{ ...inputStyle, width: 160, padding: '4px 8px', fontSize: 14, fontWeight: 600 }}
                      disabled={savingName}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.OK, opacity: savingName ? 0.5 : 1, padding: 0 }}
                    >
                      <Check style={{ width: 16, height: 16 }} />
                    </button>
                    <button
                      onClick={handleCancelName}
                      disabled={savingName}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.MUTED, padding: 0 }}
                    >
                      <X style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleStartEditName}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
                    >
                      <span style={{ fontWeight: 600, color: C.INK, fontSize: 14 }}>{profile.name}</span>
                      <Pencil style={{ width: 14, height: 14, color: C.MUTED }} />
                    </button>
                    <span style={{ position: 'relative', cursor: 'help' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: '#fdf6e3', color: '#7a5a0a', border: `1px solid #e8d49a` }}>
                        <Crown style={{ width: 12, height: 12 }} />
                        Pro MVP
                      </span>
                    </span>
                  </div>
                )}
                <p style={{ fontSize: 12, color: C.MUTED, marginTop: 2 }}>{profile.activityType}</p>
              </div>
            </div>
          </div>

          <div style={{ overflow: 'hidden', borderRadius: '0 0 14px 14px' }}>
            <SettingsRow label={t.settings.fiscalRegime} value={t.settings.fiscalRegimeValue} />
            <SettingsRow
              label={t.settings.irpfRetention}
              value={profile.ivaRetention ? `${(profile.irpfRetentionRate * 100).toFixed(0)}%` : t.settings.noRetention}
            />
            {!editingNif ? (
              <div style={rowStyle}>
                <span style={{ fontSize: 14, color: C.MUTED }}>
                  {profile.nifType ?? "NIF"}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.INK }}>
                    {profile.nif ?? "—"}
                  </span>
                  <button
                    onClick={() => {
                      setNifValue(profile.nif ?? "");
                      setNifTypeValue(profile.nifType ?? "NIF");
                      setEditingNif(true);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.MUTED, textDecoration: 'underline', padding: 0 }}
                  >
                    {t.settings.nifEdit}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: C.MUTED, margin: 0 }}>{t.settings.nifDocType}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(["NIF", "NIE", "CIF", "DNI"] as NifType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNifTypeValue(type)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        ...(nifTypeValue === type
                          ? { border: `2px solid ${C.INK}`, background: '#f5f0e8', color: C.INK }
                          : { border: `1px solid ${C.BORDER}`, background: C.CARD, color: C.MUTED }),
                      }}
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
                  style={{ ...inputStyle, textTransform: 'uppercase' }}
                  disabled={savingNif}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={async () => {
                      setSavingNif(true);
                      await updateNif(nifValue.trim() || undefined, nifValue.trim() ? nifTypeValue : undefined);
                      setSavingNif(false);
                      setEditingNif(false);
                    }}
                    disabled={savingNif}
                    style={{ ...primaryBtnStyle, opacity: savingNif ? 0.5 : 1 }}
                  >
                    {t.common.save}
                  </button>
                  <button
                    onClick={() => setEditingNif(false)}
                    disabled={savingNif}
                    style={secondaryBtnStyle}
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* IRPF Advance Rate */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.INK, margin: 0 }}>{t.settings.irpfAdvanceRateLabel}</p>
            {!editingIrpf && (
              <button
                onClick={() => { setIrpfRateValue(profile.irpfAdvanceRate); setEditingIrpf(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.MUTED, textDecoration: 'underline', padding: 0 }}
              >
                {t.settings.irpfAdvanceRateEdit}
              </button>
            )}
          </div>

          {!editingIrpf ? (
            <div style={{ padding: '12px 20px' }}>
              {profile.irpfAdvanceRate === undefined ? (
                <p style={{ fontSize: 14, color: C.IRPF, margin: 0 }}>{t.settings.irpfAdvanceRateNotSet}</p>
              ) : (
                <p style={{ fontSize: 14, fontWeight: 500, color: C.INK, margin: 0 }}>{(profile.irpfAdvanceRate * 100).toFixed(0)}%</p>
              )}
            </div>
          ) : (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { rate: 0.2, label: "20%" },
                { rate: 0.25, label: "25%" },
                { rate: 0.3, label: "30%" },
              ].map(({ rate, label }) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setIrpfRateValue(rate)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    ...(irpfRateValue === rate
                      ? { border: `2px solid ${C.INK}`, background: '#f5f0e8', color: C.INK }
                      : { border: `1px solid ${C.BORDER}`, background: C.CARD, color: C.MUTED }),
                  }}
                >
                  {label}
                  {irpfRateValue === rate && <Check style={{ width: 16, height: 16 }} />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIrpfRateValue(undefined)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  ...(irpfRateValue === undefined
                    ? { border: `2px solid ${C.INK}`, background: '#f5f0e8', color: C.INK }
                    : { border: `1px solid ${C.BORDER}`, background: C.CARD, color: C.MUTED }),
                }}
              >
                {t.settings.irpfAdvanceRateNotSet}
                {irpfRateValue === undefined && <Check style={{ width: 16, height: 16 }} />}
              </button>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button
                  onClick={async () => {
                    setSavingIrpf(true);
                    await updateIrpfAdvanceRate(irpfRateValue);
                    setSavingIrpf(false);
                    setEditingIrpf(false);
                  }}
                  disabled={savingIrpf}
                  style={{ ...primaryBtnStyle, opacity: savingIrpf ? 0.5 : 1 }}
                >
                  {t.settings.irpfAdvanceRateSave}
                </button>
                <button
                  onClick={() => setEditingIrpf(false)}
                  disabled={savingIrpf}
                  style={secondaryBtnStyle}
                >
                  {t.settings.irpfAdvanceRateCancel}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Session / account actions — mobile only (hidden at ≥1024px via scoped style) */}
        <style>{`@media (min-width: 1024px) { .settings-signout-card { display: none !important; } }`}</style>
        <div style={{ ...cardStyle, display: 'block' }} className="settings-signout-card">
          <button
            onClick={handleSignOut}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
          >
            <LogOut style={{ width: 16, height: 16, color: C.MUTED, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: C.MUTED, margin: 0 }}>{t.settings.signOut}</p>
              <p style={{ fontSize: 12, color: C.MUTED, opacity: 0.7, margin: '2px 0 0' }}>{t.settings.signOutSubtitle}</p>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div style={{ border: `1px solid ${C.IVA}40`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', background: '#fdf0ee', borderBottom: `1px solid ${C.IVA}40` }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.IVA, margin: 0 }}>{t.settings.dangerZone}</p>
          </div>
          <div style={{ background: C.CARD }}>
            <button
              onClick={() => { setDeleteConfirmText(""); setShowDeleteModal(true); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
              <Trash2 style={{ width: 16, height: 16, color: C.IVA, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: C.IVA, margin: 0 }}>{t.settings.deleteAccountButton}</p>
                <p style={{ fontSize: 12, color: C.IVA, opacity: 0.7, margin: '2px 0 0' }}>{t.settings.deleteAccountPermanent}</p>
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,31,46,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}>
          <div style={{ background: C.CARD, borderRadius: 16, padding: 28, maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fdf0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 style={{ width: 20, height: 20, color: C.IVA }} />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.INK, margin: 0 }}>{t.settings.deleteAccountModalTitle}</h2>
            </div>
            <p style={{ fontSize: 14, color: C.MUTED, marginBottom: 16 }}>
              {t.settings.deleteAccountModalDesc}{" "}
              <span style={{ fontWeight: 600, color: C.INK }}>{t.settings.deleteAccountConfirmWord}</span>.
            </p>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleDeleteAll(); if (e.key === "Escape") setShowDeleteModal(false); }}
              placeholder={t.settings.deleteAccountConfirmWord}
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ ...secondaryBtnStyle, flex: 1 }}
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== t.settings.deleteAccountConfirmWord}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: deleteConfirmText !== t.settings.deleteAccountConfirmWord ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  background: C.IVA,
                  color: 'white',
                  opacity: deleteConfirmText !== t.settings.deleteAccountConfirmWord ? 0.4 : 1,
                }}
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${C.BORDER}` }}>
      <span style={{ fontSize: 14, color: '#6b6456' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1f2e' }}>{value}</span>
    </div>
  );
}
