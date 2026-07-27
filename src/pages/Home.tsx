import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAudio } from "../context/AudioContext";
import { useLogo } from "../hooks/useLogo";
import { Play, Pause, Mic2, Tv, Clock, X, MessageSquare, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { io } from "socket.io-client";
import { convertToLocalTime } from "../lib/timeUtils";

function DjDiskPlayButton({
  isPlaying,
  isBuffering,
  isLightMode,
  onClick
}: {
  isPlaying: boolean;
  isBuffering: boolean;
  isLightMode: boolean;
  onClick: () => void;
}) {
  const { settings } = useLogo();

  const stationName = useMemo(() => {
    return settings?.station_name || settings?.site_title || settings?.app_name || "DEJAVU FM";
  }, [settings]);

  return (
    <button 
      onClick={onClick}
      title={isPlaying ? "Pause Live Radio" : "Play Live Radio"}
      className="absolute top-[40%] sm:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 group/djbtn active:scale-95 transition-all duration-300 focus:outline-none"
    >
      {/* 1. Atmospheric Ambient Aura driven dynamically by brand colors */}
      <div 
        className={`absolute -inset-6 sm:-inset-10 rounded-full transition-all duration-700 blur-2xl pointer-events-none ${
          isPlaying ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover/djbtn:opacity-40'
        }`}
        style={{
          background: `radial-gradient(circle, var(--color-neon-purple, #b026ff) 0%, var(--color-neon-blue, #00d2ff) 55%, transparent 80%)`
        }}
      />

      {/* Live Audio Rippling Expansion Rings in Brand Colors */}
      {isPlaying && (
        <>
          <div 
            className="absolute -inset-3 sm:-inset-5 rounded-full border animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" 
            style={{ borderColor: 'var(--color-neon-blue, #00d2ff)', opacity: 0.5 }}
          />
          <div 
            className="absolute -inset-6 sm:-inset-9 rounded-full border animate-[ping_3.5s_cubic-bezier(0,0,0.2,1)_1s_infinite] pointer-events-none" 
            style={{ borderColor: 'var(--color-neon-purple, #b026ff)', opacity: 0.35 }}
          />
        </>
      )}

      {/* 2. Outer Luxury Chamfered Brushed Metal Chassis */}
      <div className="relative p-[3px] sm:p-[5px] rounded-full bg-gradient-to-b from-zinc-200 via-zinc-600 to-zinc-950 shadow-[0_25px_60px_rgba(0,0,0,0.95)] transition-transform duration-500 group-hover/djbtn:scale-105">
        
        {/* Speed Markings Strobe Rim with Brand Accent */}
        <div 
          className="relative p-[3px] sm:p-[4px] rounded-full bg-[#0d0d10] border shadow-inner transition-colors duration-500"
          style={{ borderColor: 'color-mix(in srgb, var(--color-neon-purple, #b026ff) 30%, rgba(255,255,255,0.1))' }}
        >
          <div className={`absolute inset-0 rounded-full border border-dashed border-zinc-400/30 opacity-60 pointer-events-none ${
            isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
          }`} />

          {/* 3. Main Vinyl Turntable Base */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500 bg-[#060608] shadow-[inset_0_4px_20px_rgba(0,0,0,0.95)]">
            
            {/* Spinning Vinyl Record Body */}
            <div className={`absolute inset-0 rounded-full flex items-center justify-center ${
              isPlaying ? 'animate-[spin_2.4s_linear_infinite]' : 'transition-transform duration-1000 ease-out'
            }`}>
              
              {/* Outer Lead-In Rim */}
              <div className="absolute inset-1 sm:inset-1.5 rounded-full border border-zinc-600/40 opacity-80" />

              {/* Photorealistic High-Gloss Micro-Grooves */}
              <div 
                className="absolute inset-0 rounded-full opacity-95"
                style={{
                  background: `
                    radial-gradient(circle at center, 
                      transparent 0%, 
                      transparent 22%, 
                      rgba(255,255,255,0.08) 22.5%, 
                      rgba(0,0,0,0.95) 23%, 
                      transparent 25%, 
                      rgba(255,255,255,0.1) 28%, 
                      rgba(0,0,0,0.98) 32%, 
                      transparent 36%, 
                      rgba(255,255,255,0.12) 40%, 
                      rgba(0,0,0,0.92) 45%, 
                      transparent 50%, 
                      rgba(255,255,255,0.09) 56%, 
                      rgba(0,0,0,0.97) 62%, 
                      transparent 68%, 
                      rgba(255,255,255,0.11) 75%, 
                      rgba(0,0,0,0.98) 84%, 
                      transparent 90%,
                      rgba(255,255,255,0.18) 95%,
                      #030304 100%
                    )
                  `
                }}
              />

              {/* Conic Specular Reflection */}
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_15deg,transparent_0deg,rgba(255,255,255,0.25)_30deg,transparent_65deg,transparent_180deg,rgba(255,255,255,0.25)_210deg,transparent_245deg)] pointer-events-none mix-blend-screen" />

              {/* Runout Groove Ring styled with brand secondary tint */}
              <div 
                className="absolute w-[42%] h-[42%] rounded-full border opacity-90" 
                style={{ borderColor: 'color-mix(in srgb, var(--color-neon-blue, #00d2ff) 35%, transparent)' }}
              />

              {/* Center Record Label (Luxury Brand Gradient Badge) */}
              <div 
                className="relative w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full p-[1.5px] shadow-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, var(--color-neon-purple, #b026ff), var(--color-neon-blue, #00d2ff))`
                }}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-b from-[#141418] via-[#09090b] to-[#121216] flex flex-col items-center justify-center border border-white/20 relative px-1">
                  <span 
                    className="text-[5px] sm:text-[6px] font-black uppercase tracking-widest leading-none"
                    style={{ color: 'var(--color-neon-blue, #00d2ff)' }}
                  >
                    33⅓ RPM
                  </span>
                  
                  <div 
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-white/80 shadow-md my-0.5"
                    style={{
                      background: `linear-gradient(135deg, var(--color-neon-purple, #b026ff), var(--color-neon-blue, #00d2ff))`
                    }}
                  />

                  <span 
                    className="text-[4px] sm:text-[5px] font-extrabold tracking-wider leading-none truncate max-w-full text-center"
                    style={{ color: 'var(--color-neon-purple, #b026ff)' }}
                  >
                    {stationName.slice(0, 12)}
                  </span>
                </div>
              </div>

            </div>

            {/* 4. Animated Tonearm & Stylus Cartridge */}
            <div className={`absolute top-1 right-2 sm:top-2 sm:right-3.5 origin-top-right transition-all duration-700 pointer-events-none z-10 filter drop-shadow-md ${
              isPlaying ? 'rotate-[18deg] opacity-100 scale-100' : '-rotate-[15deg] opacity-60 scale-95'
            }`}>
              {/* Tonearm Wand */}
              <div className="w-1 sm:w-1.5 h-8 sm:h-11 bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-700 rounded-full border border-white/30 shadow-lg relative">
                {/* Cartridge & Stylus Light */}
                <div 
                  className="absolute bottom-0 -left-1 w-3 sm:w-3.5 h-2.5 sm:h-3 bg-gradient-to-r from-zinc-700 to-zinc-900 rounded-sm border shadow-sm flex items-center justify-center"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-neon-blue, #00d2ff) 60%, rgba(255,255,255,0.4))' }}
                >
                  <div 
                    className={`w-1 h-1 rounded-full ${isPlaying ? 'animate-ping' : ''}`}
                    style={{ backgroundColor: 'var(--color-neon-blue, #00d2ff)' }}
                  />
                </div>
              </div>
            </div>

            {/* 5. Center Glassmorphic Control Button */}
            <div 
              className="relative z-20 flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-black/75 backdrop-blur-md border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.85)] group-hover/djbtn:scale-110 group-hover/djbtn:bg-black/90 transition-all duration-300"
              style={{
                borderColor: isPlaying ? 'var(--color-neon-blue, #00d2ff)' : 'var(--color-neon-purple, #b026ff)'
              }}
            >
              {isBuffering && isPlaying ? (
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white/20 animate-spin" 
                  style={{ borderTopColor: 'var(--color-neon-blue, #00d2ff)' }}
                />
              ) : isPlaying ? (
                <Pause 
                  className="w-5 h-5 sm:w-6 sm:h-6 fill-current group-hover/djbtn:text-white transition-colors duration-300"
                  style={{ 
                    color: 'var(--color-neon-blue, #00d2ff)',
                    filter: 'drop-shadow(0 0 10px var(--color-neon-blue, #00d2ff))'
                  }}
                />
              ) : (
                <Play 
                  className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5 fill-current group-hover/djbtn:text-white transition-colors duration-300"
                  style={{ 
                    color: 'var(--color-neon-purple, #b026ff)',
                    filter: 'drop-shadow(0 0 10px var(--color-neon-purple, #b026ff))'
                  }}
                />
              )}
            </div>

          </div>
        </div>
      </div>
    </button>
  );
}

