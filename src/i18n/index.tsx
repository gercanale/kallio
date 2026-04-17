"use client";

import { createContext, useContext, useCallback } from "react";
import { useKallioStore } from "@/lib/store";
import es from "./locales/es.json";
import en from "./locales/en.json";

export type Locale = "es" | "en";

type Dict = typeof es;
const DICTIONARIES: Record<Locale, Dict> = { es, en };

const I18nContext = createContext<Locale>("es");

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useKallioStore((s) => s.locale);
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useT() {
  const locale = useContext(I18nContext);
  const dict = DICTIONARIES[locale];

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const parts = key.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let val: any = dict;
      for (const part of parts) {
        val = val?.[part];
        if (val === undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let fb: any = es;
          for (const p of parts) fb = fb?.[p];
          return typeof fb === "string" ? fb : key;
        }
      }
      if (typeof val !== "string") return key;
      if (vars) {
        return val.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
      }
      return val;
    },
    [dict]
  );

  return { t, locale };
}
