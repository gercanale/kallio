import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function buildHtml(userEmail: string | null, message: string): string {
  const now = new Date().toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr>
          <td style="background:#0d9488;border-radius:12px 12px 0 0;padding:28px 36px 24px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Kallio</p>
            <p style="margin:6px 0 0;font-size:13px;color:#99f6e4;font-weight:500;">Solicitud de ayuda</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 36px;">

            <!-- User info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#f0fdfa;border-left:3px solid #0d9488;border-radius:0 8px 8px 0;padding:14px 16px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#0f766e;text-transform:uppercase;letter-spacing:0.6px;">Usuario</p>
                  <p style="margin:0;font-size:14px;color:#0f172a;font-weight:500;">${userEmail ?? "<em style='color:#94a3b8;font-style:normal;'>No identificado</em>"}</p>
                </td>
              </tr>
            </table>

            <!-- Message -->
            <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;">Mensaje</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px 20px;font-size:15px;line-height:1.65;color:#1e293b;">
              ${escapedMessage}
            </div>

            <!-- Reply CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr>
                <td align="center">
                  <a href="mailto:${userEmail ?? ""}" style="display:inline-block;background:#0d9488;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
                    Responder al usuario →
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:18px 36px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              ${now} · Madrid &nbsp;·&nbsp; <a href="https://kallio.tax" style="color:#0d9488;text-decoration:none;">kallio.tax</a>
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
  const { message, userEmail } = await req.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const trimmed = message.trim().slice(0, 500);
  if (trimmed.length === 0) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: "Kallio Help <hello@kallio.tax>",
    to: "gercanale@gmail.com",
    replyTo: userEmail || undefined,
    subject: `Kallio – Ayuda${userEmail ? ` · ${userEmail}` : ""}`,
    html: buildHtml(userEmail, trimmed),
    text: `Nueva solicitud de ayuda en Kallio\n\nUsuario: ${userEmail || "No identificado"}\n\nMensaje:\n${trimmed}`,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
