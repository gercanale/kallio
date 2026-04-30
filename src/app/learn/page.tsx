'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, BookOpen, Search } from 'lucide-react';
import { useKallioStore } from '@/lib/store';
import { translations } from '@/lib/i18n';
import { Navigation } from '@/components/Navigation';
import { getAllExplanations, LEARN_GROUPS, type ConceptKey } from '@/lib/tax-explanations';

const C = {
  BG: '#fdfaf3',
  INK: '#1a1f2e',
  MUTED: '#6b6456',
  BORDER: '#e8dfc8',
  IVA: '#c44536',
  IRPF: '#d4a017',
  OK: '#5a7a3e',
  CARD: '#ffffff',
  WARM: '#c9bfa8',
};

// ─── Guide types ───────────────────────────────────────────────────────────────

interface Callout {
  label: string;
  value: string;
  color?: string;
}

interface Section {
  id: string;
  title: string;
  body: string[];
  callouts?: Callout[];
  tip?: string;
  warning?: string;
  link?: { label: string; href: string };
}

interface Chapter {
  id: string;
  num: string;
  label: string;
  tagline: string;
  sections: Section[];
}

// ─── Guide content ─────────────────────────────────────────────────────────────

const CHAPTERS: Chapter[] = [
  {
    id: 'basico',
    num: '01',
    label: 'Lo básico',
    tagline: 'Cómo funciona el sistema fiscal para autónomos',
    sections: [
      {
        id: 'quien',
        title: '¿Quién es autónomo?',
        body: [
          'Eres autónomo cuando facturas de forma habitual como persona física. No necesitas tener una empresa (SL). Puedes estar dado de alta en el RETA (Régimen Especial de Trabajadores Autónomos) de la Seguridad Social y declarar el IRPF en estimación directa simplificada.',
          'La mayoría de autónomos usan la modalidad de estimación directa simplificada, que es la más sencilla: pagas impuestos sobre tus ingresos reales menos tus gastos reales.',
        ],
        tip: 'Si facturas menos de €150.000/año y no tienes empleados ni renuncias a la estimación directa, casi seguro que estás en estimación directa simplificada.',
      },
      {
        id: 'dos-impuestos',
        title: 'Dos impuestos principales: IVA e IRPF',
        body: [
          'Como autónomo gestionas dos impuestos grandes. Son conceptualmente muy distintos.',
          'El IVA (Impuesto sobre el Valor Añadido) no es tuyo. Lo cobras a tus clientes en nombre del Estado. Cada trimestre, liquidas la diferencia entre lo que cobraste (IVA repercutido) y lo que pagaste en compras y gastos (IVA soportado). Si cobraste más de lo que pagaste, ingresas la diferencia. Si pagaste más, puedes compensarlo o incluso recuperarlo.',
          'El IRPF (Impuesto sobre la Renta de las Personas Físicas) sí es tuyo. Es el impuesto sobre tus beneficios (ingresos − gastos). Se paga en dos momentos: adelantos trimestrales (M130) y la declaración anual de junio.',
        ],
        callouts: [
          { label: 'IVA general', value: '21%', color: C.IVA },
          { label: 'IVA reducido', value: '10%', color: C.IVA },
          { label: 'IVA superreducido', value: '4%', color: C.IVA },
          { label: 'Retención IRPF habitual', value: '15%', color: C.IRPF },
        ],
      },
      {
        id: 'retencion',
        title: 'La retención del 15%',
        body: [
          'Cuando facturas a empresas españolas, puedes aplicar una retención de IRPF del 15% (7% el primer año). Esto significa que el cliente te paga un 15% menos, pero ingresa ese importe directamente a Hacienda en tu nombre.',
          'Esta retención es un adelanto de tu IRPF anual. Al hacer la declaración de junio, se descuenta de lo que debes. Si retuvieron más de lo que debes, Hacienda te devuelve la diferencia.',
          'Ojo: si tu cliente es un particular o una empresa extranjera, generalmente no aplicas retención, y tú debes pagar los adelantos trimestralmente vía M130.',
        ],
        callouts: [
          { label: 'Retención año 1', value: '7%', color: C.IRPF },
          { label: 'Retención habitual', value: '15%', color: C.IRPF },
        ],
        warning: 'Si tus retenciones cubren más del 70% de tus ingresos anuales, estás exento de presentar el M130. De lo contrario, debes presentarlo aunque tengas retenciones.',
      },
    ],
  },
  {
    id: 'trimestres',
    num: '02',
    label: 'Tus trimestres',
    tagline: 'El ciclo fiscal trimestral explicado',
    sections: [
      {
        id: 'ciclo',
        title: 'El ciclo trimestral',
        body: [
          'El año fiscal se divide en 4 trimestres. Cada trimestre tienes un plazo para presentar tus modelos y, si procede, pagar. Los plazos son siempre los mismos: los primeros 20 días del mes siguiente al fin del trimestre (el 4T es hasta el 30 de enero).',
          '1T: enero–marzo → presentar entre el 1 y el 20 de abril.',
          '2T: abril–junio → presentar entre el 1 y el 20 de julio.',
          '3T: julio–septiembre → presentar entre el 1 y el 20 de octubre.',
          '4T: octubre–diciembre → presentar entre el 1 y el 30 de enero.',
        ],
        callouts: [
          { label: '1T vence', value: '20 abr', color: C.INK },
          { label: '2T vence', value: '20 jul', color: C.INK },
          { label: '3T vence', value: '20 oct', color: C.INK },
          { label: '4T vence', value: '30 ene', color: C.INK },
        ],
      },
      {
        id: 'modelos',
        title: 'Los modelos que presentas',
        body: [
          'M303 – IVA trimestral. Resumes todo el IVA que facturaste (repercutido) y todo el IVA que pagaste en gastos (soportado). Si repercutido > soportado, pagas la diferencia. Si facturas a empresas europeas sin IVA o tienes mucho gasto, puede salirte negativo — compensas el próximo trimestre o solicitas devolución en el 4T.',
          'M130 – Pago fraccionado IRPF. Pagas el 20% del beneficio neto acumulado desde enero. Se resta lo que pagaste los trimestres anteriores, así que en realidad solo pagas el incremento de cada período. Si tus retenciones cubren más del 70% de tus ingresos, estás exento.',
          'M349 – Operaciones intracomunitarias. Solo si facturas a empresas de otros países de la UE. Se presenta el mismo plazo que el M303.',
        ],
        tip: 'El M130 usa la base acumulada: en el 3T calculas sobre enero-septiembre completo, no solo sobre julio-septiembre. Kallio hace este cálculo automáticamente.',
      },
      {
        id: 'provision',
        title: 'Cuánto provisionar cada mes',
        body: [
          'Cuando cobres una factura, separa inmediatamente el IVA (21% si es el tipo general) porque ese dinero nunca fue tuyo. Además, reserva entre un 15% y un 25% del neto para el IRPF.',
          'Ejemplo: cobras €1.000 + IVA a una empresa española que te retiene el 15%. Recibes €1.000 + €210 IVA − €150 retención = €1.060 en cuenta. Los €210 de IVA los pagas en el M303. Los €150 ya los ingresó tu cliente. Del neto restante (€850), conviene reservar €170–210 más para la renta anual según tu tramo.',
        ],
        callouts: [
          { label: 'IVA a separar', value: '21%', color: C.IVA },
          { label: 'IRPF a provisionar', value: '15–25%', color: C.IRPF },
          { label: 'Del neto, tuyo seguro', value: '~60–70%', color: C.OK },
        ],
      },
    ],
  },
  {
    id: 'gastos',
    num: '03',
    label: 'Gastos deducibles',
    tagline: 'Qué puedes deducir y cómo funciona',
    sections: [
      {
        id: 'que-es-deducir',
        title: '¿Qué significa deducir un gasto?',
        body: [
          'Deducir un gasto significa restarlo de tus ingresos para calcular el beneficio sobre el que pagas IRPF. Si ingresas €40.000 y tienes €10.000 en gastos deducibles, pagas IRPF sobre €30.000, no sobre €40.000.',
          'En IVA, los gastos deducibles también te permiten recuperar el IVA que pagaste en esas compras. Lo descontás directamente en el M303.',
          'Para ser deducible, un gasto debe cumplir tres condiciones: (1) ser necesario para la actividad, (2) estar correctamente justificado con factura o ticket, y (3) estar registrado en tu libro de gastos.',
        ],
        warning: 'Un ticket del supermercado o una comida con amigos no es deducible aunque "hables de trabajo". El gasto debe ser claramente profesional y justificable ante Hacienda.',
      },
      {
        id: 'gastos-comunes',
        title: 'Los gastos más comunes',
        body: [
          'Software y suscripciones: herramientas que uses en tu trabajo (Adobe, Figma, Notion, hosting, dominios, cloud). Deducible al 100% si es exclusivamente profesional.',
          'Teléfono e internet: si los usas para trabajar, Hacienda suele aceptar el 50% si no tienes líneas separadas personales/profesionales.',
          'Material de oficina: papel, tóner, teclados, ratones, pantallas. 100% deducible.',
          'Formación: cursos, libros, suscripciones de formación relacionados con tu actividad.',
          'Cuota de autónomos: la cuota mensual de la Seguridad Social es gasto deducible de IRPF al 100%.',
          'Seguro de responsabilidad civil y gestoría: 100% deducibles.',
        ],
        callouts: [
          { label: 'Software profesional', value: '100%', color: C.OK },
          { label: 'Teléfono / internet', value: '~50%', color: C.IRPF },
          { label: 'Cuota autónomos', value: '100%', color: C.OK },
          { label: 'Formación', value: '100%', color: C.OK },
        ],
        link: { label: 'Ver todos los gastos en Kallio →', href: '/gastos' },
      },
      {
        id: 'gdj',
        title: 'GDJ: Gastos de Difícil Justificación',
        body: [
          'En estimación directa simplificada tienes una ventaja especial: puedes deducir el 5% de tu beneficio neto como "Gastos de Difícil Justificación" (GDJ), sin necesidad de justificar nada. El tope es €2.000 anuales.',
          'Si tu beneficio neto es €30.000, el GDJ son €1.500 deducibles automáticamente. Kallio lo calcula y aplica por ti.',
        ],
        callouts: [
          { label: 'GDJ', value: '5% del neto', color: C.OK },
          { label: 'Tope anual', value: '€2.000', color: C.MUTED },
        ],
        tip: 'El GDJ solo aplica en estimación directa simplificada. Es una de las ventajas de este régimen frente a la modalidad normal.',
      },
      {
        id: 'home-office',
        title: 'Despacho en casa',
        body: [
          'Si trabajas desde casa, puedes deducir una parte de los suministros (luz, agua, gas, internet) proporcional a los metros usados como despacho. La fórmula de Hacienda: (m² despacho / m² totales) × 30% del gasto.',
          'Ejemplo: piso de 80m², despacho de 16m² → 20%. De €100 de luz, deduces 20% × 30% = €6. No parece mucho, pero en el año suma.',
        ],
        warning: 'Hacienda es estricta aquí. Los metros deben ser reales y el despacho debe ser de uso exclusivamente profesional para deducir el alquiler/hipoteca.',
      },
    ],
  },
  {
    id: 'renta',
    num: '04',
    label: 'La Renta anual',
    tagline: 'Qué pasa en junio y cómo calcularlo',
    sections: [
      {
        id: 'que-es-renta',
        title: '¿Qué es la declaración de la Renta?',
        body: [
          'La declaración de la Renta (IRPF anual) es el ajuste final de cuentas con Hacienda. Durante el año has pagado adelantos vía retenciones y M130. En junio del año siguiente calculas cuánto deberías haber pagado realmente y pagas la diferencia — o recibes la devolución si pagaste de más.',
          'El período de presentación es de abril a junio. En 2026, declaras la renta del ejercicio 2025.',
        ],
        callouts: [
          { label: 'Período declaración', value: 'Abr–Jun', color: C.INK },
          { label: 'Ejercicio que se declara', value: 'Año anterior', color: C.INK },
          { label: 'Fecha límite', value: '30 Jun', color: C.IVA },
        ],
      },
      {
        id: 'tramos',
        title: 'Los tramos del IRPF',
        body: [
          'El IRPF en España es progresivo: no pagas el mismo porcentaje sobre todo tu ingreso. Cada tramo tiene su tipo, y solo el importe que supera cada umbral tributa al tipo de ese tramo.',
          'Tramos generales estatales (2025): hasta €12.450 → 19%. De €12.450 a €20.200 → 24%. De €20.200 a €35.200 → 30%. De €35.200 a €60.000 → 37%. De €60.000 a €300.000 → 45%. Más de €300.000 → 47%.',
          'A estos tipos estatales se suman los autonómicos. El tipo efectivo total depende de tu comunidad autónoma.',
          'Base del ahorro (dividendos, plusvalías, crypto): hasta €6.000 → 19%. De €6.000 a €50.000 → 21%. De €50.000 a €200.000 → 23%. De €200.000 a €300.000 → 27%. Más de €300.000 → 28%.',
        ],
        callouts: [
          { label: 'Primer tramo', value: '19%', color: C.OK },
          { label: 'Tramo medio', value: '30–37%', color: C.IRPF },
          { label: 'Tramo alto', value: '45–47%', color: C.IVA },
          { label: 'Base del ahorro', value: '19–28%', color: C.INK },
        ],
        link: { label: 'Calcular mi Renta estimada →', href: '/renta' },
      },
      {
        id: 'minimo-personal',
        title: 'Mínimo personal y familiar',
        body: [
          'Antes de aplicar los tipos, Hacienda descuenta el "mínimo personal y familiar" — un importe que no tributa. El mínimo personal base es €5.550 para todos.',
          'Con hijos a cargo: primer hijo +€2.400, segundo +€2.700, tercero +€4.000, cuarto y siguientes +€4.500. Si el hijo tiene menos de 3 años, hay €2.800 adicionales.',
          'El ahorro real depende de tu tramo marginal, pero siempre es significativo.',
        ],
        callouts: [
          { label: 'Mínimo personal', value: '€5.550', color: C.OK },
          { label: 'Primer hijo', value: '+€2.400', color: C.OK },
          { label: 'Segundo hijo', value: '+€2.700', color: C.OK },
        ],
      },
      {
        id: 'resultado',
        title: 'Cómo se calcula el resultado final',
        body: [
          'El proceso: (1) Base imponible = ingresos − gastos deducibles − GDJ − cuotas autónomo. (2) Aplicar tramos → cuota íntegra estatal + autonómica. (3) Restar deducciones autonómicas (vivienda, familia…). (4) Restar retenciones y M130 ya pagados. (5) El resultado es lo que pagas o lo que te devuelven.',
          'Si durante el año provisionaste bien tus adelantos, el resultado de la renta suele ser un ajuste pequeño, no una sorpresa.',
        ],
        tip: 'La clave para no tener sustos en junio es provisionar bien durante el año. Si reservas el 20–25% de cada cobro neto para IRPF, raramente la declaración te sorprenderá.',
      },
    ],
  },
  {
    id: 'region',
    num: '05',
    label: 'Tu región',
    tagline: 'Deducciones autonómicas para tu comunidad',
    sections: [],
  },
];

