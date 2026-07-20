
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
  // Create a date object representing now in London time.
  const nowInLondon = new Date(new Date().toLocaleString('en-US', { timeZone: LONDON_TIMEZONE }));
  
  // Get the current day of the week in London.
  const currentLondonDay = nowInLondon.getDay();
  
  // Calculate the difference in days to the target show day.
  let dayDifference = londonDay - currentLondonDay;
  
  // Create a new date object for the show.
  const showDateInLondon = new Date(nowInLondon.getTime());
  
  // Set the date to the correct day.
  showDateInLondon.setDate(nowInLondon.getDate() + dayDifference);
  
  // Set the time for the show.
  const [hours, minutes] = londonTime.split(':').map(Number);
  showDateInLondon.setHours(hours, minutes, 0, 0);
  
  // The browser will automatically convert this London-based date object
  // to the user's local time when we extract parts from it.
  const localShowDate = showDateInLondon;

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
