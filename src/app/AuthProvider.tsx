"use client";

import { useEffect } from "react";
import { useKallioStore } from "@/lib/store";
import { createClient } from "@/lib/supabase";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const loadUserData = useKallioStore((s) => s.loadUserData);
  const signOut = useKallioStore((s) => s.signOut);

  useEffect(() => {
    loadUserData();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") loadUserData();
      else if (event === "SIGNED_OUT") signOut();
    });

    return () => subscription.unsubscribe();
  }, [loadUserData, signOut]);

  return <>{children}</>;
}
