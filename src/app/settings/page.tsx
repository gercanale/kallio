"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, User, Pencil, Check, X, Crown } from "lucide-react";
import type { NifType } from "@/lib/types";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import { Navigation } from "@/components/Navigation";
import { REGIONS, REGIONS_SORTED } from "@/lib/regional-tax";
import { DEDUCTIBILITY_RATES, type ActivityKey } from "@/lib/wizard-config";
import type { Language } from "@/lib/i18n";

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
  const wizardProfile = useKallioStore((s) => s.wizardProfile);
  const language = useKallioStore((s) => s.language);
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

  const [showConfigEdit, setShowConfigEdit] = useState(false);

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

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 88px', boxSizing: 'border-box' }}>
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

        {/* Configuración de onboarding */}
        <ConfigCard
          t={t}
          wizardProfile={wizardProfile}
          profile={profile}
          language={language}
          cardStyle={cardStyle}
          cardHeaderStyle={cardHeaderStyle}
          onEdit={() => setShowConfigEdit(true)}
        />

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

      {showConfigEdit && (
        <ConfigEditModal
          t={t}
          wizardProfile={wizardProfile}
          profile={profile}
          language={language}
          onClose={() => setShowConfigEdit(false)}
        />
      )}

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

function ConfigCard({
  t, wizardProfile, profile, language, cardStyle, cardHeaderStyle, onEdit,
}: {
  t: ReturnType<typeof import('@/lib/useT').useT>;
  wizardProfile: import('@/lib/wizard-config').WizardProfile | null;
  profile: import('@/lib/types').UserProfile;
  language: string;
  cardStyle: React.CSSProperties;
  cardHeaderStyle: React.CSSProperties;
  onEdit: () => void;
}) {
  const ow = t.onboardingWizard;

  const REGIME_LABELS: Record<string, string> = {
    eds: ow.regimeLabelA,
    beckham: ow.regimeLabelB,
    sl: ow.regimeLabelC,
  };

  const ACTIVITY_LABELS: Record<string, string> = {
    consultoria_tech: ow.actLabelTech,
    diseno:           ow.actLabelDesign,
    formacion:        ow.actLabelTeach,
    salud:            ow.actLabelHealth,
    comercio:         ow.actLabelTrade,
    construccion:     ow.actLabelBuild,
    transporte:       t.wizard.actTransporte,
    otro:             ow.actLabelOther,
  };

  const CLIENTES_LABELS: Record<string, string> = {
    es_only: ow.clientLabelEs,
    eu:      ow.clientLabelEs,
    non_eu:  ow.clientLabelFuera,
    mix:     ow.clientLabelMix,
  };

  const LANG_NAMES: Record<string, string> = {
    es: 'Español', en: 'English', it: 'Italiano', de: 'Deutsch', fr: 'Français',
  };

  const regimeValue = wizardProfile
    ? `${REGIME_LABELS[wizardProfile.fiscalRegime] ?? wizardProfile.fiscalRegime}${
        wizardProfile.fiscalRegime === 'beckham' && wizardProfile.beckhamStartYear
          ? ` · ${wizardProfile.beckhamStartYear}`
          : ''
      }`
    : (profile.fiscalRegime ?? '—');

  const activityValue = wizardProfile
    ? (ACTIVITY_LABELS[wizardProfile.activity] ?? wizardProfile.activity)
    : (profile.activityType || '—');

  const clientesValue = profile.clientes
    ? (CLIENTES_LABELS[profile.clientes] ?? profile.clientes)
    : '—';

  const regionName = profile.region
    ? (REGIONS.find(r => r.code === profile.region)?.name ?? profile.region)
    : '—';

  const incomeValue = profile.ingresoMensual
    ? `€${profile.ingresoMensual.toLocaleString('es-ES')} / ${ow.incomePerMonth}`
    : '—';

  const rows: [string, string][] = [
    [ow.summaryRegime,        regimeValue],
    [ow.summaryActivity,      activityValue],
    [ow.summaryClients,       clientesValue],
    [ow.summaryRegion,        regionName],
    [t.settings.configIncome, incomeValue],
    [t.settings.configLanguage, LANG_NAMES[language] ?? language],
  ];

  return (
    <div style={cardStyle}>
      <div style={{ ...cardHeaderStyle, gap: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.INK, margin: 0, flex: 1 }}>
          {t.settings.configSectionTitle}
        </p>
        <button
          onClick={onEdit}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.MUTED, textDecoration: 'underline', padding: 0 }}
        >
          {t.settings.nifEdit}
        </button>
      </div>
      <div style={{ overflow: 'hidden', borderRadius: '0 0 14px 14px' }}>
        {rows.map(([label, value], i) => (
          <div
            key={label}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px',
              borderBottom: i < rows.length - 1 ? `1px solid ${C.BORDER}` : 'none',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 14, color: C.MUTED, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.INK, textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: C.MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function ConfigEditModal({
  t, wizardProfile, profile, language: currentLanguage, onClose,
}: {
  t: ReturnType<typeof import('@/lib/useT').useT>;
  wizardProfile: import('@/lib/wizard-config').WizardProfile | null;
  profile: import('@/lib/types').UserProfile;
  language: string;
  onClose: () => void;
}) {
  const setLanguage   = useKallioStore((s) => s.setLanguage);
  const setWizardProfile = useKallioStore((s) => s.setWizardProfile);
  const setProfile    = useKallioStore((s) => s.setProfile);

  const [lang, setLang] = useState<Language>(currentLanguage as Language);
  const [regime, setRegime] = useState<'eds' | 'beckham' | 'sl'>(wizardProfile?.fiscalRegime ?? 'eds');
  const [beckhamYear, setBeckhamYear] = useState(
    wizardProfile?.beckhamStartYear ? String(wizardProfile.beckhamStartYear) : ''
  );
  const [activity, setActivity] = useState<ActivityKey>(wizardProfile?.activity ?? 'consultoria_tech');
  const [clientesKey, setClientesKey] = useState<'es_only' | 'non_eu' | 'mix'>(() => {
    const c = profile.clientes;
    if (c === 'non_eu') return 'non_eu';
    if (c === 'mix') return 'mix';
    return 'es_only';
  });
  const [region, setRegion] = useState(profile.region ?? '');
  const [ingresoStr, setIngresoStr] = useState(
    profile.ingresoMensual ? String(profile.ingresoMensual) : ''
  );

  const handleSave = () => {
    setLanguage(lang);

    const base = wizardProfile ?? {
      incomeStructure: 'multi_client' as const,
      incomeStability: 'stable' as const,
      expensesVolume:  'some' as const,
      wizardCompleted: true,
    };
    setWizardProfile({
      ...base,
      fiscalRegime:     regime,
      beckhamStartYear: regime === 'beckham' ? (parseInt(beckhamYear) || null) : null,
      activity,
      deductibilityRate: DEDUCTIBILITY_RATES[activity],
      wizardCompleted: true,
    });

    setProfile({
      clientes:       clientesKey,
      region:         region || undefined,
      ingresoMensual: parseFloat(ingresoStr) || undefined,
    });

    onClose();
  };

  const ow = t.onboardingWizard;

  const LANGS: { code: Language; flag: string; label: string }[] = [
    { code: 'es', flag: '🇪🇸', label: 'Español'  },
    { code: 'en', flag: '🇬🇧', label: 'English'  },
    { code: 'it', flag: '🇮🇹', label: 'Italiano' },
    { code: 'de', flag: '🇩🇪', label: 'Deutsch'  },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
  ];

  const REGIMES: { key: 'eds' | 'beckham' | 'sl'; label: string }[] = [
    { key: 'eds',     label: ow.regimeLabelA },
    { key: 'beckham', label: ow.regimeLabelB },
    { key: 'sl',      label: ow.regimeLabelC },
  ];

  const ACTIVITIES: { key: ActivityKey; label: string }[] = [
    { key: 'consultoria_tech', label: ow.actLabelTech    },
    { key: 'diseno',           label: ow.actLabelDesign  },
    { key: 'formacion',        label: ow.actLabelTeach   },
    { key: 'salud',            label: ow.actLabelHealth  },
    { key: 'comercio',         label: ow.actLabelTrade   },
    { key: 'construccion',     label: ow.actLabelBuild   },
    { key: 'transporte',       label: t.wizard.actTransporte },
    { key: 'otro',             label: ow.actLabelOther   },
  ];

  const CLIENTES: { key: 'es_only' | 'non_eu' | 'mix'; label: string }[] = [
    { key: 'es_only', label: ow.clientLabelEs   },
    { key: 'non_eu',  label: ow.clientLabelFuera },
    { key: 'mix',     label: ow.clientLabelMix  },
  ];

  const pillBase: React.CSSProperties = {
    borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 500, textAlign: 'left',
  };
  const pillActive: React.CSSProperties = {
    ...pillBase, border: `2px solid ${C.INK}`, background: '#f5f0e8', color: C.INK,
  };
  const pillIdle: React.CSSProperties = {
    ...pillBase, border: `1px solid ${C.BORDER}`, background: 'transparent', color: C.MUTED,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,31,46,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 50, padding: '16px', overflowY: 'auto',
    }}>
      <div style={{
        background: C.CARD, borderRadius: 16, padding: 28,
        maxWidth: 540, width: '100%', marginTop: 24, marginBottom: 24,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.INK, margin: 0 }}>
            {t.settings.configSectionTitle}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.MUTED, padding: 0 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Language */}
        <ConfigSection label={t.settings.configLanguage}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                style={{
                  ...(lang === l.code ? pillActive : pillIdle),
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                }}
              >
                <span style={{ fontSize: 16 }}>{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>
        </ConfigSection>

        {/* Regime */}
        <ConfigSection label={ow.summaryRegime}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REGIMES.map(r => (
              <button
                key={r.key}
                onClick={() => setRegime(r.key)}
                style={{ ...(regime === r.key ? pillActive : pillIdle), padding: '10px 16px', width: '100%' }}
              >
                {r.label}
              </button>
            ))}
          </div>
          {regime === 'beckham' && (
            <input
              value={beckhamYear}
              onChange={e => setBeckhamYear(e.target.value)}
              placeholder="2024"
              style={{
                marginTop: 10, width: 120, background: C.BG, border: `1px solid ${C.BORDER}`,
                borderRadius: 10, padding: '10px 14px', fontSize: 14, color: C.INK,
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          )}
        </ConfigSection>

        {/* Activity */}
        <ConfigSection label={ow.summaryActivity}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ACTIVITIES.map(a => (
              <button
                key={a.key}
                onClick={() => setActivity(a.key)}
                style={{ ...(activity === a.key ? pillActive : pillIdle), padding: '10px 14px', fontSize: 12 }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </ConfigSection>

        {/* Clientes */}
        <ConfigSection label={ow.summaryClients}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CLIENTES.map(c => (
              <button
                key={c.key}
                onClick={() => setClientesKey(c.key)}
                style={{ ...(clientesKey === c.key ? pillActive : pillIdle), padding: '10px 16px', width: '100%' }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </ConfigSection>

        {/* Region */}
        <ConfigSection label={ow.summaryRegion}>
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            style={{
              width: '100%', background: C.BG, border: `1px solid ${C.BORDER}`,
              borderRadius: 10, padding: '10px 14px', fontSize: 14,
              color: region ? C.INK : C.MUTED, fontFamily: 'inherit', outline: 'none',
            }}
          >
            <option value="">—</option>
            {REGIONS_SORTED.map(r => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </ConfigSection>

        {/* Monthly income */}
        <ConfigSection label={t.settings.configIncome}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: C.MUTED, pointerEvents: 'none',
            }}>€</span>
            <input
              type="number"
              value={ingresoStr}
              onChange={e => setIngresoStr(e.target.value)}
              placeholder="0"
              style={{
                width: '100%', background: C.BG, border: `1px solid ${C.BORDER}`,
                borderRadius: 10, padding: '10px 14px 10px 28px',
                fontSize: 14, color: C.INK, fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </ConfigSection>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10,
              border: `1px solid ${C.BORDER}`, background: 'transparent',
              color: C.MUTED, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10,
              border: 'none', background: C.INK, color: 'white',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
