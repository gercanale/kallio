"use client";

/**
 * Kallio – /renta page
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive "Renta preparation" tool for Spanish autónomos.
 * Helps users understand their full IRPF picture across all income sources
 * and gather the right documents for their accountant.
 *
 * Layout (mobile-first, stacked):
 *   1. Profile pills (horizontal scroll)
 *   2. Region selector
 *   3. Header metrics bar (dark card)
 *   4. Two-column calculation: ENTRA EN LA BASE + DEDUCCIONES EN LA CUOTA
 *   5. "Ya adelantado" row
 *   6. "Lo que se te escapa" (yellow optimization section)
 *   7. Document checklist for accountant
 *
 * Design system: Direction A (inline styles, no Tailwind)
 */

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { calculateYTDSnapshot, calculateTaxSnapshot, nowInSpain, formatCurrency, quarterDateRange } from "@/lib/tax-engine";
import { Navigation } from "@/components/Navigation";

// ─── Design tokens (Direction A) ─────────────────────────────────────────────

const C = {
  BG:     '#fdfaf3',
  INK:    '#1a1f2e',
  MUTED:  '#6b6456',
  BORDER: '#e8dfc8',
  IVA:    '#c44536',
  IRPF:   '#d4a017',
  OK:     '#5a7a3e',
  CARD:   '#ffffff',
  WARM:   '#c9bfa8',
} as const;

// ─── Tax brackets (Spain 2025) ────────────────────────────────────────────────

const IRPF_BRACKETS = [
  { from: 0,      to: 12450,    rate: 0.19 },
  { from: 12450,  to: 20200,    rate: 0.24 },
  { from: 20200,  to: 35200,    rate: 0.30 },
  { from: 35200,  to: 60000,    rate: 0.37 },
  { from: 60000,  to: 300000,   rate: 0.45 },
  { from: 300000, to: Infinity, rate: 0.47 },
];

const SAVINGS_BRACKETS = [
  { from: 0,      to: 6000,     rate: 0.19 },
  { from: 6000,   to: 50000,    rate: 0.21 },
  { from: 50000,  to: 200000,   rate: 0.23 },
  { from: 200000, to: Infinity, rate: 0.27 },
];

// ─── Profiles ─────────────────────────────────────────────────────────────────

interface ProfilePreset {
  id: string;
  num: string;
  label: string;
  desc: string;
  overrides: {
    rental?: number;
    dividends?: number;
    salary?: number;
    crypto?: number;
    pension?: number;
    children?: number;
    depParents?: number;
  };
}

const PROFILES: ProfilePreset[] = [
  { id: 'autonomo',    num: '01', label: 'Solo autónomo',    desc: 'Solo ingresos freelance',         overrides: {} },
  { id: 'alquileres', num: '02', label: '+ alquileres',      desc: 'Alquiler habitual: €8.400/año',   overrides: { rental: 8400 } },
  { id: 'dividendos', num: '03', label: '+ dividendos',      desc: 'Dividendos: €3.600/año',          overrides: { dividends: 3600 } },
  { id: 'salario',    num: '04', label: '+ salario 2º',      desc: 'Segundo trabajo: €12.000/año',    overrides: { salary: 12000 } },
  { id: 'pensiones',  num: '05', label: 'Con pensiones',     desc: 'Aportación plan: €1.500',         overrides: { pension: 1500 } },
  { id: 'familia',    num: '06', label: 'Con familia',        desc: '2 hijos + 1 ascendiente',         overrides: { children: 2, depParents: 1 } },
];

// ─── Regional deductions ──────────────────────────────────────────────────────

interface RegionalDed {
  id: string;
  label: string;
  desc: string;
  amount: number;
}

const REGIONAL_DEDS: Record<string, RegionalDed[]> = {
  cataluna: [
    { id: 'alquiler',    label: 'Deducción autonómica · alquiler',      desc: 'Cataluña · <32 años',                  amount: 300 },
    { id: 'nacimiento',  label: 'Nacimiento o adopción',                 desc: '€150 por hijo · €300 si 2+',           amount: 150 },
    { id: 'donativos',   label: 'Donativos a fundaciones culturales ES', desc: '+15% adicional al estatal',             amount: 0   },
    { id: 'viudedad',    label: 'Viudedad',                              desc: '€150 · €300 si con hijos',             amount: 150 },
  ],
  madrid: [
    { id: 'alquiler',    label: 'Alquiler jóvenes',                      desc: '30% cuota estatal · <35 años',         amount: 1000 },
    { id: 'nacimiento',  label: 'Nacimiento/adopción',                    desc: '600, 750, 900 según orden',            amount: 600  },
    { id: 'irpf0',       label: 'Exención autonómica',                   desc: 'Tipo 0% en primeros tramos',           amount: 600  },
  ],
  valencia: [
    { id: 'dental',      label: 'Gastos dentales, salud mental, óptica', desc: 'Hasta €150 · factura con tarjeta',     amount: 150  },
    { id: 'deporte',     label: 'Actividades deportivas y de salud',     desc: '30% del gasto · hasta €150',          amount: 150  },
    { id: 'alquiler',    label: 'Alquiler vivienda habitual',             desc: '<35 años o discapacidad',              amount: 500  },
  ],
  andalucia: [
    { id: 'alquiler',    label: 'Alquiler 1ª vivienda',                  desc: '15% cuota autonómica · <35 años',     amount: 500  },
    { id: 'adopcion',    label: 'Adopción nacional o internacional',     desc: '€300 por hijo adoptado',              amount: 300  },
  ],
  pais_vasco: [
    { id: 'vivienda',    label: 'Adquisición vivienda habitual',         desc: '18% de lo pagado · hasta €1.530',     amount: 1530 },
    { id: 'pension',     label: 'Plan de pensiones',                     desc: 'Mayores deducciones que régimen común', amount: 0 },
  ],
  otro: [],
};

