import { formatCurrency } from './tax-engine';
import type { CoachContext } from './coachPrompt';

// ─── Chip questions ───────────────────────────────────────────────────────────

const ALL_CHIPS = [
  '¿Cómo se calcula mi dinero disponible?',
  '¿Por qué reservo tanto en impuestos?',
  '¿Qué pasa si pago tarde?',
  '¿Podría pagar menos con deducciones?',
  '¿Qué le pregunto a mi gestor?',
];

export function getInitialChips(_ctx: CoachContext): string[] {
  return ALL_CHIPS.slice(0, 3);
}

export function getNextChips(_ctx: CoachContext, answered: string[]): string[] {
  return ALL_CHIPS.filter((c) => !answered.includes(c));
}

// ─── Opening message ──────────────────────────────────────────────────────────

export function getOpeningMessage(ctx: CoachContext): string {
  const isEds = ctx.user.fiscalRegime !== 'beckham';
  const taxLabel = isEds ? 'IRPF' : 'IRNR';
  return `Hola, soy tu coach fiscal de Kallio. Tienes ${formatCurrency(ctx.currentQuarter.spendableBalance)} disponibles realmente este trimestre — después de reservar ${formatCurrency(ctx.currentQuarter.totalTaxReserve)} para IVA y ${taxLabel}. Tu próximo pago es el ${ctx.upcomingDeadline.date}, en ${ctx.upcomingDeadline.daysUntil} días. ¿Qué quieres entender mejor?`;
}

// ─── Fallback responses ───────────────────────────────────────────────────────

export function getFallbackResponse(question: string, ctx: CoachContext): string {
  const q = question.toLowerCase();
  const isEds = ctx.user.fiscalRegime !== 'beckham';
  const advanceLabel = isEds ? 'IRPF' : 'IRNR';

  // Fallback 1: dinero disponible
  if (q.includes('dinero disponible') || q.includes('cómo se calcula') || q.includes('como se calcula')) {
    return `Tu dinero disponible (${formatCurrency(ctx.currentQuarter.spendableBalance)}) se calcula así: ${formatCurrency(ctx.currentQuarter.grossIncome)} ingresos brutos − ${formatCurrency(ctx.currentQuarter.ivaResult)} IVA que debes a Hacienda − ${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)} adelanto de ${advanceLabel} = ${formatCurrency(ctx.currentQuarter.spendableBalance)} disponible real. Este número se actualiza cada vez que añades una factura o un gasto. ¿Quieres que te explique cómo reducir la reserva de impuestos?`;
  }

  // Fallback 2: por qué reservo tanto
  if (q.includes('reservo') || q.includes('impuestos') || q.includes('por qué')) {
    const taxPct = Math.round(
      (ctx.currentQuarter.totalTaxReserve / Math.max(1, ctx.currentQuarter.grossIncome)) * 100
    );
    return `Tu reserva de ${formatCurrency(ctx.currentQuarter.totalTaxReserve)} tiene dos partes: IVA (${formatCurrency(ctx.currentQuarter.ivaResult)}), que cobras a tu cliente pero pertenece a Hacienda y pagas el ${ctx.upcomingDeadline.date}; y ${advanceLabel} (${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)}), ${isEds ? 'un adelanto del 20% sobre tus beneficios netos este trimestre' : 'tipo fijo del 24% sobre tus ingresos netos — el beneficio del régimen Beckham frente al IRPF progresivo'}. Juntas representan el ${taxPct}% de lo facturado. ¿Te explico cómo reducir alguna de las dos partes?`;
  }

  // Fallback 3: qué pasa si pago tarde
  if (q.includes('pago tarde') || q.includes('pagar tarde') || q.includes('retraso') || q.includes('recargo')) {
    return `Tienes ${ctx.upcomingDeadline.daysUntil} días para pagar ${formatCurrency(ctx.upcomingDeadline.estimatedPayment)} antes del ${ctx.upcomingDeadline.date}. Si pagas tarde voluntariamente: hasta 1 mes de retraso +1% de recargo, entre 1–3 meses +5%, entre 3–6 meses +10%, más de 12 meses +15% más intereses. El pago se hace en la sede electrónica de la AEAT, no a través de Kallio. ¿Necesitas ayuda para preparar lo que tienes que pagar?`;
  }

  // Fallback 4: deducciones
  if (q.includes('deducci') || q.includes('pagar menos') || q.includes('gastos')) {
    const nudge =
      ctx.user.expensesVolume === 'minimal'
        ? 'Con pocos gastos registrados puede que estés pagando más de lo necesario — revisa si tienes suscripciones, coworking, formación o teléfono sin añadir.'
        : 'Parece que ya tienes gastos registrados. Activa el asistente IA para identificar más oportunidades.';
    return `Con tu actividad puedes deducir gastos profesionales. Tienes registrados ${formatCurrency(ctx.currentQuarter.deductibleExpenses)} en gastos este trimestre, lo que reduce tu base imponible en ese importe. ${nudge} ¿Quieres ver qué categorías de gastos son más relevantes para tu actividad?`;
  }

  // Fallback 5: qué pregunto al gestor
  if (q.includes('gestor') || q.includes('preguntar') || q.includes('pregunto')) {
    const checkerQuestion = ctx.checkerAvailable
      ? '"Los números de Kallio difieren en algunas líneas de lo que presentaste — ¿puedes explicarme las diferencias?"'
      : '"¿Cómo puedo llevar un mejor registro de mis gastos para la próxima declaración?"';
    return `Basándome en tu situación, estas son las preguntas más útiles para tu próxima conversación con tu gestor: "¿Estoy aplicando correctamente la deducción en todos mis gastos profesionales?" y "¿Hay gastos habituales en mi actividad que no estoy deduciendo?" Y también: ${checkerQuestion} ¿Quieres que genere un resumen de tu situación para llevar a la reunión?`;
  }

  // Generic fallback
  return `Esa es una buena pregunta. Para darte una respuesta personalizada basada en tus números reales, activa el asistente IA con el interruptor de arriba. Mientras tanto, puedes explorar las preguntas más frecuentes usando los botones de sugerencia. ¿Hay algo concreto que quieras entender sobre tu situación fiscal?`;
}
