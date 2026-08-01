import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Bell, BellOff, Calendar as CalendarIcon, Search, Layers } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { convertToLocalTime, getLondonTime } from "../lib/timeUtils";
import { useLogo } from "../hooks/useLogo";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
  hover: { y: -5, scale: 1.02 }
};

export default function Schedule() {
  const [reminders, setReminders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<number | 'all'>(() => {
    return getLondonTime().getDay();
  });
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetch("/api/public/schedule").then(res => res.json())
  });

  const { logoUrl, isLightMode, settings, resolveDjImage, getPageTitle } = useLogo();

  const rawTitle = getPageTitle('schedule', 'Weekly Schedule');
  const words = rawTitle.split(' ');
  const firstPart = words.slice(0, -1).join(' ') || '';
  const lastWord = words.length > 1 ? words[words.length - 1] : words[0];

  useEffect(() => {
    const saved = localStorage.getItem('dejavu_reminders');
    if (saved) setReminders(JSON.parse(saved));
  }, []);

  const toggleReminder = async (showId: string, showName: string) => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support desktop notifications");
      return;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (err) {
        console.error("Failed to request notification permission:", err);
      }
    }

    if (permission !== 'granted') {
      const isIframe = window.self !== window.top;
      if (isIframe) {
        toast.error("Notification permission is blocked in previews. Please open the app in a new tab to enable desktop alerts.");
      } else {
        toast.warning("Notification permission denied. We'll still save your reminder, but you won't receive a desktop alert.");
      }
    }

    setReminders(prev => {
      const isSet = prev.includes(showId);
      let newReminders;
      if (isSet) {
        newReminders = prev.filter(id => id !== showId);
        toast.info(`Reminder removed for ${showName}`);
      } else {
        newReminders = [...prev, showId];
        if (permission === 'granted') {
          toast.success(`We will notify you 10 mins before ${showName} starts!`);
        } else {
          toast.success(`Show added to reminders (Desktop alerts disabled)`);
        }
      }
      localStorage.setItem('dejavu_reminders', JSON.stringify(newReminders));
      return newReminders;
    });
  };

  const localSchedule = useMemo(() => {
    if (!Array.isArray(scheduleData)) return [];
    return scheduleData.map(show => {
      const start = convertToLocalTime(show.day_of_week, show.start_time);
      const end = convertToLocalTime(show.day_of_week, show.end_time);
      return {
        ...show,
        local_day: start.dayOfWeek,
        local_start: start.timeStr,
        local_end: end.timeStr
      };
    });
  }, [scheduleData]);

  const [timeCtx, setTimeCtx] = useState(() => {
    const now = getLondonTime();
    return {
      day: now.getDay(),
      time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getLondonTime();
      setTimeCtx({
        day: now.getDay(),
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentDay = timeCtx.day;
  const currentTime = timeCtx.time;

  // Compute show counts dynamically for each day of the week
  const dayCounts = useMemo(() => {
    const counts = Array(7).fill(0);
    localSchedule.forEach(show => {
      if (show.local_day >= 0 && show.local_day < 7) {
        counts[show.local_day]++;
      }
    });
    return counts;
  }, [localSchedule]);

  // Total shows across the whole week
  const totalShows = localSchedule.length;

  // Filter shows by active day tab and/or search query
  const filteredSchedule = useMemo(() => {
    let list = localSchedule;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(show => 
        show.dj_name.toLowerCase().includes(q) || 
        show.show_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [localSchedule, searchQuery]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-10 pb-20 mt-8"
    >
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-6 px-4">
        <div className="text-center lg:text-left">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-4xl sm:text-6xl md:text-8xl font-black font-display uppercase tracking-tighter leading-none relative z-10 drop-shadow-2xl ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}
          >
            {firstPart && firstPart + " "}<span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">{lastWord}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`mt-6 text-base md:text-lg font-light tracking-wide border-l-2 pl-6 transition-colors text-left max-w-xl mx-auto lg:mx-0 ${
              isLightMode ? 'border-neon-purple/50 text-slate-500' : 'border-neon-purple/30 text-white/50'
            }`}
          >
            Browse scheduled live broadcasts easily. Find your favorite DJs and never miss a beat.
          </motion.p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 self-center lg:self-end w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search DJ or show..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/Desktop Navigation Switch */}
      <div className={`border-b ${isLightMode ? "border-slate-200" : "border-white/5"} pb-6 mt-[60px] mr-0`}>
        {/* Mobile Dropdown Navigation */}
        <div className="block sm:hidden relative w-full">
          <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? "text-slate-500" : "text-white/40"} mb-2.5 block`}>
            Select Schedule View
          </label>
          <div className="relative">
            <select
              id="mobile-schedule-select"
              value={activeTab === 'all' ? 'all' : activeTab}
              onChange={(e) => {
                const val = e.target.value;
                setActiveTab(val === 'all' ? 'all' : parseInt(val, 10));
              }}
              className={`w-full px-4 py-4 pr-12 text-xs font-black uppercase tracking-[0.1em] rounded-2xl border appearance-none transition-all cursor-pointer outline-none ${
                isLightMode 
                  ? "bg-slate-100 border-slate-200 text-slate-900 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple"
                  : "bg-white/5 border-white/10 text-white focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20"
              }`}
            >
              <option value="all" className={isLightMode ? "text-slate-900 bg-white" : "text-white bg-dark-bg"}>
                Full Week ({totalShows} shows)
              </option>
              {DAYS.map((dayName, index) => {
                const isToday = currentDay === index;
                const showCount = dayCounts[index];
                return (
                  <option 
                    key={dayName} 
                    value={index}
                    className={isLightMode ? "text-slate-900 bg-white" : "text-white bg-[#121214]"}
                  >
                    {dayName} {isToday ? "• Today " : ""}({showCount} {showCount === 1 ? 'show' : 'shows'})
                  </option>
                );
              })}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
              {activeTab !== 'all' && currentDay === activeTab && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-purple opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-purple"></span>
                </span>
              )}
              <svg
                className={`w-4 h-4 ${isLightMode ? "text-slate-600" : "text-white/45"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Desktop Tabs Navigation */}
        <div className="hidden sm:block">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full">
              <div className={`flex items-center ${
                isLightMode ? "bg-slate-100/80 border-slate-200" : "bg-[#0d0d0f]/60 border-white/5"
              } border p-1 rounded-full overflow-x-auto scrollbar-none max-w-full gap-1`}>
                {/* 'All' Tab */}
                <button
                  id="tab-all"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-2 sm:px-5 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all relative shrink-0 z-10 ${
                    activeTab === 'all'
                      ? (isLightMode ? "text-slate-900" : "text-white")
                      : (isLightMode ? "text-slate-500 hover:text-slate-900" : "text-white/40 hover:text-white/80")
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Full Week</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono ${
                    activeTab === 'all'
                      ? (isLightMode ? "bg-slate-900/10 text-slate-900" : "bg-white/10 text-white")
                      : (isLightMode ? "bg-slate-200/50 text-slate-500" : "bg-white/5 text-white/50")
                  }`}>
                    {totalShows}
                  </span>
                  {activeTab === 'all' && (
                    <motion.div
                      layoutId="activeTabPill"
                      className={`absolute inset-0 rounded-full ${
                        isLightMode
                          ? "bg-gradient-to-r from-neon-purple/15 to-neon-blue/15 border border-neon-purple/20 shadow-sm shadow-neon-purple/5"
                          : "bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 border border-neon-purple/30 shadow-lg shadow-neon-purple/5"
                      } -z-10`}
                      transition={{ type: "spring", stiffness: 350, damping: 26 }}
                    />
                  )}
                </button>

                {/* Separator */}
                <div className={`h-5 w-[1px] ${isLightMode ? "bg-slate-200" : "bg-white/10"} shrink-0 mx-1 self-center`} />

                {/* Daily Tabs */}
                {DAYS.map((dayName, index) => {
                  const isToday = currentDay === index;
                  const showCount = dayCounts[index];
                  const isActive = activeTab === index;

                  return (
                    <button
                      id={`tab-day-${index}`}
                      key={dayName}
                      onClick={() => setActiveTab(index)}
                      className={`px-3 py-2 sm:px-5 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all relative shrink-0 z-10 ${
                        isActive
                          ? (isLightMode ? "text-slate-900" : "text-white")
                          : (isLightMode ? "text-slate-500 hover:text-slate-900" : "text-white/40 hover:text-white/80")
                      }`}
                    >
                      {isToday && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-purple opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neon-purple"></span>
                        </span>
                      )}
                      {/* Desktop name & mobile name */}
                      <span className="hidden sm:inline">{dayName}</span>
                      <span className="inline sm:hidden">{SHORT_DAYS[index]}</span>
                      
                      {showCount > 0 && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono ${
                          isActive
                            ? (isLightMode ? "bg-slate-900/10 text-slate-900" : "bg-white/15 text-white")
                            : (isLightMode ? "bg-slate-200/50 text-slate-500" : "bg-white/5 text-white/50")
                        }`}>
                          {showCount}
                        </span>
                      )}

                      {isActive && (
                        <motion.div
                          layoutId="activeTabPill"
                          className={`absolute inset-0 rounded-full ${
                            isLightMode
                              ? "bg-gradient-to-r from-neon-purple/15 to-neon-blue/15 border border-neon-purple/20 shadow-sm shadow-neon-purple/5"
                              : "bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 border border-neon-purple/30 shadow-lg shadow-neon-purple/5"
                          } -z-10`}
                          transition={{ type: "spring", stiffness: 350, damping: 26 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main schedule layout area */}
      {isLoading ? (
        <div className="flex flex-col gap-10">
          <div className="space-y-6">
            <div className="h-8 w-48 bg-white/10 animate-pulse rounded-md border-b border-white/10 pb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map(j => (
                <div key={j} className="glass-panel rounded-2xl p-5 flex gap-5">
                  <div className="w-24 h-24 rounded-xl bg-white/10 animate-pulse flex-shrink-0"></div>
                  <div className="flex flex-col justify-center flex-1 space-y-3">
                    <div className="h-6 w-3/4 bg-white/10 animate-pulse rounded"></div>
                    <div className="h-4 w-1/2 bg-white/10 animate-pulse rounded"></div>
                    <div className="h-6 w-20 bg-white/10 animate-pulse rounded mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {activeTab === 'all' ? (
            // Full Week View (Stacked Day Sections)
            <div className="flex flex-col gap-14">
              {DAYS.map((dayName, dayIndex) => {
                const dayShows = filteredSchedule
                  .filter(s => s.local_day === dayIndex)
                  .sort((a, b) => a.local_start.localeCompare(b.local_start));
                  
                if (dayShows.length === 0) return null;

                const isToday = currentDay === dayIndex;

                return (
                  <motion.div 
                    key={dayName} 
                    className="space-y-6 relative"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                  >
                    <h2 className="text-2xl font-display font-bold uppercase tracking-wide border-b border-white/5 pb-4 flex items-center justify-between">
                      <span className="flex items-center gap-3">
                        {dayName} 
                        {isToday && (
                          <span className="px-2.5 py-0.5 bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-[10px] font-black tracking-widest rounded-full animate-pulse glow-box">
                            TODAY
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-mono text-white/30 font-light">
                        {dayShows.length} show{dayShows.length === 1 ? '' : 's'}
                      </span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {dayShows.map(show => {
                        const isCrossMidnight = show.local_start > show.local_end;
                        const isTimeMatch = isCrossMidnight 
                          ? (currentTime >= show.local_start || currentTime < show.local_end)
                          : (show.local_start <= currentTime && show.local_end > currentTime);
                        
                        const isLive = isToday && isTimeMatch;

                        return (
                          <motion.div 
                            key={show.id}
                            variants={itemVariants}
                            whileHover="hover"
                            className={`glass-panel rounded-2xl p-5 flex gap-5 transition-all duration-300 group relative overflow-hidden ${isLive ? 'border-neon-purple glow-box bg-white/5' : 'hover:bg-white/5'}`}
                          >
                            <motion.div
                              className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-0"
                              variants={{ hover: { x: ['-150%', '150%'] } }}
                              transition={{ duration: 0.75, ease: "easeInOut" }}
                              initial={{ x: '-150%' }}
                            />
                            <div className="relative shrink-0 w-24 h-24 z-10">
                              <div className={`w-full h-full rounded-xl overflow-hidden border border-white/5 ${
                                resolveDjImage(show.image_url || show.dj_photo) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-black shadow-inner' : 'bg-transparent') : ''
                              }`}>
                                <img src={resolveDjImage(show.image_url || show.dj_photo)} alt={show.dj_name} className={`w-full h-full filter grayscale group-hover:grayscale-0 transition-all duration-500 ${resolveDjImage(show.image_url || show.dj_photo) === logoUrl && logoUrl ? 'object-contain p-2' : 'object-cover'}`} />
                              </div>
                              {isLive && (
                                <div className="absolute inset-0 border-2 border-neon-purple rounded-xl scale-105 animate-pulse pointer-events-none"></div>
                              )}
                            </div>
                            <div className="flex flex-col justify-center flex-1 z-10">
                              {isLive && (
                                <span className="text-[10px] uppercase tracking-widest text-neon-purple font-bold mb-1 flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-neon-purple mr-1.5 animate-ping"></span>
                                  Live Now
                                </span>
                              )}
                              <h4 className="font-display font-bold text-xl leading-tight mb-1 group-hover:text-neon-blue transition-colors">{show.dj_name}</h4>
                              <p className="text-white/50 text-sm font-light leading-snug">{show.show_name}</p>
                              
                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-white bg-white/10 text-xs font-mono px-2 py-1 rounded">
                                  {show.local_start} - {show.local_end}
                                </span>
                                <button
                                  onClick={() => toggleReminder(show.id, show.dj_name)}
                                  className={`p-2 rounded-full transition-all duration-300 ${
                                    reminders.includes(show.id) 
                                    ? 'bg-neon-purple text-white glow-box' 
                                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                  }`}
                                  title={reminders.includes(show.id) ? "Remove reminder" : "Remind me"}
                                >
                                  {reminders.includes(show.id) ? (
                                    <Bell className="w-4 h-4 fill-current" />
                                  ) : (
                                    <BellOff className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
              
              {/* If search queries produce absolutely no results */}
              {filteredSchedule.length === 0 && (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 p-8 max-w-xl mx-auto space-y-4">
                  <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/30">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white/90">No shows found</h3>
                  <p className="text-sm text-white/45 max-w-md mx-auto">
                    We couldn't find any shows or DJs matching "{searchQuery}". Try typing something else or check another day.
                  </p>
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="px-5 py-2.5 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-xl text-sm font-medium tracking-wide transition-all glow-box"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Single Day Tab Focus View
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {(() => {
                  const dayShows = filteredSchedule
                    .filter(s => s.local_day === activeTab)
                    .sort((a, b) => a.local_start.localeCompare(b.local_start));

                  const isToday = currentDay === activeTab;

                  if (dayShows.length === 0) {
                    return (
                      <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 p-8 max-w-xl mx-auto space-y-4">
                        <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/30">
                          <CalendarIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white/90">
                          No shows {searchQuery ? 'matched' : 'scheduled'} for {DAYS[activeTab]}
                        </h3>
                        <p className="text-sm text-white/45 max-w-md mx-auto">
                          {searchQuery 
                            ? `We couldn't find any matches for "${searchQuery}" on this day.` 
                            : `There are currently no shows scheduled on ${DAYS[activeTab]}.`}
                        </p>
                        <div className="flex justify-center gap-3 pt-2">
                          {searchQuery && (
                            <button 
                              onClick={() => setSearchQuery("")}
                              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-all"
                            >
                              Clear Search
                            </button>
                          )}
                          <button 
                            onClick={() => setActiveTab('all')}
                            className="px-5 py-2.5 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-xl text-sm font-medium tracking-wide transition-all glow-box"
                          >
                            View Full Week
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-display font-bold uppercase tracking-wide border-b border-white/5 pb-4 flex items-center justify-between">
                        <span className="flex items-center gap-3">
                          {DAYS[activeTab]} 
                          {isToday && (
                            <span className="px-2.5 py-0.5 bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-[10px] font-black tracking-widest rounded-full animate-pulse glow-box">
                              TODAY
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-mono text-white/30 font-light">
                          {dayShows.length} show{dayShows.length === 1 ? '' : 's'}
                        </span>
                      </h2>

                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                      >
                        {dayShows.map(show => {
                          const isCrossMidnight = show.local_start > show.local_end;
                          const isTimeMatch = isCrossMidnight 
                            ? (currentTime >= show.local_start || currentTime < show.local_end)
                            : (show.local_start <= currentTime && show.local_end > currentTime);
                          
                          const isLive = isToday && isTimeMatch;

                          return (
                            <motion.div 
                              key={show.id}
                              variants={itemVariants}
                              whileHover="hover"
                              className={`glass-panel rounded-2xl p-5 flex gap-5 transition-all duration-300 group relative overflow-hidden ${isLive ? 'border-neon-purple glow-box bg-white/5' : 'hover:bg-white/5'}`}
                            >
                              <motion.div
                                className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-0"
                                variants={{ hover: { x: ['-150%', '150%'] } }}
                                transition={{ duration: 0.75, ease: "easeInOut" }}
                                initial={{ x: '-150%' }}
                              />
                              <div className="relative shrink-0 w-24 h-24 z-10">
                                <div className={`w-full h-full rounded-xl overflow-hidden border border-white/5 ${
                                  resolveDjImage(show.image_url || show.dj_photo) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-black shadow-inner' : 'bg-transparent') : ''
                                }`}>
                                  <img src={resolveDjImage(show.image_url || show.dj_photo)} alt={show.dj_name} className={`w-full h-full filter grayscale group-hover:grayscale-0 transition-all duration-500 ${resolveDjImage(show.image_url || show.dj_photo) === logoUrl && logoUrl ? 'object-contain p-2' : 'object-cover'}`} />
                                </div>
                                {isLive && (
                                  <div className="absolute inset-0 border-2 border-neon-purple rounded-xl scale-105 animate-pulse pointer-events-none"></div>
                                )}
                              </div>
                              <div className="flex flex-col justify-center flex-1 z-10">
                                {isLive && (
                                  <span className="text-[10px] uppercase tracking-widest text-neon-purple font-bold mb-1 flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neon-purple mr-1.5 animate-ping"></span>
                                    Live Now
                                  </span>
                                )}
                                <h4 className="font-display font-bold text-xl leading-tight mb-1 group-hover:text-neon-blue transition-colors">{show.dj_name}</h4>
                                <p className="text-white/50 text-sm font-light leading-snug">{show.show_name}</p>
                                
                                <div className="mt-3 flex items-center justify-between">
                                  <span className="text-white bg-white/10 text-xs font-mono px-2 py-1 rounded">
                                    {show.local_start} - {show.local_end}
                                  </span>
                                  <button
                                    onClick={() => toggleReminder(show.id, show.dj_name)}
                                    className={`p-2 rounded-full transition-all duration-300 ${
                                      reminders.includes(show.id) 
                                      ? 'bg-neon-purple text-white glow-box' 
                                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                    }`}
                                    title={reminders.includes(show.id) ? "Remove reminder" : "Remind me"}
                                  >
                                    {reminders.includes(show.id) ? (
                                      <Bell className="w-4 h-4 fill-current" />
                                    ) : (
                                      <BellOff className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </motion.div>
  );
}
