import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
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
    subject: `Kallio – Solicitud de ayuda${userEmail ? ` de ${userEmail}` : ""}`,
    text: `Nueva solicitud de ayuda en Kallio\n\nUsuario: ${userEmail || "No identificado"}\n\nMensaje:\n${trimmed}`,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
