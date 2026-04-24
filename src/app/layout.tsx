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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
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
