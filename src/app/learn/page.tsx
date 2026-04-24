"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { Navigation } from "@/components/Navigation";
import { getAllExplanations, LEARN_GROUPS, type ConceptKey } from "@/lib/tax-explanations";

const C = {
  BG: '#fdfaf3', INK: '#1a1f2e', MUTED: '#6b6456',
  BORDER: '#e8dfc8', IVA: '#c44536', OK: '#5a7a3e', CARD: '#ffffff',
};

export default function LearnPage() {
  const language = useKallioStore((s) => s.language);
  const isES = language === "es";
  const explanations = getAllExplanations(language === "es" ? "es" : "en");

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<ConceptKey | null>(null);

  const toggle = (key: ConceptKey) =>
    setExpanded((prev) => (prev === key ? null : key));

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
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK }}>
      <Navigation />

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '80px 24px 88px', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>
            {isES ? "Glosario fiscal" : "Tax glossary"}
          </h1>
          <p style={{ fontSize: 14, color: C.MUTED, lineHeight: 1.5 }}>
            {isES
              ? "Todo lo que necesitas saber sobre impuestos de autónomo, en lenguaje claro."
              : "Everything you need to know about freelance taxes, in plain language."}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.MUTED }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isES ? "Buscar concepto…" : "Search concept…"}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 10,
              padding: '10px 14px 10px 38px', fontSize: 14, color: C.INK,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        {/* Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {visibleGroups.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.MUTED }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📖</div>
              <p style={{ fontSize: 14 }}>{isES ? "No hay resultados" : "No results found"}</p>
            </div>
          )}

          {visibleGroups.map((group) => (
            <section key={group.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>{group.icon}</span>
                <span className="mono" style={{ fontSize: 11, color: C.MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                  {isES ? group.titleES : group.titleEN}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.concepts.map((key) => {
                  const exp = explanations[key];
                  const isOpen = expanded === key;

                  return (
                    <div
                      key={key}
                      style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 12, overflow: 'hidden' }}
                    >
                      <button
                        onClick={() => toggle(key)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 20px', background: 'transparent', border: 'none',
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.INK }}>
                          {exp.title}
                        </span>
                        {isOpen
                          ? <ChevronUp size={16} style={{ color: C.MUTED, flexShrink: 0 }} />
                          : <ChevronDown size={16} style={{ color: C.MUTED, flexShrink: 0 }} />}
                      </button>

                      {isOpen && (
                        <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${C.BORDER}`, paddingTop: 14 }}>
                          <p style={{ fontSize: 14, color: C.MUTED, lineHeight: 1.7, marginBottom: exp.example ? 12 : 0 }}>
                            {exp.body}
                          </p>
                          {exp.example && (
                            <div style={{ background: '#eef3eb', borderRadius: 10, padding: '10px 14px', border: `1px solid #c8ddc0` }}>
                              <p style={{ fontSize: 13, color: '#3d5a29', lineHeight: 1.6 }}>
                                <span style={{ fontWeight: 600 }}>
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
        <div style={{ marginTop: 32, background: '#f0e8d3', borderRadius: 12, padding: '14px 20px' }}>
          <p style={{ fontSize: 12, color: C.MUTED, lineHeight: 1.6, textAlign: 'center' }}>
            {isES
              ? "Kallio aplica las reglas fiscales de Estimación Directa Simplificada (España 2025). Para casos complejos, consulta con un gestor."
              : "Kallio applies Simplified Direct Assessment tax rules (Spain 2025). For complex situations, consult a tax professional."}
          </p>
        </div>
      </main>
    </div>
  );
}
