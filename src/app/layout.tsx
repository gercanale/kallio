import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n";
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
        <I18nProvider>
          <HtmlLangSetter />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
