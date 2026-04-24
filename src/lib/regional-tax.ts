/**
 * Spanish regional (autonómica) IRPF data — fiscal year 2024/2025.
 *
 * IRPF = estatal component + autonómica component.
 * The estatal component is uniform across Spain.
 * The autonómica component varies by comunidad autónoma and represents ~40–50% of total IRPF.
 *
 * Sources: AEAT, regional tax agencies, TaxDown, Idealista Fiscal (April 2025).
 * ⚠️  These rates change each fiscal year — update this file annually.
 */

export type RegionCode =
  | 'AND' | 'ARA' | 'AST' | 'BAL' | 'CAN' | 'CNT' | 'CLM'
  | 'CYL' | 'CAT' | 'EXT' | 'GAL' | 'MAD' | 'MUR' | 'NAV'
  | 'PVA' | 'RIO' | 'VAL';

export interface RegionInfo {
  code: RegionCode;
  name: string;
  /** Autonómica minimum marginal rate (%) */
  autoMinRate: number;
  /** Autonómica maximum marginal rate (%) */
  autoMaxRate: number;
  /** Approximate total aggregate max rate (estatal 24.5% + autonómica max) */
  totalMaxRate: number;
  /** Relative burden vs national median: 'low' | 'medium' | 'high' */
  burden: 'low' | 'medium' | 'high';
  /** Notable regional deductions relevant to autónomos (display text) */
  keyDeduction?: string | null;
}

export const REGIONS: RegionInfo[] = [
  { code: 'MAD', name: 'Madrid',                autoMinRate: 8.5,  autoMaxRate: 20.5, totalMaxRate: 45.0, burden: 'low',    keyDeduction: 'Deducción alquiler 30% (máx. €1.237)' },
  { code: 'EXT', name: 'Extremadura',            autoMinRate: 8.0,  autoMaxRate: 25.0, totalMaxRate: 47.0, burden: 'low',    keyDeduction: 'Sin deducción autonómica de alquiler relevante' },
  { code: 'CYL', name: 'Castilla y León',        autoMinRate: 9.0,  autoMaxRate: 21.5, totalMaxRate: 46.5, burden: 'low',    keyDeduction: 'Deducción por formación profesional' },
  { code: 'CLM', name: 'Castilla-La Mancha',     autoMinRate: 9.5,  autoMaxRate: 22.5, totalMaxRate: 47.0, burden: 'medium', keyDeduction: null },
  { code: 'AND', name: 'Andalucía',              autoMinRate: 9.5,  autoMaxRate: 22.5, totalMaxRate: 47.0, burden: 'medium', keyDeduction: 'Deducción por discapacidad y familia numerosa' },
  { code: 'GAL', name: 'Galicia',                autoMinRate: 9.0,  autoMaxRate: 22.5, totalMaxRate: 47.0, burden: 'medium', keyDeduction: null },
  { code: 'MUR', name: 'Murcia',                 autoMinRate: 9.5,  autoMaxRate: 22.5, totalMaxRate: 47.0, burden: 'medium', keyDeduction: null },
  { code: 'CNT', name: 'Cantabria',              autoMinRate: 8.5,  autoMaxRate: 24.5, totalMaxRate: 47.0, burden: 'medium', keyDeduction: null },
  { code: 'BAL', name: 'Baleares',               autoMinRate: 9.0,  autoMaxRate: 24.75,totalMaxRate: 48.5, burden: 'medium', keyDeduction: null },
  { code: 'ARA', name: 'Aragón',                 autoMinRate: 9.5,  autoMaxRate: 25.5, totalMaxRate: 49.0, burden: 'medium', keyDeduction: null },
  { code: 'CAN', name: 'Canarias',               autoMinRate: 9.0,  autoMaxRate: 26.0, totalMaxRate: 49.5, burden: 'medium', keyDeduction: 'REF — régimen económico fiscal especial' },
  { code: 'AST', name: 'Asturias',               autoMinRate: 10.0, autoMaxRate: 25.5, totalMaxRate: 49.5, burden: 'high',   keyDeduction: null },
  { code: 'CAT', name: 'Cataluña',               autoMinRate: 10.5, autoMaxRate: 25.5, totalMaxRate: 50.0, burden: 'high',   keyDeduction: 'Deducción alquiler 10% (máx. €1.000)' },
  { code: 'RIO', name: 'La Rioja',               autoMinRate: 8.0,  autoMaxRate: 27.0, totalMaxRate: 51.5, burden: 'high',   keyDeduction: null },
  { code: 'NAV', name: 'Navarra',                autoMinRate: 13.0, autoMaxRate: 52.0, totalMaxRate: 52.0, burden: 'high',   keyDeduction: 'Foral — régimen especial propio' },
  { code: 'PVA', name: 'País Vasco',             autoMinRate: 13.0, autoMaxRate: 49.0, totalMaxRate: 49.0, burden: 'high',   keyDeduction: 'Foral — régimen especial propio' },
  { code: 'VAL', name: 'Comunidad Valenciana',   autoMinRate: 9.0,  autoMaxRate: 29.5, totalMaxRate: 54.0, burden: 'high',   keyDeduction: 'Mayor carga para rentas medias-altas' },
];

