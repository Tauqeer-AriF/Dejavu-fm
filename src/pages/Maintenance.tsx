import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useLogo } from "../hooks/useLogo";
import { Clock, Radio, Play, Pause } from "lucide-react";
import { useAudio } from "../context/AudioContext";

interface MaintenanceProps {
  settings: Record<string, any>;
}

export default function Maintenance({ settings }: MaintenanceProps) {
  const { logoUrl, isLightMode } = useLogo();
  const { isPlaying, isBuffering, togglePlay, currentTrack } = useAudio();
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const title = settings?.maintenance_title || "TEMPORARY CLOSED FOR MAINTENANCE";
  const text = settings?.maintenance_text || "Our sound engineers are performing essential system updates. We will be back on-air shortly with upgraded streams, podcasts, and archives.";
  const endTime = settings?.maintenance_end_time;

  // Calculate live countdown
  useEffect(() => {
    if (!endTime) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const difference = +new Date(endTime) - +new Date();
      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const appName = settings?.app_name || "DejavuFM";
  const adminCustomPath = (settings?.admin_custom_path || '/admin').trim().replace(/\/+$/, '') || '/admin';

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 md:p-12 relative overflow-hidden transition-colors duration-500 ${
      isLightMode 
        ? "bg-[#faf9f6] text-[#0a0a0a]" 
        : "bg-[#080809] text-[#f5f5f7]"
    }`}>
      {/* Decorative Premium Glow Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-neon-purple/5 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-neon-blue/5 blur-[120px]" />
      </div>

      {/* Header with Logo */}
      <header className="relative z-10 flex flex-col sm:flex-row items-center justify-between w-full max-w-7xl mx-auto gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <div className={`h-12 w-12 flex items-center justify-center rounded-xl p-1 border overflow-hidden ${
              isLightMode ? "bg-white border-black/10" : "bg-white/5 border-white/10"
            }`}>
              <img src={logoUrl} alt={appName} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
            </div>
          )}
          <span className="font-display font-black tracking-tighter text-lg uppercase">
            {appName}
          </span>
        </div>

        {/* Live Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${
          isLightMode ? "bg-black/5 border-black/10 text-black/60" : "bg-white/5 border-white/10 text-white/60"
        }`}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
          </span>
          Offline Transmission
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto my-8 sm:my-12 px-2 sm:px-0 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6 sm:space-y-8 w-full"
        >
          {/* Eyebrow badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] sm:text-xs font-black uppercase tracking-widest ${
            isLightMode 
              ? "border-red-500/20 bg-red-500/10 text-red-600" 
              : "border-red-500/10 bg-red-500/5 text-red-500"
          }`}>
            <Clock className={`w-4 h-4 animate-spin ${isLightMode ? "text-red-600" : "text-red-500"}`} style={{ animationDuration: '6s' }} />
            <span>Updates In Progress</span>
          </div>

          {/* Premium Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-tight uppercase leading-none max-w-2xl mx-auto select-none px-2">
            {title}
          </h1>

          {/* Body description constrained to balanced lines */}
          <p className={`text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-medium px-4 ${
            isLightMode ? "text-black/60" : "text-white/60"
          }`}>
            {text}
          </p>

          {/* Optional countdown timer */}
          {timeLeft && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className={`w-full grid grid-cols-4 gap-2 sm:gap-6 max-w-lg mx-auto p-4 sm:p-6 rounded-3xl border transition-all shadow-xl ${
                isLightMode 
                  ? "border-black/10 shadow-black/5 text-black" 
                  : "border-white/10 shadow-2xl"
              }`}
              style={{ backgroundColor: isLightMode ? '#ffffff' : 'rgba(255, 255, 255, 0.05)' }}
            >
              {[
                { label: "Days", value: timeLeft.days },
                { label: "Hours", value: timeLeft.hours },
                { label: "Mins", value: timeLeft.minutes },
                { label: "Secs", value: timeLeft.seconds },
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center justify-center text-center">
                  <span className={`text-2xl sm:text-4xl md:text-5xl font-display font-black tracking-tighter tabular-nums ${
                    isLightMode ? "text-black" : "text-neon-purple"
                  }`}>
                    {String(item.value).padStart(2, "0")}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1 sm:mt-1.5 ${
                    isLightMode ? "text-black/70" : "text-white/40"
                  }`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Radio player overlay on maintenance */}
          {settings?.maintenance_show_player === '1' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className={`w-full max-w-md mx-auto p-3 sm:p-5 rounded-[2rem] sm:rounded-3xl border flex items-center justify-between gap-3 sm:gap-5 transition-all mt-6 sm:mt-8 shadow-xl ${
                isLightMode 
                  ? "border-black/10 shadow-black/5" 
                  : "border-white/10 shadow-2xl"
              }`}
              style={{ backgroundColor: isLightMode ? '#ffffff' : 'rgba(255, 255, 255, 0.05)' }}
            >
              <div className="flex items-center gap-3 sm:gap-4 text-left overflow-hidden">
                <button
                  type="button"
                  onClick={togglePlay}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    isPlaying 
                      ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/40 animate-pulse" 
                      : (isLightMode ? "bg-black/5 text-black hover:bg-black/10" : "bg-white text-black hover:bg-neutral-100")
                  }`}
                >
                  {isBuffering ? (
                    <Clock className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <h4 className={`text-xs font-black uppercase tracking-wider truncate ${isLightMode ? "text-black" : "text-white"}`}>
                    {isPlaying ? "LIVE ON-AIR" : "TUNE IN LIVE"}
                  </h4>
                  <p className={`text-[10px] font-mono mt-0.5 truncate max-w-[140px] sm:max-w-[180px] ${isLightMode ? "text-black/80" : "text-white/40"}`}>
                    {currentTrack || "DejavuFM Live Broadcast"}
                  </p>
                </div>
              </div>

              {/* Dynamic waveform visualizer when playing */}
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-6 shrink-0 pr-2 sm:pr-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-neon-purple rounded-full animate-bounce"
                      style={{
                        height: `${[40, 90, 60, 100, 50, 75][i]}%`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '1.2s'
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Back Online Notification Box */}
          <div className="pt-2 sm:pt-4 px-2">
            <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${
              isLightMode ? "text-black/40" : "text-white/40"
            }`}>
              <Radio className="hidden sm:block w-4 h-4 text-neon-purple animate-pulse" />
              Tune in again soon for our upgraded broadcast
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer Area */}
      <footer className="relative z-10 flex items-center justify-center w-full max-w-7xl mx-auto border-t border-dashed transition-colors pt-6 sm:pt-8 pb-4 sm:pb-0 border-black/5 dark:border-white/5">
        {/* Centered Copyright */}
        <div className={`text-xs font-mono font-medium text-center ${isLightMode ? "text-black/40" : "text-white/40"}`}>
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

