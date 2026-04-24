"use client";

import { useState } from "react";
import { BookOpen, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { Navigation } from "@/components/Navigation";
import { getAllExplanations, LEARN_GROUPS, type ConceptKey } from "@/lib/tax-explanations";

export default function LearnPage() {
  const language = useKallioStore((s) => s.language);
  const isES = language === "es";
  const explanations = getAllExplanations(language === "es" ? "es" : "en");

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<ConceptKey | null>(null);

  const toggle = (key: ConceptKey) =>
    setExpanded((prev) => (prev === key ? null : key));

  // Filter by search
  const searchLower = search.toLowerCase();
  const matchesConcept = (key: ConceptKey) => {
    if (!searchLower) return true;
    const exp = explanations[key];
    return (
      exp.title.toLowerCase().includes(searchLower) ||
      exp.body.toLowerCase().includes(searchLower)
    );
  };

  const visibleGroups = LEARN_GROUPS.map((g) => ({
    ...g,
    concepts: g.concepts.filter(matchesConcept),
  })).filter((g) => g.concepts.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 sm:pb-0 transition-colors">
      <Navigation />

      <main className="pt-14 px-4 lg:px-8 py-6 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {isES ? "Glosario fiscal" : "Tax glossary"}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isES
              ? "Todo lo que necesitas saber sobre impuestos de autónomo, en lenguaje claro."
              : "Everything you need to know about freelance taxes, in plain language."}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isES ? "Buscar concepto…" : "Search concept…"}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 dark:text-slate-100 placeholder:text-slate-400 transition-colors"
          />
        </div>

        {/* Groups */}
        <div className="space-y-6">
          {visibleGroups.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{isES ? "No hay resultados" : "No results found"}</p>
            </div>
          )}

          {visibleGroups.map((group) => (
            <section key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{group.icon}</span>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isES ? group.titleES : group.titleEN}
                </h2>
              </div>

              <div className="space-y-2">
                {group.concepts.map((key) => {
                  const exp = explanations[key];
                  const isOpen = expanded === key;

                  return (
                    <div
                      key={key}
                      className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm"
                    >
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {exp.title}
                        </span>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {exp.body}
                          </p>
                          {exp.example && (
                            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl px-4 py-3 border border-teal-100 dark:border-teal-800">
                              <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">
                                <span className="font-semibold">
                                  {isES ? "Ejemplo: " : "Example: "}
                                </span>
                                {exp.example}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 px-4 py-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center">
            {isES
              ? "Kallio aplica las reglas fiscales de Estimación Directa Simplificada (España 2025). Para casos complejos, consulta con un gestor."
              : "Kallio applies Simplified Direct Assessment tax rules (Spain 2025). For complex situations, consult a tax professional."}
          </p>
        </div>
      </main>
    </div>
  );
}
