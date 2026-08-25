import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Calendar, Radio, Clock, Search, Filter, Flame, 
  ArrowRight, Users, Play, Bell, Layers 
} from 'lucide-react';
import { safeFetchJson } from '../utils/safeFetch';
import { SpecialEvent } from '../types/events';
import { EventCard } from '../components/events/EventCard';
import { useLogo } from '../hooks/useLogo';
import { Link } from 'react-router-dom';
import { useEventCountdown } from '../hooks/useEventCountdown';
import { EventReminderModal } from '../components/events/EventReminderModal';
import { useAudio } from '../context/AudioContext';

export function Events() {
  const { isLightMode, settings } = useLogo();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'past' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedEventForReminder, setSelectedEventForReminder] = useState<SpecialEvent | null>(null);

  const { togglePlay, playRadio, setStreamUrl, setCurrentTrack, isPlaying, activeType } = useAudio();

  const { data: events = [], isLoading } = useQuery<SpecialEvent[]>({
    queryKey: ['special-events'],
    queryFn: () => safeFetchJson<SpecialEvent[]>('/api/public/events?type=all'),
    refetchInterval: 15000
  });

  const { data: featuredData } = useQuery<{ event: SpecialEvent | null }>({
    queryKey: ['special-events-featured'],
    queryFn: () => safeFetchJson<{ event: SpecialEvent | null }>('/api/public/events/featured'),
    refetchInterval: 15000
  });

  const featuredEvent = featuredData?.event || (events.find(e => e.status === 'live' || e.is_featured) || events[0]);

  // Extract all unique genres across events
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      e.genres?.forEach(g => set.add(g));
    });
    return Array.from(set);
  }, [events]);

  // Filter events based on active tab, search, and genre
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Tab filter
      if (activeTab === 'live' && event.status !== 'live') return false;
      if (activeTab === 'upcoming' && (event.status === 'completed' || event.status === 'cancelled' || (event.status !== 'scheduled' && event.status !== 'live'))) return false;
      if (activeTab === 'past' && event.status !== 'completed') return false;

      // Genre filter
      if (selectedGenre !== 'all' && !event.genres?.includes(selectedGenre)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = event.title.toLowerCase().includes(q);
        const descMatch = (event.description || '').toLowerCase().includes(q) || (event.short_description || '').toLowerCase().includes(q);
        const djMatch = event.participating_djs?.some(d => d.name.toLowerCase().includes(q)) || false;
        const genreMatch = event.genres?.some(g => g.toLowerCase().includes(q)) || false;
        if (!titleMatch && !descMatch && !djMatch && !genreMatch) {
          return false;
        }
      }

      return true;
    });
  }, [events, activeTab, selectedGenre, searchQuery]);

  const liveCount = useMemo(() => events.filter(e => e.status === 'live').length, [events]);
  const upcomingCount = useMemo(() => events.filter(e => e.status === 'scheduled' || e.status === 'live').length, [events]);
  const pastCount = useMemo(() => events.filter(e => e.status === 'completed').length, [events]);

  const featuredCountdown = useEventCountdown(
    featuredEvent?.start_time || new Date().toISOString(),
    featuredEvent?.end_time || new Date().toISOString(),
    featuredEvent?.timezone
  );

  return (
    <div className={`min-h-screen py-8 sm:py-12 space-y-12 transition-colors duration-300 bg-transparent px-4 sm:px-6 lg:px-8 ${
      isLightMode ? 'text-black' : 'text-white'
    }`}>
      {/* Header Title Section */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8 ${
        isLightMode ? 'border-black/10' : 'border-white/10'
      }`}>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Special Broadcasts & Takeovers
          </div>
          <h1 className={`text-3xl sm:text-5xl font-black uppercase tracking-tight font-display ${
            isLightMode ? 'text-black' : 'text-white'
          }`}>
            Special Events
          </h1>
          <p className={`text-sm sm:text-base max-w-2xl font-sans ${
            isLightMode ? 'text-black/70' : 'text-white/60'
          }`}>
            Experience exclusive multi-DJ takeovers, charity marathons, guest battles, and genre-defining milestones with double XP rewards.
          </p>
        </div>

        {/* Quick Nav Badges */}
        <div className="flex items-center gap-3">
          <Link
            to="/schedule"
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 transition-all ${
              isLightMode
                ? 'bg-[#ffffff] border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm'
                : 'bg-white/5 border-white/10 text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4 text-neon-blue" />
            <span>Weekly Schedule</span>
          </Link>
          <Link
            to="/djs"
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 transition-all ${
              isLightMode
                ? 'bg-[#ffffff] border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm'
                : 'bg-white/5 border-white/10 text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4 text-neon-purple" />
            <span>Resident DJs</span>
          </Link>
        </div>
      </div>

      {/* Featured Highlight Hero Banner */}
      {featuredEvent && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`relative rounded-[2.5rem] border overflow-hidden p-6 sm:p-10 lg:p-12 shadow-2xl transition-all ${
            isLightMode
              ? 'bg-[#ffffff] border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-slate-900'
              : 'bg-[#111116] border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-white'
          }`}
        >
          {/* Ambient Background Aura */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-purple/15 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-neon-blue/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Col: Event Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                {featuredEvent.status === 'live' || featuredCountdown.isLive ? (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600 text-[#ffffff] text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffffff] animate-ping" />
                    Now Broadcasting Live
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${
                    isLightMode
                      ? 'bg-neon-blue/5 border-neon-blue/25 text-neon-blue'
                      : 'bg-white/10 border-white/15 text-neon-blue'
                  }`}>
                    <Flame className={`w-4 h-4 ${isLightMode ? 'text-neon-blue' : 'text-neon-purple'}`} />
                    Featured Special Event
                  </span>
                )}

                {featuredEvent.xp_multiplier > 1 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-purple text-[#ffffff] text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(176,38,255,0.3)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    {featuredEvent.xp_multiplier}× XP Multiplier
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <h2 className={`text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight font-display leading-[1.1] ${
                  isLightMode ? 'text-black' : 'text-white'
                }`}>
                  {featuredEvent.title}
                </h2>
                <p className={`text-sm sm:text-base leading-relaxed max-w-xl font-sans ${
                  isLightMode ? 'text-black/70' : 'text-white/70'
                }`}>
                  {featuredEvent.short_description || featuredEvent.description?.substring(0, 160) || 'Tune in for an unforgettable underground radio event.'}
                </p>
              </div>

              {/* Sessions / DJ Lineup Snapshot */}
              {featuredEvent.participating_djs && featuredEvent.participating_djs.length > 0 && (
                <div className="space-y-2">
                  <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${
                    isLightMode ? 'text-black/50' : 'text-white/40'
                  }`}>
                    Featuring Resident Artists:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {featuredEvent.participating_djs.map((dj, i) => (
                      <div
                        key={i}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                          isLightMode
                            ? 'bg-black/5 border-black/10 text-black'
                            : 'bg-white/5 border-white/10 text-white'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-neon-purple/30 overflow-hidden shrink-0">
                          {dj.image_url ? (
                            <img src={dj.image_url} alt={dj.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px]">★</div>
                          )}
                        </div>
                        <span>{dj.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions & Countdown */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                {featuredEvent.status === 'live' || featuredCountdown.isLive ? (
                  <button
                    onClick={() => {
                      if (isPlaying && activeType === 'radio') {
                        togglePlay();
                      } else {
                        if (featuredEvent.stream_override_url) {
                          setStreamUrl(featuredEvent.stream_override_url);
                        }
                        setCurrentTrack(`${featuredEvent.title} (Special Event)`);
                        playRadio();
                      }
                    }}
                    className="px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_30px_rgba(239,68,68,0.5)] flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>Tune In Live Now</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedEventForReminder(featuredEvent)}
                    className="px-6 py-4 rounded-2xl bg-neon-purple hover:bg-neon-purple/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all active:scale-95"
                  >
                    <Bell className="w-4 h-4" />
                    <span>{featuredEvent.user_has_reminder ? 'Reminder Active' : 'Set Event Reminder'}</span>
                  </button>
                )}

                <Link
                  to={`/events/${featuredEvent.slug || featuredEvent.id}`}
                  className={`px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 transition-all ${
                    isLightMode
                      ? 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <span>Event Timetable & Info</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Col: Banner Art & Countdown Widget */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/15 shadow-2xl group">
                <img
                  src={featuredEvent.cover_image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80'}
                  alt={featuredEvent.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Countdown overlay banner */}
                <div className={`absolute bottom-4 left-4 right-4 p-4 rounded-2xl backdrop-blur-xl border ${
                  isLightMode
                    ? 'bg-[#ffffff]/95 border-slate-200 text-slate-900 shadow-lg'
                    : 'bg-black/60 border-white/10 text-[#ffffff]'
                }`}>
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center justify-between ${
                    isLightMode ? 'text-slate-500' : 'text-white/50'
                  }`}>
                    <span>{featuredCountdown.isLive ? 'Broadcast Status' : 'Event Countdown'}</span>
                    <span className="text-neon-blue">{featuredEvent.timezone}</span>
                  </div>
                  <div className={`text-xl sm:text-2xl font-black font-mono tracking-wider uppercase ${
                    isLightMode ? 'text-slate-900' : 'text-[#ffffff]'
                  }`}>
                    {featuredCountdown.formatted}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Control / Filter Bar */}
      <div className="space-y-6">
        {/* Tab switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className={`p-1.5 rounded-2xl border flex items-center gap-1 w-full sm:w-auto overflow-x-auto max-w-full ${
            isLightMode ? 'bg-black/[0.03] border-black/10' : 'bg-white/[0.03] border-white/10'
          }`}>
            {[
              { id: 'upcoming', label: 'Upcoming', count: upcomingCount, icon: Calendar },
              { id: 'live', label: 'Live Now', count: liveCount, icon: Radio },
              { id: 'past', label: 'Past Archive', count: pastCount, icon: Layers },
              { id: 'all', label: 'All Events', count: events.length, icon: Sparkles }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-neon-purple text-white shadow-[0_0_20px_rgba(176,38,255,0.3)]'
                      : isLightMode
                      ? 'text-black/60 hover:text-black hover:bg-black/5'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-neon-purple'}`} />
                  {/* Responsive Labels */}
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="hidden xs:inline md:hidden">
                    {tab.id === 'upcoming' ? 'Upcoming' : tab.id === 'live' ? 'Live' : tab.id === 'past' ? 'Past' : 'All'}
                  </span>
                  <span className={`text-[10px] font-bold ${isActive ? 'text-white/90' : 'text-neon-purple'}`}>
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input & Genre Dropdown */}
          <div className="flex items-center gap-3">
            <div className={`relative flex-1 sm:w-64 rounded-2xl border px-3.5 py-2.5 flex items-center gap-2 ${
              isLightMode ? 'bg-[#ffffff] border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10'
            }`}>
              <Search className={`w-4 h-4 shrink-0 ${isLightMode ? 'text-slate-400' : 'text-white/40'}`} />
              <input
                type="text"
                placeholder="Search event, DJ, genre..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent text-xs outline-none ${
                  isLightMode ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-white/30'
                }`}
              />
            </div>

            {allGenres.length > 0 && (
              <select
                value={selectedGenre}
                onChange={e => setSelectedGenre(e.target.value)}
                aria-label="Filter events by genre"
                className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-wider outline-none cursor-pointer ${
                  isLightMode
                    ? 'bg-[#ffffff] border-slate-200 text-slate-800'
                    : 'bg-[#101015] border-white/10 text-white'
                }`}
              >
                <option value="all">All Genres</option>
                {allGenres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`aspect-[4/5] rounded-3xl animate-pulse border ${
                isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/5'
              }`} />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className={`py-20 text-center rounded-3xl border border-dashed space-y-4 ${
            isLightMode
              ? 'bg-[#ffffff] border-slate-200 text-slate-800 shadow-sm'
              : 'border-white/10 text-white'
          }`}>
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
              isLightMode ? 'bg-slate-100 border border-slate-200 text-slate-400' : 'bg-white/5 border border-white/10 text-white/40'
            }`}>
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className={`text-lg font-black uppercase tracking-wider font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                No Special Events Found
              </h3>
              <p className={`text-xs max-w-md mx-auto ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>
                No events currently match your selected filters. Check back soon for upcoming takeovers and resident milestones!
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedGenre('all');
                setSearchQuery('');
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                isLightMode
                  ? 'bg-neon-blue/15 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/25'
                  : 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple hover:bg-neon-purple/30'
              }`}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                isLightMode={isLightMode}
              />
            ))}
          </div>
        )}
      </div>

      {selectedEventForReminder && (
        <EventReminderModal
          event={selectedEventForReminder}
          isOpen={!!selectedEventForReminder}
          onClose={() => setSelectedEventForReminder(null)}
        />
      )}
    </div>
  );
}