export default function Home() {
  const { togglePlay, playRadio, isPlaying, isBuffering, activeType, onAirInfo } = useAudio();

  const handleMainPlayerClick = () => {
    if (activeType === 'podcast') {
      playRadio();
    } else {
      togglePlay();
    }
  };

  const handleMobileShoutout = () => {
    window.dispatchEvent(new CustomEvent('open-shoutout'));
  };

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetch("/api/public/schedule").then(res => res.json()),
    refetchInterval: 10000,
  });

  const { logoUrl, isLightMode, settings, resolveDjImage } = useLogo();


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

  const nextShow = useMemo(() => {
    if (!Array.isArray(scheduleData) || scheduleData.length === 0) return null;

    let nearestShow = null;
    let minDiff = Infinity;

    scheduleData.forEach(show => {
      const start = convertToLocalTime(show.day_of_week, show.start_time);
      
      let dayDiff = start.dayOfWeek - timeCtx.day;
      if (dayDiff < 0) dayDiff += 7;
      
      let startMins = parseInt(start.timeStr.split(':')[0]) * 60 + parseInt(start.timeStr.split(':')[1]);
      let currMins = parseInt(timeCtx.time.split(':')[0]) * 60 + parseInt(timeCtx.time.split(':')[1]);
      
      let minuteDiff = (dayDiff * 24 * 60) + startMins - currMins;
      
      if (minuteDiff < 0) {
        minuteDiff += 7 * 24 * 60;
      }
      
      if (minuteDiff > 0 && minuteDiff < minDiff) {
        minDiff = minuteDiff;
        nearestShow = { ...show, local_start: start.timeStr, local_day: start.dayOfWeek };
      }
    });

    return nearestShow;
  }, [scheduleData, timeCtx]);

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row items-center justify-between min-h-[75vh] gap-12">
        <div className="hidden lg:block flex-1 space-y-6 md:space-y-8 z-10 w-full">
          <div className="w-40 h-10 bg-white/10 animate-pulse rounded-full"></div>
          <div className="space-y-4 pt-4">
            <div className="h-20 md:h-24 lg:h-32 bg-white/10 animate-pulse rounded-2xl w-3/4"></div>
            <div className="h-20 md:h-24 lg:h-32 bg-white/10 animate-pulse rounded-2xl w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col space-y-8 md:space-y-12 pb-2 md:pb-4"
    >
      <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between min-h-[calc(100vh-80px)] lg:min-h-[calc(100vh-270px)] pb-32 lg:pb-0 gap-8 md:gap-12 relative px-4">
        <div className="hidden lg:flex flex-1 space-y-6 md:space-y-8 z-10 w-full flex-col items-center lg:items-start pt-4 lg:pt-0">
          <div className="space-y-4 md:space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center space-x-2.5 md:space-x-3 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)] group mx-auto lg:mx-0"
            >
              <div className="relative">
                <span className={`block w-2 md:w-2.5 h-2 md:h-2.5 rounded-full ${isPlaying ? 'bg-neon-blue animate-pulse shadow-[0_0_12px_rgba(0,210,255,1)]' : 'bg-white/20'}`}></span>
              </div>
              <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-black text-white/90">
                {onAirInfo ? 'Live Broadcast' : 'Continuity Mix'}
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-[0.95] md:leading-[0.9] font-black font-display uppercase tracking-tight md:tracking-[-0.05em] flex flex-col items-center lg:items-start w-full"
            >
              {onAirInfo ? (
                <>
                  <span className="text-white drop-shadow-2xl">{onAirInfo.djName.split(' ')[0]}</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] italic tracking-tighter -mt-1 md:-mt-2 lg:-mt-4 relative pr-6 pb-1">
                    {onAirInfo.djName.split(' ').slice(1).join(' ') || 'LIVE'}
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 via-neon-blue/20 to-neon-purple/20 blur-2xl -z-10"></div>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-white drop-shadow-2xl">{settings?.app_name?.split(' ')[0] || "DEJAVU"}</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] italic tracking-tighter -mt-1 md:-mt-2 lg:-mt-4 relative pr-6 pb-1">
                    {settings?.app_name?.split(' ').slice(1).join(' ') || "FM RADIO"}
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 via-neon-blue/20 to-neon-purple/20 blur-2xl -z-10"></div>
                  </span>
                </>
              )}
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col md:flex-row items-center gap-6 md:gap-8 justify-center lg:justify-start w-full"
          >
            <p className="hidden sm:block text-base md:text-xl text-white/50 font-light max-w-[300px] sm:max-w-md md:max-w-lg lg:border-l border-white/20 lg:pl-6 py-1 text-center lg:text-left leading-relaxed">
              {onAirInfo ? onAirInfo.showName : settings?.app_tagline || "Broadcasting 24/7. The heartbeat of underground music since 2005."}
            </p>
            
            {settings?.studio_video_url && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden sm:block w-full sm:w-auto"
              >
                <Link
                  to="/watch"
                  className="flex items-center justify-center space-x-3 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black uppercase tracking-[0.2em] text-[10px] md:text-xs text-neon-blue shadow-lg w-full sm:w-auto"
                >
                  <Tv className="w-5 h-5" />
                  <span>Live Studio Cam</span>
                  <span className="w-2 md:w-2 h-2 md:h-2 rounded-full bg-red-500 animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative -mt-10 sm:-mt-14 lg:mt-0 group w-full lg:w-[45%] flex justify-center pt-2 pb-8 sm:py-12 md:py-6 lg:py-12"
        >
          <div className={`relative w-full aspect-square max-w-[280px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[480px] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-700 ${
            (resolveDjImage(onAirInfo?.djPhoto) === logoUrl) && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-white' : 'bg-transparent') : ''
          }`}>
            <img 
              src={resolveDjImage(onAirInfo?.djPhoto)}
              alt="Current DJ"
              className={`w-full h-full transition-all duration-1000 ${(isPlaying && activeType === 'radio') ? 'scale-110 contrast-125' : 'scale-100 grayscale brightness-75'} ${(resolveDjImage(onAirInfo?.djPhoto) === logoUrl && logoUrl) ? 'object-contain p-6 md:p-8' : 'object-cover'}`}
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${(isPlaying && activeType === 'radio') ? 'from-neon-purple/40 via-dark-bg/60' : 'from-dark-bg via-dark-bg/40'} to-transparent opacity-90 transition-colors duration-1000`}></div>
            
            {/* CDJ Style Now Playing Overlay */}
            <div className={`now-playing-panel absolute bottom-4 left-4 right-4 md:bottom-10 md:left-10 md:right-10 z-10 p-4 md:p-6 rounded-2xl md:rounded-3xl border flex flex-col space-y-1.5 md:space-y-2 translate-y-0 group-hover:-translate-y-2 transition-transform duration-500 backdrop-blur-xl ${
              isLightMode ? 'bg-white border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)]' : 'bg-black/40 border-white/10 shadow-2xl'
            }`}>
              <div className={`flex justify-between items-center text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] ${
                isLightMode ? 'text-black/50' : 'text-white/50'
              }`}>
                <span className="flex items-center space-x-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${onAirInfo ? 'bg-neon-pink animate-pulse' : (isLightMode ? 'bg-black/40' : 'bg-white/40')}`}></div>
                  <span>{onAirInfo?.startTime ? `START: ${onAirInfo.startTime}` : 'HD Feed'}</span>
                </span>
                <span className="text-neon-blue drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]">
                  {onAirInfo?.endTime ? `END: ${onAirInfo.endTime}` : 'LIVE / 320K'}
                </span>
              </div>
              <div className={`h-[1px] w-full my-2 ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></div>
              <div className={`text-center md:text-left text-[15px] sm:text-lg md:text-xl font-bold uppercase tracking-tight truncate ${
                isLightMode ? 'text-black' : 'text-white'
              }`}>
                {onAirInfo?.showName || "DEJAVU AUTO-MIX"}
              </div>
              <div className={`text-center md:text-left text-[9px] md:text-xs text-neon-purple font-black tracking-[0.25em] uppercase drop-shadow-[0_0_8px_rgba(176,38,255,0.4)]`}>
                {onAirInfo?.djName || "STREAMS ACTIVE"}
              </div>
            </div>
          </div>
 
          {/* Mobile Only Shoutout Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            onClick={handleMobileShoutout}
            className="lg:hidden absolute -bottom-7 flex items-center space-x-2 px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white transition-all active:scale-95 shadow-xl"
          >
            <MessageSquare className="w-4 h-4 text-neon-purple" />
            <span className="text-[10px] font-black uppercase tracking-widest">Send Shoutout</span>
          </motion.button>
 
          <DjDiskPlayButton 
            isPlaying={isPlaying && activeType === 'radio'} 
            isBuffering={isBuffering} 
            isLightMode={isLightMode} 
            onClick={handleMainPlayerClick} 
          />
        </motion.div>


      </div>

      {nextShow && (
        <div className="w-full px-4 sm:px-6 xl:px-12 pb-16 mt-24 md:mt-16 lg:mt-24 relative z-20">
          <div className="max-w-[1400px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              whileHover="hover"
              className={`glass-panel p-5 md:p-8 rounded-[2rem] border relative overflow-hidden group w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-500 ${
                isLightMode 
                  ? 'bg-white border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:border-black/20' 
                  : 'border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-white/20'
              }`}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-0"
                variants={{ hover: { x: ['-150%', '150%'] } }}
                transition={{ duration: 0.75, ease: "easeInOut" }}
                initial={{ x: '-150%' }}
              />
              {/* Subtle ambient light */}
              <div className="absolute top-1/2 -left-32 w-64 h-64 bg-neon-purple/10 blur-[80px] -translate-y-1/2 rounded-full pointer-events-none transition-all duration-700 group-hover:opacity-100 group-hover:scale-150 z-0"></div>
              
              <div className="flex flex-row items-center gap-4 md:gap-6 relative z-10 w-full md:w-auto">
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl overflow-hidden shrink-0 border relative group-hover:border-neon-purple/40 transition-all duration-500 shadow-2xl ${
                  isLightMode ? 'border-black/10' : 'border-white/10'
                } ${
                  resolveDjImage(nextShow.dj_photo) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-white' : 'bg-transparent') : ''
                }`}>
                  <img src={resolveDjImage(nextShow.dj_photo)} alt={nextShow.dj_name} className={`w-full h-full filter grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-110 ${resolveDjImage(nextShow.dj_photo) === logoUrl && logoUrl ? 'object-contain p-2' : 'object-cover'}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
                
                <div className="flex flex-col justify-center min-w-0">
                  <h4 className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] flex items-center space-x-2 text-white/40 mb-1 md:mb-2">
                    <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-neon-blue" />
                    <span>Next Up</span>
                  </h4>
                  <h3 className={`font-display font-black text-xl sm:text-3xl leading-tight group-hover:text-neon-blue transition-colors duration-500 truncate uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>
                    {nextShow.dj_name}
                  </h3>
                  <p className={`text-[11px] sm:text-sm truncate mt-0.5 font-mono uppercase tracking-widest font-bold ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
                    {nextShow.show_name}
                  </p>
                </div>
              </div>
              
              <div className={`relative z-10 w-full md:w-auto flex justify-start md:justify-end shrink-0 mt-0 md:mt-0`}>
                <div className={`inline-flex items-center space-x-3 border rounded-xl px-4 md:px-5 py-2.5 md:py-3 shadow-inner backdrop-blur-md transition-colors duration-300 w-full sm:w-auto justify-center sm:justify-start ${
                  isLightMode ? 'bg-black/5 border-black/10 group-hover:border-black/20' : 'bg-white/5 border-white/10 group-hover:border-white/20'
                }`}>
                   <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse"></div>
                   <span className={`text-sm md:text-base font-bold font-mono tracking-widest uppercase ${isLightMode ? 'text-black' : 'text-white'}`}>{nextShow.local_start}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      <div className={`w-full py-5 md:py-8 border-y overflow-hidden relative group ${isLightMode ? 'border-black/5 bg-black/[0.01]' : 'border-white/5 bg-white/[0.01]'}`}>
        <div className="flex whitespace-nowrap animate-[marquee_180s_linear_infinite] group-hover:[animation-play-state:paused] space-x-12 md:space-x-24 w-max">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-12 md:space-x-16 shrink-0">
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-pulse"></span>
                <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>Live on {settings?.app_name || "DEJAVUFM"}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-blue">{settings?.app_tagline || "The Underground Worldwide"}</span>
              </div>
            </div>
          ))}
        </div>
        <div className={`absolute inset-y-0 left-0 w-24 md:w-64 z-10 ${isLightMode ? 'bg-gradient-to-r from-[#f3f4f6] to-transparent' : 'bg-gradient-to-r from-dark-bg to-transparent'}`}></div>
        <div className={`absolute inset-y-0 right-0 w-24 md:w-64 z-10 ${isLightMode ? 'bg-gradient-to-l from-[#f3f4f6] to-transparent' : 'bg-gradient-to-l from-dark-bg to-transparent'}`}></div>
      </div>
    </motion.div>
  );
}
