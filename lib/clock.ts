// Fixed "now" for the whole prototype (README: 10:30 AM, 23 Sep 2026, IST).
// Never call Date.now() for business logic.
export const NOW = '2026-09-23T10:30:00+05:30';
export const TODAY = '2026-09-23';

// Meal window opening times (IST, minutes after midnight).
export const MEAL_OPEN_MIN = { lunch: 12 * 60 + 30, dinner: 19 * 60 + 30 } as const;
export const MEAL_CLOSE_MIN = { lunch: 14 * 60, dinner: 21 * 60 } as const;

// Minutes since midnight IST on the simulated clock. Advance via simulatedOffsetMin.
export function nowMinutes(simulatedOffsetMin = 0): number {
  return 10 * 60 + 30 + simulatedOffsetMin;
}

export function minutesToMeal(meal: 'lunch' | 'dinner', simulatedOffsetMin = 0): number {
  return MEAL_OPEN_MIN[meal] - nowMinutes(simulatedOffsetMin);
}

// ISO timestamp on the simulated clock (offset in seconds from NOW).
export function simulatedIso(offsetSec = 0): string {
  const base = Date.parse(NOW); // fixed constant, not wall-clock time
  return new Date(base + offsetSec * 1000).toISOString();
}