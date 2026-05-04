"use client";

import { useKallioStore } from "@/lib/store";

const MASK = "••••";

export function PrivacyAmount({ value }: { value: string }) {
  const privacyMode = useKallioStore((s) => s.privacyMode);
  return <>{privacyMode ? MASK : value}</>;
}

export function usePrivacyMask() {
  const privacyMode = useKallioStore((s) => s.privacyMode);
  return (value: string) => (privacyMode ? MASK : value);
}
