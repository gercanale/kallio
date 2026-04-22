import type { Metadata } from "next";
import "./globals.css";
import { HtmlLangSetter } from "./HtmlLangSetter";
import { AuthProvider } from "./AuthProvider";
import { ThemeWrapper } from "./ThemeWrapper";
import { HelpButton } from "@/components/HelpButton";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
        <AuthProvider>
          <ThemeWrapper>
            {children}
            <HelpButton />
          </ThemeWrapper>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
