"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/useT";

// ─── Direction A tokens ───────────────────────────────────────────────────────
const C = {
  BG:     '#fdfaf3',
  INK:    '#1a1f2e',
  MUTED:  '#6b6456',
  BORDER: '#e8dfc8',
  IVA:    '#c44536',
  CARD:   '#ffffff',
  OK:     '#5a7a3e',
};

type Mode = "login" | "signup";

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccessMsg(t.auth.checkEmail);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(t.auth.invalidCredentials);
      } else if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", data.user.id)
          .single();
        router.push(profile?.onboarding_complete ? "/dashboard" : "/onboarding");
        router.refresh();
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'Inter, sans-serif', color: C.INK }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 22, marginBottom: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: C.IVA, display: 'inline-block' }} />
            Kallio
          </div>
          <p style={{ fontSize: 14, color: C.MUTED, margin: 0 }}>
            {mode === "login" ? t.auth.loginSubtitle : t.auth.signupSubtitle}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(26,31,46,0.06)' }}>

          {/* Mode toggle */}
          <div style={{ display: 'flex', border: `1px solid ${C.BORDER}`, borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setSuccessMsg(null); }}
                style={{
                  flex: 1, padding: '9px 0', fontSize: 14, fontWeight: 500,
                  background: mode === m ? C.INK : 'transparent',
                  color: mode === m ? 'white' : C.MUTED,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {m === 'login' ? t.auth.login : t.auth.signup}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.MUTED, marginBottom: 6 }}>
                {t.auth.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@email.com"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: C.BG, border: `1px solid ${C.BORDER}`, borderRadius: 10,
                  padding: '10px 14px', fontSize: 14, color: C.INK,
                  fontFamily: 'inherit', outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = C.INK}
                onBlur={(e) => e.target.style.borderColor = C.BORDER}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.MUTED, marginBottom: 6 }}>
                {t.auth.passwordLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  minLength={6}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: C.BG, border: `1px solid ${C.BORDER}`, borderRadius: 10,
                    padding: '10px 40px 10px 14px', fontSize: 14, color: C.INK,
                    fontFamily: 'inherit', outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.INK}
                  onBlur={(e) => e.target.style.borderColor = C.BORDER}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.MUTED, padding: 0, display: 'flex' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 13, color: C.IVA, background: '#fdf0ee', border: `1px solid #f5cdc8`, borderRadius: 8, padding: '10px 14px' }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div style={{ fontSize: 13, color: C.OK, background: '#f0f5ec', border: `1px solid #c8ddc0`, borderRadius: 8, padding: '10px 14px' }}>
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', background: loading ? C.MUTED : C.INK, color: 'white',
                border: 'none', borderRadius: 10, padding: '12px 0',
                fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', marginTop: 4,
              }}
            >
              {loading ? t.auth.loading : mode === "login" ? t.auth.loginBtn : t.auth.signupBtn}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: C.BORDER, marginTop: 24, letterSpacing: '0.05em' }}>
          KALLIO · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
