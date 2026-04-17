"use client";

import { useKallioStore } from "@/lib/store";

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const theme = useKallioStore((s) => s.theme);
  return <div className={theme === "dark" ? "dark" : ""}>{children}</div>;
}
