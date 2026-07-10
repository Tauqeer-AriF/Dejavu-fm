import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Volume2, Radio, Sliders, Monitor, Mic2, Minimize2, ChevronUp } from 'lucide-react';
import { useAudio, AudioQuality } from '../context/AudioContext';
import { useLogo } from '../hooks/useLogo';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';

function Visualizer({ isPlaying, volume }: { isPlaying: boolean; volume: number }) {
  const numBars = 16;
  const [heights, setHeights] = useState<number[]>(Array(numBars).fill(10));
  const requestRef = useRef<number>();
  const { getAnalyser } = useAudio();
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    const animate = () => {
      const analyser = getAnalyser();
      
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
          const newHeights = Array.from({ length: numBars }, (_, i) => {
            const binIndex = Math.floor(i * (dataArray.length * 0.4) / numBars); 
            const value = dataArray[binIndex]; 
            const percent = (value / 255) * 100;
            return Math.max(15, percent);
          });
          setHeights(newHeights);
          requestRef.current = requestAnimationFrame(animate);
        } else {
          setHeights(Array.from({ length: numBars }, () => {
            const min = 15;
            const max = 20 + (80 * volume);
            return Math.random() * (max - min) + min;
          }));
          interval = setTimeout(animate, 150);
        }
      } else if (isPlaying && volume > 0) {
        setHeights(Array.from({ length: numBars }, () => {
          const min = 15;
          const max = 20 + (80 * volume);
          return Math.random() * (max - min) + min;
        }));
        interval = setTimeout(animate, 150);
      } else {
        setHeights(Array(numBars).fill(10));
      }
    };
    
    if (isPlaying) {
      animate();
    } else {
      setHeights(Array(numBars).fill(10));
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (interval) clearTimeout(interval);
    };
  }, [isPlaying, volume, getAnalyser]);

  return (
    <div className="flex items-end space-x-[2px] h-8 mr-8 align-bottom">
      {heights.map((h, i) => (
        <div 
          key={i} 
          className={`w-1 rounded-full transition-all ease-linear ${isPlaying ? 'duration-50' : 'duration-150'} ${i % 3 === 0 ? 'bg-neon-purple shadow-[0_0_12px_rgba(176,38,255,0.6)]' : i % 3 === 1 ? 'bg-neon-blue shadow-[0_0_12px_rgba(0,210,255,0.6)]' : 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]'}`}
          style={{ height: `${Math.min(100, Math.max(15, h))}%`, opacity: isPlaying && volume > 0 ? 0.9 : 0.2 }}
        />
      ))}
    </div>
  );
}

