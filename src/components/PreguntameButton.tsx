"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
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

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-sm font-semibold shadow-sm transition-all"
      >
        <MessageCircle className="w-4 h-4" />
        Pregúntame
      </button>

      {isOpen && (
        <CoachPanel
          onClose={() => setIsOpen(false)}
          snapshot={snapshot}
          wizardProfile={wizardProfile}
          checkerHistory={checkerHistory}
        />
      )}
    </>
  );
}
