"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircleQuestion, X, Send, CheckCircle } from "lucide-react";
import { useT } from "@/lib/useT";
import { createClient } from "@/lib/supabase";

type Status = "idle" | "sending" | "success" | "error";

export function HelpButton() {
  const t = useT();
  const ht = t.help;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && status === "idle" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open, status]);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setMessage("");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || status === "sending") return;

    setStatus("sending");

    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email ?? null;

    const res = await fetch("/api/help", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), userEmail }),
    });

    if (res.ok) {
      setStatus("success");
      setMessage("");
    } else {
      setStatus("error");
    }
  }

  const remaining = 500 - message.length;
  const overLimit = remaining < 0;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label={ht.buttonLabel}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-teal-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-teal-700 active:scale-95 sm:bottom-6 sm:right-6"
      >
        <MessageCircleQuestion size={18} className="shrink-0" />
        <span className="hidden sm:inline">{ht.buttonLabel}</span>
      </button>

      {/* Modal backdrop + dialog */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:mb-0 mb-16">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {ht.modalTitle}
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            {status === "success" ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle size={40} className="text-teal-500" />
                <p className="text-base font-medium text-slate-800 dark:text-slate-100">
                  {ht.successTitle}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {ht.successBody}
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  OK
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) setMessage(e.target.value);
                    }}
                    placeholder={ht.placeholder}
                    rows={5}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                  />
                  <span
                    className={`absolute bottom-2 right-3 text-xs ${
                      remaining <= 50 ? "text-amber-500" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {remaining} {ht.charCount}
                  </span>
                </div>

                {status === "error" && (
                  <p className="text-sm text-red-500">{ht.errorBody}</p>
                )}

                <button
                  type="submit"
                  disabled={!message.trim() || overLimit || status === "sending"}
                  className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={15} />
                  {status === "sending" ? ht.sending : ht.send}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
