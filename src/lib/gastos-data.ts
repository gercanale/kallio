/**
 * Gastos Buckets — personalized deductible expense guide for Spanish autónomos.
 * Each bucket = one type of typical professional expense.
 * Used by /gastos page and the dashboard nudge card.
 */

import type { ActivityKey } from "./wizard-config";

export type BucketUnit = 'mes' | 'año' | 'unidad';
export type DeductibilityType = 'full' | 'partial';

export interface GastoBucket {
  id: string;
  group: string;          // display group name
  groupDesc: string;      // one-liner about the group
  label: string;          // "Internet en casa"
  hint?: string;          // "Solo si la usas principalmente para el trabajo"
  priceRangeLow: number;
  priceRangeHigh: number;
  unit: BucketUnit;
  defaultAmount: number;  // suggested amount in that unit
  deductibility: DeductibilityType;
  partialRate?: number;   // 0–1 (e.g. 0.5 = 50%), only for 'partial'
  partialNote?: string;   // "uso profesional estimado"
  amortizable?: boolean;  // equipment > €300, depreciated 25%/year
  activities: ActivityKey[] | 'all';
}

// ─── Groups ───────────────────────────────────────────────────────────────────
export const GROUPS = [
  { id: 'digital',    label: 'Trabajo · digital',          desc: 'Claramente afectos a tu actividad' },
  { id: 'equipo',     label: 'Equipamiento',               desc: 'Amortizables al >€300 (25% anual · 4 años)' },
  { id: 'formacion',  label: 'Formación y crecimiento',    desc: 'Directamente relacionado con tu actividad' },
  { id: 'admin',      label: 'Profesionales y administración', desc: 'Servicios que pagas para operar' },
  { id: 'vivienda',   label: 'Vivienda · afectación parcial', desc: 'Solo si trabajas desde casa. Requiere afectar % en el 036' },
] as const;

export type GroupId = typeof GROUPS[number]['id'];

