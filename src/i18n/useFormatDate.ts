import { useT } from "./index";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { Locale as DFLocale } from "date-fns";

const DF_LOCALES: Record<string, DFLocale> = { es, en: enUS };

export function useFormatDate() {
  const { locale } = useT();
  const dfLocale = DF_LOCALES[locale] ?? es;

  return {
    // "lunes, 17 de abril de 2026" / "Monday, April 17, 2026"
    formatLong: (iso: string) =>
      format(new Date(iso), "PPPP", { locale: dfLocale }),

    // "17 abr 2026" / "Apr 17, 2026"
    formatShort: (iso: string) =>
      format(new Date(iso), locale === "en" ? "MMM d, yyyy" : "d MMM yyyy", { locale: dfLocale }),

    // "17 abr" / "Apr 17"
    formatDayMonth: (iso: string) =>
      format(new Date(iso), locale === "en" ? "MMM d" : "d MMM", { locale: dfLocale }),

    // Dashboard header date
    formatDashboard: (date: Date) =>
      locale === "en"
        ? format(date, "EEEE, MMMM d", { locale: dfLocale })
        : format(date, "EEEE, d 'de' MMMM", { locale: dfLocale }),

    // PDF date
    formatPdf: (date: Date) =>
      format(date, locale === "en" ? "d MMMM yyyy" : "d 'de' MMMM 'de' yyyy", { locale: dfLocale }),
  };
}