/** Sorted for UI display: alphabetical */
export const REGIONS_SORTED = [...REGIONS].sort((a, b) => a.name.localeCompare(b.name, 'es'));

/** Statale IRPF brackets — uniform across all Spain (2024) */
const ESTATAL_BRACKETS: [number, number][] = [
  [12450,  0.19],
  [20200,  0.24],
  [35200,  0.30],
  [60000,  0.37],
  [300000, 0.45],
  [Infinity, 0.47],
];

/**
 * Calculate total estimated annual IRPF for an autónomo under Estimación Directa.
 * Uses statale brackets. Regional component adds ~40–50% on top.
 *
 * @param netTaxableIncome  Net taxable income (after GJD and expenses)
 * @param regionCode        Comunidad autónoma — used to estimate total effective rate
 * @returns Estimated total IRPF (estatal + autonómica approximation)
 */
export function estimateAnnualIRPF(netTaxableIncome: number, regionCode?: RegionCode): number {
  if (netTaxableIncome <= 0) return 0;

  // Calculate statale tax precisely using brackets
  let estatale = 0;
  let remaining = netTaxableIncome;
  let prevThreshold = 0;

  for (const [threshold, rate] of ESTATAL_BRACKETS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, threshold - prevThreshold);
    estatale += taxable * rate;
    remaining -= taxable;
    prevThreshold = threshold;
  }

  // Autonómica approximation: use region's effective rate scaled to income
  // The autonómica component is roughly 85–110% of the statale component in practice
  // (it uses similar bracket widths but different rates)
  const region = regionCode ? REGIONS.find(r => r.code === regionCode) : null;

  let autoMultiplier: number;
  if (region) {
    // Estimate autonómica as a fraction of statale, calibrated to region burden
    autoMultiplier = region.burden === 'low' ? 0.82 : region.burden === 'medium' ? 0.93 : 1.05;
    // Foral regions (PVA, NAV) have independent tax systems — approximation only
    if (region.code === 'PVA' || region.code === 'NAV') autoMultiplier = 1.10;
  } else {
    autoMultiplier = 0.93; // national median
  }

  const autonómica = estatale * autoMultiplier;
  return Math.round(estatale + autonómica);
}

/**
 * Get effective IRPF rate for a given income and region.
 */
export function getEffectiveIRPFRate(netTaxableIncome: number, regionCode?: RegionCode): number {
  if (netTaxableIncome <= 0) return 0;
  return estimateAnnualIRPF(netTaxableIncome, regionCode) / netTaxableIncome;
}

/**
 * Get a region by code. Returns undefined if not found.
 */
export function getRegion(code: RegionCode | string): RegionInfo | undefined {
  return REGIONS.find(r => r.code === code);
}
