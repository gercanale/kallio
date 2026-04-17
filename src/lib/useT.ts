"use client";

import { useKallioStore } from "./store";
import { translations } from "./i18n";

export function useT() {
  const language = useKallioStore((s) => s.language);
  return translations[language];
}
