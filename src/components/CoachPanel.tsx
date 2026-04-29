"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send } from "lucide-react";
import type { TaxSnapshot, CheckerRun } from "@/lib/types";
import type { WizardProfile } from "@/lib/wizard-config";
import type { Language } from "@/lib/i18n";
import { translations } from "@/lib/i18n";
import { nextDeadline } from "@/lib/tax-engine";
import { buildCoachContext } from "@/lib/coachContext";
import { getOpeningMessage, getFallbackResponse, getInitialChips, getNextChips } from "@/lib/coachFallback";
import type { CoachContext } from "@/lib/coachPrompt";

// ─── Design tokens (match app design system) ─────────────────────────────────
const C = {
  BG:     '#fdfaf3',
  INK:    '#1a1f2e',
  MUTED:  '#6b6456',
  BORDER: '#e8dfc8',
  BORDER_SOFT: '#f0e8d3',
  CARD:   '#ffffff',
  IVA:    '#c44536',
  IRPF:   '#d4a017',
  OK:     '#5a7a3e',
  WARM:   '#c9bfa8',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

interface CoachPanelProps {
  onClose: () => void;
  snapshot: TaxSnapshot;
  wizardProfile: WizardProfile;
  checkerHistory: CheckerRun[];
  language: Language;
}

// ─── Loading Dots ─────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 16px' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: C.MUTED, display: 'inline-block',
            animation: 'bounce 1s infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '80%', background: C.INK, color: 'white',
          borderRadius: '16px 16px 4px 16px',
          padding: '10px 14px', fontSize: 14, lineHeight: 1.55,
        }}>
          {message.content}
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{
          maxWidth: '85%', background: '#fef2f2', color: C.IVA,
          borderRadius: '16px 16px 16px 4px', border: `1px solid #fecaca`,
          padding: '10px 14px', fontSize: 14, lineHeight: 1.55,
        }}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{
        maxWidth: '85%', background: C.CARD, color: C.INK,
        borderRadius: '16px 16px 16px 4px', border: `1px solid ${C.BORDER}`,
        padding: '10px 14px', fontSize: 14, lineHeight: 1.55,
      }}>
        {message.content}
      </div>
    </div>
  );
}

// ─── Main CoachPanel ──────────────────────────────────────────────────────────

