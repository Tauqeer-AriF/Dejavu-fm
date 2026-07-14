
/**
 * Utility to handle London HQ time conversion to user local time.
 * Dejavu FM broadcasts from London (Europe/London).
 */

export const LONDON_TIMEZONE = 'Europe/London';

export interface ShowTime {
  day_of_week: number;
  time: string;
}

/**
 * Converts a London-based day and time into the user's local day and time.
 * @param londonDay 0 (Sunday) to 6 (Saturday)
 * @param londonTime "HH:mm" scale
 */
export function convertToLocalTime(londonDay: number, londonTime: string) {
  const [h, m] = londonTime.split(':').map(Number);
  const now = new Date();

  // Calculate the current offset between London and Local time
  const londonNow = new Date(now.toLocaleString('en-US', { timeZone: LONDON_TIMEZONE }));
  const localNow = new Date(now.toLocaleString('en-US'));
  const offsetMs = localNow.getTime() - londonNow.getTime();

  // Create a target date representing the show start in London
  const londonShowDate = new Date(londonNow);
  londonShowDate.setHours(h, m, 0, 0);

  // Adjust for the specific day of the week requested
  const dayShift = londonDay - londonNow.getDay();
  londonShowDate.setDate(londonShowDate.getDate() + dayShift);

  // Apply the timezone offset to find the Local date
  const localShowDate = new Date(londonShowDate.getTime() + offsetMs);

  return {
    dayOfWeek: localShowDate.getDay(),
    timeStr: localShowDate.toTimeString().slice(0, 5)
  };
}

export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return 'UTC';
  }
}
