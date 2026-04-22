"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send } from "lucide-react";
import type { TaxSnapshot, CheckerRun } from "@/lib/types";
import type { WizardProfile } from "@/lib/wizard-config";
import { nextDeadline } from "@/lib/tax-engine";
import { buildCoachContext } from "@/lib/coachContext";
import { getOpeningMessage, getFallbackResponse, getInitialChips, getNextChips } from "@/lib/coachFallback";
import type { CoachContext } from "@/lib/coachPrompt";

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
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
        checked ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Loading Dots ─────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
        {message.content}
      </div>
    </div>
  );
}

// ─── Main CoachPanel ──────────────────────────────────────────────────────────

export function CoachPanel({ onClose, snapshot, wizardProfile, checkerHistory }: CoachPanelProps) {
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

  // Build context once
  const ctx: CoachContext = buildCoachContext(
    snapshot,
    wizardProfile,
    nextDeadline(new Date().getFullYear()),
    checkerHistory
  );

  // On mount: fetch eligibility, set opening message and chips
  useEffect(() => {
    const opening = getOpeningMessage(ctx);
    setMessages([
      {
        id: "opening",
        role: "assistant",
        content: opening,
      },
    ]);
    setChips(getInitialChips(ctx));

    // Fetch eligibility
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle LLM toggle
  const handleToggle = useCallback(
    (value: boolean) => {
      setLlmEnabled(value);
      localStorage.setItem("kallio-coach-llm", String(value));
      if (!value) {
        // Clear conversation when turning off
        const opening = getOpeningMessage(ctx);
        setMessages([{ id: "opening", role: "assistant", content: opening }]);
        setSessionCount(0);
        setAnsweredChips([]);
        setChips(getInitialChips(ctx));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx]
  );

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || sessionCount >= 4) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      // Remove this chip if it was a chip click
      const newAnswered = [...answeredChips, trimmed];
      setAnsweredChips(newAnswered);

      try {
        if (!llmEnabled || !eligible) {
          // Use fallback synchronously
          const reply = getFallbackResponse(trimmed, ctx);
          const assistantMsg: Message = {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: reply,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setSessionCount((c) => c + 1);
          setChips(getNextChips(ctx, newAnswered));
        } else {
          // Use LLM
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
            }),
          });

          const data = (await res.json()) as {
            reply?: string;
            error?: boolean;
            useFallback?: boolean;
            sessionLimit?: boolean;
            limitReached?: boolean;
          };

          const replyText =
            data.reply ?? getFallbackResponse(trimmed, ctx);
          const assistantMsg: Message = {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: replyText,
            isError: data.error === true,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setSessionCount((c) => c + 1);
          setChips(getNextChips(ctx, newAnswered));
        }
      } catch {
        const errorMsg: Message = {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "En este momento no puedo procesar tu pregunta. Prueba de nuevo en unos segundos.",
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, sessionCount, llmEnabled, eligible, messages, answeredChips, ctx]
  );

  const handleNewSession = () => {
    const opening = getOpeningMessage(ctx);
    setMessages([{ id: "opening", role: "assistant", content: opening }]);
    setSessionCount(0);
    setAnsweredChips([]);
    setChips(getInitialChips(ctx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed top-0 bottom-0 right-0 w-full sm:w-[440px] z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Coach fiscal
            </h2>
            {eligible && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 uppercase tracking-wide">
                experimental
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LLM toggle row — only if eligible */}
        {eligible && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Asistente IA (experimental)
              </span>
              <ToggleSwitch checked={llmEnabled} onChange={handleToggle} />
            </div>
            {llmEnabled ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Las respuestas del asistente son orientativas y no constituyen asesoramiento fiscal.
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Respuestas automáticas activas — activa el asistente para respuestas personalizadas.
              </p>
            )}
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm">
                <LoadingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chips row */}
        {chips.length > 0 && sessionCount < 4 && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0 scrollbar-none">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                disabled={loading}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Session limit banner */}
        {sessionCount >= 4 && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Sesión completada — abre una nueva sesión para continuar.
            </p>
            <button
              onClick={handleNewSession}
              className="text-xs font-medium text-amber-700 dark:text-amber-400 underline hover:no-underline ml-2 flex-shrink-0"
            >
              Nueva sesión
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || sessionCount >= 4}
            placeholder={
              sessionCount >= 4
                ? "Sesión completada"
                : "Escribe tu pregunta..."
            }
            className="flex-1 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || sessionCount >= 4}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
