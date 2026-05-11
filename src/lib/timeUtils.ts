
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
  const [hours, minutes] = londonTime.split(':').map(Number);
  
  // We need to create a Date object that corresponds to "Last Sunday" + londonDay
  // and the specified time, then interpret that in London time.
  
  const now = new Date();
  
  // To be safe, let's find the offset for a specific point in time.
  // Create a UTC string that represents the time in London
  // This is hard with pure JS.
  
  // ALTERNATIVE:
  // Calculate the offset between London and UTC for "now"
  // Calculate the offset between Local and UTC for "now"
  // The relative offset allows us to shift the hours.
  
  const tempDate = new Date();
  const localTime = tempDate.getTime();
  
  const londonDateStr = tempDate.toLocaleString('en-US', { timeZone: LONDON_TIMEZONE });
  const londonTimeParsed = new Date(londonDateStr).getTime();
  
  // The difference between local system clock and London clock
  const offsetMs = localTime - londonTimeParsed;
  
  // Now apply this offset to the source time
  // We create a "dummy" date at the requested London time
  const dummyDate = new Date();
  dummyDate.setHours(hours, minutes, 0, 0);
  
  // Shift by offset
  const localDate = new Date(dummyDate.getTime() + offsetMs);
  
  let newDay = londonDay;
  const newHours = localDate.getHours();
  const newMinutes = localDate.getMinutes();
  
  // If we crossed midnight in the calculation
  // (dummyDate was today, localDate might be tomorrow or yesterday)
  const dayShift = Math.floor((dummyDate.getTime() + offsetMs - new Date(dummyDate).setHours(0,0,0,0)) / 86400000) - 
                   Math.floor((dummyDate.getTime() - new Date(dummyDate).setHours(0,0,0,0)) / 86400000);
  
  // Wait, that's complex. Let's just check the hours.
  // If dummyDate is 05:00 and localDate is 23:00 (of previous day)
  // or dummyDate is 23:00 and localDate is 01:00 (of next day)
  
  // Simpler Day Shift detection:
  // If London is 1AM and Local is 11PM (Day - 1)
  // If London is 11PM and Local is 1AM (Day + 1)
  
  const londonHourNow = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: LONDON_TIMEZONE }).format(tempDate));
  const localHourNow = tempDate.getHours();
  
  let hourDiff = localHourNow - londonHourNow;
  // Handle wraps
  if (hourDiff > 12) hourDiff -= 24;
  if (hourDiff < -12) hourDiff += 24;
  
  // Minutes diff (rare but exists, e.g. India is +5:30)
  const londonMinNow = parseInt(new Intl.DateTimeFormat('en-US', { minute: 'numeric', timeZone: LONDON_TIMEZONE }).format(tempDate));
  const localMinNow = tempDate.getMinutes();
  let minDiff = localMinNow - londonMinNow;
  
  // Apply diff to show time
  let finalMin = minutes + minDiff;
  let finalHour = hours + hourDiff;
  
  if (finalMin >= 60) {
    finalMin -= 60;
    finalHour += 1;
  } else if (finalMin < 0) {
    finalMin += 60;
    finalHour -= 1;
  }
  
  if (finalHour >= 24) {
    finalHour -= 24;
    newDay = (newDay + 1) % 7;
  } else if (finalHour < 0) {
    finalHour += 24;
    newDay = (newDay + 6) % 7;
  }
  
  return {
    dayOfWeek: newDay,
    timeStr: `${finalHour.toString().padStart(2, '0')}:${finalMin.toString().padStart(2, '0')}`
  };
}

export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return 'UTC';
  }
}
