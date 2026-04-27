import { formatCurrency } from './tax-engine';
import { translations } from './i18n';
import type { Language } from './i18n';
import type { CoachContext } from './coachPrompt';

export function getInitialChips(ctx: CoachContext, language: Language = 'es'): string[] {
  const t = translations[language].coach;
  return [t.chip1, t.chip2, t.chip3];
}

export function getNextChips(ctx: CoachContext, answered: string[], language: Language = 'es'): string[] {
  const t = translations[language].coach;
  const all = [t.chip1, t.chip2, t.chip3, t.chip4, t.chip5];
  return all.filter((c) => !answered.includes(c));
}

export function getOpeningMessage(ctx: CoachContext, language: Language = 'es'): string {
  const isEds = ctx.user.fiscalRegime !== 'beckham';
  const taxLabel = isEds ? 'IRPF' : 'IRNR';
  const spendable = formatCurrency(ctx.currentQuarter.spendableBalance);
  const reserve = formatCurrency(ctx.currentQuarter.totalTaxReserve);
  const date = ctx.upcomingDeadline.date;
  const days = ctx.upcomingDeadline.daysUntil;

  switch (language) {
    case 'en':
      return `Hi, I'm your Kallio tax coach. You have ${spendable} actually available this quarter — after setting aside ${reserve} for VAT and ${taxLabel}. Your next payment is on ${date}, in ${days} days. What would you like to understand better?`;
    case 'it':
      return `Ciao, sono il tuo coach fiscale di Kallio. Hai ${spendable} realmente disponibili questo trimestre — dopo aver accantonato ${reserve} per IVA e ${taxLabel}. Il tuo prossimo pagamento è il ${date}, tra ${days} giorni. Cosa vorresti capire meglio?`;
    case 'de':
      return `Hallo, ich bin dein Kallio-Steuer-Coach. Du hast ${spendable} dieses Quartal wirklich verfügbar — nach dem Zurücklegen von ${reserve} für MwSt. und ${taxLabel}. Deine nächste Zahlung ist am ${date}, in ${days} Tagen. Was möchtest du besser verstehen?`;
    case 'fr':
      return `Bonjour, je suis votre coach fiscal Kallio. Vous avez ${spendable} réellement disponibles ce trimestre — après avoir mis de côté ${reserve} pour la TVA et l'${taxLabel}. Votre prochain paiement est le ${date}, dans ${days} jours. Que souhaitez-vous mieux comprendre ?`;
    default:
      return `Hola, soy tu coach fiscal de Kallio. Tienes ${spendable} disponibles realmente este trimestre — después de reservar ${reserve} para IVA y ${taxLabel}. Tu próximo pago es el ${date}, en ${days} días. ¿Qué quieres entender mejor?`;
  }
}

