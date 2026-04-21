/**
 * Kallio Setup Wizard — activity config and deductibility rates.
 * Maintained as a standalone config so it can be updated independently of UI logic.
 * Update DEDUCTIBILITY_RATES when Spanish tax rules change — never hardcode in components.
 */

export type ActivityKey =
  | 'consultoria_tech'
  | 'diseno'
  | 'formacion'
  | 'salud'
  | 'construccion'
  | 'comercio'
  | 'transporte'
  | 'otro';

export type IncomeStructure = 'single_client' | 'multi_client' | 'sl_beckham';
export type IncomeStability = 'stable' | 'variable';
export type ExpensesVolume = 'minimal' | 'some' | 'many';

/**
 * Net deductible fraction per activity (EDS rules, Spain 2025).
 * e.g. 0.75 means 75 % of declared expenses are deductible.
 */
export const DEDUCTIBILITY_RATES: Record<ActivityKey, number> = {
  consultoria_tech: 1.0,
  diseno: 1.0,
  formacion: 1.0,
  salud: 0.85,
  construccion: 0.75,
  comercio: 0.60,
  transporte: 0.50,
  otro: 0.70,   // conservative default
};

/** Badge text shown on activity cards in the wizard */
export const ACTIVITY_DEDUCTIBILITY_BADGE: Record<ActivityKey, string> = {
  consultoria_tech: '100%',
  diseno: '100%',
  formacion: '100%',
  salud: '70–100%',
  construccion: '50–100%',
  comercio: '50–70%',
  transporte: '50%',
  otro: 'variable',
};

export interface WizardProfile {
  incomeStructure: IncomeStructure;
  activity: ActivityKey;
  deductibilityRate: number;     // resolved from DEDUCTIBILITY_RATES[activity]
  incomeStability: IncomeStability;
  expensesVolume: ExpensesVolume;
  wizardCompleted: boolean;
}
