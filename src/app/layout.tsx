import type { Metadata } from "next";
import "./globals.css";
import { HtmlLangSetter } from "./HtmlLangSetter";

export const metadata: Metadata = {
  title: "Kallio – Tu copiloto fiscal",
  description:
    "Reserva fiscal en tiempo real, asistente de deducciones y countdown trimestral para autónomos digitales en España.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">
        <HtmlLangSetter />
        {children}
      </body>
    </html>
  );
}
