import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convertToLocalTime } from '../lib/timeUtils';

export function NotificationManager() {
  const { data: scheduleData } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetch("/api/public/schedule").then(res => res.json())
  });

  const lastNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkSchedule = () => {
      const savedReminders = localStorage.getItem('dejavu_reminders');
      if (!savedReminders || !scheduleData) return;

      const reminderIds = JSON.parse(savedReminders) as string[];
      if (reminderIds.length === 0) return;

      const schedule = Array.isArray(scheduleData) ? scheduleData : [];
      const now = new Date();
      
      // Target time: exactly 10 minutes from now (rounded to the minute)
      const targetTime = new Date(now.getTime() + 10 * 60000);
      const targetDay = targetTime.getDay();
      const targetTimeString = `${targetTime.getHours().toString().padStart(2, '0')}:${targetTime.getMinutes().toString().padStart(2, '0')}`;

      reminderIds.forEach(id => {
        const show = schedule.find(s => s.id === id);
        if (!show) return;

        // Convert the show's London time to Local time
        const local = convertToLocalTime(show.day_of_week, show.start_time);

        // If local start time matches targetTime exactly, notify
        if (local.dayOfWeek === targetDay && local.timeStr === targetTimeString) {
          const notificationKey = `${id}-${targetDay}-${targetTimeString}`;
          if (!lastNotifiedRef.current.has(notificationKey)) {
            if (Notification.permission === 'granted') {
              const title = 'Dejavu FM Reminder';
              const options = {
                body: `Don't miss ${show.dj_name}'s show starting in 10 minutes!`,
                icon: show.dj_photo || '/icon.svg',
                badge: '/icon.svg',
                vibrate: [200, 100, 200],
                data: { url: '/schedule' }
              };

              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification(title, options);
                });
              } else {
                new Notification(title, options);
              }
              lastNotifiedRef.current.add(notificationKey);
              
              // Cleanup old notifications from ref to avoid memory leak
              if (lastNotifiedRef.current.size > 100) {
                const firstKey = lastNotifiedRef.current.values().next().value;
                if (firstKey) lastNotifiedRef.current.delete(firstKey);
              }
            }
          }
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkSchedule, 60000);
    checkSchedule(); // Initial check

    return () => clearInterval(interval);
  }, [scheduleData]);

  return null; // Invisible component
}