const REGIONS = [
  { id: 'cataluna',   label: 'Cataluña' },
  { id: 'madrid',     label: 'Madrid' },
  { id: 'valencia',   label: 'C. Valenciana' },
  { id: 'andalucia',  label: 'Andalucía' },
  { id: 'pais_vasco', label: 'País Vasco' },
  { id: 'otro',       label: 'Otra región' },
];

// ─── Document checklist ───────────────────────────────────────────────────────

interface DocItem {
  id: string;
  label: string;
  tag?: string;
  condition?: (profile: string, region: string, crypto: number) => boolean;
}

const DOC_CHECKLIST: DocItem[] = [
  // Always visible
  { id: 'renta_ant',   label: 'Renta del año pasado (PDF de la declaración anterior)' },
  { id: 'dni',         label: 'DNI / NIE (copia por ambas caras)' },
  { id: 'iban',        label: 'Número de cuenta (IBAN)' },
  // Conditional
  { id: 'dni_pareja',  label: 'DNI de la pareja',           tag: 'si casado/a',        condition: () => false },
  { id: 'cripto',      label: 'Historial de criptomonedas', tag: 'si cripto',           condition: (_p, _r, crypto) => crypto > 0 },
  { id: 'alquiler',    label: 'Contrato de alquiler y recibos del año', tag: 'si alquileres', condition: (p) => p === 'alquileres' },
  { id: 'convenio',    label: 'Convenio regulador',         tag: 'si separado/a con hijos', condition: () => false },
  { id: 'cert_empresa',label: 'Certificado de empresa',     tag: 'si salario 2º',      condition: (p) => p === 'salario' },
  { id: 'escritura',   label: 'Escritura de compraventa',   tag: 'si inmueble comprado/vendido', condition: () => false },
  { id: 'fact_salud',  label: 'Facturas gastos sanitarios', tag: 'si Valencia',        condition: (_p, r) => r === 'valencia' },
  { id: 'fact_deporte',label: 'Facturas actividades deportivas', tag: 'si Valencia',   condition: (_p, r) => r === 'valencia' },
  { id: 'cert_pension',label: 'Certificado de aportaciones al plan de pensiones', tag: 'si plan pensiones', condition: (p) => p === 'pensiones' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyBrackets(
  amount: number,
  brackets: { from: number; to: number; rate: number }[]
): number {
  let tax = 0;
  let remaining = Math.max(0, amount);
  for (const b of brackets) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.to === Infinity ? remaining : b.to - b.from);
    tax += slice * b.rate;
    remaining -= slice;
  }
  return tax;
}

