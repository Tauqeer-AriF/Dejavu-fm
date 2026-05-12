import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAudio } from "../context/AudioContext";
import { Play, Pause, Mic2, Tv } from "lucide-react";
import { motion } from "motion/react";
import { io } from "socket.io-client";

function HeroVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getAnalyser } = useAudio();
  const animationRef = useRef<number>();

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
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
      ctx.strokeStyle = `rgba(${isPlaying ? '176, 38, 255' : '255, 255, 255'}, 0.6)`;
      
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

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(r => r.json()),
    refetchInterval: 3000,
  });

  const { isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetch("/api/public/schedule").then(res => res.json()),
    refetchInterval: 10000,
  });

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
      <div className="flex flex-col lg:flex-row items-center justify-between min-h-[70vh] lg:min-h-[80vh] gap-12 lg:gap-16 relative">
        <div className="flex-1 space-y-8 md:space-y-12 z-10 w-full text-center lg:text-left pt-12 lg:pt-0">
          <div className="space-y-4 md:space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center space-x-3 px-5 py-2.5 rounded-2xl glass-panel border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.3)] group"
            >
              <div className="relative">
                <span className={`block w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-neon-blue animate-pulse shadow-[0_0_10px_rgba(0,210,255,1)]' : 'bg-white/20'}`}></span>
              </div>
              <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-black text-white/90">
                {onAirInfo ? 'Live Broadcast' : 'Continuity Mix'}
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-7xl md:text-9xl xl:text-[11rem] leading-[0.85] font-black font-display uppercase tracking-[-0.05em] flex flex-col"
            >
              {onAirInfo ? (
                <>
                  <span className="text-white drop-shadow-2xl">{onAirInfo.djName.split(' ')[0]}</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] italic tracking-tighter -mt-1 md:-mt-4">
                    {onAirInfo.djName.split(' ').slice(1).join(' ') || 'LIVE'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-white drop-shadow-2xl">{settings?.app_name?.split(' ')[0] || "DEJAVU"}</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] italic tracking-tighter -mt-1 md:-mt-4">
                    {settings?.app_name?.split(' ').slice(1).join(' ') || "FM RADIO"}
                  </span>
                </>
              )}
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col md:flex-row items-center lg:items-center gap-8 lg:gap-10 justify-center lg:justify-start"
          >
            <p className="text-lg md:text-2xl text-white/40 font-light max-w-lg lg:border-l-2 border-neon-blue/30 lg:pl-6 py-1">
              {onAirInfo ? onAirInfo.showName : settings?.app_tagline || "Broadcasting 24/7. The heartbeat of underground music since 2005."}
            </p>
            
            {settings?.studio_video_url && (
              <motion.div
                whileHover={{ scale: 1.05 }}
              >
                <Link
                  to="/watch"
                  className="flex items-center space-x-4 px-8 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-black uppercase tracking-[0.2em] text-[10px] md:text-xs text-neon-blue shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                >
                  <Tv className="w-5 h-5" />
                  <span>Live Studio Cam</span>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative group w-full lg:w-1/2 flex justify-center py-6 lg:py-12"
        >
          <HeroVisualizer isPlaying={isPlaying} />
          
          <div className="relative w-64 h-64 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] lg:w-[540px] lg:h-[540px] rounded-[30px] md:rounded-[40px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 group-hover:border-white/20 transition-all duration-700">
            <img 
              src={onAirInfo?.djPhoto || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80"}
              alt="Current DJ"
              className={`w-full h-full object-cover transition-all duration-1000 ${isPlaying ? 'scale-110 contrast-125' : 'scale-100 grayscale brightness-75'}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent opacity-80"></div>
            
            {/* CDJ Style Now Playing Overlay */}
            <div className="absolute bottom-4 left-4 right-4 md:bottom-10 md:left-10 md:right-10 p-4 md:p-6 glass-panel rounded-2xl md:rounded-3xl border border-white/5 flex flex-col space-y-1.5 md:space-y-2 translate-y-0 group-hover:-translate-y-1 transition-transform duration-500">
              <div className="flex justify-between items-center text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                <span>HD Audio Feed</span>
                <span className="text-neon-blue">LIVE / 320K</span>
              </div>
              <div className="h-[1px] w-full bg-white/5 my-1 md:my-2"></div>
              <div className="text-xs md:text-xl font-bold uppercase tracking-tight truncate">
                {onAirInfo?.showName || "DEJAVU AUTO-MIX"}
              </div>
              <div className="text-[9px] md:text-xs text-neon-purple font-black tracking-widest uppercase">
                {onAirInfo?.djName || "STREAMS ACTIVE"}
              </div>
            </div>
          </div>
          
          <button 
            onClick={togglePlay}
            className="absolute top-[40%] sm:top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-20 h-20 sm:w-32 sm:h-32 bg-white text-dark-bg rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 shadow-[0_20px_60px_rgba(255,255,255,0.4)] group/btn"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />
            ) : (
              <Play className="w-8 h-8 sm:w-12 sm:h-12 ml-1 sm:ml-2 fill-current" />
            )}
          </button>
        </motion.div>
      </div>

      {/* Global Activity Marquee */}
      <div className="w-full py-6 md:py-8 border-y border-white/5 overflow-hidden relative group bg-white/[0.02]">
        <div className="flex whitespace-nowrap animate-[marquee_120s_linear_infinite] group-hover:[animation-play-state:paused] space-x-20 w-max">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-12 shrink-0">
              <div className="flex items-center space-x-4">
                <span className="w-2 h-2 bg-neon-purple rounded-full animate-pulse shadow-[0_0_10px_rgba(176,38,255,0.5)]"></span>
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Broadcasting Live</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Total Listeners:</span>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neon-blue">{listeners} Connected</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Status:</span>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500">Signal Optimal</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Network:</span>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neon-purple">Global Gateway Active</span>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-dark-bg to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-dark-bg to-transparent z-10"></div>
      </div>
    </motion.div>
  );
}
