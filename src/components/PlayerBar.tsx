import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Volume2, Radio, Sliders, Monitor, Mic2, Minimize2, ChevronUp } from 'lucide-react';
import { useAudio, AudioQuality } from '../context/AudioContext';
import { useLogo } from '../hooks/useLogo';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

function Visualizer({ isPlaying, volume, isLightMode }: { isPlaying: boolean; volume: number; isLightMode: boolean }) {
  const numBars = 16;
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const { getAnalyser } = useAudio();
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    const animate = () => {
      const analyser = getAnalyser();
      const children = containerRef.current?.children;
      
      if (isPlaying && volume > 0 && analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        let hasData = false;
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > 0) {
            hasData = true;
            break;
          }
        }

        if (hasData) {
          if (children) {
            for (let i = 0; i < numBars; i++) {
              const binIndex = Math.floor(i * (dataArray.length * 0.4) / numBars); 
              const value = dataArray[binIndex]; 
              const percent = (value / 255) * 100;
              const h = Math.min(100, Math.max(15, percent));
              const child = children[i] as HTMLDivElement;
              if (child) {
                child.style.height = `${h}%`;
                child.style.opacity = '0.9';
              }
            }
          }
          requestRef.current = requestAnimationFrame(animate);
        } else {
          if (children) {
            for (let i = 0; i < numBars; i++) {
              const min = 15;
              const max = 20 + (80 * volume);
              const val = Math.random() * (max - min) + min;
              const child = children[i] as HTMLDivElement;
              if (child) {
                child.style.height = `${val}%`;
                child.style.opacity = '0.9';
              }
            }
          }
          interval = setTimeout(animate, 150);
        }
      } else if (isPlaying && volume > 0) {
        if (children) {
          for (let i = 0; i < numBars; i++) {
            const min = 15;
            const max = 20 + (80 * volume);
            const val = Math.random() * (max - min) + min;
            const child = children[i] as HTMLDivElement;
            if (child) {
              child.style.height = `${val}%`;
              child.style.opacity = '0.9';
            }
          }
        }
        interval = setTimeout(animate, 150);
      } else {
        if (children) {
          for (let i = 0; i < numBars; i++) {
            const child = children[i] as HTMLDivElement;
            if (child) {
              child.style.height = '10%';
              child.style.opacity = '0.2';
            }
          }
        }
      }
    };
    
    if (isPlaying) {
      animate();
    } else {
      const children = containerRef.current?.children;
      if (children) {
        for (let i = 0; i < numBars; i++) {
          const child = children[i] as HTMLDivElement;
          if (child) {
            child.style.height = '10%';
            child.style.opacity = '0.2';
          }
        }
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (interval) clearTimeout(interval);
    };
  }, [isPlaying, volume, getAnalyser]);

  return (
    <div ref={containerRef} className="flex items-end space-x-[2px] h-8 mr-8 align-bottom">
      {Array.from({ length: numBars }).map((_, i) => (
        <div 
          key={i} 
          className={`w-1 rounded-full ${
            isPlaying 
              ? 'transition-[opacity] duration-150 ease-linear' 
              : 'transition-[height,opacity] duration-500 ease-out'
          } ${i % 3 === 0 ? 'bg-neon-purple shadow-[0_0_12px_rgba(176,38,255,0.6)]' : i % 3 === 1 ? 'bg-neon-blue shadow-[0_0_12px_rgba(0,210,255,0.6)]' : `${isLightMode ? "bg-black/60 shadow-[0_0_12px_rgba(0,0,0,0.1)]" : "bg-[#ffffff] shadow-[0_0_12px_rgba(255,255,255,0.6)]"}`}`}
          style={{ height: '10%', opacity: 0.2 }}
        />
      ))}
    </div>
  );
}