/** Full IRPF calculation including all income sources */
function calcFullIRPF(params: {
  autonomoNet: number;
  salary: number;
  rental: number;
  dividends: number;
  crypto: number;
  pension: number;
  children: number;
  depParents: number;
  alreadyPaid: number;
  regionDedsTotal: number;
}) {
  const {
    autonomoNet, salary, rental, dividends, crypto,
    pension, children, depParents, alreadyPaid, regionDedsTotal,
  } = params;

  // Rental: 60% reducción for habitual rental (Art. 23.2 LIRPF)
  const rentalNet = rental * 0.4;

  // Pension: capped at €1.500/year (2025 limit for individual plans)
  const pensionDeduction = Math.min(pension, 1500);

  // General base = autónomo net + salary + rental net − pension contrib
  const generalBase = Math.max(0, autonomoNet + salary + rentalNet - pensionDeduction);

  // Savings base: dividends + crypto − €1.500 exempt
  const savingsBase = Math.max(0, dividends + crypto - 1500);

  // Mínimo personal y familiar
  const minimo = 5550
    + (children >= 1 ? 2400 : 0)
    + (children >= 2 ? 2700 : 0)
    + (children >= 3 ? 4000 : 0)
    + 1150 * depParents;

  const taxableGeneral = Math.max(0, generalBase - minimo);

  const generalTax  = applyBrackets(taxableGeneral, IRPF_BRACKETS);
  const savingsTax  = applyBrackets(savingsBase,    SAVINGS_BRACKETS);
  const cuotaIntegra = generalTax + savingsTax;
  const cuotaLiquida = Math.max(0, cuotaIntegra - regionDedsTotal);
  const aPagar       = cuotaLiquida - alreadyPaid;

  const totalBase = autonomoNet + salary + rentalNet + savingsBase;
  const effectiveRate = totalBase > 0 ? cuotaLiquida / totalBase : 0;

  // Marginal rate: find the bracket where taxableGeneral sits
  let marginalRate = IRPF_BRACKETS[0].rate;
  let acc = 0;
  for (const b of IRPF_BRACKETS) {
    const width = b.to === Infinity ? Infinity : b.to - b.from;
    if (taxableGeneral <= acc + width) { marginalRate = b.rate; break; }
    acc += width;
  }

  return {
    rentalNet,
    pensionDeduction,
    generalBase,
    savingsBase,
    minimo,
    taxableGeneral,
    generalTax,
    savingsTax,
    cuotaIntegra,
    cuotaLiquida,
    aPagar,
    totalBase,
    effectiveRate,
    marginalRate,
  };
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function RentaPage() {
  const router        = useRouter();
  const hydrated      = useHydrated();
  const storeProfile       = useKallioStore((s) => s.profile);
  const sessionActive      = useKallioStore((s) => s.sessionActive);
  const transactions       = useKallioStore((s) => s.transactions);
  const historicalYearData = useKallioStore((s) => s.historicalYearData);
  const setHistoricalQuarter = useKallioStore((s) => s.setHistoricalQuarter);

  // ── Guard ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) { router.replace("/"); return; }
    if (!storeProfile.onboardingComplete) router.replace("/onboarding");
  }, [hydrated, sessionActive, storeProfile.onboardingComplete, router]);

  // ── Year context ─────────────────────────────────────────────────────────────
  const now        = nowInSpain();
  const currentYear = now.getFullYear();                        // e.g. 2026
  const prevYear    = currentYear - 1;                          // e.g. 2025
  const inDeclarationPeriod = now.getMonth() < 7;              // Jan–Jul: filing prev year
  const defaultYear = inDeclarationPeriod ? prevYear : currentYear;

  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const isPrevYear = selectedYear !== currentYear;

  const year  = selectedYear;
  const nextY = year + 1;

  // ── YTD snapshot (current year) ───────────────────────────────────────────────
  const snapshot = useMemo(() => {
    if (!hydrated) return null;
    return calculateYTDSnapshot(transactions, storeProfile, currentYear);
  }, [transactions, storeProfile, currentYear, hydrated]);

  // ── Historical quarterly data ─────────────────────────────────────────────────
  // For a past year: user can enter Q1-Q4 data manually (or pre-populated from transactions).
  // Fall back: try to compute from transactions filtered to that year.
  const QUARTERS = [1, 2, 3, 4] as const;

  // Get per-quarter transaction-based snapshot for the selected year
  const txQuarterSnaps = useMemo(() => {
    if (!hydrated) return null;
    return QUARTERS.map(q => calculateTaxSnapshot(transactions, storeProfile, q, year));
  }, [transactions, storeProfile, year, hydrated]);

  // Editable quarterly state — keyed "YYYY-Q"
  // Initial value: from store if saved, else from transaction snapshot
  const getQData = (q: number) => {
    const key = `${year}-${q}`;
    if (historicalYearData[key]) return historicalYearData[key];
    const snap = txQuarterSnaps?.[q - 1];
    if (!snap) return { grossIncome: 0, expenses: 0, m130: 0 };
    // net income from autónomo (sin IVA, after deductible expenses)
    return {
      grossIncome: Math.round(snap.ytdNetIncome * 100) / 100,
      expenses:    Math.round(snap.deductibleExpenses * 100) / 100,
      m130:        Math.round(snap.irpfAdvancePayable * 100) / 100,
    };
  };

  // Local editable state for historical quarters (only used when isPrevYear)
  const [qData, setQData] = useState<Record<string, { grossIncome: number; expenses: number; m130: number }>>({});

  // Sync qData from store/transactions when year changes
  const syncedQData = useMemo(() => {
    const result: Record<string, { grossIncome: number; expenses: number; m130: number }> = {};
    for (const q of QUARTERS) {
      const key = `${year}-${q}`;
      result[key] = qData[key] ?? getQData(q);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, historicalYearData, txQuarterSnaps]);

  const updateQField = (q: number, field: 'grossIncome' | 'expenses' | 'm130', value: number) => {
    const key = `${year}-${q}`;
    const updated = { ...syncedQData[key], [field]: value };
    setQData(prev => ({ ...prev, [key]: updated }));
    setHistoricalQuarter(year, q, updated);
  };

  // Totals from the 4 quarters (for past year calculation)
  const histTotals = useMemo(() => {
    let grossIncome = 0, expenses = 0, m130 = 0;
    for (const q of QUARTERS) {
      const d = syncedQData[`${year}-${q}`] ?? { grossIncome: 0, expenses: 0, m130: 0 };
      grossIncome += d.grossIncome;
      expenses    += d.expenses;
      m130        += d.m130;
    }
    return { grossIncome, expenses, m130, net: Math.max(0, grossIncome - expenses) };
  }, [syncedQData, year]);

  // ── Profile / region state ───────────────────────────────────────────────────
  const [profile,       setProfileId]   = useState<string>('autonomo');
  const [region,        setRegion]      = useState<string>('cataluna');

  // ── Income state (editable) ───────────────────────────────────────────────────
  const [rental,        setRental]      = useState(0);
  const [dividends,     setDividends]   = useState(0);
  const [salary,        setSalary]      = useState(0);
  const [crypto,        setCrypto]      = useState(0);
  const [pension,       setPension]     = useState(0);
  const [children,      setChildren]    = useState(0);
  const [depParents,    setDepParents]  = useState(0);

  // ── Regional deductions toggles ───────────────────────────────────────────────
  const [activeRegDeds, setActiveRegDeds] = useState<Set<string>>(new Set());

  // Toggle a regional deduction on/off
  const toggleRegDed = (id: string) => {
    setActiveRegDeds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // Apply profile preset
  const applyProfile = (p: ProfilePreset) => {
    setProfileId(p.id);
    setRental(p.overrides.rental       ?? 0);
    setDividends(p.overrides.dividends ?? 0);
    setSalary(p.overrides.salary       ?? 0);
    setCrypto(p.overrides.crypto       ?? 0);
    setPension(p.overrides.pension     ?? 0);
    setChildren(p.overrides.children   ?? 0);
    setDepParents(p.overrides.depParents ?? 0);
    setActiveRegDeds(new Set());
  };

  // Reset regional deductions when region changes
  const handleRegionChange = (r: string) => {
    setRegion(r);
    setActiveRegDeds(new Set());
  };

  // ── Derived calculations ─────────────────────────────────────────────────────
  // For past years: use historical quarterly totals. For current year: use live snapshot.
  const autonomoNet = isPrevYear ? histTotals.net : (snapshot?.projectedAnnualNetIncome ?? 0);
  const alreadyPaid = isPrevYear ? histTotals.m130 : (snapshot?.irpfPaidViaAdvances ?? 0);

  const regionDeds    = REGIONAL_DEDS[region] ?? [];
  const regionDedsTotal = regionDeds
    .filter(d => activeRegDeds.has(d.id))
    .reduce((sum, d) => sum + d.amount, 0);

  const calc = useMemo(() => calcFullIRPF({
    autonomoNet,
    salary,
    rental,
    dividends,
    crypto,
    pension,
    children,
    depParents,
    alreadyPaid,
    regionDedsTotal,
  }), [autonomoNet, salary, rental, dividends, crypto, pension, children, depParents, alreadyPaid, regionDedsTotal]);

  // ── Loading / guard states ───────────────────────────────────────────────────
  if (!hydrated || !sessionActive) {
    return (
      <div style={{ minHeight: '100dvh', background: C.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${C.IRPF}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!storeProfile.onboardingComplete) return null;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK, paddingBottom: 80 }}>
      <Navigation />

      {/* Responsive sidebar support via embedded style */}
      <style>{`
        @media (min-width: 768px) {
          .renta-layout { display: flex !important; gap: 32px !important; align-items: flex-start !important; }
          .renta-sidebar { display: block !important; min-width: 220px !important; max-width: 220px !important; }
          .renta-pills-row { display: none !important; }
          .renta-main { flex: 1 !important; min-width: 0 !important; }
          .renta-cols { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
        }
        @media (max-width: 767px) {
          .renta-sidebar { display: none !important; }
        }
        .renta-layout { display: block; }
        .renta-cols { display: block; }
        .amt-input { background: transparent; border: none; outline: none; font-family: inherit; font-size: 14px; color: #1a1f2e; text-align: right; width: 100px; font-variant-numeric: tabular-nums; }
        .amt-input:focus { background: #f0ead8; border-radius: 4px; }
        .pill-btn { border: 1.5px solid #e8dfc8; border-radius: 999px; padding: 6px 14px; background: #fff; cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
        .pill-btn:hover { border-color: #d4a017; }
        .pill-btn.active { background: #1a1f2e; color: white; border-color: #1a1f2e; }
        .toggle-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0ead8; cursor: pointer; }
        .toggle-row:last-child { border-bottom: none; }
        .toggle-box { width: 18px; height: 18px; border: 1.5px solid #e8dfc8; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
        .toggle-box.checked { background: #1a1f2e; border-color: #1a1f2e; }
        select.region-sel { background: #fff; border: 1.5px solid #e8dfc8; border-radius: 8px; padding: 8px 10px; font-family: inherit; font-size: 13px; color: #1a1f2e; width: 100%; cursor: pointer; }
        select.region-sel:focus { outline: none; border-color: #d4a017; }
        .doc-tag { display: inline-block; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; background: #f0ead8; color: #6b6456; border-radius: 999px; padding: 2px 7px; margin-left: 6px; }
        .doc-tag.active { background: #1a1f2e22; color: #1a1f2e; }
        .sidebar-profile-card { border: 1.5px solid #e8dfc8; border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: all 0.15s; margin-bottom: 6px; }
        .sidebar-profile-card:hover { border-color: #d4a017; }
        .sidebar-profile-card.active { border-color: #1a1f2e; background: #1a1f2e08; }
      `}</style>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 20px 40px', boxSizing: 'border-box' }}>

        {/* ── Page header ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              Renta {year} · A declarar Jun {nextY}
            </h1>
            {/* Year selector tabs */}
            <div style={{ display: 'flex', gap: 4, background: '#f0ead8', borderRadius: 10, padding: 3 }}>
              {[prevYear, currentYear].map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    background: selectedYear === y ? C.INK : 'transparent',
                    color: selectedYear === y ? 'white' : C.MUTED,
                    transition: 'all 0.15s',
                  }}
                >
                  {y}{y === prevYear && inDeclarationPeriod ? ' ★' : ''}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 14, color: C.MUTED, margin: 0 }}>
            Lo que <em className="serif" style={{ fontStyle: 'italic', color: C.INK }}>de verdad</em> te tocará pagar en junio depende de todo esto.
            {isPrevYear && (
              <span style={{ marginLeft: 8, fontSize: 12, color: C.IVA, fontWeight: 600 }}>
                · Declaración {year} — introduce tus datos trimestrales abajo
              </span>
            )}
          </p>
        </div>

        {/* ── Quarterly data entry (past years only) ──────────────────────────── */}
        {isPrevYear && (
          <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: C.IRPF, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  DATOS DE {year} · ACTIVIDAD AUTÓNOMA
                </div>
                <p style={{ fontSize: 12, color: C.MUTED, margin: 0 }}>
                  Introduce los datos de cada trimestre de tu M130. Pre-rellenado desde tus facturas en Kallio si las tienes.
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: C.MUTED }}>Total neto</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.INK }}>{formatCurrency(histTotals.net)}</div>
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr', gap: 8, marginBottom: 6 }}>
              <div />
              <div className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>Ingresos netos</div>
              <div className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>Gastos deducibles</div>
              <div className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>M130 pagado</div>
            </div>

            {QUARTERS.map(q => {
              const key = `${year}-${q}`;
              const d = syncedQData[key] ?? { grossIncome: 0, expenses: 0, m130: 0 };
              const qLabels = ['ENE–MAR', 'ABR–JUN', 'JUL–SEP', 'OCT–DIC'];
              return (
                <div key={q} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr', gap: 8, padding: '8px 0', borderTop: `1px solid ${C.BORDER}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.INK }}>{q}T</span>
                    <span className="mono" style={{ fontSize: 9, color: C.MUTED, letterSpacing: '0.04em' }}>{qLabels[q - 1]}</span>
                  </div>
                  {(['grossIncome', 'expenses', 'm130'] as const).map(field => (
                    <div key={field} style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11, color: C.MUTED, marginRight: 2 }}>€</span>
                      <input
                        type="number"
                        className="amt-input"
                        value={d[field] || ''}
                        placeholder="0"
                        onChange={e => updateQField(q, field, parseFloat(e.target.value) || 0)}
                        style={{ width: 80, fontSize: 13, textAlign: 'right', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', color: C.INK }}
                      />
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Totals row */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr', gap: 8, padding: '10px 0 0', borderTop: `2px solid ${C.INK}`, marginTop: 4 }}>
              <div className="mono" style={{ fontSize: 10, color: C.MUTED, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>TOTAL</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: C.INK }}>{formatCurrency(histTotals.grossIncome)}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: C.MUTED }}>−{formatCurrency(histTotals.expenses)}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: C.IRPF }}>{formatCurrency(histTotals.m130)}</div>
            </div>
          </div>
        )}

        {/* ── Profile pills (mobile only) ──────────────────────────────────────── */}
        <div className="renta-pills-row" style={{ overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 12, marginBottom: 16, WebkitOverflowScrolling: 'touch' }}>
          {PROFILES.map(p => (
            <button
              key={p.id}
              className={`pill-btn${profile === p.id ? ' active' : ''}`}
              onClick={() => applyProfile(p)}
              style={{ fontSize: 13, fontWeight: 500 }}
            >
              <span style={{ opacity: 0.5, marginRight: 5 }}>{p.num}</span>{p.label}
            </button>
          ))}
        </div>

        {/* ── Region selector (mobile) ─────────────────────────────────────────── */}
        <div className="renta-pills-row" style={{ marginBottom: 20 }}>
          <select
            className="region-sel"
            value={region}
            onChange={e => handleRegionChange(e.target.value)}
          >
            {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>

        {/* ── Two-pane layout ──────────────────────────────────────────────────── */}
        <div className="renta-layout">

          {/* ── LEFT SIDEBAR (desktop) ────────────────────────────────────────── */}
          <aside className="renta-sidebar">
            {/* Section label */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.MUTED, marginBottom: 10 }}>
              Perfiles
            </div>

            {/* Profile cards */}
            {PROFILES.map(p => (
              <div
                key={p.id}
                className={`sidebar-profile-card${profile === p.id ? ' active' : ''}`}
                onClick={() => applyProfile(p)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: C.MUTED, fontWeight: 600, letterSpacing: '0.08em', minWidth: 20 }}>{p.num}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.INK }}>{p.label}</span>
                </div>
                <div style={{ fontSize: 11, color: C.MUTED, paddingLeft: 28 }}>{p.desc}</div>
              </div>
            ))}

            {/* Region selector */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.MUTED, marginBottom: 10 }}>
                Región
              </div>
              <select
                className="region-sel"
                value={region}
                onChange={e => handleRegionChange(e.target.value)}
              >
                {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </aside>

          {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
          <div className="renta-main">

            {/* ── Header metrics bar (dark card) ─────────────────────────────── */}
            <div style={{
              background: C.INK,
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 0,
            }}>
              <MetricCell
                label="Base imponible"
                value={formatCurrency(calc.totalBase)}
                color={C.WARM}
              />
              <MetricCell
                label="Tipo efectivo"
                value={`${(calc.effectiveRate * 100).toFixed(1)}%`}
                color={C.IRPF}
                center
              />
              <MetricCell
                label={`A pagar · Jun ${nextY}`}
                value={calc.aPagar > 0
                  ? formatCurrency(calc.aPagar)
                  : `Devuelven ${formatCurrency(Math.abs(calc.aPagar))}`}
                color={calc.aPagar > 0 ? '#e8784a' : '#9ec77c'}
                right
              />
            </div>

            {/* ── Two column calculation ─────────────────────────────────────── */}
            <div className="renta-cols" style={{ marginBottom: 16 }}>

              {/* LEFT COL: income + reductions */}
              <div>
                {/* ENTRA EN LA BASE */}
                <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
                  <SectionLabel label="Entra en la base" />

                  <IncomeRow
                    label="Rendimientos autónomo (neto)"
                    value={autonomoNet}
                    readOnly
                    note="calculado de tus facturas"
                  />
                  <IncomeRow
                    label="Alquiler (bruto anual)"
                    value={rental}
                    onChange={setRental}
                    note={rental > 0 ? `Neto declarado: ${formatCurrency(rental * 0.4)} (−60% reducción)` : undefined}
                  />
                  <IncomeRow
                    label="Dividendos"
                    value={dividends}
                    onChange={setDividends}
                    note={dividends > 0 ? 'Base ahorro · exentos primeros €1.500' : undefined}
                  />
                  <IncomeRow
                    label="Salario (2º trabajo)"
                    value={salary}
                    onChange={setSalary}
                  />
                  <IncomeRow
                    label="Criptomonedas (ganancia)"
                    value={crypto}
                    onChange={setCrypto}
                    note={crypto > 0 ? 'Base ahorro' : undefined}
                  />

                  {/* Totals */}
                  <div style={{ borderTop: `1px solid ${C.BORDER}`, marginTop: 12, paddingTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: C.MUTED }}>Base general</span>
                      <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(calc.generalBase)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.MUTED }}>Base ahorro</span>
                      <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(calc.savingsBase)}</span>
                    </div>
                  </div>
                </div>

                {/* REDUCCIONES A LA BASE */}
                <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
                  <SectionLabel label="Reducciones a la base" />

                  <IncomeRow
                    label="Plan de pensiones (aportación)"
                    value={pension}
                    onChange={setPension}
                    note={pension > 0 ? `Reducción efectiva: ${formatCurrency(Math.min(pension, 1500))} (máx €1.500)` : undefined}
                    accent={C.OK}
                  />

                  {/* Hijos */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid #f0ead8` }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.INK }}>Hijos a cargo</div>
                      {children > 0 && (
                        <div style={{ fontSize: 11, color: C.OK }}>
                          Mínimo familiar +{formatCurrency(
                            (children >= 1 ? 2400 : 0) + (children >= 2 ? 2700 : 0) + (children >= 3 ? 4000 : 0)
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => setChildren(c => Math.max(0, c - 1))}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${C.BORDER}`, background: C.BG, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, color: C.INK }}
                      >−</button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{children}</span>
                      <button
                        onClick={() => setChildren(c => c + 1)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${C.BORDER}`, background: C.BG, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, color: C.INK }}
                      >+</button>
                    </div>
                  </div>

                  {/* Ascendientes */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.INK }}>Ascendientes a cargo</div>
                      {depParents > 0 && (
                        <div style={{ fontSize: 11, color: C.OK }}>Mínimo familiar +{formatCurrency(1150 * depParents)}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => setDepParents(p => Math.max(0, p - 1))}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${C.BORDER}`, background: C.BG, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, color: C.INK }}
                      >−</button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{depParents}</span>
                      <button
                        onClick={() => setDepParents(p => p + 1)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${C.BORDER}`, background: C.BG, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, color: C.INK }}
                      >+</button>
                    </div>
                  </div>

                  {/* Mínimo summary */}
                  {(children > 0 || depParents > 0 || pension > 0) && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#f4faf0', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: C.OK }}>Mínimo personal y familiar</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.OK }}>{formatCurrency(calc.minimo)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COL: regional deductions */}
              <div>
                <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <SectionLabel label="Deducciones en la cuota" />
                    <span style={{ fontSize: 11, color: C.MUTED, fontStyle: 'italic' }}>
                      {REGIONS.find(r => r.id === region)?.label}
                    </span>
                  </div>

                  {regionDeds.length === 0 ? (
                    <div style={{ padding: '16px 0', textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: C.MUTED, margin: 0 }}>
                        Selecciona tu comunidad autónoma para ver las deducciones disponibles.
                      </p>
                    </div>
                  ) : (
                    <>
                      {regionDeds.map(d => {
                        const isChecked = activeRegDeds.has(d.id);
                        return (
                          <div
                            key={d.id}
                            className="toggle-row"
                            onClick={() => d.amount > 0 && toggleRegDed(d.id)}
                            style={{ opacity: d.amount === 0 ? 0.55 : 1, cursor: d.amount > 0 ? 'pointer' : 'default' }}
                          >
                            <div className={`toggle-box${isChecked ? ' checked' : ''}`}>
                              {isChecked && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: C.INK, lineHeight: 1.3 }}>{d.label}</div>
                              <div style={{ fontSize: 11, color: C.MUTED, marginTop: 2 }}>{d.desc}</div>
                            </div>
                            {d.amount > 0 && (
                              <div style={{ fontSize: 13, fontWeight: 600, color: isChecked ? C.OK : C.MUTED, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                                −{formatCurrency(d.amount)}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Total regional deductions */}
                      {regionDedsTotal > 0 && (
                        <div style={{ borderTop: `1px solid ${C.BORDER}`, marginTop: 12, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: C.MUTED }}>Total deducciones autonómicas</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.OK }}>−{formatCurrency(regionDedsTotal)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* CUOTA breakdown (right col, below region deds) */}
                <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '18px 20px', marginTop: 16 }}>
                  <SectionLabel label="Cuota" />

                  <CalcRow label="Cuota íntegra"          value={formatCurrency(calc.cuotaIntegra)} />
                  {regionDedsTotal > 0 && (
                    <CalcRow label="− Deducciones autonómicas" value={`−${formatCurrency(regionDedsTotal)}`} accent={C.OK} />
                  )}
                  <CalcRow label="Cuota líquida"          value={formatCurrency(calc.cuotaLiquida)} bold />
                  <CalcRow label="Tipo marginal"           value={`${(calc.marginalRate * 100).toFixed(0)}%`} muted />
                </div>
              </div>
            </div>

            {/* ── Ya adelantado (full width row) ────────────────────────────── */}
            <div style={{
              background: '#f0ead8',
              border: `1px solid ${C.BORDER}`,
              borderRadius: 14,
              padding: '16px 24px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.MUTED, marginBottom: 3 }}>
                  Ya adelantado (retenciones + M130)
                </div>
                <div style={{ fontSize: 12, color: C.MUTED }}>
                  Avances de IRPF pagados durante el año
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.INK, fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(alreadyPaid)}
              </div>
            </div>

            {/* ── Lo que se te escapa (yellow) ──────────────────────────────── */}
            <EscapasSection
              pension={pension}
              region={region}
              marginalRate={calc.marginalRate}
              effectiveRate={calc.effectiveRate}
              children={children}
            />

            {/* ── Documentación para el gestor ────────────────────────────── */}
            <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: '20px 24px', marginTop: 16 }}>
              <SectionLabel label="Documentación para el gestor" />
              <p style={{ fontSize: 12, color: C.MUTED, marginTop: 2, marginBottom: 16 }}>
                Todo lo que necesitas llevar cuando hagas la declaración.
              </p>

              {DOC_CHECKLIST.map(doc => {
                const isActive = doc.condition
                  ? doc.condition(profile, region, crypto)
                  : true;
                const isAlways = !doc.condition;

                return (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '8px 0',
                      borderBottom: `1px solid #f5f0e8`,
                      opacity: isAlways || isActive ? 1 : 0.55,
                    }}
                  >
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: `1.5px solid ${isAlways ? C.OK : isActive ? C.IRPF : C.BORDER}`,
                      background: isAlways ? '#f4faf0' : isActive ? '#fdf3e0' : C.BG,
                      flexShrink: 0,
                      marginTop: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isAlways && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.OK }} />
                      )}
                      {!isAlways && isActive && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.IRPF }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, color: C.INK }}>{doc.label}</span>
                      {doc.tag && (
                        <span className={`doc-tag${isActive ? ' active' : ''}`}>{doc.tag}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>{/* /renta-main */}
        </div>{/* /renta-layout */}
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.MUTED, marginBottom: 12 }}>
      {label}
    </div>
  );
}