type RegionKey = 'valencia' | 'cataluna' | 'madrid' | 'andalucia' | 'pais_vasco' | 'otro';

const REGIONAL_CONTENT: Record<RegionKey, Section[]> = {
  valencia: [
    {
      id: 'valencia-intro',
      title: 'Comunitat Valenciana: visión general',
      body: [
        'La Comunitat Valenciana ofrece un catálogo de deducciones autonómicas que complementan las estatales. A partir de 2025 se han incorporado nuevas deducciones por gastos de salud. Estas deducciones se aplican sobre la cuota autonómica, reduciendo directamente lo que pagas.',
      ],
      link: {
        label: 'Manual IRPF 2025 – Deducciones Comunitat Valenciana (AEAT) →',
        href: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunitat-valenciana.html',
      },
    },
    {
      id: 'valencia-salud',
      title: 'Salud: dental, mental y óptica (nueva 2025)',
      body: [
        'Desde 2025, la Comunitat Valenciana permite deducir el 30% de los gastos de salud no cubiertos por la Seguridad Social, con un máximo de €150 anuales por contribuyente.',
        'Incluye: tratamientos dentales, gafas y lentillas con receta, y consultas de psicología o psiquiatría no reembolsadas.',
      ],
      callouts: [
        { label: 'Deducción', value: '30% gastos salud', color: C.OK },
        { label: 'Tope', value: '€150 / año', color: C.OK },
        { label: 'Aplica desde', value: '2025', color: C.INK },
      ],
      tip: 'Guarda todas las facturas de dentista, óptica y psicólogo del año.',
    },
    {
      id: 'valencia-deportes',
      title: 'Actividades deportivas',
      body: [
        'Puedes deducir el 30% de los gastos en actividades físicas y deportivas (gym, clases, federaciones), con un máximo de €150 anuales.',
        'Aplica tanto para ti como para tus hijos menores si los gastos corren a tu cargo.',
      ],
      callouts: [
        { label: 'Deducción', value: '30%', color: C.OK },
        { label: 'Tope', value: '€150 / persona', color: C.OK },
      ],
    },
    {
      id: 'valencia-alquiler',
      title: 'Alquiler de vivienda habitual (<35 años)',
      body: [
        'Si tienes menos de 35 años y pagas alquiler por tu vivienda habitual, puedes deducir el 15% de lo pagado, con un tope de €550 anuales.',
        'Requisito: la base imponible total no puede superar €25.000 (individual) o €40.000 (conjunta).',
      ],
      callouts: [
        { label: 'Deducción', value: '15% del alquiler', color: C.OK },
        { label: 'Tope', value: '€550 / año', color: C.OK },
        { label: 'Límite de renta', value: 'Base < €25.000', color: C.MUTED },
      ],
    },
    {
      id: 'valencia-familia',
      title: 'Familia y conciliación',
      body: [
        'Nacimiento o adopción: €270 por cada hijo nacido o adoptado en el ejercicio.',
        'Familia numerosa: €300 general; €600 especial.',
        'Gastos de guardería: 15% de las cantidades satisfechas, límite €270 anuales.',
        'Cuidado de ascendientes: €179 por ascendiente mayor de 70 años que conviva contigo.',
      ],
      callouts: [
        { label: 'Nacimiento / adopción', value: '€270', color: C.OK },
        { label: 'Familia numerosa general', value: '€300', color: C.OK },
        { label: 'Guardería (15%)', value: 'máx. €270', color: C.OK },
      ],
    },
    {
      id: 'valencia-energia',
      title: 'Energía renovable y vehículo eléctrico',
      body: [
        'Instalación de paneles solares o mejoras de eficiencia energética: 20% de la inversión, tope €8.000 anuales.',
        'Adquisición de vehículo eléctrico o híbrido enchufable nuevo: 10% del precio, tope €4.000.',
      ],
      callouts: [
        { label: 'Energía solar / renovable', value: '20%, máx. €8.000', color: C.OK },
        { label: 'Vehículo eléctrico', value: '10%, máx. €4.000', color: C.OK },
      ],
      link: {
        label: 'Fuente oficial: AEAT Comunitat Valenciana →',
        href: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas/comunitat-valenciana.html',
      },
    },
  ],
  cataluna: [
    {
      id: 'cataluna-intro',
      title: 'Catalunya: visión general',
      body: [
        'Catalunya tiene una de las cargas autonómicas más altas de España. Su tramo autonómico del IRPF supera al de Madrid en todos los tramos, haciendo especialmente importante aprovechar las deducciones disponibles.',
      ],
    },
    {
      id: 'cataluna-deducciones',
      title: 'Principales deducciones autonómicas',
      body: [
        'Alquiler de vivienda habitual: 10% de lo pagado si tienes menos de 33 años o eres familia numerosa, tope €300 (o €600 familia numerosa). Base imponible inferior a €20.000.',
        'Donaciones a entidades catalanas: 25% de donativos a fundaciones y asociaciones de utilidad pública.',
        'Rehabilitación de vivienda habitual: 1,5% de las cantidades invertidas, límite €9.040.',
        'Nacimiento o adopción: €150 por el primer hijo, €300 por el segundo, €600 por el tercero y siguientes.',
      ],
      callouts: [
        { label: 'Alquiler <33 años', value: '10%, máx. €300', color: C.OK },
        { label: 'Donaciones', value: '25%', color: C.OK },
        { label: 'Tercer hijo', value: '€600', color: C.OK },
      ],
    },
  ],
  madrid: [
    {
      id: 'madrid-intro',
      title: 'Comunidad de Madrid: ventaja fiscal',
      body: [
        'Madrid es la comunidad con menor presión fiscal autonómica de España. Aplica una bonificación del 25% sobre la cuota íntegra autonómica, reduciendo significativamente el tipo efectivo.',
      ],
      callouts: [{ label: 'Bonificación cuota autonómica', value: '25%', color: C.OK }],
    },
    {
      id: 'madrid-deducciones',
      title: 'Principales deducciones autonómicas',
      body: [
        'Nacimiento o adopción: €600 por el primero, €750 por el segundo, €900 por el tercero y siguientes.',
        'Alquiler de vivienda habitual: 20% para menores de 35 años. Tope €840.',
        'Inversión en empresas nuevas o jóvenes: 20% de la inversión, máx. €4.000.',
      ],
      callouts: [
        { label: 'Nacimiento 1er hijo', value: '€600', color: C.OK },
        { label: 'Alquiler <35 años', value: '20%, máx. €840', color: C.OK },
        { label: 'Inversión startups', value: '20%', color: C.OK },
      ],
    },
  ],
  andalucia: [
    {
      id: 'andalucia-intro',
      title: 'Andalucía: escala autonómica propia',
      body: [
        'Andalucía aprobó en 2023 su propia escala autonómica del IRPF con tipos inferiores a los estatales, acercándose a Madrid en términos de presión fiscal.',
      ],
    },
    {
      id: 'andalucia-deducciones',
      title: 'Principales deducciones autonómicas',
      body: [
        'Compra de vivienda nueva por jóvenes: 3% si eres menor de 35 años y la vivienda es nueva (máx. €1.800).',
        'Gastos educativos: 15% de gastos en escolaridad, libros y uniformes de hijos en educación obligatoria (máx. €150 por hijo).',
        'Asistencia a personas mayores dependientes: €100 por ascendiente mayor de 75 años a cargo.',
      ],
      callouts: [
        { label: 'Vivienda nueva <35 años', value: '3%, máx. €1.800', color: C.OK },
        { label: 'Gastos educativos', value: '15%, máx. €150/hijo', color: C.OK },
      ],
    },
  ],
  pais_vasco: [
    {
      id: 'pais-vasco-intro',
      title: 'País Vasco: régimen foral propio',
      body: [
        'El País Vasco (y Navarra) tienen régimen foral propio. Los territorios históricos (Álava, Gipuzkoa, Bizkaia) tienen sus propias normativas de IRPF y recaudan directamente sin pasar por la AEAT.',
        'Si vives o trabajas en el País Vasco, los cálculos de Kallio pueden no ser exactos. Consulta siempre con un gestor especializado en régimen foral.',
      ],
      warning: 'Kallio está optimizado para el régimen común de tributación. Si resides en País Vasco o Navarra, consulta con un gestor especializado.',
      link: { label: 'Hacienda Foral de Bizkaia →', href: 'https://www.bizkaia.eus/ogasuna' },
    },
  ],
  otro: [
    {
      id: 'otro-intro',
      title: 'Deducciones de tu comunidad autónoma',
      body: [
        'Cada comunidad autónoma tiene su propio catálogo de deducciones que complementan las estatales. La AEAT publica anualmente el manual práctico del IRPF con un capítulo específico por comunidad.',
      ],
      link: {
        label: 'Manual IRPF 2025 – Deducciones autonómicas (AEAT) →',
        href: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025-deducciones-autonomicas.html',
      },
    },
  ],
};

