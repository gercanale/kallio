import type { TaxSnapshot, CheckerRun } from './types';
import type { WizardProfile } from './wizard-config';
import { nextDeadline } from './tax-engine';
import type { CoachContext } from './coachPrompt';

export function buildCoachContext(
  snapshot: TaxSnapshot,
  wizardProfile: WizardProfile,
  nextDeadlineResult: ReturnType<typeof nextDeadline>,
  checkerHistory: CheckerRun[]
): CoachContext {
  const beckhamStartYear = wizardProfile.beckhamStartYear;
  const beckhamYearsRemaining =
    beckhamStartYear != null
      ? Math.max(0, 6 - (new Date().getFullYear() - beckhamStartYear + 1))
      : null;

  return {
    user: {
      fiscalRegime: wizardProfile.fiscalRegime,
      activity: wizardProfile.activity,
      deductibilityRate: wizardProfile.deductibilityRate,
      incomeStability: wizardProfile.incomeStability,
      expensesVolume: wizardProfile.expensesVolume,
      beckhamYearsRemaining,
    },
    currentQuarter: {
      period: snapshot.quarterLabel,
      grossIncome: snapshot.grossIncome,
      netIncome: snapshot.grossIncome - snapshot.ivaCollected,
      ivaRepercutido: snapshot.ivaCollected,
      ivaSoportado: snapshot.ivaDeductible,
      ivaResult: snapshot.ivaPayable,
      irpfOrIrnrAdvance: snapshot.irpfAdvancePayable,
      totalTaxReserve: snapshot.totalTaxReserve,
      spendableBalance: snapshot.trueSpendableBalance,
      deductibleExpenses: snapshot.deductibleExpenses,
      gdj: snapshot.gjdDeduction,
      transactionCount: 0, // not available in snapshot
    },
    upcomingDeadline: {
      date: new Date(nextDeadlineResult.modelo130Deadline).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
      }),
      daysUntil: nextDeadlineResult.daysLeft,
      estimatedPayment: snapshot.ivaPayable + snapshot.irpfAdvancePayable,
      modelos: ['Modelo 303', 'Modelo 130'],
    },
    checkerAvailable: checkerHistory.length > 0,
    recentCheckerDiff: checkerHistory[0]?.diff?.totalDiff ?? null,
  };
}
