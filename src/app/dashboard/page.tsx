"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { TaxReserveMeter } from "@/components/TaxReserveMeter";
import { DeductionAssistant } from "@/components/DeductionAssistant";
import { QuarterlyCountdown } from "@/components/QuarterlyCountdown";
import { Navigation } from "@/components/Navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { useT } from "@/i18n";
import { useFormatDate } from "@/i18n/useFormatDate";

export default function DashboardPage() {
  const { t } = useT();
  const { formatDashboard } = useFormatDate();
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useKallioStore((s) => s.profile);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [hydrated, profile.onboardingComplete, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile.onboardingComplete) return null;

  const hour = new Date().getHours();
  const greeting =
    hour < 13
      ? t("dashboard.greetingMorning")
      : hour < 20
      ? t("dashboard.greetingAfternoon")
      : t("dashboard.greetingEvening");

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {greeting}, {profile.name.split(" ")[0]} 👋
            </h1>
            <p className="text-slate-500 text-sm capitalize">
              {formatDashboard(new Date())}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("dashboard.add")}
          </button>
        </div>

        <div className="space-y-4">
          <TaxReserveMeter />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DeductionAssistant />
            <QuarterlyCountdown />
          </div>
        </div>
      </main>

      {showForm && (
        <TransactionForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