function QualitySelector() {
  const { isLightMode } = useLogo();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
  });

  const { quality, setQuality, qualityUrls } = useAudio();
  const [isOpen, setIsOpen] = useState(false);

  if (settings?.feat_stream_quality === '0') return null;

  const availableQualities = (Object.keys(qualityUrls) as AudioQuality[])
    .filter(k => !!qualityUrls[k]);
  
  if (availableQualities.length === 0) return null;

  const qualityLabels: Record<AudioQuality, string> = {
    low: '64K / Low',
    medium: '128K / HD',
    high: '320K / HQ'
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 transition-all text-[9px] md:text-xs font-bold uppercase tracking-widest px-2 md:px-3 py-1 md:py-1.5 rounded-lg border ${isLightMode ? "text-black/40 hover:text-black bg-black/5 hover:bg-black/10 border-black/5" : "text-white/40 hover:text-white bg-white/5 hover:bg-white/10 border-white/5"}`}
      >
        <Sliders className="w-3 h-3 md:w-3.5 md:h-3.5" />
        <span>{qualityLabels[quality] || quality}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className={`absolute bottom-full right-0 mb-4 backdrop-blur-3xl border rounded-2xl p-1.5 shadow-2xl z-[70] min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-200 ${isLightMode ? "bg-[#ffffff]/95 border-black/10" : "bg-dark-bg/95 border-white/10"}`}>
            <p className={`px-3 py-2 text-[10px] uppercase tracking-widest font-bold border-b mb-1 ${isLightMode ? "text-black/30 border-black/5" : "text-white/30 border-white/5"}`}>Select Quality</p>
            {availableQualities.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuality(q);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${quality === q ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(176,38,255,0.4)]' : isLightMode ? 'text-black/50 hover:bg-black/5 hover:text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
              >
                {qualityLabels[q]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PlayerBar() {
  const { isPlaying, isBuffering, togglePlay, volume, setVolume, onAirInfo, toggleCinematic, activeType, podcastTrack } = useAudio();
  const { logoUrl, isLightMode, settings, resolveDjImage } = useLogo();
  
  const { data: djs } = useQuery<any[]>({
    queryKey: ['djs'],
    queryFn: () => fetch('/api/public/djs').then(res => res.json()),
  });

  const matchedDj = djs?.find(dj => {
    const djNameLower = dj.name.toLowerCase().trim();
    const currentDjNameLower = onAirInfo?.djName?.toLowerCase().trim() || '';
    return djNameLower === currentDjNameLower || 
           (currentDjNameLower && djNameLower.includes(currentDjNameLower)) ||
           (currentDjNameLower && currentDjNameLower.includes(djNameLower));
  });
  
  const [isMinimized, setIsMinimized] = useState(true);

  const [dragConstraints, setDragConstraints] = useState({ left: -800, right: 50, top: -600, bottom: 50 });

  useEffect(() => {
    const handleResize = () => {
      setDragConstraints({
        left: -window.innerWidth + 150,
        right: 50,
        top: -window.innerHeight + 150,
        bottom: 50
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {!isMinimized ? (
        <motion.div 
          key="expanded"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="front-player-bar hidden sm:block fixed bottom-[104px] sm:bottom-[112px] xl:bottom-8 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none"
        >
          <div className={`front-player-bar-card max-w-6xl mx-auto backdrop-blur-3xl rounded-2xl md:rounded-3xl h-20 md:h-28 flex items-center px-4 md:px-10 border relative group pointer-events-auto ${isLightMode ? "bg-[#ffffff]/95 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-black/10" : "bg-dark-bg/95 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10"}`}>
            {/* Close/Minimize Button */}
            <button 
              onClick={() => setIsMinimized(true)}
              className={`front-player-minimize-btn absolute top-2 right-2 md:top-4 md:right-4 p-2 rounded-full transition-all ${isLightMode ? "text-black/30 hover:text-black hover:bg-black/10" : "text-white/30 hover:text-white hover:bg-white/10"}`}
              title="Minimize Player"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            <div className="front-player-left flex-1 flex items-center space-x-3 md:space-x-6 overflow-hidden">
              <div className="front-player-artwork relative shrink-0">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl text-dark-bg flex items-center justify-center overflow-hidden transition-all duration-500 ${isPlaying ? 'scale-100' : 'scale-95 grayscale'} ${
                  activeType === 'radio' && resolveDjImage(onAirInfo?.djPhoto) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-black' : 'bg-transparent') : ''
                }`}>
                  {activeType === 'podcast' && podcastTrack ? (
                    <img src={podcastTrack.imageUrl} alt={podcastTrack.title} className="w-full h-full object-cover" />
                  ) : resolveDjImage(onAirInfo?.djPhoto) ? (
                    <img src={resolveDjImage(onAirInfo?.djPhoto)} alt={onAirInfo?.djName || "DJ"} className={`w-full h-full ${resolveDjImage(onAirInfo?.djPhoto) === logoUrl && logoUrl ? 'object-contain p-2' : 'object-cover'}`} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-white">
                      <Mic2 className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                  )}
                </div>
                {isPlaying && (
                  <div className="absolute -inset-1 rounded-xl md:rounded-2xl border border-neon-blue/30 animate-pulse duration-1000"></div>
                )}
              </div>
              
              <div className="front-player-info flex-1 min-w-0 pr-2">
                <div className="flex items-center space-x-2 md:space-x-3 mb-1 flex-wrap gap-y-1">
                  <p className={`text-[8px] md:text-xs uppercase tracking-[0.2em] font-black flex items-center shrink-0 ${isLightMode ? "text-black/60" : "text-white/60"}`}>
                    <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mr-2 glow-box shrink-0 ${isBuffering && isPlaying ? 'bg-amber-500 animate-pulse' : isPlaying ? 'bg-neon-blue animate-pulse' : isLightMode ? 'bg-black/20' : 'bg-white/20'}`}></span>
                    <span className="truncate">
                      {isBuffering && isPlaying ? 'Buffering feed...' : (activeType === 'podcast' ? 'Podcast Player' : (onAirInfo ? 'Broadcasting Live' : 'Auto-Mix Mode'))}
                    </span>
                  </p>
                </div>
                
                <h4 className={`front-player-title font-display font-bold text-sm md:text-2xl truncate tracking-tight leading-tight mb-1 ${isLightMode ? "text-black" : "text-white"}`}>
                  {activeType === 'podcast' && podcastTrack ? (
                    <div className="flex items-center truncate">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue font-black uppercase italic tracking-tighter mr-2 pr-2 shrink-0">EPISODE</span>
                      <span className={`opacity-80 font-medium truncate ${isLightMode ? "text-black" : "text-white"}`}>{podcastTrack.title}</span>
                    </div>
                  ) : onAirInfo ? (
                    <div className="flex items-center truncate">
                      <Link 
                        to={matchedDj ? `/djs/${matchedDj.id}` : `/djs?search=${encodeURIComponent(onAirInfo.djName)}`}
                        className="hover:opacity-85 transition-opacity shrink-0 cursor-pointer"
                      >
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue font-black uppercase italic tracking-tighter mr-2 pr-2 shrink-0">{onAirInfo.djName}</span>
                      </Link>
                      <span className={`opacity-80 font-medium truncate ${isLightMode ? "text-black" : "text-white"}`}>{onAirInfo.showName}</span>
                    </div>
                  ) : (
                    <span className={`opacity-80 ${isLightMode ? "text-black" : "text-white"}`}>DejavuFM Global Stream</span>
                  )}
                </h4>
                <div className="lg:hidden flex items-center">
                  <QualitySelector />
                </div>
              </div>
            </div>

            <div className="front-player-center flex items-center justify-center shrink-0 mx-2 md:mx-6 relative">
              <button 
                onClick={togglePlay}
                className={`front-player-play-btn w-12 h-12 md:w-20 md:h-20 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all relative group/play z-10 ${isLightMode ? "bg-black text-[#ffffff] shadow-[0_0_40px_rgba(0,0,0,0.2)]" : "bg-white text-dark-bg shadow-[0_0_40px_rgba(255,255,255,0.3)]"}`}
              >
                {isBuffering && isPlaying ? (
                  <div className={`w-6 h-6 md:w-10 md:h-10 rounded-full border-4 border-t-neon-blue animate-spin ${isLightMode ? "border-[#ffffff]" : "border-dark-bg"}`} />
                ) : isPlaying ? (
                  <Pause className="w-6 h-6 md:w-10 md:h-10 fill-current" />
                ) : (
                  <Play className="w-6 h-6 md:w-10 md:h-10 ml-1 fill-current" />
                )}
              </button>
              
              {/* Animated rings around play button */}
              {isPlaying && (
                <>
                  <div className={`absolute inset-0 rounded-full border animate-[ping_2s_linear_infinite] scale-150 opacity-0 ${isLightMode ? "border-black/20" : "border-white/20"}`}></div>
                  <div className={`absolute inset-0 rounded-full border animate-[ping_3s_linear_infinite] scale-[2] opacity-0 ${isLightMode ? "border-black/10" : "border-white/10"}`}></div>
                </>
              )}
            </div>

            <div className="front-player-right flex-1 flex justify-end items-center space-x-6 hidden lg:flex">
              <div className="flex flex-col items-end space-y-2">
                <QualitySelector />
                <div className={`front-player-volume flex items-center space-x-3 px-4 py-2 rounded-xl border ${isLightMode ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"}`}>
                  <Volume2 className={`w-4 h-4 ${isLightMode ? "text-black/40" : "text-white/40"}`} />
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 accent-neon-blue cursor-pointer"
                  />
                </div>
              </div>
              <button 
                onClick={() => toggleCinematic()}
                className="front-player-visualizer-btn relative group transition-opacity hover:opacity-80"
                title="Open Cinematic Visualizer"
              >
                <Visualizer isPlaying={isPlaying} volume={volume} isLightMode={isLightMode} />
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg ${isLightMode ? "bg-[#ffffff]/40" : "bg-black/40"}`}>
                  <Monitor className={`w-5 h-5 ${isLightMode ? "text-black" : "text-white"}`} />
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="minimized"
          initial={{ scale: 0, opacity: 0, x: 50 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0, opacity: 0, x: 50 }}
          className="front-player-bar-minimized hidden sm:flex fixed bottom-[104px] sm:bottom-[112px] xl:bottom-8 right-4 sm:right-8 z-50 flex items-center space-x-3 cursor-grab active:cursor-grabbing touch-none select-none"
          drag
          dragConstraints={dragConstraints}
          dragElastic={0.1}
          dragMomentum={false}
        >
          <div className={`backdrop-blur-3xl border rounded-full p-1.5 flex items-center ${isLightMode ? "bg-[#ffffff]/80 border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)]" : "bg-dark-bg/80 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"}`}>
             <button 
              onClick={() => setIsMinimized(false)}
              className={`p-2 rounded-full transition-all mr-1 ${isLightMode ? "text-black/50 hover:text-black hover:bg-black/10" : "text-white/50 hover:text-white hover:bg-white/10"}`}
              title="Expand Player"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button 
              onClick={togglePlay}
              className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all ${isLightMode ? "bg-black text-[#ffffff] shadow-[0_10px_30px_rgba(0,0,0,0.2)]" : "bg-white text-dark-bg shadow-[0_10px_30px_rgba(255,255,255,0.3)]"}`}
            >
              {isBuffering && isPlaying ? (
                <div className={`w-5 h-5 rounded-full border-2 border-t-neon-blue animate-spin ${isLightMode ? "border-[#ffffff]" : "border-dark-bg"}`} />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 ml-1 fill-current" />
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
