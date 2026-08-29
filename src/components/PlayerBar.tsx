import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Volume2, Radio, Sliders, Monitor, Mic2, Minimize2, ChevronUp, RotateCcw, RotateCw, FastForward } from 'lucide-react';
import { useAudio, AudioQuality } from '../context/AudioContext';
import { useLogo } from '../hooks/useLogo';
import { safeFetchJson } from '../utils/safeFetch';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { triggerHaptic } from '../lib/hapticHelper';

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
    queryFn: () => safeFetchJson('/api/public/settings'),
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
                  triggerHaptic('selection');
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

function formatTime(secs: number) {
  if (isNaN(secs) || !isFinite(secs)) return "0:00";
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function PlayerBar() {
  const { 
    isPlaying, 
    isBuffering, 
    togglePlay, 
    volume, 
    setVolume, 
    onAirInfo, 
    toggleCinematic, 
    activeType, 
    podcastTrack,
    podcastProgress,
    podcastDuration,
    seekPodcast,
    playbackRate,
    setPlaybackRate
  } = useAudio();
  const { logoUrl, isLightMode, settings, resolveDjImage } = useLogo();
  
  const { data: djs } = useQuery<any[]>({
    queryKey: ['djs'],
    queryFn: () => safeFetchJson('/api/public/djs'),
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

  const handleSkip = (delta: number) => {
    if (activeType !== 'podcast') return;
    triggerHaptic('light');
    const maxDur = podcastDuration || 999999;
    const newProgress = Math.max(0, Math.min(maxDur, podcastProgress + delta));
    seekPodcast(newProgress);
  };

  const speedOptions = [1, 1.25, 1.5, 2];
  const toggleSpeed = () => {
    triggerHaptic('selection');
    const currentIdx = speedOptions.indexOf(playbackRate);
    const nextIdx = (currentIdx + 1) % speedOptions.length;
    setPlaybackRate(speedOptions[nextIdx]);
  };

  return (
    <AnimatePresence mode="wait">
      {!isMinimized ? (
        <motion.div 
          key="expanded"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="front-player-bar fixed bottom-[88px] sm:bottom-[112px] xl:bottom-8 left-0 right-0 z-50 px-2 sm:px-6 pointer-events-none"
        >
          <div className={`front-player-bar-card max-w-6xl mx-auto backdrop-blur-3xl rounded-2xl md:rounded-3xl h-24 md:h-28 flex flex-col justify-center px-3 sm:px-6 md:px-10 border relative group pointer-events-auto shadow-2xl ${isLightMode ? "bg-[#ffffff]/95 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-black/10" : "bg-dark-bg/95 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10"}`}>
            {/* Close/Minimize Button */}
            <button 
              onClick={() => {
                triggerHaptic('selection');
                setIsMinimized(true);
              }}
              className={`front-player-minimize-btn absolute top-1.5 right-1.5 md:top-3 md:right-3 p-1.5 md:p-2 rounded-full transition-all z-20 ${isLightMode ? "text-black/30 hover:text-black hover:bg-black/10" : "text-white/30 hover:text-white hover:bg-white/10"}`}
              title="Minimize Player"
            >
              <Minimize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>

            {/* Podcast Scrub Bar (Compact top row when in podcast mode) */}
            {activeType === 'podcast' && podcastTrack && (
              <div className="w-full flex items-center space-x-2 text-[10px] md:text-xs font-mono mb-1 select-none">
                <span className={`shrink-0 ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>
                  {formatTime(podcastProgress)}
                </span>
                <div className="relative flex-1 group/scrub py-1">
                  <input
                    type="range"
                    min="0"
                    max={podcastDuration || 100}
                    step="1"
                    value={podcastProgress}
                    onChange={(e) => seekPodcast(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple focus:outline-none"
                  />
                </div>
                <span className={`shrink-0 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                  {formatTime(podcastDuration)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between w-full">
              <div className="front-player-left flex-1 flex items-center space-x-2 sm:space-x-3 md:space-x-6 overflow-hidden">
                <div className="front-player-artwork relative shrink-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl text-dark-bg flex items-center justify-center overflow-hidden transition-all duration-500 ${isPlaying ? 'scale-100' : 'scale-95 grayscale'} ${
                    activeType === 'radio' && resolveDjImage(onAirInfo?.djPhoto) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-black' : 'bg-transparent') : ''
                  }`}>
                    {activeType === 'podcast' && podcastTrack ? (
                      <Link to={`/podcasts/${podcastTrack.id}`} className="w-full h-full block">
                        <img src={podcastTrack.imageUrl} alt={podcastTrack.title} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </Link>
                    ) : resolveDjImage(onAirInfo?.djPhoto) ? (
                      <img src={resolveDjImage(onAirInfo?.djPhoto)} alt={onAirInfo?.djName || "DJ"} className={`w-full h-full ${resolveDjImage(onAirInfo?.djPhoto) === logoUrl && logoUrl ? 'object-contain p-2' : 'object-cover'}`} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-white">
                        <Mic2 className="w-5 h-5 md:w-8 md:h-8" />
                      </div>
                    )}
                  </div>
                  {isPlaying && (
                    <div className="absolute -inset-1 rounded-xl md:rounded-2xl border border-neon-blue/30 animate-pulse duration-1000 pointer-events-none"></div>
                  )}
                </div>
                
                <div className="front-player-info flex-1 min-w-0 pr-2">
                  <div className="flex items-center space-x-2 md:space-x-3 mb-0.5 flex-wrap gap-y-1">
                    <p className={`text-[8px] md:text-xs uppercase tracking-[0.2em] font-black flex items-center shrink-0 ${isLightMode ? "text-black/60" : "text-white/60"}`}>
                      <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mr-2 glow-box shrink-0 ${isBuffering && isPlaying ? 'bg-amber-500 animate-pulse' : isPlaying ? 'bg-neon-blue animate-pulse' : isLightMode ? 'bg-black/20' : 'bg-white/20'}`}></span>
                      <span className="truncate">
                        {isBuffering && isPlaying ? 'Buffering feed...' : (activeType === 'podcast' ? 'Podcast Player' : (onAirInfo ? 'Broadcasting Live' : 'Auto-Mix Mode'))}
                      </span>
                    </p>
                  </div>
                  
                  <h4 className={`front-player-title font-display font-bold text-xs sm:text-sm md:text-xl truncate tracking-tight leading-tight mb-0.5 ${isLightMode ? "text-black" : "text-white"}`}>
                    {activeType === 'podcast' && podcastTrack ? (
                      <Link to={`/podcasts/${podcastTrack.id}`} className="flex items-center truncate hover:text-neon-purple transition-colors">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue font-black uppercase italic tracking-tighter mr-2 pr-2 shrink-0">EPISODE</span>
                        <span className={`opacity-80 font-medium truncate ${isLightMode ? "text-black" : "text-white"}`}>{podcastTrack.title}</span>
                      </Link>
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
                  {activeType === 'radio' && (
                    <div className="lg:hidden flex items-center">
                      <QualitySelector />
                    </div>
                  )}
                </div>
              </div>

              <div className="front-player-center flex items-center justify-center shrink-0 space-x-2 sm:space-x-3 mx-1 sm:mx-2 md:mx-6 relative">
                {activeType === 'podcast' && (
                  <button
                    type="button"
                    onClick={() => handleSkip(-15)}
                    aria-label="Rewind 15 seconds"
                    className={`p-1.5 sm:p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${
                      isLightMode ? 'text-black/60 hover:text-black hover:bg-black/5' : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title="Rewind 15s"
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}

                <button 
                  onClick={() => {
                    triggerHaptic(isPlaying ? 'light' : 'medium');
                    togglePlay();
                  }}
                  className={`front-player-play-btn w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all relative group/play z-10 ${isLightMode ? "bg-black text-[#ffffff] shadow-[0_0_40px_rgba(0,0,0,0.2)]" : "bg-white text-dark-bg shadow-[0_0_40px_rgba(255,255,255,0.3)]"}`}
                >
                  {isBuffering && isPlaying ? (
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full border-3 border-t-neon-blue animate-spin ${isLightMode ? "border-[#ffffff]" : "border-dark-bg"}`} />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 ml-0.5 sm:ml-1 fill-current" />
                  )}
                </button>

                {activeType === 'podcast' && (
                  <button
                    type="button"
                    onClick={() => handleSkip(15)}
                    aria-label="Skip forward 15 seconds"
                    className={`p-1.5 sm:p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${
                      isLightMode ? 'text-black/60 hover:text-black hover:bg-black/5' : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title="Skip forward 15s"
                  >
                    <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
                
                {/* Animated rings around play button */}
                {isPlaying && (
                  <>
                    <div className={`absolute inset-0 rounded-full border animate-[ping_2s_linear_infinite] scale-150 opacity-0 pointer-events-none ${isLightMode ? "border-black/20" : "border-white/20"}`}></div>
                    <div className={`absolute inset-0 rounded-full border animate-[ping_3s_linear_infinite] scale-[2] opacity-0 pointer-events-none ${isLightMode ? "border-black/10" : "border-white/10"}`}></div>
                  </>
                )}
              </div>

              <div className="front-player-right flex-1 flex justify-end items-center space-x-3 sm:space-x-6 hidden md:flex">
                <div className="flex flex-col items-end space-y-1.5">
                  {activeType === 'radio' ? (
                    <QualitySelector />
                  ) : (
                    <button
                      type="button"
                      onClick={toggleSpeed}
                      className={`flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all ${
                        isLightMode ? 'bg-black/5 hover:bg-black/10 text-black/70 border-black/10' : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                      }`}
                      title="Toggle Playback Speed"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>{playbackRate}x Speed</span>
                    </button>
                  )}
                  <div className={`front-player-volume flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-1.5 rounded-xl border ${isLightMode ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"}`}>
                    <Volume2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLightMode ? "text-black/40" : "text-white/40"}`} />
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-16 sm:w-24 accent-neon-blue cursor-pointer"
                    />
                  </div>
                </div>
                {activeType === 'radio' && (
                  <button 
                    onClick={() => toggleCinematic()}
                    className="front-player-visualizer-btn relative group transition-opacity hover:opacity-80 shrink-0"
                    title="Open Cinematic Visualizer"
                  >
                    <Visualizer isPlaying={isPlaying} volume={volume} isLightMode={isLightMode} />
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg ${isLightMode ? "bg-[#ffffff]/40" : "bg-black/40"}`}>
                      <Monitor className={`w-5 h-5 ${isLightMode ? "text-black" : "text-white"}`} />
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="minimized"
          initial={{ scale: 0, opacity: 0, x: 50 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0, opacity: 0, x: 50 }}
          className="front-player-bar-minimized fixed bottom-[88px] sm:bottom-[112px] xl:bottom-8 right-3 sm:right-8 z-50 hidden sm:flex items-center space-x-2 sm:space-x-3 cursor-grab active:cursor-grabbing touch-none select-none"
          drag
          dragConstraints={dragConstraints}
          dragElastic={0.1}
          dragMomentum={false}
        >
          <div className={`backdrop-blur-3xl border rounded-full p-1 sm:p-1.5 flex items-center ${isLightMode ? "bg-[#ffffff]/80 border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)]" : "bg-dark-bg/80 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"}`}>
             <button 
              onClick={() => {
                triggerHaptic('selection');
                setIsMinimized(false);
              }}
              className={`p-1.5 sm:p-2 rounded-full transition-all mr-0.5 sm:mr-1 ${isLightMode ? "text-black/50 hover:text-black hover:bg-black/10" : "text-white/50 hover:text-white hover:bg-white/10"}`}
              title="Expand Player"
            >
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={() => {
                triggerHaptic(isPlaying ? 'light' : 'medium');
                togglePlay();
              }}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all ${isLightMode ? "bg-black text-[#ffffff] shadow-[0_10px_30px_rgba(0,0,0,0.2)]" : "bg-white text-dark-bg shadow-[0_10px_30px_rgba(255,255,255,0.3)]"}`}
            >
              {isBuffering && isPlaying ? (
                <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-t-neon-blue animate-spin ${isLightMode ? "border-[#ffffff]" : "border-dark-bg"}`} />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 sm:ml-1 fill-current" />
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
