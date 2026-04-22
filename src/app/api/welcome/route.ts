import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type Lang = "es" | "en" | "it" | "de" | "fr";

const copy: Record<Lang, {
  subject: string;
  headline: string;
  sub: string;
  intro: string;
  f1Title: string; f1Desc: string;
  f2Title: string; f2Desc: string;
  f3Title: string; f3Desc: string;
  cta: string;
  footer: string;
}> = {
  es: {
    subject: "Te damos la bienvenida a Kallio 🎉",
    headline: "Te damos la bienvenida a Kallio",
    sub: "Tu copiloto fiscal está listo.",
    intro: "Gracias por unirte. Esto es lo que puedes hacer desde hoy:",
    f1Title: "Reserva fiscal en vivo",
    f1Desc: "Kallio separa en tiempo real el IVA y el IRPF de cada ingreso para que siempre sepas cuánto dinero es realmente tuyo.",
    f2Title: "Asistente de deducciones",
    f2Desc: "Detecta automáticamente qué gastos son deducibles y calcula cuánto te ahorras en impuestos.",
    f3Title: "Countdown trimestral",
    f3Desc: "Alertas a 30, 15 y 7 días antes de cada cierre trimestral con el importe estimado a pagar. Exporta el PDF para tu gestor.",
    cta: "Ir al dashboard →",
    footer: "¿Tienes alguna duda? Responde este email o usa el botón de ayuda dentro de la app.",
  },
  en: {
    subject: "Welcome to Kallio 🎉",
    headline: "Welcome to Kallio",
    sub: "Your tax co-pilot is ready.",
    intro: "Thanks for joining. Here's what you can do from today:",
    f1Title: "Live tax reserve",
    f1Desc: "Kallio separates VAT and income tax from every transaction in real time, so you always know how much money is truly yours.",
    f2Title: "Deduction assistant",
    f2Desc: "Automatically detects deductible expenses and shows you exactly how much you're saving on taxes.",
    f3Title: "Quarterly countdown",
    f3Desc: "Alerts at 30, 15, and 7 days before each quarterly deadline with the estimated amount due. Export a PDF for your accountant.",
    cta: "Go to dashboard →",
    footer: "Have a question? Reply to this email or use the help button inside the app.",
  },
  it: {
    subject: "Benvenuti su Kallio 🎉",
    headline: "Ti diamo il benvenuto su Kallio",
    sub: "Il tuo copilota fiscale è pronto.",
    intro: "Grazie per esserti unito/a. Ecco cosa puoi fare da oggi:",
    f1Title: "Riserva fiscale in tempo reale",
    f1Desc: "Kallio separa IVA e IRPF da ogni transazione in tempo reale, così sai sempre quanto denaro è davvero tuo.",
    f2Title: "Assistente alle deduzioni",
    f2Desc: "Rileva automaticamente le spese deducibili e calcola quanto stai risparmiando in tasse.",
    f3Title: "Conto alla rovescia trimestrale",
    f3Desc: "Avvisi a 30, 15 e 7 giorni prima di ogni scadenza trimestrale con l'importo stimato da pagare.",
    cta: "Vai alla dashboard →",
    footer: "Hai domande? Rispondi a questa email o usa il pulsante di aiuto nell'app.",
  },
  de: {
    subject: "Willkommen bei Kallio 🎉",
    headline: "Willkommen bei Kallio",
    sub: "Dein Steuer-Copilot ist bereit.",
    intro: "Danke, dass du dabei bist. Das kannst du ab heute tun:",
    f1Title: "Live-Steuerrücklage",
    f1Desc: "Kallio trennt USt. und IRPF von jeder Transaktion in Echtzeit, damit du immer weißt, wie viel Geld wirklich dir gehört.",
    f2Title: "Abzugsassistent",
    f2Desc: "Erkennt automatisch abzugsfähige Ausgaben und zeigt dir genau, wie viel du bei der Steuer sparst.",
    f3Title: "Quartals-Countdown",
    f3Desc: "Benachrichtigungen 30, 15 und 7 Tage vor jeder Quartalsabgabe mit dem geschätzten Zahlbetrag.",
    cta: "Zum Dashboard →",
    footer: "Hast du Fragen? Antworte auf diese E-Mail oder nutze den Hilfe-Button in der App.",
  },
  fr: {
    subject: "Bienvenue sur Kallio 🎉",
    headline: "Bienvenue sur Kallio",
    sub: "Votre copilote fiscal est prêt.",
    intro: "Merci de nous rejoindre. Voici ce que vous pouvez faire dès aujourd'hui :",
    f1Title: "Réserve fiscale en direct",
    f1Desc: "Kallio sépare la TVA et l'IRPF de chaque transaction en temps réel, pour que vous sachiez toujours combien d'argent vous appartient vraiment.",
    f2Title: "Assistant déductions",
    f2Desc: "Détecte automatiquement les dépenses déductibles et calcule combien vous économisez en impôts.",
    f3Title: "Compte à rebours trimestriel",
    f3Desc: "Alertes à 30, 15 et 7 jours avant chaque échéance trimestrielle avec le montant estimé à payer.",
    cta: "Aller au tableau de bord →",
    footer: "Une question ? Répondez à cet email ou utilisez le bouton d'aide dans l'application.",
  },
};

function buildHtml(lang: Lang, email: string): string {
  const c = copy[lang];

  const feature = (icon: string, title: string, desc: string) => `
    <tr>
      <td style="padding:0 0 16px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" valign="top" style="padding-top:2px;">
              <div style="width:32px;height:32px;background:#f0fdfa;border-radius:8px;text-align:center;line-height:32px;font-size:16px;">${icon}</div>
            </td>
            <td style="padding-left:12px;">
              <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0f172a;">${title}</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 100%);border-radius:12px 12px 0 0;padding:32px 36px 28px;">
            <p style="margin:0 0 16px;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Kallio</p>
            <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${c.headline}</p>
            <p style="margin:0;font-size:14px;color:#99f6e4;">${c.sub}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 36px;">

            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#334155;">${c.intro}</p>

            <!-- Features -->
            <table width="100%" cellpadding="0" cellspacing="0">
              ${feature("📊", c.f1Title, c.f1Desc)}
              ${feature("✅", c.f2Title, c.f2Desc)}
              ${feature("⏰", c.f3Title, c.f3Desc)}
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;">
              <tr><td style="border-top:1px solid #e2e8f0;"></td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://kallio.tax/dashboard" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:8px;">
                    ${c.cta}
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:20px 36px;">
            <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.6;">${c.footer}</p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              <a href="https://kallio.tax" style="color:#0d9488;text-decoration:none;">kallio.tax</a>
              &nbsp;·&nbsp; 2026
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { email, lang } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const safeLang: Lang = (["es", "en", "it", "de", "fr"] as Lang[]).includes(lang) ? lang : "es";
  const c = copy[safeLang];

  const { error } = await resend.emails.send({
    from: "Kallio <hello@kallio.tax>",
    to: email,
    subject: c.subject,
    html: buildHtml(safeLang, email),
    text: `${c.headline}\n\n${c.intro}\n\n• ${c.f1Title}: ${c.f1Desc}\n• ${c.f2Title}: ${c.f2Desc}\n• ${c.f3Title}: ${c.f3Desc}\n\nhttps://kallio.tax/dashboard\n\n${c.footer}`,
  });

  if (error) {
    console.error("Resend welcome error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
