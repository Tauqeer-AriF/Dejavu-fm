import { create } from 'zustand';
import { ReactNode } from 'react';
import { toast } from 'sonner';

// External Singletons to avoid putting non-serializable objects in Zustand state
let audio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;

if (typeof window !== 'undefined') {
  audio = new Audio();
  audio.crossOrigin = "anonymous";
}

export type AudioQuality = 'low' | 'medium' | 'high';

interface AudioStore {
  isPlaying: boolean;
  volume: number;
  currentTrack: string;
  streamUrl: string;
  quality: AudioQuality;
  qualityUrls: Record<AudioQuality, string>;
  onAirInfo: {
    djName: string;
    showName: string;
    djPhoto?: string;
    djBio?: string;
    instagram?: string;
    soundcloud?: string;
    mixcloud?: string;
    startTime?: string;
    endTime?: string;
  } | null;
  isCinematicOpen: boolean;
  
  togglePlay: () => void;
  setVolume: (val: number) => void;
  setCurrentTrack: (val: string) => void;
  setStreamUrl: (val: string) => void;
  setQuality: (quality: AudioQuality) => void;
  setQualityUrls: (urls: Record<AudioQuality, string>) => void;
  setOnAirInfo: (info: { 
    djName: string; 
    showName: string; 
    djPhoto?: string;
    djBio?: string;
    instagram?: string;
    soundcloud?: string;
    mixcloud?: string;
    startTime?: string;
    endTime?: string;
  } | null) => void;
  toggleCinematic: () => void;
  getAnalyser: () => AnalyserNode | null;
}

const getSavedVolume = () => {
  if (typeof window === 'undefined') return 0.8;
  const saved = localStorage.getItem('dejavufm_volume');
  return saved !== null ? parseFloat(saved) : 0.8;
};

const getSavedQuality = (): AudioQuality => {
  if (typeof window === 'undefined') return 'medium';
  const saved = localStorage.getItem('dejavufm_quality') as AudioQuality;
  return ['low', 'medium', 'high'].includes(saved) ? saved : 'medium';
};

const updateMediaMetadata = (currentTrack: string, onAirInfo: AudioStore['onAirInfo']) => {
  if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
    let title = currentTrack && currentTrack !== "Dejavu FM Live" ? currentTrack : "Dejavu FM Live";
    let artist = "Dejavu FM";
    let album = "Live Radio";
    let artwork: any[] = [];

    if (onAirInfo) {
      artist = onAirInfo.djName || artist;
      album = onAirInfo.showName || album;
      if (title === "Dejavu FM Live" && onAirInfo.showName) {
         title = onAirInfo.showName;
      }
      
      if (onAirInfo.djPhoto) {
        artwork = [
          { src: onAirInfo.djPhoto, sizes: '96x96', type: 'image/jpeg' },
          { src: onAirInfo.djPhoto, sizes: '128x128', type: 'image/jpeg' },
          { src: onAirInfo.djPhoto, sizes: '192x192', type: 'image/jpeg' },
          { src: onAirInfo.djPhoto, sizes: '256x256', type: 'image/jpeg' },
          { src: onAirInfo.djPhoto, sizes: '384x384', type: 'image/jpeg' },
          { src: onAirInfo.djPhoto, sizes: '512x512', type: 'image/jpeg' },
        ];
      }
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork
      });
    } catch (e) {
      console.error("Failed to update media session metadata", e);
    }
  }
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  isPlaying: false,
  isCinematicOpen: false,
  volume: getSavedVolume(),
  currentTrack: "Dejavu FM Live",
  streamUrl: "",
  quality: getSavedQuality(),
  qualityUrls: {
    low: "",
    medium: "",
    high: ""
  },
  onAirInfo: null,

  togglePlay: () => {
    const { isPlaying, streamUrl, volume, quality, qualityUrls } = get();
    if (!audio) return;
    
    // Choose the best URL based on quality if streamUrl isn't explicitly set to something else
    let targetUrl = streamUrl;
    if (!targetUrl && qualityUrls[quality]) {
      targetUrl = qualityUrls[quality];
    }
    
    // Init Audio Context on first play if needed
    if (!isPlaying && !audioContext) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          audioContext = ctx;
          
          const analyserNode = ctx.createAnalyser();
          analyserNode.fftSize = 64; // Will yield 32 frequency bins
          analyserNode.smoothingTimeConstant = 0.8;
          analyser = analyserNode;

          // Master Compression / Normalization
          const compressor = ctx.createDynamicsCompressor();
          compressor.threshold.setValueAtTime(-24, ctx.currentTime);
          compressor.knee.setValueAtTime(30, ctx.currentTime);
          compressor.ratio.setValueAtTime(12, ctx.currentTime);
          compressor.attack.setValueAtTime(0.003, ctx.currentTime);
          compressor.release.setValueAtTime(0.25, ctx.currentTime);

          const source = ctx.createMediaElementSource(audio);
          source.connect(compressor);
          compressor.connect(analyserNode);
          analyserNode.connect(ctx.destination);
        }
      } catch (err) {
        console.error("Failed to initialize Web Audio API:", err);
      }
    }
    
    if (!isPlaying && audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    if (!isPlaying) {
      if (audio.src !== targetUrl) {
         audio.src = targetUrl;
         audio.load();
      }
      audio.volume = volume;
      audio.play().then(() => {
        set({ isPlaying: true });
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        
        // Track stream start
        fetch('/api/public/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'stream_starts' })
        }).catch(() => {});
      }).catch(e => {
        if (e.name === 'AbortError') {
           console.log("Playback interrupted by new request, ignoring.");
           return;
        }
        console.error("Autoplay blocked or playback failed:", e);
        toast.error("Failed to connect to stream. Retrying...");
        set({ isPlaying: false });
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      });
    } else {
      audio.pause();
      set({ isPlaying: false });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }
  },

  setVolume: (val: number) => {
    if (audio) audio.volume = val;
    localStorage.setItem('dejavufm_volume', val.toString());
    set({ volume: val });
  },

  setCurrentTrack: (val: string) => {
    const { onAirInfo } = get();
    updateMediaMetadata(val, onAirInfo);
    set({ currentTrack: val });
  },

  setStreamUrl: (val: string) => {
    const { isPlaying } = get();
    if (audio && audio.src !== val) {
      audio.src = val;
      audio.load();
      if (isPlaying) {
        audio.play().then(() => {
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }).catch(e => {
           if (e.name === 'AbortError') return;
           console.error("Playback error:", e);
           toast.error("Failed to connect to stream. Retrying...");
           set({ isPlaying: false });
           if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        });
      }
    }
    set({ streamUrl: val });
  },

  setQuality: (quality: AudioQuality) => {
    const { isPlaying, qualityUrls, quality: currentQuality } = get();
    if (quality === currentQuality) return;

    localStorage.setItem('dejavufm_quality', quality);
    set({ quality });

    const newUrl = qualityUrls[quality];
    if (newUrl && audio) {
      const wasPlaying = isPlaying;
      audio.pause();
      audio.src = newUrl;
      audio.load();
      if (wasPlaying) {
        audio.play().catch(e => {
          if (e.name !== 'AbortError') console.error("Quality switch playback error:", e);
        });
      }
    }
  },

  setQualityUrls: (urls: Record<AudioQuality, string>) => {
    set({ qualityUrls: urls });
    
    // If we're currently playing the default stream, update it to the active quality
    const { quality, isPlaying, streamUrl } = get();
    if (!streamUrl && urls[quality] && audio && audio.src !== urls[quality]) {
       const wasPlaying = isPlaying;
       audio.src = urls[quality];
       audio.load();
       if (wasPlaying) {
         audio.play().catch(e => {
           if (e.name !== 'AbortError') console.error("Playback error after URL update:", e);
         });
       }
    }
  },

  setOnAirInfo: (info) => {
    const { currentTrack } = get();
    updateMediaMetadata(currentTrack, info);
    set({ onAirInfo: info });
  },

  toggleCinematic: () => set(state => ({ isCinematicOpen: !state.isCinematicOpen })),

  getAnalyser: () => analyser
}));

