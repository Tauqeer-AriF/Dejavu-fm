import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Clock, X, AlertCircle, Sparkles } from 'lucide-react';
import { SpecialEvent } from '../../types/events';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useLogo } from '../../hooks/useLogo';

interface EventReminderModalProps {
  event: SpecialEvent;
  isOpen: boolean;
  onClose: () => void;
}

export function EventReminderModal({ event, isOpen, onClose }: EventReminderModalProps) {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>(['1h']);
  const [loading, setLoading] = useState(false);
  const [hasNotifPermission, setHasNotifPermission] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  useEffect(() => {
    // Load existing reminders
    try {
      const stored = localStorage.getItem('dejavu_event_reminders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[event.id] && Array.isArray(parsed[event.id]) && parsed[event.id].length > 0) {
          setSelectedIntervals(parsed[event.id]);
          return;
        }
      }
    } catch {}

    if (event.user_reminder_intervals && event.user_reminder_intervals.length > 0) {
      setSelectedIntervals(event.user_reminder_intervals);
    }
  }, [event]);

  const requestPermissionIfNeeded = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        setHasNotifPermission(permission === 'granted');
        if (permission === 'granted') {
          toast.success('Notification permissions enabled');
        }
      } catch {}
    }
  };

  const toggleInterval = (interval: string) => {
    setSelectedIntervals(prev => 
      prev.includes(interval) 
        ? prev.filter(i => i !== interval) 
        : [...prev, interval]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    await requestPermissionIfNeeded();

    try {
      // Save locally
      const stored = localStorage.getItem('dejavu_event_reminders');
      const allReminders = stored ? JSON.parse(stored) : {};
      
      if (selectedIntervals.length > 0) {
        allReminders[event.id] = selectedIntervals;
      } else {
        delete allReminders[event.id];
      }
      localStorage.setItem('dejavu_event_reminders', JSON.stringify(allReminders));

      // Sync with server API
      let userToken = null;
      try { userToken = localStorage.getItem('user_token') || localStorage.getItem('admin_token'); } catch {}
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userToken) headers['Authorization'] = `Bearer ${userToken}`;

      let currentUsername = 'listener';
      try {
        const savedUser = localStorage.getItem('chat_username') || localStorage.getItem('auth_user');
        if (savedUser) currentUsername = savedUser;
      } catch {}

      await fetch(`/api/public/events/${event.id}/remind`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          intervals: selectedIntervals,
          username: currentUsername
        })
      });

      // Refetch queries
      queryClient.invalidateQueries({ queryKey: ['special-events'] });
      queryClient.invalidateQueries({ queryKey: ['special-event', event.slug] });
      queryClient.invalidateQueries({ queryKey: ['special-event', event.id] });

      if (selectedIntervals.length > 0) {
        toast.success(`Reminder set for ${event.title}`, {
          description: `You'll be notified ${selectedIntervals.map(i => i === '24h' ? '24 hours before' : i === '1h' ? '1 hour before' : '15 minutes before').join(', ')}`,
          icon: '🔔'
        });
      } else {
        toast.info(`Reminders turned off for this event`);
      }

      onClose();
    } catch (err: any) {
      toast.error('Failed to save reminder preferences');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`fixed inset-0 backdrop-blur-md ${
            isLightMode ? 'bg-slate-900/40' : 'bg-black/80'
          }`}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className={`relative w-full max-w-md border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden ${
            isLightMode
              ? 'bg-[#ffffff] border-slate-200 text-slate-900 shadow-xl'
              : 'bg-[#0e0e12] border-white/10 text-[#ffffff] shadow-[0_25px_60px_rgba(0,0,0,0.8)]'
          }`}
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-neon-purple/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-neon-blue/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
            isLightMode ? 'border-slate-200' : 'border-white/10'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-neon-purple shadow-[0_0_15px_rgba(176,38,255,0.2)]">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className={`text-base font-black uppercase tracking-wider font-display ${
                  isLightMode ? 'text-slate-900' : 'text-[#ffffff]'
                }`}>
                  Event Reminder
                </h3>
                <p className={`text-[11px] font-mono ${
                  isLightMode ? 'text-slate-500' : 'text-[#ffffff]/50'
                }`}>
                  Never miss a special broadcast
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                  : 'bg-[#ffffff]/5 hover:bg-[#ffffff]/10 text-[#ffffff]/60 hover:text-[#ffffff]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Event Title Preview */}
          <div className={`p-3.5 rounded-2xl border mb-6 flex items-center gap-3 ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#ffffff]/[0.03] border-white/5'
          }`}>
            {event.cover_image && (
              <img
                src={event.cover_image}
                alt={event.title}
                className={`w-12 h-12 rounded-xl object-cover shrink-0 border ${
                  isLightMode ? 'border-slate-200' : 'border-white/10'
                }`}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-black uppercase tracking-tight truncate ${
                isLightMode ? 'text-slate-900' : 'text-[#ffffff]'
              }`}>
                {event.title}
              </div>
              <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mt-0.5 ${
                isLightMode ? 'text-neon-blue' : 'text-neon-purple'
              }`}>
                {event.xp_multiplier}× XP Active • {event.genres?.[0] || 'Special Event'}
              </div>
            </div>
          </div>

          {/* Notification Permission Callout if needed */}
          {!hasNotifPermission && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 mb-5 ${
              isLightMode ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue'
            }`}>
              <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isLightMode ? 'text-blue-600' : 'text-neon-blue'}`} />
              <div>
                <p className="font-bold">Browser notifications</p>
                <p className={`text-[10px] mt-0.5 ${isLightMode ? 'text-blue-900/80' : 'text-[#ffffff]/70'}`}>
                  We'll ask for notification permission when you save so you can receive desktop alerts even when browsing other tabs.
                </p>
              </div>
            </div>
          )}

          {/* Interval Choices */}
          <div className="space-y-3 mb-8">
            <label className={`text-[10px] font-black uppercase tracking-[0.2em] block ${
              isLightMode ? 'text-slate-500' : 'text-[#ffffff]/40'
            }`}>
              Notify Me Before Start:
            </label>

            {[
              { id: '15m', label: '15 Minutes Before', desc: 'Instant alert right as warm-up starts' },
              { id: '1h', label: '1 Hour Before', desc: 'Get ready for the broadcast' },
              { id: '24h', label: '24 Hours Before (1 Day)', desc: 'Advance reminder for calendar planning' }
            ].map(item => {
              const isSelected = selectedIntervals.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleInterval(item.id)}
                  className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? isLightMode
                        ? 'bg-neon-blue/10 border-neon-blue text-slate-900 font-bold shadow-xs'
                        : 'bg-neon-purple/20 border-neon-purple text-neon-purple font-bold shadow-sm'
                      : isLightMode
                      ? 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      : 'bg-[#ffffff]/5 border-[#ffffff]/5 text-[#ffffff]/60 hover:text-[#ffffff] hover:bg-[#ffffff]/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? isLightMode
                          ? 'bg-neon-blue border-neon-blue text-[#ffffff]'
                          : 'bg-neon-purple border-neon-purple text-[#ffffff]'
                        : isLightMode
                        ? 'border-slate-300 bg-[#ffffff]'
                        : 'border-[#ffffff]/20 bg-transparent'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-wider ${
                        isSelected
                          ? isLightMode ? 'text-slate-900' : 'text-neon-purple'
                          : isLightMode ? 'text-slate-900' : 'text-[#ffffff]'
                      }`}>{item.label}</div>
                      <div className={`text-[10px] mt-0.5 ${
                        isLightMode ? 'text-slate-500' : 'text-[#ffffff]/40'
                      }`}>{item.desc}</div>
                    </div>
                  </div>
                  <Clock className={`w-4 h-4 ${
                    isSelected
                      ? isLightMode ? 'text-neon-blue' : 'text-neon-purple'
                      : isLightMode ? 'text-slate-400' : 'text-[#ffffff]/20'
                  }`} />
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900'
                  : 'bg-[#ffffff]/5 hover:bg-[#ffffff]/10 text-[#ffffff]/60 hover:text-[#ffffff]'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl text-[#ffffff] text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md bg-neon-purple hover:bg-neon-purple/90"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#ffffff]/30 border-t-[#ffffff] rounded-full animate-spin" />
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>{selectedIntervals.length > 0 ? 'Set Reminder' : 'Remove Reminder'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