function QualitySelector() {
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
        className="flex items-center space-x-2 text-white/40 hover:text-white transition-all text-[9px] md:text-xs font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-white/5"
      >
        <Sliders className="w-3 h-3 md:w-3.5 md:h-3.5" />
        <span>{qualityLabels[quality] || quality}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full right-0 mb-4 bg-dark-bg/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-1.5 shadow-2xl z-[70] min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-white/30 font-bold border-b border-white/5 mb-1">Select Quality</p>
            {availableQualities.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuality(q);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${quality === q ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(176,38,255,0.4)]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
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
  const { isPlaying, togglePlay, volume, setVolume, onAirInfo, toggleCinematic } = useAudio();
  const { logoUrl, isLightMode, settings, resolveDjImage } = useLogo();
  
  const [listeners, setListeners] = useState(0);
  const [isMinimized, setIsMinimized] = useState(true);
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

  return (
    <AnimatePresence mode="wait">
      {!isMinimized ? (
        <motion.div 
          key="expanded"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="hidden sm:block fixed bottom-[104px] sm:bottom-[112px] xl:bottom-8 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none"
        >
          <div className="max-w-6xl mx-auto bg-dark-bg/95 backdrop-blur-3xl rounded-2xl md:rounded-3xl h-20 md:h-28 flex items-center px-4 md:px-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative group pointer-events-auto overflow-hidden">
            {/* Progress bar background (always 100% since it's a live stream) */}
            <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-neon-purple/50 via-neon-blue/50 to-neon-purple/50 w-full opacity-30"></div>
            
            {/* Close/Minimize Button */}
            <button 
              onClick={() => setIsMinimized(true)}
              className="absolute top-2 right-2 md:top-4 md:right-4 p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all"
              title="Minimize Player"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            <div className="flex-1 flex items-center space-x-3 md:space-x-6 overflow-hidden">
              <div className="relative shrink-0">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl text-dark-bg flex items-center justify-center overflow-hidden transition-all duration-500 ${isPlaying ? 'scale-100' : 'scale-95 grayscale'} ${
                  resolveDjImage(onAirInfo?.djPhoto) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-white' : 'bg-transparent') : ''
                }`}>
                  {resolveDjImage(onAirInfo?.djPhoto) ? (
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
              
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center space-x-2 md:space-x-3 mb-1 flex-wrap gap-y-1">
                  <p className="text-white/60 text-[8px] md:text-xs uppercase tracking-[0.2em] font-black flex items-center shrink-0">
                    <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mr-2 glow-box shrink-0 ${isPlaying ? 'bg-neon-blue animate-pulse' : 'bg-white/20'}`}></span>
                    <span className="truncate">{onAirInfo ? 'Broadcasting Live' : 'Auto-Mix Mode'}</span>
                  </p>
                  <div className="h-3 w-[1px] bg-white/10 hidden sm:block"></div>
                  <p className="text-neon-purple text-[8px] md:text-xs uppercase tracking-[0.2em] font-black items-center hidden sm:flex">
                    <Monitor className="w-3 h-3 mr-1.5" />
                    {listeners} Listeners
                  </p>
                </div>
                
                <h4 className="text-white font-display font-bold text-sm md:text-2xl truncate tracking-tight leading-tight mb-1">
                  {onAirInfo ? (
                    <div className="flex items-center truncate">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue font-black uppercase italic tracking-tighter mr-2 shrink-0">{onAirInfo.djName}</span>
                      <span className="text-white opacity-80 font-medium truncate">{onAirInfo.showName}</span>
                    </div>
                  ) : (
                    <span className="opacity-80">Dejavu FM Global Stream</span>
                  )}
                </h4>
                <div className="lg:hidden flex items-center">
                  <QualitySelector />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center shrink-0 mx-2 md:mx-6 relative">
              <button 
                onClick={togglePlay}
                className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-white text-dark-bg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] relative group/play z-10"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 md:w-10 md:h-10 fill-current" />
                ) : (
                  <Play className="w-6 h-6 md:w-10 md:h-10 ml-1 fill-current" />
                )}
              </button>
              
              {/* Animated rings around play button */}
              {isPlaying && (
                <>
                  <div className="absolute inset-0 rounded-full border border-white/20 animate-[ping_2s_linear_infinite] scale-150 opacity-0"></div>
                  <div className="absolute inset-0 rounded-full border border-white/10 animate-[ping_3s_linear_infinite] scale-[2] opacity-0"></div>
                </>
              )}
            </div>

            <div className="flex-1 flex justify-end items-center space-x-6 hidden lg:flex">
              <div className="flex flex-col items-end space-y-2">
                <QualitySelector />
                <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  <Volume2 className="text-white/40 w-4 h-4" />
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
                className="relative group transition-opacity hover:opacity-80"
                title="Open Cinematic Visualizer"
              >
                <Visualizer isPlaying={isPlaying} volume={volume} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <Monitor className="w-5 h-5 text-white" />
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
          className="hidden sm:flex fixed bottom-[104px] sm:bottom-[112px] xl:bottom-8 right-4 sm:right-8 z-50 flex items-center space-x-3"
        >
          <div className="bg-dark-bg/80 backdrop-blur-3xl border border-white/10 rounded-full p-1.5 flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
             <button 
              onClick={() => setIsMinimized(false)}
              className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all mr-1"
              title="Expand Player"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button 
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-white text-dark-bg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.3)]"
            >
              {isPlaying ? (
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
