
/**
 * Utility to handle London HQ time conversion to user local time.
 * DejavuFM broadcasts from London (Europe/London).
 */

export const LONDON_TIMEZONE = 'Europe/London';

export interface ShowTime {
  day_of_week: number;
  time: string;
}

/**
 * Gets the current time in the Europe/London timezone.
 */
export function getLondonTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: LONDON_TIMEZONE }));
}

/**
 * Converts a London-based day and time into the London display day and time.
 * Since we want the application to show the same schedule of London to every time zone,
 * we return the input London day and time directly.
 * @param londonDay 0 (Sunday) to 6 (Saturday)
 * @param londonTime "HH:mm" scale
 */
export function convertToLocalTime(londonDay: number, londonTime: string) {
  return {
    dayOfWeek: londonDay,
    timeStr: londonTime
  };
}

export function getUserTimezone() {
  return LONDON_TIMEZONE;
}

