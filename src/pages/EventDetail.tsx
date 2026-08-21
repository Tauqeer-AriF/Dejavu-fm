import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, Bell, Play, Pause, Sparkles, Flame, Share2, 
  Users, ArrowLeft, Radio, Check, Volume2, Shield, Heart, 
  MessageSquare, Award, ExternalLink, Globe 
} from 'lucide-react';
import { safeFetchJson } from '../utils/safeFetch';
import { SpecialEvent, EventSession } from '../types/events';
import { useEventCountdown } from '../hooks/useEventCountdown';
import { EventReminderModal } from '../components/events/EventReminderModal';
import { useAudio } from '../context/AudioContext';
import { useLogo } from '../hooks/useLogo';
import { toast } from 'sonner';

export function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLightMode, settings } = useLogo();
  const { togglePlay, playRadio, isPlaying, activeType, setStreamUrl, setCurrentTrack } = useAudio();

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: event, isLoading, error } = useQuery<SpecialEvent>({
    queryKey: ['special-event', slug],
    queryFn: () => safeFetchJson<SpecialEvent>(`/api/public/events/${slug}`),
    refetchInterval: 10000
  });

  const countdown = useEventCountdown(
    event?.start_time || new Date().toISOString(),
    event?.end_time || new Date().toISOString(),
    event?.timezone
  );

  const isLive = countdown.isLive || event?.status === 'live';
  const isEnded = countdown.isEnded || event?.status === 'completed';

  // Event Heartbeat Listener Tracker:
  // When event is live and user is currently playing audio, ping heartbeat every 30s
  useEffect(() => {
    if (!isLive || !isPlaying || !event) return;

    const interval = setInterval(async () => {
      try {
        let userToken = null;
        try { userToken = localStorage.getItem('user_token') || localStorage.getItem('admin_token'); } catch {}
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (userToken) headers['Authorization'] = `Bearer ${userToken}`;

        let currentUsername = 'listener';
        try {
          const savedUser = localStorage.getItem('chat_username') || localStorage.getItem('auth_user');
          if (savedUser) currentUsername = savedUser;
        } catch {}

        const res = await fetch(`/api/public/events/${event.id}/heartbeat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            username: currentUsername,
            duration_seconds: 30
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.badge_unlocked) {
            toast.success(`Achievement Unlocked!`, {
              description: `You earned the "${data.badge_details?.name || 'Event Attendee'}" badge!`,
              icon: '🏆',
              duration: 8000
            });
            queryClient.invalidateQueries({ queryKey: ['special-event', slug] });
            queryClient.invalidateQueries({ queryKey: ['gamification-profile'] });
          }
        }
      } catch (err) {
        // silent heartbeat error
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLive, isPlaying, event, slug, queryClient]);

  const handleTuneIn = () => {
    if (!event) return;
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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title || 'Special Event on DejavuFM',
          text: `Tune into ${event?.title} live on DejavuFM!`,
          url
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success('Event link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const formatSessionTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatEventFullDate = (startIso: string, endIso: string) => {
    try {
      const s = new Date(startIso);
      const e = new Date(endIso);
      const datePart = s.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const startTime = s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const endTime = e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return `${datePart} • ${startTime} - ${endTime} (${event?.timezone || 'UK Time'})`;
    } catch {
      return `${startIso} - ${endIso}`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-3 border-neon-purple border-t-transparent rounded-full animate-spin" />
        <p className={`text-xs uppercase font-mono tracking-widest ${isLightMode ? 'text-black/60' : 'text-white/50'}`}>Loading Special Event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <Radio className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className={`text-2xl font-black uppercase tracking-wider font-display ${isLightMode ? 'text-black' : 'text-white'}`}>Event Not Found</h2>
          <p className={`text-sm ${isLightMode ? 'text-black/60' : 'text-white/50'}`}>The requested special event could not be found or has been removed.</p>
        </div>
        <Link
          to="/events"
          className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
            isLightMode ? 'bg-black/5 hover:bg-black/10 text-black border border-black/10' : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          Browse All Events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-10 space-y-10">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/events"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all ${
            isLightMode
              ? 'bg-[#ffffff] border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-neon-purple" />
          <span>All Special Events</span>
        </Link>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={`px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
            copiedLink
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600'
              : isLightMode
              ? 'bg-[#ffffff] border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm'
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4 text-neon-blue" />}
          <span>{copiedLink ? 'Link Copied' : 'Share Event'}</span>
        </button>
      </div>

      {/* Hero Visual Banner */}
      <div className={`relative rounded-3xl sm:rounded-[2.5rem] overflow-hidden border shadow-2xl transition-all ${
        isLightMode
          ? 'bg-[#ffffff] border-slate-200 shadow-slate-200/80 text-slate-900'
          : 'bg-[#0c0c10] border-white/10 text-white'
      }`}>
        {/* Cover Image */}
        <div className="relative aspect-[1.1/1] xs:aspect-[1.5/1] sm:aspect-[21/8] w-full overflow-hidden">
          <img
            src={event.cover_image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=80'}
            alt={event.title}
            className={`w-full h-full object-cover scale-105 ${
              isLightMode ? 'brightness-100' : 'brightness-75'
            }`}
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${
            isLightMode
              ? 'from-[#ffffff] via-[#ffffff]/90 to-[#ffffff]/30'
              : 'from-[#0c0c10] via-[#0c0c10]/75 to-[#0c0c10]/30'
          }`} />
          <div className={`absolute inset-0 bg-gradient-to-r ${
            isLightMode
              ? 'from-[#ffffff]/95 via-transparent to-[#ffffff]/95'
              : 'from-[#0c0c10]/80 via-transparent to-[#0c0c10]/80'
          }`} />
        </div>

        {/* Hero Overlay Content */}
        <div className="absolute inset-0 p-4 sm:p-10 lg:p-14 flex flex-col justify-end">
          <div className="space-y-3 sm:space-y-4 max-w-4xl">
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {isLive ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-[#ffffff] text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#ffffff] animate-ping" />
                  Live Broadcast
                </span>
              ) : isEnded ? (
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border ${
                  isLightMode
                    ? 'bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-black/70 backdrop-blur-md text-[#ffffff]/60 border-white/10'
                }`}>
                  Event Completed
                </span>
              ) : (
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border ${
                  isLightMode
                    ? 'bg-[#ffffff]/90 text-neon-blue border-neon-blue/30 shadow-sm font-black'
                    : 'bg-black/70 backdrop-blur-md text-neon-blue border-white/15'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  Upcoming Broadcast
                </span>
              )}

              {event.xp_multiplier > 1 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-purple text-[#ffffff] text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(176,38,255,0.4)]">
                  <Flame className="w-3 h-3 fill-current animate-pulse" />
                  {event.xp_multiplier}× XP Multiplier
                </span>
              )}

              {event.genres?.map((g, i) => (
                <span key={i} className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${
                  isLightMode
                    ? 'bg-slate-100 text-slate-800 border-slate-200'
                    : 'bg-white/10 backdrop-blur-md text-white/80 border-white/10'
                }`}>
                  {g}
                </span>
              ))}
            </div>

            {/* Event Title */}
            <h1 className={`text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight font-display leading-[1.1] ${
              isLightMode ? 'text-slate-900' : 'text-white drop-shadow-lg'
            }`}>
              {event.title}
            </h1>

            {/* Event Time & Schedule Line */}
            <div className={`flex items-start gap-2 text-[11px] sm:text-sm font-mono tracking-wide ${
              isLightMode ? 'text-slate-700 font-bold' : 'text-white/80'
            }`}>
              <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5 ${isLightMode ? 'text-neon-blue' : 'text-neon-purple'}`} />
              <span className="leading-relaxed">{formatEventFullDate(event.start_time, event.end_time)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Live / Countdown Action Control Bar */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 ${
        isLive
          ? isLightMode
            ? 'bg-red-50/90 border-red-200 text-slate-900 shadow-[0_10px_30px_rgba(239,68,68,0.08)]'
            : 'bg-[#180a0f] border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)] text-white'
          : isLightMode
          ? 'bg-[#ffffff] border-slate-200 text-slate-900 shadow-slate-200/60'
          : 'bg-[#121218] border-white/10 text-white'
      }`}>
        <div className="flex items-center gap-5 w-full md:w-auto">
          {/* Pulsing indicator or clock icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
            isLive
              ? 'bg-red-600 text-[#ffffff] shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse'
              : isLightMode
              ? 'bg-neon-blue/15 text-neon-blue border border-neon-blue/30'
              : 'bg-neon-purple/20 text-neon-purple border border-neon-purple/40'
          }`}>
            {isLive ? <Radio className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
          </div>

          <div className="space-y-1">
            <div className={`text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 ${
              isLightMode ? 'text-slate-600' : 'text-white/50'
            }`}>
              <span>{isLive ? 'Current Live Session' : isEnded ? 'Broadcast Archive' : 'Countdown to Airtime'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
              <span className="text-neon-blue">{event.timezone}</span>
            </div>

            <div className={`text-xl sm:text-2xl font-black uppercase font-display tracking-tight ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              {isLive ? (
                event.current_session ? (
                  <span>{event.current_session.dj_name} – {event.current_session.session_title}</span>
                ) : (
                  <span>Live Studio Transmission</span>
                )
              ) : (
                <span>{countdown.formatted}</span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isLive ? (
            <button
              onClick={handleTuneIn}
              className="w-full md:w-auto px-8 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.5)] flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause Stream</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>Tune In Live Now</span>
                </>
              )}
            </button>
          ) : !isEnded ? (
            <button
              onClick={() => setIsReminderModalOpen(true)}
              className="w-full md:w-auto px-8 py-4 rounded-2xl bg-neon-purple hover:bg-neon-purple/90 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md"
            >
              <Bell className="w-5 h-5" />
              <span>{event.user_has_reminder ? 'Edit Reminder' : 'Set Reminder'}</span>
            </button>
          ) : (
            <div className={`px-6 py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider ${
              isLightMode ? 'bg-black/5 border-black/10 text-black/50' : 'bg-white/5 border-white/10 text-white/50'
            }`}>
              Broadcast Concluded
            </div>
          )}
        </div>
      </div>

      {/* Grid: Left Column (Schedule & Sessions) + Right Column (Gamification Rewards & Participating DJs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Multi-Session Schedule & Event Description */}
        <div className="lg:col-span-8 space-y-8">
          {/* Multi-Session Lineup Timeline */}
          {event.sessions && event.sessions.length > 0 && (
            <div className={`p-6 sm:p-8 rounded-3xl border ${
              isLightMode ? 'bg-[#ffffff] border-slate-200 shadow-sm' : 'bg-[#101016] border-white/10'
            }`}>
              <div className={`flex items-center justify-between pb-4 mb-6 border-b ${
                isLightMode ? 'border-black/10' : 'border-white/10'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center text-neon-blue">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black uppercase tracking-wider font-display ${
                      isLightMode ? 'text-black' : 'text-white'
                    }`}>
                      Event Line-up & Timetable
                    </h3>
                    <p className={`text-xs font-mono ${
                      isLightMode ? 'text-black/50' : 'text-white/50'
                    }`}>
                      Continuous multi-DJ broadcast timetable
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
                  isLightMode ? 'text-black/40' : 'text-white/40'
                }`}>
                  {event.sessions.length} Sessions
                </span>
              </div>

              {/* Timeline list */}
              <div className="space-y-4">
                {event.sessions.map((sess, idx) => {
                  const isSessionLive = sess.is_live;
                  return (
                    <div
                      key={sess.id || idx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isSessionLive
                          ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                          : isLightMode
                          ? 'bg-black/[0.03] border-black/10 hover:border-black/20'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Left: Time & DJ Info */}
                      <div className="flex items-center gap-4 min-w-0">
                        {/* DJ Avatar */}
                        <div className={`w-12 h-12 rounded-2xl overflow-hidden shrink-0 border ${
                          isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/10 border-white/10'
                        }`}>
                          {sess.dj_photo ? (
                            <img src={sess.dj_photo} alt={sess.dj_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-black text-white bg-neon-purple/40">
                              {sess.dj_name?.charAt(0) || 'D'}
                            </div>
                          )}
                        </div>

                        {/* Title & DJ */}
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            {isSessionLive && (
                              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                                On Air Now
                              </span>
                            )}
                            <span className="text-xs font-mono font-bold text-neon-blue">
                              {formatSessionTime(sess.start_time)} – {formatSessionTime(sess.end_time)}
                            </span>
                          </div>

                          <div className={`text-sm sm:text-base font-black uppercase tracking-tight truncate ${
                            isLightMode ? 'text-black' : 'text-white'
                          }`}>
                            {sess.session_title}
                          </div>

                          <div className={`text-xs font-sans flex items-center gap-2 ${
                            isLightMode ? 'text-black/60' : 'text-white/60'
                          }`}>
                            {sess.dj_id ? (
                              <Link
                                to={`/djs/${sess.dj_id}`}
                                className="text-neon-purple hover:underline font-bold"
                              >
                                {sess.dj_name}
                              </Link>
                            ) : (
                              <span className={`font-bold ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{sess.dj_name}</span>
                            )}
                            {sess.genre && (
                              <>
                                <span>•</span>
                                <span className={isLightMode ? 'text-black/40' : 'text-white/40'}>{sess.genre}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: DJ Profile link */}
                      {sess.dj_id && (
                        <Link
                          to={`/djs/${sess.dj_id}`}
                          className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors self-end sm:self-center ${
                            isLightMode
                              ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black/80 hover:text-black'
                              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                          }`}
                        >
                          View DJ
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Description & Event Information */}
          <div className={`p-6 sm:p-8 rounded-3xl border ${
            isLightMode ? 'bg-[#ffffff] border-slate-200 shadow-sm' : 'bg-[#101016] border-white/10'
          }`}>
            <div className={`flex items-center gap-3 pb-4 mb-6 border-b ${
              isLightMode ? 'border-black/10' : 'border-white/10'
            }`}>
              <div className="w-9 h-9 rounded-xl bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-neon-purple">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-lg font-black uppercase tracking-wider font-display ${
                  isLightMode ? 'text-black' : 'text-white'
                }`}>
                  About This Event
                </h3>
                <p className={`text-xs font-mono ${
                  isLightMode ? 'text-black/50' : 'text-white/50'
                }`}>
                  Event information, format, and broadcast details
                </p>
              </div>
            </div>

            <div className={`prose max-w-none text-sm leading-relaxed font-sans space-y-4 ${
              isLightMode ? 'prose-neutral text-black/80' : 'prose-invert text-white/80'
            }`}>
              {event.description ? (
                <div className="whitespace-pre-line">{event.description}</div>
              ) : (
                <p>{event.short_description || 'Join us for this special underground radio broadcast on DejavuFM.'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Gamification Rewards & Participating DJs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Gamification & Reward Highlights */}
          <div className={`p-6 rounded-3xl border relative overflow-hidden ${
            isLightMode ? 'bg-[#ffffff] border-slate-200 shadow-sm' : 'bg-[#121219] border-white/10'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/20 rounded-full blur-2xl pointer-events-none" />

            <div className={`flex items-center gap-3 pb-4 mb-5 border-b ${
              isLightMode ? 'border-black/10' : 'border-white/10'
            }`}>
              <div className="w-8 h-8 rounded-xl bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-neon-purple">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className={`text-xs font-black uppercase tracking-widest font-display ${
                  isLightMode ? 'text-black' : 'text-white'
                }`}>
                  Event Perks & XP
                </h4>
                <p className={`text-[10px] font-mono ${
                  isLightMode ? 'text-black/40' : 'text-white/40'
                }`}>
                  Listener gamification rewards
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Double XP Highlight */}
              <div className={`p-4 rounded-2xl border space-y-1.5 ${
                isLightMode ? 'bg-purple-50/80 border-purple-200/80' : 'bg-neon-purple/10 border-neon-purple/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isLightMode ? 'text-purple-950' : 'text-white'
                  }`}>
                    <Flame className="w-3.5 h-3.5 text-neon-purple" />
                    {event.xp_multiplier}× XP Multiplier
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neon-purple text-white font-bold">
                    Active
                  </span>
                </div>
                <p className={`text-[11px] leading-normal ${
                  isLightMode ? 'text-purple-900/80' : 'text-white/70'
                }`}>
                  All listening time and chat reactions during this broadcast earn <strong className="text-neon-purple">{event.xp_multiplier}× regular XP</strong> towards your listener level.
                </p>
              </div>

              {/* Event Badge Card if configured */}
              {event.badge_name && (
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  event.badge_unlocked_for_user
                    ? isLightMode ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30'
                    : isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        event.badge_unlocked_for_user ? 'bg-emerald-500/20 text-emerald-600' : 'bg-neon-blue/20 text-neon-blue'
                      }`}>
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-black uppercase tracking-tight ${
                          isLightMode ? 'text-black' : 'text-white'
                        }`}>
                          {event.badge_name}
                        </div>
                        <div className={`text-[10px] font-mono ${
                          isLightMode ? 'text-black/50' : 'text-white/40'
                        }`}>
                          {event.badge_unlocked_for_user ? 'Badge Earned!' : `Listen ${event.badge_listen_minutes} mins to unlock`}
                        </div>
                      </div>
                    </div>

                    {event.badge_unlocked_for_user && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider">
                        Earned
                      </span>
                    )}
                  </div>

                  <p className={`text-[11px] ${
                    isLightMode ? 'text-black/60' : 'text-white/60'
                  }`}>
                    {event.badge_description || `Tune in live for ${event.badge_listen_minutes} minutes during this event to collect this exclusive badge.`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Participating Resident DJs */}
          {event.participating_djs && event.participating_djs.length > 0 && (
            <div className={`p-6 rounded-3xl border ${
              isLightMode ? 'bg-[#ffffff] border-slate-200 shadow-sm' : 'bg-[#121219] border-white/10'
            }`}>
              <div className={`flex items-center gap-3 pb-4 mb-5 border-b ${
                isLightMode ? 'border-black/10' : 'border-white/10'
              }`}>
                <div className="w-8 h-8 rounded-xl bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center text-neon-blue">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-black uppercase tracking-widest font-display ${
                    isLightMode ? 'text-black' : 'text-white'
                  }`}>
                    Resident Selectors
                  </h4>
                  <p className={`text-[10px] font-mono ${
                    isLightMode ? 'text-black/40' : 'text-white/40'
                  }`}>
                    {event.participating_djs.length} Artists
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {event.participating_djs.map((dj, i) => (
                  <Link
                    key={dj.id || i}
                    to={dj.id.startsWith('guest_') ? '#' : `/djs/${dj.id}`}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all group ${
                      isLightMode
                        ? 'bg-black/[0.03] hover:bg-black/5 border-black/5'
                        : 'bg-white/[0.03] hover:bg-white/10 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 border ${
                        isLightMode ? 'bg-black/10 border-black/10' : 'bg-white/10 border-white/10'
                      }`}>
                        {dj.image_url ? (
                          <img src={dj.image_url} alt={dj.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-black text-white bg-neon-purple/40">
                            {dj.name?.charAt(0) || 'D'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold group-hover:text-neon-purple transition-colors truncate ${
                          isLightMode ? 'text-black' : 'text-white'
                        }`}>
                          {dj.name}
                        </div>
                        <div className={`text-[10px] truncate ${
                          isLightMode ? 'text-black/50' : 'text-white/40'
                        }`}>
                          Resident Selector
                        </div>
                      </div>
                    </div>

                    {!dj.id.startsWith('guest_') && (
                      <ExternalLink className={`w-3.5 h-3.5 transition-colors ${
                        isLightMode ? 'text-black/30 group-hover:text-black' : 'text-white/30 group-hover:text-white'
                      }`} />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reminder Modal */}
      <EventReminderModal
        event={event}
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
      />
    </div>
  );
}
