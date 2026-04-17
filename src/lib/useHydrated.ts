import { useKallioStore } from "./store";

/**
 * Returns true only after Zustand has finished rehydrating from localStorage.
 * Use this to prevent premature redirects on first render.
 */
export function useHydrated(): boolean {
  return useKallioStore((s) => s._hasHydrated);
}
