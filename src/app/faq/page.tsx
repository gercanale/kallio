"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, Info, Settings2 } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useT } from "@/lib/useT";
import { Navigation } from "@/components/Navigation";

const IRPF_BRACKETS = [
  { from: 0, to: 12450, rate: "19%" },
  { from: 12450, to: 20200, rate: "24%" },
  { from: 20200, to: 35200, rate: "30%" },
  { from: 35200, to: 60000, rate: "37%" },
  { from: 60000, to: 300000, rate: "45%" },
  { from: 300000, to: null, rate: "47%" },
];

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{children}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);
  const sessionActive = useKallioStore((s) => s.sessionActive);
  const t = useT();

  useEffect(() => {
    if (!hydrated) return;
    if (!sessionActive) router.replace("/");
    else if (!profile.onboardingComplete) router.replace("/onboarding");
  }, [hydrated, sessionActive, profile.onboardingComplete, router]);

  if (!hydrated || !sessionActive) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tf = t.faq;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navigation />
      <main className="pt-14 px-4 lg:px-8 py-6 pb-24 lg:pb-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{tf.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tf.subtitle}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {tf.updatedLabel}: {tf.updatedDate}
          </p>
        </div>

        {/* Models section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Modelos
            </h2>
          </div>
          <div className="space-y-2">
            <Accordion title={tf.m303Title}>{tf.m303Body}</Accordion>
            <Accordion title={tf.m130Title}>{tf.m130Body}</Accordion>
          </div>
        </section>

        {/* Onboarding choices section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {tf.onboardingSection}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{tf.onboardingDesc}</p>
          <div className="space-y-2">
            <Accordion title={tf.regimeFaqTitle}>{tf.regimeFaqBody}</Accordion>
            <Accordion title={tf.irpfRetentionFaqTitle}>{tf.irpfRetentionFaqBody}</Accordion>
            <Accordion title={tf.irpfRateFaqTitle}>{tf.irpfRateFaqBody}</Accordion>
          </div>
        </section>

        {/* IRPF brackets table */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              IRPF
            </h2>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{tf.irpfTitle}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tf.irpfSubtitle}</p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">{tf.irpfUpdated}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {tf.irpfColFrom}
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {tf.irpfColTo}
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {tf.irpfColRate}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {IRPF_BRACKETS.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-5 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                        {row.from.toLocaleString("es-ES")} €
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                        {row.to ? `${row.to.toLocaleString("es-ES")} €` : tf.irpfUnlimited}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-block bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-semibold px-2 py-0.5 rounded-md">
                          {row.rate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">{tf.irpfFootnote}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{tf.irpfSourceNote}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
