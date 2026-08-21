import { useState, useEffect } from 'react';

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isLive: boolean;
  isEnded: boolean;
  statusText: string;
}

export function useEventCountdown(startTimeStr: string, endTimeStr: string, timezone: string = 'Europe/London'): CountdownResult {
  const calculate = (): CountdownResult => {
    const now = Date.now();
    const start = new Date(startTimeStr).getTime();
    const end = new Date(endTimeStr).getTime();

    if (isNaN(start) || isNaN(end)) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formatted: 'TBA',
        isLive: false,
        isEnded: false,
        statusText: 'Scheduled'
      };
    }

    if (now >= end) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formatted: 'Event Ended',
        isLive: false,
        isEnded: true,
        statusText: 'Completed'
      };
    }

    if (now >= start && now < end) {
      const remainingSecs = Math.max(0, Math.floor((end - now) / 1000));
      const hours = Math.floor(remainingSecs / 3600);
      const minutes = Math.floor((remainingSecs % 3600) / 60);
      const seconds = remainingSecs % 60;

      return {
        days: 0,
        hours,
        minutes,
        seconds,
        formatted: `Live Now • ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} left`,
        isLive: true,
        isEnded: false,
        statusText: 'Live Broadcast'
      };
    }

    // Upcoming
    const diffSecs = Math.max(0, Math.floor((start - now) / 1000));
    const days = Math.floor(diffSecs / (3600 * 24));
    const hours = Math.floor((diffSecs % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    const seconds = diffSecs % 60;

    let formatted = '';
    if (days > 0) {
      formatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
      formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return {
      days,
      hours,
      minutes,
      seconds,
      formatted,
      isLive: false,
      isEnded: false,
      statusText: 'Upcoming'
    };
  };

  const [countdown, setCountdown] = useState<CountdownResult>(calculate);

  useEffect(() => {
    setCountdown(calculate());
    const interval = setInterval(() => {
      setCountdown(calculate());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTimeStr, endTimeStr, timezone]);

  return countdown;
}