// ─── Bucket definitions ───────────────────────────────────────────────────────
export const BUCKETS: GastoBucket[] = [

  // ── DIGITAL ─────────────────────────────────────────────────────────────────
  {
    id: 'internet_casa',
    group: 'digital',
    groupDesc: 'Claramente afectos a tu actividad',
    label: 'Internet en casa',
    hint: 'Solo la parte de uso profesional',
    priceRangeLow: 35, priceRangeHigh: 60, unit: 'mes', defaultAmount: 45,
    deductibility: 'partial', partialRate: 0.5, partialNote: 'parcial (50%)',
    activities: 'all',
  },
  {
    id: 'movil_datos',
    group: 'digital',
    groupDesc: 'Claramente afectos a tu actividad',
    label: 'Móvil · tarifa datos',
    hint: 'Si lo usas para clientes',
    priceRangeLow: 15, priceRangeHigh: 50, unit: 'mes', defaultAmount: 22,
    deductibility: 'partial', partialRate: 0.5, partialNote: 'parcial (50%)',
    activities: 'all',
  },
  {
    id: 'software_dev',
    group: 'digital',
    groupDesc: 'Claramente afectos a tu actividad',
    label: 'Software · Figma, Notion, Cursor',
    hint: 'Herramientas de trabajo digital',
    priceRangeLow: 20, priceRangeHigh: 100, unit: 'mes', defaultAmount: 68,
    deductibility: 'full',
    activities: ['consultoria_tech', 'diseno', 'formacion'],
  },
  {
    id: 'software_general',
    group: 'digital',
    groupDesc: 'Claramente afectos a tu actividad',
    label: 'Office 365 · Google Workspace',
    hint: 'Suite ofimática profesional',
    priceRangeLow: 5, priceRangeHigh: 22, unit: 'mes', defaultAmount: 12,
    deductibility: 'full',
    activities: 'all',
  },
  {
    id: 'hosting_dominios',
    group: 'digital',
    groupDesc: 'Claramente afectos a tu actividad',
    label: 'Hosting, dominios, servidores',
    hint: 'Infraestructura web y servicios cloud',
    priceRangeLow: 12, priceRangeHigh: 50, unit: 'mes', defaultAmount: 25,
    deductibility: 'full',
    activities: ['consultoria_tech', 'diseno'],
  },
  {
    id: 'coworking',
    group: 'digital',
    groupDesc: 'Claramente afectos a tu actividad',
    label: 'Coworking · con factura a tu nombre',
    hint: 'Espacio de trabajo fuera de casa',
    priceRangeLow: 150, priceRangeHigh: 400, unit: 'mes', defaultAmount: 200,
    deductibility: 'full',
    activities: 'all',
  },
  {
    id: 'adobe_cc',
    group: 'digital',
    groupDesc: 'Claramente afectos a tu actividad',
    label: 'Adobe Creative Cloud',
    hint: 'Suite diseño profesional',
    priceRangeLow: 30, priceRangeHigh: 60, unit: 'mes', defaultAmount: 55,
    deductibility: 'full',
    activities: ['diseno'],
  },
  {
    id: 'ai_tools',
    group: 'digital',
    groupDesc: 'Claramente afectos a tu actividad',
    label: 'AI · ChatGPT · Claude · Gemini',
    hint: 'Suscripciones a modelos de IA para el trabajo',
    priceRangeLow: 20, priceRangeHigh: 100, unit: 'mes', defaultAmount: 40,
    deductibility: 'full',
    activities: 'all',
  },

  // ── EQUIPAMIENTO ─────────────────────────────────────────────────────────────
  {
    id: 'ordenador',
    group: 'equipo',
    groupDesc: 'Amortizables al >€300 (25% anual · 4 años)',
    label: 'Ordenador · portátil',
    hint: '4€/día durante 4 años',
    priceRangeLow: 800, priceRangeHigh: 3000, unit: 'unidad', defaultAmount: 1499,
    deductibility: 'full', amortizable: true,
    activities: 'all',
  },
  {
    id: 'monitor',
    group: 'equipo',
    groupDesc: 'Amortizables al >€300 (25% anual · 4 años)',
    label: 'Monitor externo',
    hint: 'Pantalla adicional de trabajo',
    priceRangeLow: 150, priceRangeHigh: 800, unit: 'unidad', defaultAmount: 349,
    deductibility: 'full', amortizable: true,
    activities: 'all',
  },
  {
    id: 'silla_ergonomica',
    group: 'equipo',
    groupDesc: 'Amortizables al >€300 (25% anual · 4 años)',
    label: 'Silla de oficina ergonómica',
    hint: 'Requiere uso principal profesional',
    priceRangeLow: 200, priceRangeHigh: 800, unit: 'unidad', defaultAmount: 399,
    deductibility: 'full', amortizable: true,
    activities: 'all',
  },
  {
    id: 'perifericos',
    group: 'equipo',
    groupDesc: 'Amortizables al >€300 (25% anual · 4 años)',
    label: 'Auriculares, webcam, periféricos',
    hint: 'Accesorios de trabajo digital',
    priceRangeLow: 25, priceRangeHigh: 300, unit: 'unidad', defaultAmount: 150,
    deductibility: 'full',
    activities: 'all',
  },
  {
    id: 'camara',
    group: 'equipo',
    groupDesc: 'Amortizables al >€300 (25% anual · 4 años)',
    label: 'Cámara / equipo fotografía',
    hint: 'Si tu actividad requiere producción visual',
    priceRangeLow: 500, priceRangeHigh: 3000, unit: 'unidad', defaultAmount: 1200,
    deductibility: 'full', amortizable: true,
    activities: ['diseno'],
  },
  {
    id: 'tablet',
    group: 'equipo',
    groupDesc: 'Amortizables al >€300 (25% anual · 4 años)',
    label: 'Tablet · iPad Pro',
    hint: 'Para trabajo de diseño o presentaciones',
    priceRangeLow: 400, priceRangeHigh: 1500, unit: 'unidad', defaultAmount: 899,
    deductibility: 'full', amortizable: true,
    activities: ['diseno', 'consultoria_tech'],
  },

  // ── FORMACIÓN ────────────────────────────────────────────────────────────────
  {
    id: 'cursos_online',
    group: 'formacion',
    groupDesc: 'Directamente relacionado con tu actividad',
    label: 'Cursos online · Udemy, Coursera',
    hint: 'Pendiente: 2 cursos de 2025',
    priceRangeLow: 30, priceRangeHigh: 400, unit: 'año', defaultAmount: 150,
    deductibility: 'full',
    activities: 'all',
  },
  {
    id: 'libros_tecnicos',
    group: 'formacion',
    groupDesc: 'Directamente relacionado con tu actividad',
    label: 'Libros técnicos',
    hint: 'De tu área profesional',
    priceRangeLow: 22, priceRangeHigh: 60, unit: 'año', defaultAmount: 80,
    deductibility: 'full',
    activities: 'all',
  },
  {
    id: 'conferencias',
    group: 'formacion',
    groupDesc: 'Directamente relacionado con tu actividad',
    label: 'Conferencias · entradas + viajes',
    hint: 'Eventos de tu sector profesional',
    priceRangeLow: 200, priceRangeHigh: 1500, unit: 'año', defaultAmount: 500,
    deductibility: 'full',
    activities: 'all',
  },

  // ── ADMIN ────────────────────────────────────────────────────────────────────
  {
    id: 'gestoria',
    group: 'admin',
    groupDesc: 'Servicios que pagas para operar',
    label: 'Gestoría / asesoría fiscal',
    hint: 'Cuota mensual de gestión',
    priceRangeLow: 60, priceRangeHigh: 150, unit: 'mes', defaultAmount: 75,
    deductibility: 'full',
    activities: 'all',
  },
  {
    id: 'seguro_rc',
    group: 'admin',
    groupDesc: 'Servicios que pagas para operar',
    label: 'Seguro RC · responsabilidad civil',
    hint: 'Obligatorio para muchos proyectos',
    priceRangeLow: 150, priceRangeHigh: 400, unit: 'año', defaultAmount: 250,
    deductibility: 'full',
    activities: 'all',
  },
  {
    id: 'cuota_autonomos',
    group: 'admin',
    groupDesc: 'Servicios que pagas para operar',
    label: 'Cuota autónomos (RETA)',
    hint: '100% deducible · ya automático',
    priceRangeLow: 230, priceRangeHigh: 590, unit: 'mes', defaultAmount: 294,
    deductibility: 'full',
    activities: 'all',
  },
  {
    id: 'cuenta_bancaria',
    group: 'admin',
    groupDesc: 'Servicios que pagas para operar',
    label: 'Cuenta bancaria profesional',
    hint: 'Comisiones y mantenimiento',
    priceRangeLow: 5, priceRangeHigh: 20, unit: 'mes', defaultAmount: 10,
    deductibility: 'full',
    activities: 'all',
  },

  // ── VIVIENDA ─────────────────────────────────────────────────────────────────
  {
    id: 'alquiler_oficina',
    group: 'vivienda',
    groupDesc: 'Solo si trabajas desde casa. Requiere afectar % en el 036',
    label: '% alquiler o hipoteca · parte oficina',
    hint: 'Qº requiere declaración 036',
    priceRangeLow: 0, priceRangeHigh: 0, unit: 'mes', defaultAmount: 0,
    deductibility: 'partial', partialRate: 0.25, partialNote: '20–30% del total',
    activities: 'all',
  },
  {
    id: 'suministros_oficina',
    group: 'vivienda',
    groupDesc: 'Solo si trabajas desde casa. Requiere afectar % en el 036',
    label: '% suministros · luz, agua, gas',
    hint: '10% de la parte afectada',
    priceRangeLow: 0, priceRangeHigh: 0, unit: 'mes', defaultAmount: 0,
    deductibility: 'partial', partialRate: 0.10, partialNote: 'parcial',
    activities: 'all',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Filter buckets relevant to a given activity */
export function getBucketsForActivity(activity: ActivityKey | null): GastoBucket[] {
  if (!activity) return BUCKETS.filter(b => b.activities === 'all');
  return BUCKETS.filter(b => b.activities === 'all' || (b.activities as ActivityKey[]).includes(activity));
}

/** Buckets grouped by group id */
export function groupBuckets(buckets: GastoBucket[]): Map<string, GastoBucket[]> {
  const map = new Map<string, GastoBucket[]>();
  for (const g of GROUPS) map.set(g.id, []);
  for (const b of buckets) {
    const arr = map.get(b.group);
    if (arr) arr.push(b);
  }
  return map;
}

/** Effective annual deductible amount for a bucket */
export function annualDeductible(bucket: GastoBucket, amount: number): number {
  const raw = bucket.unit === 'mes' ? amount * 12 : amount;
  const rate = bucket.deductibility === 'partial' ? (bucket.partialRate ?? 0.5) : 1;
  // Amortizable items: 25% per year
  if (bucket.amortizable && raw > 300) return raw * 0.25 * rate;
  return raw * rate;
}

/** Quarterly deductible amount */
export function quarterlyDeductible(bucket: GastoBucket, amount: number): number {
  return annualDeductible(bucket, amount) / 4;
}

/** Price range label */
export function priceRangeLabel(bucket: GastoBucket): string {
  if (bucket.priceRangeLow === 0 && bucket.priceRangeHigh === 0) {
    return bucket.partialNote ?? 'variable';
  }
  const lo = `€${bucket.priceRangeLow}`;
  const hi = `€${bucket.priceRangeHigh}`;
  const u = bucket.unit === 'mes' ? '/mes' : bucket.unit === 'año' ? '/año' : '';
  return `${lo}–${hi}${u}`;
}

/** Effective rate label shown on item */
export function deductibilityLabel(bucket: GastoBucket): string {
  if (bucket.deductibility === 'full') return '100%';
  return bucket.partialNote ?? `${Math.round((bucket.partialRate ?? 0.5) * 100)}%`;
}

/** Activity label for display */
export const ACTIVITY_LABELS: Record<ActivityKey, string> = {
  consultoria_tech: 'Consultor / Tecnología',
  diseno:           'Diseño · Creativos',
  formacion:        'Formación',
  salud:            'Salud',
  construccion:     'Construcción',
  comercio:         'Comercio',
  transporte:       'Transporte',
  otro:             'Otros',
};
