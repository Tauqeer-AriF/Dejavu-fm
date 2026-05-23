import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, MessageSquare, Instagram, Music2, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAudio } from '../context/AudioContext';
import { useLogo } from '../hooks/useLogo';

export default function Stream() {
  const twitchUrl = useMemo(() => {
    const hostname = window.location.hostname;
    const parents = Array.from(new Set([
      hostname,
      'localhost',
      'ai.studio',
      'aistudio.google.com',
      'google.com',
      'run.app',
      'dejavufm.com',
      'www.dejavufm.com'
    ])).filter(Boolean);
    
    const parentParams = parents.map(p => `parent=${p}`).join('&');
    // Optimized parameter order for reliability
    return `https://player.twitch.tv/?channel=dejavufmlive&autoplay=true&muted=true&${parentParams}`;
  }, []);

  const { onAirInfo } = useAudio();
  const { logoUrl, resolveDjImage } = useLogo();
  const [listeners, setListeners] = useState(0);
  const [trackOverlay, setTrackOverlay] = useState<{artist: string, title: string} | null>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with global socket for listener count
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;
    
    const handler = (count: number) => setListeners(count);
    
    const onPushTrack = (data: {artist: string, title: string}) => {
      setTrackOverlay(data);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = setTimeout(() => {
        setTrackOverlay(null);
      }, 8000); 
    };

    socket.on('onlineCount', handler);
    socket.on('pushTrack', onPushTrack);

    return () => { 
      socket.off('onlineCount', handler); 
      socket.off('pushTrack', onPushTrack);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    };
  }, []);

  // Fetch settings for naming consistency
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 pt-4 lg:h-[calc(100vh-220px)] lg:min-h-[600px]"
    >
      {/* Twitch Player Section */}
      <div className="flex-1 glass-panel rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/5 relative bg-black/40 min-h-[450px] sm:min-h-[500px] lg:min-h-0">
        <div className="flex-1 w-full relative bg-black group flex items-center justify-center aspect-[4/3] sm:aspect-video lg:aspect-auto">
          <div className="absolute top-6 left-6 z-20 flex items-center space-x-3 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
            <div className="relative">
              <Radio className="w-4 h-4 text-neon-purple" />
              <span className="absolute inset-0 w-4 h-4 bg-neon-purple/40 rounded-full animate-ping"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Live Studio Feed</span>
          </div>
          
          <iframe
            key={twitchUrl}
            src={twitchUrl}
            className="w-full h-full border-none shadow-inner absolute inset-0 z-10"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; clipboard-write; gyroscope"
            allowFullScreen
          />

          {/* Animated Track overlay (Matches WatchLive) */}
          <AnimatePresence>
            {trackOverlay && (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute bottom-6 left-6 z-[60] bg-black/80 backdrop-blur-md border-l-4 border-l-neon-pink p-4 rounded-xl shadow-2xl pointer-events-none"
              >
                <div className="text-neon-pink text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-neon-pink rounded-full animate-pulse"></span>
                  <span>Now Playing</span>
                </div>
                <div className="text-xl font-bold text-white break-words max-w-[250px] leading-tight mb-1">{trackOverlay.title}</div>
                <div className="text-sm font-medium text-white/70 truncate max-w-[250px]">{trackOverlay.artist}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DJ Info Footer (Matches WatchLive) */}
        <div className="hidden md:flex p-4 md:p-6 bg-dark-bg/80 border-t border-white/5 flex-col md:flex-row items-center gap-6">
           {resolveDjImage(onAirInfo?.djPhoto) && (
             <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-neon-purple/30 shrink-0 bg-white/5">
               <img src={resolveDjImage(onAirInfo?.djPhoto)} alt={onAirInfo?.djName || "DJ"} className={`w-full h-full ${resolveDjImage(onAirInfo?.djPhoto) === logoUrl && logoUrl ? 'object-contain p-2' : 'object-cover'}`} />
             </div>
           )}
           <div className="flex-1 text-center md:text-left">
             <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
               <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue italic">
                 {onAirInfo?.djName || settings?.app_name || "DEJAVU FM"}
               </h2>
               <div className="px-2 py-0.5 bg-red-500 rounded flex items-center space-x-1 shadow-[0_0_15px_rgba(239,68,68,0.3)] shrink-0">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest leading-none">Live</span>
               </div>
             </div>
             <h3 className="text-white/90 font-bold text-sm md:text-lg mb-2">{onAirInfo?.showName || "Global Underground Stream"}</h3>
           </div>
           
           {(onAirInfo?.instagram || onAirInfo?.soundcloud || onAirInfo?.mixcloud) && (
             <div className="flex gap-4 shrink-0">
               {onAirInfo.instagram && (
                 <a href={`https://instagram.com/${onAirInfo.instagram}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-white/5 hover:bg-neon-purple/20 border border-white/5 hover:border-neon-purple/50 transition-all text-white/50 hover:text-white">
                   <Instagram className="w-5 h-5" />
                 </a>
               )}
               {onAirInfo.mixcloud && (
                 <a href={`https://mixcloud.com/${onAirInfo.mixcloud}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/30 transition-all text-white/50 hover:text-white">
                   <Globe className="w-5 h-5" />
                 </a>
               )}
             </div>
           )}
        </div>
      </div>

      {/* Right Sidebar - Stats & Chat */}
      <div className="w-full lg:w-96 flex flex-col gap-6 lg:h-full lg:max-h-full">
        
        {/* Signal Analytics Widget (Matches WatchLive) */}
        <div className="glass-panel rounded-3xl p-5 md:p-6 border border-white/5 space-y-4 hidden md:block">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Signal Analytics</h4>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-bold text-green-500 uppercase">OPTIMAL</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="space-y-1">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Latency</div>
              <motion.div animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-sm font-mono text-neon-blue">
                {Math.floor(80 + Math.random() * 40)}ms
              </motion.div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Quality</div>
              <div className="text-sm font-mono text-neon-purple">320kbps</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Global Load</div>
              <div className="text-sm font-mono text-white/60">{(listeners * 0.012).toFixed(3)}%</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Codecs</div>
              <div className="text-sm font-mono text-white/60">Opus/HD</div>
            </div>
          </div>
          <div className="pt-2">
             <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div animate={{ width: ["90%", "95%", "92%"] }} transition={{ repeat: Infinity, duration: 2 }} className="h-full bg-gradient-to-r from-neon-purple to-neon-blue" />
             </div>
          </div>
        </div>

        {/* Legacy Chat Container */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 bg-black/60 flex flex-col shadow-2xl flex-1 min-h-[450px] lg:min-h-0 lg:max-h-full">
        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center">
          <h3 className="font-bold flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-neon-purple rounded-full animate-pulse"></span>
            <MessageSquare className="w-4 h-4 text-neon-blue" />
            Studio Chat
          </h3>
        </div>
        <div className="flex-1 relative bg-black/20">
          <iframe
            src="https://dejavufm.com/bchat/"
            className="absolute inset-0 w-full h-full border-none filter contrast-125 brightness-90"
            title="Dejavu FM Chat"
          />
        </div>
        </div>
      </div>
    </motion.div>
  );
}
