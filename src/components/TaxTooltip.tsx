"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { getExplanation, type ConceptKey } from "@/lib/tax-explanations";

interface TaxTooltipProps {
  concept: ConceptKey;
  values?: Record<string, string>;
  size?: "xs" | "sm";
}

export function TaxTooltip({ concept, values, size = "xs" }: TaxTooltipProps) {
  const language = useKallioStore((s) => s.language);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ bottom: 0, left: 0 });
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const explanation = getExplanation(concept, language === "es" ? "es" : "en");

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.min(
          Math.max(rect.left + rect.width / 2, 144), // min: half tooltip width from left
          window.innerWidth - 144                     // max: half tooltip width from right
        ),
      });
    }
    setOpen((o) => !o);
  };

  const interpolate = (text: string) => {
    if (!values) return text;
    return Object.entries(values).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
      text
    );
  };

  const iconSize = size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span className="relative inline-flex items-center" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="ml-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus:outline-none"
        aria-label={`Explain: ${explanation.title}`}
      >
        <HelpCircle className={iconSize} />
      </button>

      {open && (
        <div
          className="fixed w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-left"
          style={{ bottom: coords.bottom, left: coords.left, transform: "translateX(-50%)", zIndex: 9999 }}
        >
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 rotate-45" />

          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {explanation.title}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {interpolate(explanation.body)}
            </p>
            {explanation.example && (
              <div className="mt-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-semibold text-teal-600 dark:text-teal-400">Ej. </span>
                  {interpolate(explanation.example)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