export function getFallbackResponse(question: string, ctx: CoachContext, language: Language = 'es'): string {
  const q = question.toLowerCase();
  const isEds = ctx.user.fiscalRegime !== 'beckham';
  const advanceLabel = isEds ? 'IRPF' : 'IRNR';
  const taxPct = Math.round(
    (ctx.currentQuarter.totalTaxReserve / Math.max(1, ctx.currentQuarter.grossIncome)) * 100
  );

  const isAvailable = q.includes('disponible') || q.includes('calcula') || q.includes('calculated') || q.includes('available') || q.includes('disponibile') || q.includes('verfügbar') || q.includes('calculé');
  const isReserve   = q.includes('reservo') || q.includes('impuestos') || q.includes('por qué') || q.includes('taxes') || q.includes('tasse') || q.includes('steuern') || q.includes('impôts');
  const isLate      = q.includes('tarde') || q.includes('retraso') || q.includes('late') || q.includes('ritardo') || q.includes('spät') || q.includes('retard');
  const isDeduct    = q.includes('deducci') || q.includes('pagar menos') || q.includes('deduct') || q.includes('deduz') || q.includes('abzüg') || q.includes('déduct');
  const isAccountant = q.includes('gestor') || q.includes('pregunto') || q.includes('accountant') || q.includes('commercialista') || q.includes('steuerberater') || q.includes('comptable');

  switch (language) {
    case 'en': {
      if (isAvailable) {
        return `Your available money (${formatCurrency(ctx.currentQuarter.spendableBalance)}) is calculated like this: ${formatCurrency(ctx.currentQuarter.grossIncome)} gross income − ${formatCurrency(ctx.currentQuarter.ivaResult)} VAT owed to the tax authority − ${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)} ${advanceLabel} advance = ${formatCurrency(ctx.currentQuarter.spendableBalance)} real available. This figure updates every time you add an invoice or expense. Would you like me to explain how to reduce your tax reserve?`;
      }
      if (isReserve) {
        return `Your reserve of ${formatCurrency(ctx.currentQuarter.totalTaxReserve)} has two parts: VAT (${formatCurrency(ctx.currentQuarter.ivaResult)}), which you collect from clients but belongs to the tax authority; and ${advanceLabel} (${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)}), ${isEds ? 'a 20% advance on your net quarterly profit' : 'flat 24% on net income — the advantage of the Beckham regime over progressive income tax'}. Together they represent ${taxPct}% of your billings. Would you like me to explain how to reduce either part?`;
      }
      if (isLate) {
        return `You have ${ctx.upcomingDeadline.daysUntil} days to pay ${formatCurrency(ctx.upcomingDeadline.estimatedPayment)} before ${ctx.upcomingDeadline.date}. If you pay late voluntarily: up to 1 month +1% surcharge, 1–3 months +5%, 3–6 months +10%, over 12 months +15% plus interest. Payment is made on the AEAT electronic office, not through Kallio. Do you need help preparing what you need to pay?`;
      }
      if (isDeduct) {
        const nudge = ctx.user.expensesVolume === 'minimal'
          ? 'With few expenses registered you may be paying more than necessary — check if you have subscriptions, coworking, training or phone costs to add.'
          : 'It looks like you already have expenses registered. Enable the AI assistant to identify more opportunities.';
        return `With your activity you can deduct professional expenses. You have ${formatCurrency(ctx.currentQuarter.deductibleExpenses)} in expenses registered this quarter, which reduces your tax base by that amount. ${nudge} Would you like to see which expense categories are most relevant for your activity?`;
      }
      if (isAccountant) {
        const checkerQ = ctx.checkerAvailable
          ? '"Kallio\'s numbers differ on some lines from what you filed — can you explain the differences?"'
          : '"How can I keep better records of my expenses for the next return?"';
        return `Based on your situation, here are the most useful questions for your next meeting with your accountant: "Am I correctly applying deductions for all my professional expenses?" and "Are there common expenses in my field that I'm not deducting?" Also: ${checkerQ} Would you like me to generate a summary of your situation to take to the meeting?`;
      }
      return `That's a good question. To give you a personalised answer based on your real numbers, enable the AI assistant using the toggle above. In the meantime, explore the most common questions using the suggestion buttons. Is there something specific about your tax situation you'd like to understand?`;
    }

    case 'it': {
      if (isAvailable) {
        return `Il tuo denaro disponibile (${formatCurrency(ctx.currentQuarter.spendableBalance)}) si calcola così: ${formatCurrency(ctx.currentQuarter.grossIncome)} entrate lorde − ${formatCurrency(ctx.currentQuarter.ivaResult)} IVA dovuta − ${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)} anticipo ${advanceLabel} = ${formatCurrency(ctx.currentQuarter.spendableBalance)} disponibile reale. Questo numero si aggiorna ogni volta che aggiungi una fattura o una spesa. Vuoi che ti spieghi come ridurre la riserva fiscale?`;
      }
      if (isReserve) {
        return `La tua riserva di ${formatCurrency(ctx.currentQuarter.totalTaxReserve)} ha due parti: IVA (${formatCurrency(ctx.currentQuarter.ivaResult)}), che incassi dai clienti ma appartiene al fisco; e ${advanceLabel} (${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)}), ${isEds ? 'un anticipo del 20% sul tuo utile netto trimestrale' : 'aliquota fissa del 24% sul reddito netto'}. Insieme rappresentano il ${taxPct}% del fatturato. Vuoi che ti spieghi come ridurre una delle due parti?`;
      }
      if (isLate) {
        return `Hai ${ctx.upcomingDeadline.daysUntil} giorni per pagare ${formatCurrency(ctx.upcomingDeadline.estimatedPayment)} entro il ${ctx.upcomingDeadline.date}. Se paghi tardi: fino a 1 mese +1% di sovrattassa, 1–3 mesi +5%, 3–6 mesi +10%, oltre 12 mesi +15% più interessi. Il pagamento si effettua sulla sede elettronica dell'AEAT, non tramite Kallio. Hai bisogno di aiuto per preparare quello che devi pagare?`;
      }
      if (isDeduct) {
        return `Con la tua attività puoi dedurre le spese professionali. Hai registrato ${formatCurrency(ctx.currentQuarter.deductibleExpenses)} in spese questo trimestre. Attiva l'assistente IA per identificare ulteriori opportunità. Vuoi vedere quali categorie di spese sono più rilevanti per la tua attività?`;
      }
      if (isAccountant) {
        return `In base alla tua situazione, queste sono le domande più utili per il tuo prossimo incontro con il commercialista: "Sto applicando correttamente le deduzioni per tutte le mie spese professionali?" e "Ci sono spese comuni nella mia attività che non sto deducendo?" Vuoi che generi un riepilogo della tua situazione da portare all'incontro?`;
      }
      return `È una buona domanda. Per darti una risposta personalizzata basata sui tuoi numeri reali, attiva l'assistente IA con l'interruttore in alto. Nel frattempo puoi esplorare le domande più frequenti usando i pulsanti di suggerimento. C'è qualcosa di concreto che vuoi capire sulla tua situazione fiscale?`;
    }

    case 'de': {
      if (isAvailable) {
        return `Dein verfügbares Geld (${formatCurrency(ctx.currentQuarter.spendableBalance)}) berechnet sich so: ${formatCurrency(ctx.currentQuarter.grossIncome)} Bruttoeinnahmen − ${formatCurrency(ctx.currentQuarter.ivaResult)} geschuldete MwSt. − ${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)} ${advanceLabel}-Vorauszahlung = ${formatCurrency(ctx.currentQuarter.spendableBalance)} real verfügbar. Diese Zahl aktualisiert sich jedes Mal, wenn du eine Rechnung oder Ausgabe hinzufügst. Soll ich erklären, wie du die Steuerrücklage reduzieren kannst?`;
      }
      if (isReserve) {
        return `Deine Rücklage von ${formatCurrency(ctx.currentQuarter.totalTaxReserve)} besteht aus zwei Teilen: MwSt. (${formatCurrency(ctx.currentQuarter.ivaResult)}), die du von Kunden einziehst, aber dem Finanzamt gehört; und ${advanceLabel} (${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)}), ${isEds ? 'eine 20%-Vorauszahlung auf deinen vierteljährlichen Nettogewinn' : 'Festsatz 24% auf Nettoeinkommen'}. Zusammen entsprechen sie ${taxPct}% deiner Rechnungen. Soll ich erklären, wie du einen der beiden Teile reduzieren kannst?`;
      }
      if (isLate) {
        return `Du hast ${ctx.upcomingDeadline.daysUntil} Tage, um ${formatCurrency(ctx.upcomingDeadline.estimatedPayment)} vor dem ${ctx.upcomingDeadline.date} zu zahlen. Bei verspäteter Zahlung: bis 1 Monat +1% Zuschlag, 1–3 Monate +5%, 3–6 Monate +10%, über 12 Monate +15% plus Zinsen. Die Zahlung erfolgt über das AEAT-Elektronikbüro, nicht über Kallio. Brauchst du Hilfe bei der Vorbereitung deiner Zahlung?`;
      }
      if (isDeduct) {
        return `Mit deiner Tätigkeit kannst du berufliche Ausgaben absetzen. Du hast ${formatCurrency(ctx.currentQuarter.deductibleExpenses)} an Ausgaben in diesem Quartal registriert. Aktiviere den KI-Assistenten, um weitere Möglichkeiten zu finden. Möchtest du sehen, welche Ausgabenkategorien für deine Tätigkeit am relevantesten sind?`;
      }
      if (isAccountant) {
        return `Basierend auf deiner Situation sind das die nützlichsten Fragen für dein nächstes Gespräch mit deinem Steuerberater: "Wende ich alle Abzüge für meine beruflichen Ausgaben korrekt an?" und "Gibt es übliche Ausgaben in meiner Branche, die ich nicht absetze?" Soll ich eine Zusammenfassung deiner Situation für das Gespräch erstellen?`;
      }
      return `Das ist eine gute Frage. Um dir eine personalisierte Antwort basierend auf deinen echten Zahlen zu geben, aktiviere den KI-Assistenten mit dem Schalter oben. In der Zwischenzeit kannst du die häufigsten Fragen über die Vorschlagsschaltflächen erkunden. Gibt es etwas Konkretes über deine Steuersituation, das du verstehen möchtest?`;
    }

    case 'fr': {
      if (isAvailable) {
        return `Votre argent disponible (${formatCurrency(ctx.currentQuarter.spendableBalance)}) se calcule ainsi : ${formatCurrency(ctx.currentQuarter.grossIncome)} revenus bruts − ${formatCurrency(ctx.currentQuarter.ivaResult)} TVA due − ${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)} acompte ${advanceLabel} = ${formatCurrency(ctx.currentQuarter.spendableBalance)} réellement disponible. Ce chiffre se met à jour à chaque fois que vous ajoutez une facture ou une dépense. Souhaitez-vous que je vous explique comment réduire votre réserve fiscale ?`;
      }
      if (isReserve) {
        return `Votre réserve de ${formatCurrency(ctx.currentQuarter.totalTaxReserve)} a deux parties : TVA (${formatCurrency(ctx.currentQuarter.ivaResult)}), que vous percevez de vos clients mais qui appartient au fisc ; et ${advanceLabel} (${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)}), ${isEds ? 'un acompte de 20% sur votre bénéfice net trimestriel' : 'taux fixe de 24% sur le revenu net'}. Ensemble, ils représentent ${taxPct}% de vos facturations. Souhaitez-vous que je vous explique comment réduire l'une ou l'autre partie ?`;
      }
      if (isLate) {
        return `Vous avez ${ctx.upcomingDeadline.daysUntil} jours pour payer ${formatCurrency(ctx.upcomingDeadline.estimatedPayment)} avant le ${ctx.upcomingDeadline.date}. En cas de retard : jusqu'à 1 mois +1% de majoration, 1–3 mois +5%, 3–6 mois +10%, plus de 12 mois +15% plus intérêts. Le paiement s'effectue sur le site électronique de l'AEAT, pas via Kallio. Avez-vous besoin d'aide pour préparer ce que vous devez payer ?`;
      }
      if (isDeduct) {
        return `Avec votre activité, vous pouvez déduire des dépenses professionnelles. Vous avez enregistré ${formatCurrency(ctx.currentQuarter.deductibleExpenses)} en dépenses ce trimestre. Activez l'assistant IA pour identifier d'autres opportunités. Souhaitez-vous voir quelles catégories de dépenses sont les plus pertinentes pour votre activité ?`;
      }
      if (isAccountant) {
        return `En fonction de votre situation, voici les questions les plus utiles pour votre prochain entretien avec votre comptable : « Est-ce que j'applique correctement les déductions pour toutes mes dépenses professionnelles ? » et « Y a-t-il des dépenses courantes dans mon domaine que je ne déduis pas ? » Souhaitez-vous que je génère un résumé de votre situation à apporter à la réunion ?`;
      }
      return `C'est une bonne question. Pour vous donner une réponse personnalisée basée sur vos chiffres réels, activez l'assistant IA avec le bouton en haut. En attendant, vous pouvez explorer les questions les plus fréquentes via les boutons de suggestion. Y a-t-il quelque chose de précis sur votre situation fiscale que vous souhaitez comprendre ?`;
    }

    default: {
      if (isAvailable) {
        return `Tu dinero disponible (${formatCurrency(ctx.currentQuarter.spendableBalance)}) se calcula así: ${formatCurrency(ctx.currentQuarter.grossIncome)} ingresos brutos − ${formatCurrency(ctx.currentQuarter.ivaResult)} IVA que debes a Hacienda − ${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)} adelanto de ${advanceLabel} = ${formatCurrency(ctx.currentQuarter.spendableBalance)} disponible real. Este número se actualiza cada vez que añades una factura o un gasto. ¿Quieres que te explique cómo reducir la reserva de impuestos?`;
      }
      if (isReserve) {
        return `Tu reserva de ${formatCurrency(ctx.currentQuarter.totalTaxReserve)} tiene dos partes: IVA (${formatCurrency(ctx.currentQuarter.ivaResult)}), que cobras a tu cliente pero pertenece a Hacienda y pagas el ${ctx.upcomingDeadline.date}; y ${advanceLabel} (${formatCurrency(ctx.currentQuarter.irpfOrIrnrAdvance)}), ${isEds ? 'un adelanto del 20% sobre tus beneficios netos este trimestre' : 'tipo fijo del 24% sobre tus ingresos netos — el beneficio del régimen Beckham frente al IRPF progresivo'}. Juntas representan el ${taxPct}% de lo facturado. ¿Te explico cómo reducir alguna de las dos partes?`;
      }
      if (isLate) {
        return `Tienes ${ctx.upcomingDeadline.daysUntil} días para pagar ${formatCurrency(ctx.upcomingDeadline.estimatedPayment)} antes del ${ctx.upcomingDeadline.date}. Si pagas tarde voluntariamente: hasta 1 mes de retraso +1% de recargo, entre 1–3 meses +5%, entre 3–6 meses +10%, más de 12 meses +15% más intereses. El pago se hace en la sede electrónica de la AEAT, no a través de Kallio. ¿Necesitas ayuda para preparar lo que tienes que pagar?`;
      }
      if (isDeduct) {
        const nudge = ctx.user.expensesVolume === 'minimal'
          ? 'Con pocos gastos registrados puede que estés pagando más de lo necesario — revisa si tienes suscripciones, coworking, formación o teléfono sin añadir.'
          : 'Parece que ya tienes gastos registrados. Activa el asistente IA para identificar más oportunidades.';
        return `Con tu actividad puedes deducir gastos profesionales. Tienes registrados ${formatCurrency(ctx.currentQuarter.deductibleExpenses)} en gastos este trimestre, lo que reduce tu base imponible en ese importe. ${nudge} ¿Quieres ver qué categorías de gastos son más relevantes para tu actividad?`;
      }
      if (isAccountant) {
        const checkerQuestion = ctx.checkerAvailable
          ? '"Los números de Kallio difieren en algunas líneas de lo que presentaste — ¿puedes explicarme las diferencias?"'
          : '"¿Cómo puedo llevar un mejor registro de mis gastos para la próxima declaración?"';
        return `Basándome en tu situación, estas son las preguntas más útiles para tu próxima conversación con tu gestor: "¿Estoy aplicando correctamente la deducción en todos mis gastos profesionales?" y "¿Hay gastos habituales en mi actividad que no estoy deduciendo?" Y también: ${checkerQuestion} ¿Quieres que genere un resumen de tu situación para llevar a la reunión?`;
      }
      return `Esa es una buena pregunta. Para darte una respuesta personalizada basada en tus números reales, activa el asistente IA con el interruptor de arriba. Mientras tanto, puedes explorar las preguntas más frecuentes usando los botones de sugerencia. ¿Hay algo concreto que quieras entender sobre tu situación fiscal?`;
    }
  }
}
