import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Music, Sparkles } from 'lucide-react';

interface StudioAudioPlayerProps {
  src: string;
  title?: string;
  variant?: 'dark' | 'light' | 'admin';
  compact?: boolean;
  className?: string;
}

export const StudioAudioPlayer: React.FC<StudioAudioPlayerProps> = ({
  src,
  title = "Voice Message",
  variant = 'dark',
  compact = false,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError] = useState(false);

  // Generate a deterministic waveform height pattern based on src URL string hash
  const barCount = compact ? 20 : 32;
  const waveformBars = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
      hash = (hash << 5) - hash + src.charCodeAt(i);
      hash |= 0;
    }
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const pseudoVal = Math.sin(hash + i * 0.75) * 0.5 + 0.5; // range 0 to 1
      // normalize to minimum 0.25 height up to 1.0
      const barHeight = 0.25 + pseudoVal * 0.75;
      bars.push(barHeight);
    }
    return bars;
  }, [src, barCount]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        setHasError(false);
      }).catch((err) => {
        console.error("Audio playback failed:", err);
        setHasError(true);
      });
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const cycleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const targetRatio = Math.max(0, Math.min(1, clickX / width));
    const targetTime = targetRatio * (duration || 0);
    
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Variant classes
  const isLight = variant === 'light';
  const isAdmin = variant === 'admin';

  const containerStyle = isAdmin
    ? 'bg-black/25 backdrop-blur-md border border-white/20 text-white shadow-lg'
    : isLight
      ? 'bg-slate-100/95 backdrop-blur-md border border-slate-200/90 text-slate-800 shadow-sm'
      : 'bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-100 shadow-xl';

  const playBtnStyle = isAdmin
    ? 'bg-white text-purple-700 hover:scale-105 active:scale-95 shadow-md hover:bg-slate-100'
    : isLight
      ? 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 active:scale-95 shadow-md shadow-purple-500/20'
      : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/25';

  const playedBarColor = isAdmin
    ? 'bg-white'
    : isLight
      ? 'bg-purple-600'
      : 'bg-gradient-to-t from-purple-500 to-indigo-400';

  const unplayedBarColor = isAdmin
    ? 'bg-white/30 hover:bg-white/50'
    : isLight
      ? 'bg-slate-300 hover:bg-slate-400/60'
      : 'bg-white/15 hover:bg-white/30';

  return (
    <div className={`relative group/player rounded-2xl p-3 sm:p-3.5 transition-all duration-300 max-w-sm ${containerStyle} ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header Info Bar */}
      <div className="flex items-center justify-between mb-2 text-[11px] font-medium tracking-wide">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className={`p-1 rounded-md ${isAdmin ? 'bg-white/20 text-white' : isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/20 text-purple-300'}`}>
            <Music className="w-3 h-3" />
          </span>
          <span className="truncate max-w-[140px] opacity-90">{title}</span>
          {isPlaying && (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold animate-pulse ml-1">
              <Sparkles className="w-2.5 h-2.5" /> LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 opacity-80 text-[10px] font-mono">
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls & Waveform Interactive Row */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={hasError}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${playBtnStyle} ${
            isPlaying ? 'ring-2 ring-purple-400/50 ring-offset-2 ring-offset-black/20' : ''
          }`}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Interactive Waveform Visualizer & Seek Track */}
        <div 
          onClick={handleSeek}
          className="flex-1 flex items-center gap-[2.5px] h-9 px-1 cursor-pointer group/wave py-1"
          title="Click to seek"
        >
          {waveformBars.map((heightFactor, idx) => {
            const barProgress = (idx / barCount) * 100;
            const isPlayed = barProgress <= progressPercent;

            return (
              <div
                key={idx}
                className="flex-1 flex items-center justify-center h-full"
              >
                <div
                  className={`w-full rounded-full transition-all duration-150 ${
                    isPlayed ? playedBarColor : unplayedBarColor
                  } ${
                    isPlaying && isPlayed ? 'animate-pulse' : ''
                  }`}
                  style={{
                    height: `${Math.max(15, heightFactor * 100)}%`,
                    transform: isPlaying && isPlayed ? 'scaleY(1.15)' : 'scaleY(1)',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Auxiliary Controls */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 dark:border-white/10 text-[10px] font-medium opacity-80">
        <div className="flex items-center gap-2">
          {/* Playback Speed Pill */}
          <button
            type="button"
            onClick={cycleSpeed}
            className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all cursor-pointer border ${
              isAdmin 
                ? 'border-white/30 hover:bg-white/20 text-white' 
                : isLight 
                  ? 'border-slate-300 hover:bg-slate-200 text-slate-700' 
                  : 'border-white/15 hover:bg-white/10 text-purple-300'
            }`}
            title="Change playback speed"
          >
            {playbackRate}x
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer opacity-70 hover:opacity-100"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Download / Open File */}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex items-center gap-1 hover:underline opacity-70 hover:opacity-100 transition-opacity text-[10px]"
          title="Download audio clip"
        >
          <Download className="w-3 h-3" />
          <span>Save</span>
        </a>
      </div>

      {hasError && (
        <div className="mt-1 text-[10px] text-red-400 flex items-center justify-between">
          <span>Failed to load audio</span>
          <a href={src} target="_blank" rel="noopener noreferrer" className="underline">Direct Link</a>
        </div>
      )}
    </div>
  );
};
