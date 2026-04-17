"use client";

import { useEffect } from "react";
import { useKallioStore } from "@/lib/store";
import { createClient } from "@/lib/supabase";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const loadUserData = useKallioStore((s) => s.loadUserData);
  const clearSession = useKallioStore((s) => s.clearSession);

  useEffect(() => {
    loadUserData();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") loadUserData();
      else if (event === "SIGNED_OUT") clearSession();
    });

    return () => subscription.unsubscribe();
  }, [loadUserData, clearSession]);

  return <>{children}</>;
}