if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'Dejavu FM Live',
    artist: 'Dejavu FM',
    album: 'Live Radio',
  });

  navigator.mediaSession.setActionHandler('play', () => {
    const store = useAudioStore.getState();
    if (!store.isPlaying) {
      store.togglePlay();
    } else if (audio && audio.paused) {
      // Recovery via OS lock screen play button if stream stalled
      audio.load();
      audio.play().catch(e => {
        if (e.name !== 'AbortError') console.error("MediaSession play recovery failed:", e);
      });
    }
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    if (useAudioStore.getState().isPlaying) {
      useAudioStore.getState().togglePlay();
    }
  });
}

// Background & network drop recovery
if (typeof window !== 'undefined' && audio) {
  let recoveryTimeout: ReturnType<typeof setTimeout> | null = null;
  let isRecovering = false;
  let retryCount = 0;
  const MAX_RETRIES = 5;

  const attemptRecovery = () => {
    const store = useAudioStore.getState();
    if (!store.isPlaying || !audio || isRecovering || retryCount >= MAX_RETRIES) return;
    
    isRecovering = true;
    retryCount++;
    console.log(`Audio stream interrupted. Attempting recovery ${retryCount}/${MAX_RETRIES}...`);
    
    // Slight delay to handle brief network switching (e.g., WiFi to Cellular)
    if (recoveryTimeout) clearTimeout(recoveryTimeout);
    recoveryTimeout = setTimeout(() => {
      if (useAudioStore.getState().isPlaying && audio) {
        console.log("Reloading stream buffer...");
        const currentSrc = audio.src;
        audio.src = ''; // Force resource release
        setTimeout(() => {
          if (audio) {
            audio.src = currentSrc;
            audio.load();
            audio.play().catch(e => {
              if (e.name !== 'AbortError') console.error("Background stream recovery failed:", e);
              // Do not togglePlay() here, let it keep retrying or stay 'playing' 
              // until user pauses, so when network returns they can hit play again.
            }).finally(() => {
              isRecovering = false;
            });
          }
        }, 100);
      } else {
        isRecovering = false;
      }
    }, 1500);
  };

  audio.addEventListener('error', attemptRecovery);
  audio.addEventListener('stalled', attemptRecovery);
  audio.addEventListener('ended', attemptRecovery); // A live radio stream shouldn't end smoothly
  
  audio.addEventListener('playing', () => {
    isRecovering = false;
    if (recoveryTimeout) {
      clearTimeout(recoveryTimeout);
      recoveryTimeout = null;
    }
  });
}

// Export a dummy provider so we don't break App.tsx
export function AudioProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// Export the hook with the exact same signature
export function useAudio() {
  return useAudioStore();
}