function MetricCell({
  label,
  value,
  color,
  center,
  right,
}: {
  label: string;
  value: string;
  color: string;
  center?: boolean;
  right?: boolean;
}) {
  return (
    <div style={{
      textAlign: center ? 'center' : right ? 'right' : 'left',
      borderRight: !right ? `1px solid #ffffff18` : undefined,
      paddingRight: !right ? 16 : 0,
      paddingLeft: center ? 16 : right ? 16 : 0,
    }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8070', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

function IncomeRow({
  label,
  value,
  onChange,
  readOnly,
  note,
  accent,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  note?: string;
  accent?: string;
}) {
  const [raw, setRaw] = useState('');
  const [editing, setEditing] = useState(false);

  const displayValue = editing ? raw : value === 0 ? '' : value.toLocaleString('es-ES');

  return (
    <div style={{ padding: '7px 0', borderBottom: `1px solid #f0ead8` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: C.INK, flex: 1, paddingRight: 8 }}>{label}</span>
        {readOnly ? (
          <span style={{ fontSize: 14, fontWeight: 600, color: accent ?? C.INK, fontVariantNumeric: 'tabular-nums' }}>
            {value > 0 ? formatCurrency(value) : <span style={{ color: C.MUTED, fontWeight: 400, fontSize: 12 }}>del tracker</span>}
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: C.MUTED }}>€</span>
            <input
              className="amt-input"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={displayValue}
              onFocus={() => { setEditing(true); setRaw(value === 0 ? '' : String(value)); }}
              onBlur={() => {
                setEditing(false);
                const parsed = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
                onChange?.(isNaN(parsed) ? 0 : parsed);
                setRaw('');
              }}
              onChange={e => setRaw(e.target.value)}
            />
          </div>
        )}
      </div>
      {note && (
        <div style={{ fontSize: 11, color: accent ?? C.MUTED, marginTop: 2, paddingLeft: 0 }}>{note}</div>
      )}
    </div>
  );
}

function CalcRow({
  label,
  value,
  bold,
  muted,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  accent?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 0',
      borderBottom: bold ? `1px solid ${C.BORDER}` : undefined,
      marginBottom: bold ? 4 : 0,
    }}>
      <span style={{ fontSize: 12, color: muted ? C.MUTED : C.INK }}>{label}</span>
      <span style={{
        fontSize: bold ? 15 : 13,
        fontWeight: bold ? 700 : 500,
        color: accent ?? (muted ? C.MUTED : C.INK),
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
    </div>
  );
}

function EscapasSection({
  pension,
  region,
  marginalRate,
  effectiveRate,
  children,
}: {
  pension: number;
  region: string;
  marginalRate: number;
  effectiveRate: number;
  children: number;
}) {
  const suggestions: { id: string; text: string; sub?: string }[] = [];

  if (pension === 0) {
    const saving = Math.round(marginalRate * 1500);
    suggestions.push({
      id: 'pension',
      text: `Plan de pensiones: aporta hasta €1.500 → ahorra ~€${saving} de IRPF`,
      sub: `A tu tipo marginal del ${(marginalRate * 100).toFixed(0)}%, la deducción máxima compensa.`,
    });
  }

  if (region === 'otro') {
    suggestions.push({
      id: 'region',
      text: 'Selecciona tu comunidad autónoma para ver tus deducciones autonómicas',
      sub: 'Cada región tiene deducciones específicas que pueden reducir tu cuota.',
    });
  }

  if (effectiveRate > 0.35 && children === 0) {
    suggestions.push({
      id: 'minimo',
      text: 'Tu tipo efectivo es alto. ¿Tienes gastos deducibles que no has registrado?',
      sub: 'Formación, suscripciones, material de trabajo y gastos de difícil justificación reducen la base.',
    });
  }

  // Always show at least one item
  if (suggestions.length === 0) {
    suggestions.push({
      id: 'gestor',
      text: 'Revisa con tu gestor las deducciones aplicables a tu situación concreta',
      sub: 'Esta herramienta es orientativa. Un gestor puede encontrar optimizaciones adicionales.',
    });
  }

  return (
    <div style={{
      background: '#fdf6d8',
      border: `1px solid #e8d97a`,
      borderRadius: 14,
      padding: '18px 20px',
      marginBottom: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 15 }}>⚡</div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a7200' }}>
          Lo que se te escapa
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {suggestions.map(s => (
          <div
            key={s.id}
            style={{
              background: '#fffde8',
              border: '1px solid #e8d97a',
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#5a4a00', lineHeight: 1.4 }}>{s.text}</div>
            {s.sub && (
              <div style={{ fontSize: 12, color: '#8a7200', marginTop: 4, lineHeight: 1.4 }}>{s.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