const REGION_LABELS: Record<RegionKey, string> = {
  valencia: 'C. Valenciana',
  cataluna: 'Cataluña',
  madrid: 'Madrid',
  andalucia: 'Andalucía',
  pais_vasco: 'País Vasco',
  otro: 'Otra',
};

// ─── Section block (guide) ─────────────────────────────────────────────────────

function SectionBlock({ section, defaultOpen = false }: { section: Section; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: `1px solid ${C.BORDER}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: C.INK, lineHeight: 1.3 }}>
          {section.title}
        </span>
        {open
          ? <ChevronUp size={16} color={C.MUTED} style={{ flexShrink: 0 }} />
          : <ChevronDown size={16} color={C.MUTED} style={{ flexShrink: 0 }} />
        }
      </button>

      {open && (
        <div style={{ paddingBottom: 20 }}>
          {section.body.map((para, i) => (
            <p key={i} style={{ fontSize: 14, color: C.INK, lineHeight: 1.7, marginBottom: 10 }}>
              {para}
            </p>
          ))}

          {section.callouts && section.callouts.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(section.callouts.length, 2)}, 1fr)`,
              gap: 10,
              margin: '14px 0',
            }}>
              {section.callouts.map((c, i) => (
                <div key={i} style={{
                  background: C.BG,
                  border: `1px solid ${C.BORDER}`,
                  borderRadius: 10,
                  padding: '11px 13px',
                }}>
                  <div style={{ fontSize: 10, color: C.MUTED, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: c.color || C.INK }}>
                    {c.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {section.tip && (
            <div style={{ background: '#f0f7eb', border: `1px solid ${C.OK}`, borderRadius: 10, padding: '11px 14px', marginTop: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.OK, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tip </span>
              <span style={{ fontSize: 13, color: C.INK }}>{section.tip}</span>
            </div>
          )}

          {section.warning && (
            <div style={{ background: '#fef9e7', border: `1px solid ${C.IRPF}`, borderRadius: 10, padding: '11px 14px', marginTop: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.IRPF, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Atención </span>
              <span style={{ fontSize: 13, color: C.INK }}>{section.warning}</span>
            </div>
          )}

          {section.link && (
            <a
              href={section.link.href}
              target={section.link.href.startsWith('http') ? '_blank' : undefined}
              rel={section.link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 14,
                fontSize: 13,
                color: C.INK,
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: `1px solid ${C.INK}`,
                paddingBottom: 1,
              }}
            >
              {section.link.label}
              {section.link.href.startsWith('http') && <ExternalLink size={12} />}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Guide tab ─────────────────────────────────────────────────────────────────

function GuideTab() {
  const [selectedChapter, setSelectedChapter] = useState('basico');
  const [selectedRegion, setSelectedRegion] = useState<RegionKey>('valencia');

  const chapter = CHAPTERS.find(c => c.id === selectedChapter)!;
  const sections: Section[] = chapter.id === 'region'
    ? REGIONAL_CONTENT[selectedRegion]
    : chapter.sections;

  const currentIndex = CHAPTERS.findIndex(c => c.id === selectedChapter);
  const nextChapter = CHAPTERS[currentIndex + 1];

  return (
    <div>
      {/* Chapter nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {CHAPTERS.map((ch) => {
          const active = ch.id === selectedChapter;
          return (
            <button
              key={ch.id}
              onClick={() => setSelectedChapter(ch.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 16px',
                borderRadius: 12,
                border: `1.5px solid ${active ? C.INK : C.BORDER}`,
                background: active ? C.INK : C.CARD,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: active ? C.WARM : C.MUTED, minWidth: 22 }}>
                {ch.num}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#fff' : C.INK }}>{ch.label}</div>
                <div style={{ fontSize: 12, color: active ? C.WARM : C.MUTED, marginTop: 1 }}>{ch.tagline}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Region selector (chapter 05 only) */}
      {chapter.id === 'region' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: C.MUTED, marginBottom: 10 }}>Selecciona tu comunidad autónoma:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(REGION_LABELS) as RegionKey[]).map((rk) => {
              const sel = rk === selectedRegion;
              return (
                <button
                  key={rk}
                  onClick={() => setSelectedRegion(rk)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 20,
                    border: `1.5px solid ${sel ? C.INK : C.BORDER}`,
                    background: sel ? C.INK : C.CARD,
                    color: sel ? '#fff' : C.INK,
                    fontSize: 13,
                    fontWeight: sel ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {REGION_LABELS[rk]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chapter content */}
      <div style={{ background: C.CARD, borderRadius: 16, border: `1px solid ${C.BORDER}`, padding: '20px 20px 8px', marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: 10, color: C.MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Capítulo {chapter.num}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.INK, margin: '0 0 3px' }}>{chapter.label}</h2>
        <p style={{ fontSize: 13, color: C.MUTED, margin: '0 0 16px', lineHeight: 1.5 }}>{chapter.tagline}</p>
        <div>
          {sections.map((section, i) => (
            <SectionBlock key={section.id} section={section} defaultOpen={i === 0} />
          ))}
        </div>
      </div>

      {/* Next chapter card */}
      {nextChapter && (
        <button
          onClick={() => {
            setSelectedChapter(nextChapter.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderRadius: 14,
            border: `1.5px dashed ${C.BORDER}`,
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: C.MUTED, marginBottom: 3 }}>Siguiente capítulo</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.INK }}>{nextChapter.num} · {nextChapter.label}</div>
            <div style={{ fontSize: 12, color: C.MUTED, marginTop: 1 }}>{nextChapter.tagline}</div>
          </div>
          <span style={{ fontSize: 20, color: C.MUTED }}>→</span>
        </button>
      )}
    </div>
  );
}

// ─── Glossary tab (German's original content) ─────────────────────────────────

function GlossaryTab() {
  const language = useKallioStore((s) => s.language);
  const tl = translations[language].learn;
  const explanations = getAllExplanations(language === 'es' ? 'es' : 'en');

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<ConceptKey | null>(null);

  const toggle = (key: ConceptKey) => setExpanded((prev) => (prev === key ? null : key));

  const searchLower = search.toLowerCase();
  const matchesConcept = (key: ConceptKey) => {
    if (!searchLower) return true;
    const exp = explanations[key];
    return exp.title.toLowerCase().includes(searchLower) || exp.body.toLowerCase().includes(searchLower);
  };

  const visibleGroups = LEARN_GROUPS.map((g) => ({
    ...g,
    concepts: g.concepts.filter(matchesConcept),
  })).filter((g) => g.concepts.length > 0);

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.MUTED }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tl.searchPlaceholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 10,
            padding: '10px 14px 10px 38px', fontSize: 14, color: C.INK,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>

      {/* Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {visibleGroups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: C.MUTED }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📖</div>
            <p style={{ fontSize: 14 }}>{tl.noResults}</p>
          </div>
        )}

        {visibleGroups.map((group) => (
          <section key={group.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>{group.icon}</span>
              <span className="mono" style={{ fontSize: 11, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                {language === 'es' ? group.titleES : group.titleEN}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.concepts.map((key) => {
                const exp = explanations[key];
                const isOpen = expanded === key;
                return (
                  <div key={key} style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                    <button
                      onClick={() => toggle(key)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', background: 'transparent', border: 'none',
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.INK }}>{exp.title}</span>
                      {isOpen
                        ? <ChevronUp size={16} style={{ color: C.MUTED, flexShrink: 0 }} />
                        : <ChevronDown size={16} style={{ color: C.MUTED, flexShrink: 0 }} />}
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${C.BORDER}`, paddingTop: 14 }}>
                        <p style={{ fontSize: 14, color: C.MUTED, lineHeight: 1.7, marginBottom: exp.example ? 12 : 0 }}>
                          {exp.body}
                        </p>
                        {exp.example && (
                          <div style={{ background: '#eef3eb', borderRadius: 10, padding: '10px 14px', border: '1px solid #c8ddc0' }}>
                            <p style={{ fontSize: 13, color: '#3d5a29', lineHeight: 1.6 }}>
                              <span style={{ fontWeight: 600 }}>{tl.exampleLabel}</span>
                              {exp.example}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 32, background: '#f0e8d3', borderRadius: 12, padding: '14px 20px' }}>
        <p style={{ fontSize: 12, color: C.MUTED, lineHeight: 1.6, textAlign: 'center' }}>{tl.disclaimer}</p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'guide' | 'glossary';

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<Tab>('guide');

  return (
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK }}>
      <Navigation />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '80px 16px 88px', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BookOpen size={15} color={C.MUTED} />
            <span className="mono" style={{ fontSize: 10, color: C.MUTED, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              APRENDE
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.INK, margin: 0, lineHeight: 1.2 }}>
            Entiende tus impuestos
          </h1>
          <p style={{ fontSize: 14, color: C.MUTED, marginTop: 6, lineHeight: 1.5 }}>
            Una guía clara y un glosario de conceptos fiscales para autónomos.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: C.CARD,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 12,
          padding: 4,
          marginBottom: 28,
        }}>
          {([
            { key: 'guide', label: '📖 Guía paso a paso' },
            { key: 'glossary', label: '🔍 Glosario fiscal' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 9,
                  border: 'none',
                  background: active ? C.INK : 'transparent',
                  color: active ? '#fff' : C.MUTED,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'guide' ? <GuideTab /> : <GlossaryTab />}

      </main>
    </div>
  );
}
