"use client";

import { useEffect } from "react";
import { useKallioStore } from "@/lib/store";

export function HtmlLangSetter() {
  const locale = useKallioStore((s) => s.language);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
