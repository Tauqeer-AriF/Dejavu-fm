import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Bell, BellOff, Globe } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { convertToLocalTime, getUserTimezone } from "../lib/timeUtils";
import { useLogo } from "../hooks/useLogo";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.5 } },
  hover: { y: -5, scale: 1.02 }
};

export default function Schedule() {
  const [reminders, setReminders] = useState<string[]>([]);
  const userTz = useMemo(() => getUserTimezone(), []);
  
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetch("/api/public/schedule").then(res => res.json())
  });

  const { logoUrl, isLightMode, settings, resolveDjImage } = useLogo();

  useEffect(() => {
    const saved = localStorage.getItem('dejavu_reminders');
    if (saved) setReminders(JSON.parse(saved));
  }, []);

  const toggleReminder = async (showId: string, showName: string) => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support desktop notifications");
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error("Permission denied for notifications");
        return;
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
        toast.success(`We will notify you 10 mins before ${showName} starts!`);
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
    const now = new Date();
    return {
      day: now.getDay(),
      time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTimeCtx({
        day: now.getDay(),
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentDay = timeCtx.day;
  const currentTime = timeCtx.time;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-16 pb-20 mt-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div className="text-center md:text-left">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black font-display uppercase tracking-[-0.02em] glow-text"
          >
            Weekly <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">Schedule</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 mt-4 text-lg max-w-xl font-light"
          >
            Find out exactly who is playing on Dejavu FM. The best DJs, around the clock.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-3 shrink-0 self-center md:self-end"
        >
          <div className="p-2 bg-neon-blue/20 rounded-lg">
            <Globe className="w-5 h-5 text-neon-blue" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Local Timezone</p>
            <p className="text-sm font-mono text-white/90">{userTz}</p>
          </div>
        </motion.div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-16">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-6">
              <div className="h-10 w-48 bg-white/10 animate-pulse rounded-md border-b border-white/10 pb-4"></div>
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
          ))}
        </div>
      ) : (      <div className="flex flex-col gap-16">
        {DAYS.map((dayName, dayIndex) => {
          const dayShows = localSchedule.filter(s => s.local_day === dayIndex)
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
              <h2 className="text-3xl font-display font-bold uppercase tracking-wide border-b border-white/10 pb-4 flex items-center">
                {dayName} 
                {isToday && (
                  <span className="ml-4 px-3 py-1 bg-neon-purple/20 border border-neon-purple text-neon-purple text-xs tracking-widest rounded-full animate-pulse glow-box">
                    TODAY
                  </span>
                )}
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
                      <div className="relative">
                        <div className={`w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-white/5 ${
                          resolveDjImage(show.dj_photo) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-white' : 'bg-transparent') : ''
                        }`}>
                          <img src={resolveDjImage(show.dj_photo)} alt={show.dj_name} className={`w-full h-full filter grayscale group-hover:grayscale-0 transition-all duration-500 ${resolveDjImage(show.dj_photo) === logoUrl && logoUrl ? 'object-contain p-2' : 'object-cover'}`} />
                        </div>
                        {isLive && (
                          <div className="absolute inset-0 border-2 border-neon-purple rounded-xl scale-105 animate-pulse pointer-events-none"></div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center flex-1">
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
      </div>
      )}
    </motion.div>
  );
}
