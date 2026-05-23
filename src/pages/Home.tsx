import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAudio } from "../context/AudioContext";
import { useLogo } from "../hooks/useLogo";
import { Play, Pause, Mic2, Tv, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { io } from "socket.io-client";
import { convertToLocalTime } from "../lib/timeUtils";

function HeroVisualizer({ isPlaying, isLightMode }: { isPlaying: boolean; isLightMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getAnalyser } = useAudio();
  const animationRef = useRef<number>();

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      const analyser = getAnalyser();
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;
      
      ctx.clearRect(0, 0, width, height);
      if (!isPlaying || !analyser) return;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseSize = Math.min(width, height) * 0.4;
      
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(176, 38, 255, 0.4)';
      
      // Outer subtle ring
      ctx.arc(centerX, centerY, baseSize * 1.4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(${isPlaying ? '176, 38, 255' : isLightMode ? '0, 0, 0' : '255, 255, 255'}, 0.6)`;
      
      for (let i = 0; i < dataArray.length; i += 4) {
        const value = dataArray[i];
        const percent = value / 255;
        const radius = baseSize + (percent * (baseSize * 0.6));
        const angle = (i * 2 * Math.PI) / dataArray.length;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        const cpRadius = baseSize + (percent * (baseSize * 0.2));
        const cpx = centerX + Math.cos(angle) * cpRadius;
        const cpy = centerY + Math.sin(angle) * cpRadius;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.quadraticCurveTo(cpx, cpy, x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Spinning orbiting dots
      const time = Date.now() * 0.001;
      for (let i = 0; i < 3; i++) {
        const orbitAngle = time * (0.5 + i * 0.2);
        const orbitRadius = baseSize * 1.25 + i * (baseSize * 0.1);
        const dotX = centerX + Math.cos(orbitAngle) * orbitRadius;
        const dotY = centerY + Math.sin(orbitAngle) * orbitRadius;
        
        ctx.beginPath();
        ctx.fillStyle = i === 0 ? '#b026ff' : '#00d2ff';
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle as string;
      }
      ctx.shadowBlur = 0;

      // Inner pulsating glow
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const glowScale = 1 + (avg / 255) * 0.5;
      
      const gradient = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, baseSize * 1.2 * glowScale);
      gradient.addColorStop(0, 'rgba(176, 38, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    render();
    return () => cancelAnimationFrame(animationRef.current!);
  }, [getAnalyser, isPlaying]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full opacity-60" />
    </div>
  );
}

export default function Home() {
  const { togglePlay, isPlaying, onAirInfo } = useAudio();
  const [listeners, setListeners] = useState(0);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;
    
    socketRef.current = socket;
    const handler = (count: number) => {
      setListeners(count);
    };
    
    socket.on('onlineCount', handler);
    return () => {
      socket.off('onlineCount', handler);
    };
  }, []);

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
      <div className="flex flex-col lg:flex-row items-center justify-between min-h-[75vh] gap-12 mt-12 md:mt-0">
        <div className="flex-1 space-y-6 md:space-y-8 z-10 w-full">
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
      className="flex flex-col space-y-8 md:space-y-12 pb-24"
    >
      <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between min-h-[70vh] gap-6 md:gap-12 lg:gap-16 relative mt-6 md:mt-8 lg:mt-12">
        <div className="lg:flex-1 space-y-8 md:space-y-10 lg:space-y-12 z-10 w-full flex flex-col items-center lg:items-start pt-2 md:pt-12 lg:pt-0">
          <div className="space-y-5 md:space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left">
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
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[11rem] leading-[0.9] md:leading-[0.85] font-black font-display uppercase tracking-[-0.04em] md:tracking-[-0.05em] flex flex-col items-center lg:items-start w-full"
            >
              {onAirInfo ? (
                <>
                  <span className="text-white drop-shadow-2xl">{onAirInfo.djName.split(' ')[0]}</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] italic tracking-tighter -mt-1 md:-mt-2 lg:-mt-4 relative">
                    {onAirInfo.djName.split(' ').slice(1).join(' ') || 'LIVE'}
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 via-neon-blue/20 to-neon-purple/20 blur-2xl -z-10"></div>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-white drop-shadow-2xl">{settings?.app_name?.split(' ')[0] || "DEJAVU"}</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] italic tracking-tighter -mt-1 md:-mt-2 lg:-mt-4 relative">
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
            className="flex flex-col md:flex-row items-center lg:items-center gap-6 md:gap-8 lg:gap-10 justify-center lg:justify-start w-full"
          >
            <p className="hidden sm:block text-[17px] sm:text-lg md:text-2xl text-white/50 font-light max-w-[300px] sm:max-w-md md:max-w-lg lg:border-l-2 border-neon-blue/40 lg:pl-6 py-1 text-center lg:text-left leading-relaxed">
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
                  className="flex items-center justify-center space-x-4 px-8 md:px-8 py-4 md:py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black uppercase tracking-[0.2em] text-[11px] md:text-xs text-neon-blue shadow-[0_20px_40px_rgba(0,0,0,0.3)] w-full sm:w-auto"
                >
                  <Tv className="w-5 md:w-5 h-5 md:h-5" />
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
        className="relative group w-full lg:w-1/2 flex justify-center py-2 md:py-6 lg:py-12"
        >
          <HeroVisualizer isPlaying={isPlaying} isLightMode={isLightMode} />
          
          <div className={`relative w-full aspect-square max-w-[300px] sm:max-w-[360px] md:max-w-[450px] lg:max-w-[540px] rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/5 group-hover:border-white/20 transition-all duration-700 ${
            (resolveDjImage(onAirInfo?.djPhoto) === logoUrl) && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-white' : 'bg-transparent') : ''
          }`}>
            <img 
              src={resolveDjImage(onAirInfo?.djPhoto)}
              alt="Current DJ"
              className={`w-full h-full transition-all duration-1000 ${isPlaying ? 'scale-110 contrast-125' : 'scale-100 grayscale brightness-75'} ${(resolveDjImage(onAirInfo?.djPhoto) === logoUrl && logoUrl) ? 'object-contain p-6 md:p-8' : 'object-cover'}`}
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${isPlaying ? 'from-neon-purple/40 via-dark-bg/60' : 'from-dark-bg via-dark-bg/40'} to-transparent opacity-90 transition-colors duration-1000`}></div>
            
            {/* CDJ Style Now Playing Overlay */}
            <div className="absolute bottom-4 left-4 right-4 md:bottom-10 md:left-10 md:right-10 p-4 md:p-6 glass-panel rounded-2xl md:rounded-3xl border border-white/10 flex flex-col space-y-1.5 md:space-y-2 translate-y-0 group-hover:-translate-y-2 transition-transform duration-500 shadow-2xl backdrop-blur-xl bg-black/40">
              <div className="flex justify-between items-center text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/50">
                <span className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                  <span>HD Feed</span>
                </span>
                <span className="text-neon-blue drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]">LIVE / 320K</span>
              </div>
              <div className="h-[1px] w-full bg-white/10 my-2"></div>
              <div className="text-[15px] sm:text-lg md:text-xl font-bold uppercase tracking-tight truncate text-white">
                {onAirInfo?.showName || "DEJAVU AUTO-MIX"}
              </div>
              <div className="text-[9px] md:text-xs text-neon-purple font-black tracking-[0.25em] uppercase drop-shadow-[0_0_8px_rgba(176,38,255,0.4)]">
                {onAirInfo?.djName || "STREAMS ACTIVE"}
              </div>
            </div>
          </div>
          
          <button 
            onClick={togglePlay}
            className={`absolute top-[45%] sm:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 bg-clip-padding group/btn ${
              isLightMode 
                ? 'bg-dark-bg text-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-4 border-black/5' 
                : 'bg-white text-dark-bg shadow-[0_20px_60px_rgba(255,255,255,0.4)] hover:shadow-[0_20px_80px_rgba(255,255,255,0.6)] border-4 border-white/20'
            }`}
          >
            {isPlaying ? (
              <Pause className={`w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 fill-current group-hover/btn:text-neon-purple transition-colors duration-300 ${isLightMode ? 'text-white' : 'text-black'}`} />
            ) : (
              <Play className={`w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 ml-1 md:ml-2 fill-current group-hover/btn:text-neon-blue transition-colors duration-300 ${isLightMode ? 'text-white' : 'text-black'}`} />
            )}
          </button>
        </motion.div>
      </div>

      {nextShow && (
        <div className="w-full px-4 sm:px-6 xl:px-12 pb-8 !mt-2 md:!-mt-12 relative z-20">
          <div className="max-w-[1400px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="glass-panel p-5 md:p-8 rounded-[2rem] border border-white/10 relative overflow-hidden group w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all duration-500"
            >
              {/* Subtle ambient light */}
              <div className="absolute top-1/2 -left-32 w-64 h-64 bg-neon-purple/10 blur-[80px] -translate-y-1/2 rounded-full pointer-events-none transition-all duration-700 group-hover:opacity-100 group-hover:scale-150"></div>
              
              <div className="flex flex-row items-center gap-4 md:gap-6 relative z-10 w-full md:w-auto">
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl overflow-hidden shrink-0 border border-white/10 relative group-hover:border-neon-purple/40 transition-all duration-500 shadow-2xl ${
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
                  <h3 className="font-display font-black text-xl sm:text-3xl leading-tight text-white group-hover:text-neon-blue transition-colors duration-500 truncate uppercase tracking-tight">
                    {nextShow.dj_name}
                  </h3>
                  <p className="text-[11px] sm:text-sm text-white/60 truncate mt-0.5 font-mono uppercase tracking-widest font-bold">
                    {nextShow.show_name}
                  </p>
                </div>
              </div>
              
              <div className="relative z-10 w-full md:w-auto flex justify-start md:justify-end shrink-0 mt-0 md:mt-0">
                <div className="inline-flex items-center space-x-3 bg-white/5 border border-white/10 rounded-xl px-4 md:px-5 py-2.5 md:py-3 shadow-inner backdrop-blur-md group-hover:border-white/20 transition-colors duration-300 w-full sm:w-auto justify-center sm:justify-start">
                   <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse"></div>
                   <span className="text-sm md:text-base font-bold text-white font-mono tracking-widest uppercase">{nextShow.local_start}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Global Activity Marquee */}
      <div className="w-full py-5 md:py-8 border-y border-white/5 overflow-hidden relative group bg-white/[0.01]">
        <div className="flex whitespace-nowrap animate-[marquee_180s_linear_infinite] group-hover:[animation-play-state:paused] space-x-12 md:space-x-24 w-max">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-12 md:space-x-16 shrink-0">
              <div className="flex items-center space-x-3">
                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Live on {settings?.app_name || "DEJAVU FM"}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{listeners} Global Listeners</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-blue">Digital Signal Optimal</span>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-24 md:w-64 bg-gradient-to-r from-dark-bg to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-24 md:w-64 bg-gradient-to-l from-dark-bg to-transparent z-10"></div>
      </div>
    </motion.div>
  );
}