export function CoachPanel({ onClose, snapshot, wizardProfile, checkerHistory, language }: CoachPanelProps) {
  const t = translations[language].coach;

  const [llmEnabled, setLlmEnabled] = useState(false);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [answeredChips, setAnsweredChips] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx: CoachContext = buildCoachContext(
    snapshot,
    wizardProfile,
    nextDeadline(new Date().getFullYear()),
    checkerHistory
  );

  useEffect(() => {
    const opening = getOpeningMessage(ctx, language);
    setMessages([{ id: "opening", role: "assistant", content: opening }]);
    setChips(getInitialChips(ctx, language));

    fetch("/api/coach/eligibility")
      .then((r) => r.json())
      .then((data: { eligible: boolean }) => {
        setEligible(data.eligible);
        if (data.eligible) {
          const stored = localStorage.getItem("kallio-coach-llm");
          if (stored === "true") setLlmEnabled(true);
        }
      })
      .catch(() => setEligible(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleToggle = useCallback(
    (value: boolean) => {
      setLlmEnabled(value);
      localStorage.setItem("kallio-coach-llm", String(value));
      if (!value) {
        const opening = getOpeningMessage(ctx, language);
        setMessages([{ id: "opening", role: "assistant", content: opening }]);
        setSessionCount(0);
        setAnsweredChips([]);
        setChips(getInitialChips(ctx, language));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, language]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || sessionCount >= 4) return;

      const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      const newAnswered = [...answeredChips, trimmed];
      setAnsweredChips(newAnswered);

      try {
        if (!llmEnabled || !eligible) {
          const reply = getFallbackResponse(trimmed, ctx, language);
          setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: reply }]);
          setSessionCount((c) => c + 1);
          setChips(getNextChips(ctx, newAnswered, language));
        } else {
          const history = messages
            .filter((m) => m.id !== "opening")
            .map((m) => ({ role: m.role, content: m.content }));

          const res = await fetch("/api/coach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contextObject: ctx,
              userMessage: trimmed,
              conversationHistory: history,
              llmEnabled: true,
              language,
            }),
          });

          const data = (await res.json()) as {
            reply?: string;
            error?: boolean;
            useFallback?: boolean;
            sessionLimit?: boolean;
            limitReached?: boolean;
          };

          const replyText = data.reply ?? getFallbackResponse(trimmed, ctx, language);
          setMessages((prev) => [...prev, {
            id: `a-${Date.now()}`, role: "assistant", content: replyText,
            isError: data.error === true,
          }]);
          setSessionCount((c) => c + 1);
          setChips(getNextChips(ctx, newAnswered, language));
        }
      } catch {
        setMessages((prev) => [...prev, {
          id: `e-${Date.now()}`, role: "assistant",
          content: t.errorMsg, isError: true,
        }]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, sessionCount, llmEnabled, eligible, messages, answeredChips, ctx, language, t]
  );

  const handleNewSession = () => {
    const opening = getOpeningMessage(ctx, language);
    setMessages([{ id: "opening", role: "assistant", content: opening }]);
    setSessionCount(0);
    setAnsweredChips([]);
    setChips(getInitialChips(ctx, language));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Bounce animation */}
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>

      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(26,31,46,0.4)', backdropFilter: 'blur(2px)', zIndex: 40 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, bottom: 0, right: 0,
        width: '100%', maxWidth: 440,
        zIndex: 50, display: 'flex', flexDirection: 'column',
        background: C.BG,
        boxShadow: '-4px 0 32px rgba(26,31,46,0.12)',
        borderLeft: `1px solid ${C.BORDER}`,
        fontFamily: 'Inter, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 16px',
          borderBottom: `1px solid ${C.BORDER}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 2,
              background: C.IVA, flexShrink: 0,
            }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.INK, margin: 0 }}>
              {t.title}
            </h2>
            {eligible && (
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '3px 7px',
                borderRadius: 999, border: `1px solid ${C.BORDER}`,
                color: C.MUTED,
              }}>
                {t.experimental}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t.closeLabel}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', borderRadius: 8, border: 'none',
              background: 'transparent', color: C.MUTED, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.BORDER_SOFT)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* LLM toggle — only if eligible */}
        {eligible && (
          <div style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${C.BORDER}`,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.INK }}>{t.toggleLabel}</span>
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={llmEnabled}
                onClick={() => handleToggle(!llmEnabled)}
                style={{
                  position: 'relative', width: 36, height: 20,
                  borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: llmEnabled ? C.INK : C.BORDER,
                  transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 2,
                  left: llmEnabled ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
            <p style={{ fontSize: 11, color: C.MUTED, lineHeight: 1.5, margin: 0 }}>
              {llmEnabled ? t.toggleOnDisclaimer : t.toggleOffNote}
            </p>
          </div>
        )}

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: C.CARD, border: `1px solid ${C.BORDER}`,
                borderRadius: '16px 16px 16px 4px',
              }}>
                <LoadingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chips */}
        {chips.length > 0 && sessionCount < 4 && (
          <div style={{
            padding: '8px 16px', display: 'flex', gap: 6,
            overflowX: 'auto', flexShrink: 0,
            scrollbarWidth: 'none',
          }}>
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                disabled={loading}
                style={{
                  flexShrink: 0, fontSize: 12, padding: '6px 12px',
                  borderRadius: 999, border: `1px solid ${C.BORDER}`,
                  background: C.CARD, color: C.MUTED,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = C.BORDER_SOFT; e.currentTarget.style.color = C.INK; }}}
                onMouseLeave={e => { e.currentTarget.style.background = C.CARD; e.currentTarget.style.color = C.MUTED; }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Session limit banner */}
        {sessionCount >= 4 && (
          <div style={{
            padding: '10px 16px',
            background: '#fffbeb',
            borderTop: `1px solid #fde68a`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.4 }}>
              {t.sessionDone}
            </p>
            <button
              onClick={handleNewSession}
              style={{
                fontSize: 12, fontWeight: 600, color: '#92400e',
                background: 'none', border: 'none', cursor: 'pointer',
                textDecoration: 'underline', marginLeft: 8, flexShrink: 0,
                fontFamily: 'inherit',
              }}
            >
              {t.newSession}
            </button>
          </div>
        )}

        {/* Input row */}
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${C.BORDER}`,
          display: 'flex', gap: 8, flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || sessionCount >= 4}
            placeholder={sessionCount >= 4 ? t.inputDisabled : t.inputPlaceholder}
            style={{
              flex: 1, fontSize: 14, padding: '9px 14px',
              borderRadius: 10, border: `1px solid ${C.BORDER}`,
              background: C.CARD, color: C.INK,
              fontFamily: 'inherit', outline: 'none',
              opacity: (loading || sessionCount >= 4) ? 0.5 : 1,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = C.INK)}
            onBlur={e => (e.currentTarget.style.borderColor = C.BORDER)}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || sessionCount >= 4}
            aria-label="Send"
            style={{
              width: 38, height: 38, display: 'flex', alignItems: 'center',
              justifyContent: 'center', borderRadius: 10, border: 'none',
              background: (!input.trim() || loading || sessionCount >= 4) ? C.BORDER : C.INK,
              color: 'white', cursor: (!input.trim() || loading || sessionCount >= 4) ? 'not-allowed' : 'pointer',
              flexShrink: 0, transition: 'background 0.15s',
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
