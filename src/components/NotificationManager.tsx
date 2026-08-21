import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convertToLocalTime, getLondonTime } from '../lib/timeUtils';
import { useLogo } from '../hooks/useLogo';
import { safeFetchJson } from '../utils/safeFetch';
import { toast } from 'sonner';
import { SpecialEvent } from '../types/events';

export function NotificationManager() {
  const { data: scheduleData } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => safeFetchJson("/api/public/schedule")
  });

  const { data: eventsData } = useQuery({
    queryKey: ['special-events'],
    queryFn: () => safeFetchJson<SpecialEvent[]>("/api/public/events?type=all"),
    refetchInterval: 30000
  });

  const { logoUrl, resolveDjImage } = useLogo();
  const lastNotifiedRef = useRef<Set<string>>(new Set());

  // Check recurring schedule reminders
  useEffect(() => {
    const checkSchedule = () => {
      const savedReminders = localStorage.getItem('dejavu_reminders');
      if (!savedReminders || !scheduleData) return;

      let reminderIds: string[] = [];
      try {
        reminderIds = JSON.parse(savedReminders) as string[];
      } catch {
        return;
      }
      if (reminderIds.length === 0) return;

      const schedule = Array.isArray(scheduleData) ? scheduleData : [];
      const now = getLondonTime();
      
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
          const notificationKey = `show-${id}-${targetDay}-${targetTimeString}`;
          if (!lastNotifiedRef.current.has(notificationKey)) {
            const title = 'DejavuFM Show Reminder';
            const body = `Don't miss ${show.dj_name}'s show starting in 10 minutes!`;
            
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const options = {
                body,
                icon: resolveDjImage(show.dj_photo) || '/icon.svg',
                badge: logoUrl || '/icon.svg',
                vibrate: [200, 100, 200],
                data: { url: '/schedule' }
              };

              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification(title, options);
                }).catch(() => {
                  try { new Notification(title, options); } catch {}
                });
              } else {
                try { new Notification(title, options); } catch {}
              }
            } else {
              toast.info(body, {
                duration: 8000,
                icon: '⏰'
              });
            }

            lastNotifiedRef.current.add(notificationKey);
          }
        }
      });
    };

    const interval = setInterval(checkSchedule, 60000);
    checkSchedule();

    return () => clearInterval(interval);
  }, [scheduleData, resolveDjImage, logoUrl]);

  // Check special event reminders
  useEffect(() => {
    const checkSpecialEvents = () => {
      if (!eventsData || !Array.isArray(eventsData)) return;

      // Load local event reminders
      let localEventReminders: Record<string, string[]> = {};
      try {
        const stored = localStorage.getItem('dejavu_event_reminders');
        if (stored) localEventReminders = JSON.parse(stored);
      } catch {}

      const nowMs = Date.now();

      eventsData.forEach(event => {
        // Only scheduled/live events
        if (event.status === 'completed' || event.status === 'cancelled') return;

        const startMs = new Date(event.start_time).getTime();
        const diffMinutes = Math.round((startMs - nowMs) / 60000);

        const activeIntervals = localEventReminders[event.id] || (event.user_has_reminder ? (event.user_reminder_intervals || ['1h']) : []);
        if (activeIntervals.length === 0) return;

        activeIntervals.forEach(intervalType => {
          let shouldTrigger = false;
          let label = '';

          if (intervalType === '15m' && diffMinutes > 0 && diffMinutes <= 15 && diffMinutes >= 13) {
            shouldTrigger = true;
            label = 'starts in 15 minutes!';
          } else if (intervalType === '1h' && diffMinutes > 0 && diffMinutes <= 60 && diffMinutes >= 55) {
            shouldTrigger = true;
            label = 'starts in 1 hour!';
          } else if (intervalType === '24h' && diffMinutes > 0 && diffMinutes <= 1440 && diffMinutes >= 1430) {
            shouldTrigger = true;
            label = 'starts tomorrow!';
          } else if (diffMinutes <= 0 && diffMinutes >= -5) {
            // Live now notification
            shouldTrigger = true;
            label = 'is NOW LIVE! 🔴';
          }

          if (shouldTrigger) {
            const notifKey = `evt-${event.id}-${intervalType}-${Math.floor(nowMs / (1000 * 60 * 15))}`;
            if (!lastNotifiedRef.current.has(notifKey)) {
              lastNotifiedRef.current.add(notifKey);

              const title = `Special Event: ${event.title}`;
              const body = `${event.title} ${label} ${event.xp_multiplier > 1 ? `(${event.xp_multiplier}× XP Active)` : ''}`;

              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const options = {
                  body,
                  icon: event.cover_image || logoUrl || '/icon.svg',
                  badge: logoUrl || '/icon.svg',
                  vibrate: [200, 100, 200, 100, 200],
                  data: { url: `/events/${event.slug || event.id}` }
                };

                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, options);
                  }).catch(() => {
                    try { new Notification(title, options); } catch {}
                  });
                } else {
                  try { new Notification(title, options); } catch {}
                }
              }

              // Also display in-app toast notification with action link
              toast.info(body, {
                description: `${event.genres?.join(', ') || 'Special Broadcast'} • ${event.xp_multiplier}× XP Multiplier`,
                duration: 10000,
                action: {
                  label: 'View Event',
                  onClick: () => {
                    window.location.href = `/events/${event.slug || event.id}`;
                  }
                }
              });
            }
          }
        });
      });
    };

    const interval = setInterval(checkSpecialEvents, 45000);
    checkSpecialEvents();

    return () => clearInterval(interval);
  }, [eventsData, logoUrl]);

  return null;
}
