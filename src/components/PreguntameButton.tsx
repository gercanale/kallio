"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { translations } from "@/lib/i18n";
import type { TaxSnapshot, CheckerRun } from "@/lib/types";
import type { WizardProfile } from "@/lib/wizard-config";
import { CoachPanel } from "./CoachPanel";

interface PreguntameButtonProps {
  snapshot: TaxSnapshot;
  wizardProfile: WizardProfile;
  checkerHistory: CheckerRun[];
}

export function PreguntameButton({ snapshot, wizardProfile, checkerHistory }: PreguntameButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const language = useKallioStore((s) => s.language);
  const t = translations[language].coach;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 16px', borderRadius: 999,
          background: '#1a1f2e', color: 'white', border: 'none',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <MessageCircle size={13} />
        {t.preguntameBtn}
      </button>

      {isOpen && (
        <CoachPanel
          onClose={() => setIsOpen(false)}
          snapshot={snapshot}
          wizardProfile={wizardProfile}
          checkerHistory={checkerHistory}
          language={language}
        />
      )}
    </>
  );
}
