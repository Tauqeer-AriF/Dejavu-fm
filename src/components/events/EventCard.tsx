import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Clock, Bell, Play, Sparkles, Flame, Users, ArrowRight, Radio } from 'lucide-react';
import { SpecialEvent } from '../../types/events';
import { useEventCountdown } from '../../hooks/useEventCountdown';
import { EventReminderModal } from './EventReminderModal';
import { useAudio } from '../../context/AudioContext';
import { useLogo } from '../../hooks/useLogo';

interface EventCardProps {
  key?: any;
  event: SpecialEvent;
  isLightMode?: boolean;
}

export function EventCard({ event, isLightMode }: EventCardProps) {
  const { isLightMode: hookLightMode } = useLogo();
  const activeLight = isLightMode ?? hookLightMode;
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const countdown = useEventCountdown(event.start_time, event.end_time, event.timezone);
  const { isPlaying, activeType, togglePlay, playRadio, setStreamUrl, setCurrentTrack } = useAudio();

  const isLive = countdown.isLive || event.status === 'live';
  const isEnded = countdown.isEnded || event.status === 'completed';

  const formatEventDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const handleQuickPlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPlaying && activeType === 'radio') {
      togglePlay();
    } else {
      if (event.stream_override_url) {
        setStreamUrl(event.stream_override_url);
      }
      setCurrentTrack(`${event.title} (Special Event)`);
      playRadio();
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ duration: 0.25 }}
        className={`group relative rounded-3xl border overflow-hidden flex flex-col transition-all duration-300 ${
          activeLight
            ? 'bg-[#ffffff] border-slate-200 shadow-[0_15px_35px_rgba(0,0,0,0.06)] hover:border-slate-300 hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)] text-slate-900'
            : 'bg-[#101015] border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.4)] hover:border-white/20 hover:shadow-[0_20px_45px_rgba(176,38,255,0.15)] text-white'
        }`}
      >
        {/* Top Cover Image / Banner */}
        <Link to={`/events/${event.slug || event.id}`} className="relative aspect-[16/9] w-full overflow-hidden block">
          <img
            src={event.cover_image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80'}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-90 group-hover:brightness-100"
          />

          <div className={`absolute inset-0 bg-gradient-to-t ${
            activeLight
              ? 'from-white/60 via-transparent to-transparent'
              : 'from-[#101015] via-[#101015]/40 to-transparent'
          }`} />

          {/* Floating Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
            {/* Status Badge */}
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 backdrop-blur-md text-[#ffffff] text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#ffffff] animate-ping" />
                Live Broadcast
              </span>
            ) : isEnded ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#ffffff]/50 text-[10px] font-black uppercase tracking-widest border border-white/10">
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#ffffff] text-[10px] font-black uppercase tracking-widest border border-white/10">
                <Clock className="w-3 h-3 text-neon-blue" />
                {countdown.formatted}
              </span>
            )}

            {/* XP Multiplier Pill */}
            {event.xp_multiplier > 1 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neon-purple text-[#ffffff] text-[10px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(176,38,255,0.4)]">
                <Flame className="w-3 h-3 fill-current animate-pulse" />
                {event.xp_multiplier}× XP
              </span>
            )}
          </div>

          {/* If Live, Quick Tune-in overlay button */}
          {isLive && (
            <button
              onClick={handleQuickPlay}
              title="Tune In Live"
              className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-20 group/play"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>
          )}
        </Link>

        {/* Card Content Body */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            {/* Genre Pills */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {event.genres?.slice(0, 3).map((g, idx) => (
                <span
                  key={idx}
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    activeLight
                      ? 'bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-white/5 border-white/10 text-white/60'
                  }`}
                >
                  {g}
                </span>
              ))}
              {event.badge_name && (
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  activeLight
                    ? 'bg-neon-blue/15 border border-neon-blue/30 text-neon-blue'
                    : 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple'
                }`}>
                  <Sparkles className="w-2.5 h-2.5" /> Badge
                </span>
              )}
            </div>

            {/* Event Title */}
            <Link to={`/events/${event.slug || event.id}`} className="block group/title">
              <h3 className={`text-base sm:text-lg font-black uppercase tracking-tight line-clamp-1 group-hover/title:text-neon-purple transition-colors font-display ${
                activeLight ? 'text-slate-900' : 'text-white'
              }`}>
                {event.title}
              </h3>
            </Link>

            {/* Short Description */}
            <p className={`text-xs line-clamp-2 mt-1.5 leading-relaxed font-sans ${
              activeLight ? 'text-slate-600' : 'text-white/50'
            }`}>
              {event.short_description || event.description?.substring(0, 120) || 'Special broadcast on DejavuFM.'}
            </p>

            {/* Date & Time display */}
            <div className={`mt-3.5 pt-3 border-t flex items-center justify-between text-[11px] font-mono ${
              activeLight ? 'border-slate-100 text-slate-500' : 'border-white/5 text-white/40'
            }`}>
              <div className="flex items-center gap-1.5">
                <Calendar className={`w-3.5 h-3.5 ${activeLight ? 'text-neon-blue' : 'text-neon-purple'}`} />
                <span>{formatEventDate(event.start_time)}</span>
              </div>
              <span className={`text-[10px] uppercase font-bold ${activeLight ? 'text-slate-400' : 'text-white/30'}`}>
                {event.timezone?.split('/')[1] || 'UK'} Time
              </span>
            </div>
          </div>

          {/* Participating DJs + Footer Action Bar */}
          <div className="mt-4 pt-3 flex items-center justify-between gap-3">
            {/* DJ Avatars preview */}
            <div className="flex items-center -space-x-2 overflow-hidden">
              {event.participating_djs?.slice(0, 4).map((dj, i) => (
                <div
                  key={i}
                  title={dj.name}
                  className={`w-7 h-7 rounded-full border-2 overflow-hidden shrink-0 ${
                    activeLight ? 'border-white bg-slate-100' : 'border-[#101015] bg-white/10'
                  }`}
                >
                  {dj.image_url ? (
                    <img src={dj.image_url} alt={dj.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white uppercase bg-neon-purple/40">
                      {dj.name?.charAt(0) || 'D'}
                    </div>
                  )}
                </div>
              ))}
              {(event.participating_djs?.length || 0) > 4 && (
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 ${
                  activeLight ? 'border-white bg-slate-100 text-slate-900' : 'border-[#101015] bg-white/10 text-white'
                }`}>
                  +{event.participating_djs!.length - 4}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isEnded && !isLive && (
                <button
                  type="button"
                  onClick={() => setIsReminderOpen(true)}
                  title="Remind Me"
                  className={`p-2 rounded-xl border transition-all ${
                    event.user_has_reminder
                      ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                      : activeLight
                      ? 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>
              )}

              <Link
                to={`/events/${event.slug || event.id}`}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  isLive
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : activeLight
                    ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
              >
                <span>{isLive ? 'Listen' : 'Details'}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      <EventReminderModal
        event={event}
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
      />
    </>
  );
}
