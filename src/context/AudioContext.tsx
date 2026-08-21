import { create } from 'zustand';
import { ReactNode } from 'react';
import { toast } from 'sonner';

// External Singletons to avoid putting non-serializable objects in Zustand state
let radioAudio: HTMLAudioElement | null = null;
let podcastAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;

if (typeof window !== 'undefined') {
  radioAudio = new Audio();
  podcastAudio = new Audio();
}

export function getProxiedRadioUrl(url: string | undefined): string {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('/api/public/radio-stream') || trimmed.startsWith('/api/public/stream')) {
    return typeof window !== 'undefined' ? `${window.location.origin}${trimmed}` : trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const path = `/api/public/radio-stream?url=${encodeURIComponent(trimmed)}`;
    return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  }
  if (typeof window !== 'undefined' && trimmed.startsWith('/')) {
    return `${window.location.origin}${trimmed}`;
  }
  return trimmed;
}

export function playRadioAudioWithFallback(rawUrl: string, vol: number): Promise<void> {
  if (!radioAudio || !rawUrl || !rawUrl.trim()) {
    return Promise.reject(new Error("No audio element or empty stream URL"));
  }

  const cleanUrl = rawUrl.trim();
  const proxied = getProxiedRadioUrl(cleanUrl);

  radioAudio.muted = false;
  radioAudio.volume = vol;

  // 1. First attempt: Use the proxied URL with CORS anonymous
  // This avoids Mixed Content on HTTPS and enables the Web Audio analyser / visualizer
  radioAudio.crossOrigin = "anonymous";
  radioAudio.src = proxied;
  radioAudio.load();

  const playPromise = radioAudio.play();
  if (playPromise !== undefined) {
    return playPromise.catch((proxyErr) => {
      if (proxyErr.name === 'AbortError') return;
      console.warn("[AudioContext] Proxied radio stream playback failed, attempting direct source fallback...", proxyErr);

      // 2. Direct Fallback: Remove crossOrigin to prevent CORS errors on Icecast/Shoutcast servers
      if (radioAudio && cleanUrl) {
        radioAudio.removeAttribute('crossOrigin');
        radioAudio.src = cleanUrl;
        radioAudio.load();
        return radioAudio.play().catch((fallbackErr) => {
          if (fallbackErr.name === 'AbortError') return;
          console.error("[AudioContext] Direct radio stream playback fallback also failed:", fallbackErr);
          throw fallbackErr;
        });
      }
      throw proxyErr;
    });
  }
  return Promise.resolve();
}

function getProxiedPodcastUrl(url: string | undefined): string {
  if (!url) return '';
  let path = url;
  if (!url.startsWith('/api/public/podcast-stream') && (url.startsWith('http://') || url.startsWith('https://'))) {
    path = `/api/public/podcast-stream?url=${encodeURIComponent(url)}`;
  }
  if (typeof window !== 'undefined' && path.startsWith('/')) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export type AudioQuality = 'low' | 'medium' | 'high';

interface AudioStore {
  isPlaying: boolean;
  isBuffering: boolean;
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
    facebook?: string;
    startTime?: string;
    endTime?: string;
  } | null;
  isCinematicOpen: boolean;
  
  // Podcast Additions
  activeType: 'radio' | 'podcast';
  podcastTrack: {
    id: string;
    title: string;
    audioUrl: string;
    imageUrl: string;
  } | null;
  podcastProgress: number;
  podcastDuration: number;
  playbackRate: number;
  
  togglePlay: () => void;
  playRadio: () => void;
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
    facebook?: string;
    startTime?: string;
    endTime?: string;
  } | null) => void;
  toggleCinematic: () => void;
  getAnalyser: () => AnalyserNode | null;
  stopAudio: () => void;

  // Podcast Actions
  playPodcast: (track: { id: string; title: string; audioUrl: string; imageUrl: string }) => void;
  seekPodcast: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
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

const getSavedStreamUrl = () => {
  if (typeof window === 'undefined') return "";
  return localStorage.getItem('dejavufm_stream_url') || "";
};

const getSavedQualityUrls = (): Record<AudioQuality, string> => {
  if (typeof window === 'undefined') {
    return { low: "", medium: "", high: "" };
  }
  try {
    const saved = localStorage.getItem('dejavufm_quality_urls');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return { low: "", medium: "", high: "" };
};

const updateMediaMetadata = (currentTrack: string, onAirInfo: AudioStore['onAirInfo']) => {
  if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
    let title = currentTrack && currentTrack !== "DejavuFM Live" ? currentTrack : "DejavuFM Live";
    let artist = "DejavuFM";
    let album = "Live Radio";
    let artwork: any[] = [];

    if (onAirInfo) {
      artist = onAirInfo.djName || artist;
      album = onAirInfo.showName || album;
      if (title === "DejavuFM Live" && onAirInfo.showName) {
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

function initAudioContextIfNeeded() {
  if (typeof window === 'undefined' || !radioAudio) return;
  
  const isMobile = (
    /Mobi|Android|iPhone|iPad|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
  );
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const shouldBypassAudioContext = isMobile || isSafari;

  if (!audioContext && !shouldBypassAudioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass({ latencyHint: 'playback' });
        audioContext = ctx;
        
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 64;
        analyserNode.smoothingTimeConstant = 0.8;
        analyser = analyserNode;
        
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, ctx.currentTime);
        compressor.knee.setValueAtTime(30, ctx.currentTime);
        compressor.ratio.setValueAtTime(12, ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, ctx.currentTime);
        compressor.release.setValueAtTime(0.25, ctx.currentTime);

        try {
          const source = ctx.createMediaElementSource(radioAudio);
          source.connect(compressor);
          compressor.connect(analyserNode);
          analyserNode.connect(ctx.destination);
        } catch (sourceErr) {
          console.warn("[AudioContext] WebAudio source connection bypassed:", sourceErr);
        }
      }
    } catch (err) {
      console.error("Failed to initialize Web Audio API:", err);
    }
  }

  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(console.error);
  }
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  isPlaying: false,
  isBuffering: false,
  isCinematicOpen: false,
  volume: getSavedVolume(),
  currentTrack: "DejavuFM Live",
  streamUrl: getSavedStreamUrl(),
  quality: getSavedQuality(),
  qualityUrls: getSavedQualityUrls(),
  onAirInfo: null,
  
  // Podcast Init State
  activeType: 'radio',
  podcastTrack: null,
  podcastProgress: 0,
  podcastDuration: 0,
  playbackRate: 1.0,

  togglePlay: () => {
    const { isPlaying, activeType, streamUrl, volume, quality, qualityUrls, podcastTrack } = get();

    if (activeType === 'podcast') {
      if (!podcastAudio) return;
      if (isPlaying) {
        podcastAudio.pause();
        set({ isPlaying: false, isBuffering: false });
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      } else {
        if (!podcastTrack?.audioUrl || !podcastTrack.audioUrl.trim()) {
          toast.error("Audio stream not available for this episode.");
          return;
        }

        if (radioAudio) {
          radioAudio.pause();
          radioAudio.src = '';
        }

        const proxiedUrl = getProxiedPodcastUrl(podcastTrack.audioUrl);
        if (podcastAudio.src !== proxiedUrl) {
          podcastAudio.src = proxiedUrl;
          podcastAudio.load();
        }
        podcastAudio.muted = false;
        podcastAudio.playbackRate = get().playbackRate;
        podcastAudio.volume = get().volume;
        set({ isPlaying: true, isBuffering: true });
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';

        const playPromise = podcastAudio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            set({ isPlaying: true, isBuffering: false });
          }).catch(e => {
            if (e.name === 'AbortError') return;
            console.warn("Podcast proxy play failed, trying direct fallback...", e);
            if (podcastAudio && podcastTrack.audioUrl) {
              podcastAudio.src = podcastTrack.audioUrl;
              podcastAudio.load();
              podcastAudio.play().then(() => {
                set({ isPlaying: true, isBuffering: false });
              }).catch(fallbackErr => {
                if (fallbackErr.name === 'AbortError') return;
                console.error("Podcast fallback play error:", fallbackErr);
                toast.error("Failed to load podcast audio stream.");
                set({ isPlaying: false, isBuffering: false });
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
              });
            } else {
              toast.error("Failed to play podcast");
              set({ isPlaying: false, isBuffering: false });
              if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            }
          });
        }
      }
      return;
    }

    if (!radioAudio) return;
    if (podcastAudio) podcastAudio.pause();

    if (isPlaying) {
      radioAudio.pause();
      radioAudio.src = '';
      set({ isPlaying: false, isBuffering: false });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else {
      initAudioContextIfNeeded();
      const targetUrl = streamUrl || qualityUrls[quality] || qualityUrls.medium || qualityUrls.low || qualityUrls.high;
      
      if (!targetUrl) {
        toast.info("Connecting to live station stream...");
        fetch('/api/public/settings')
          .then(res => res.json())
          .then(settings => {
            if (settings && (settings.stream_url || settings.stream_url_medium || settings.stream_url_low || settings.stream_url_high)) {
              const lowUrl = settings.stream_url_low || settings.stream_url || "";
              const medUrl = settings.stream_url_medium || settings.stream_url || "";
              const hiUrl = settings.stream_url_high || settings.stream_url || "";
              const fetchedUrls = { low: lowUrl, medium: medUrl, high: hiUrl };
              const selectedUrl = fetchedUrls[quality] || settings.stream_url || medUrl || lowUrl || hiUrl;
              
              set({ 
                streamUrl: selectedUrl,
                qualityUrls: fetchedUrls,
                isPlaying: true,
                isBuffering: true
              });
              if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
              
              playRadioAudioWithFallback(selectedUrl, volume).then(() => {
                set({ isPlaying: true, isBuffering: false });
              }).catch(e => {
                if (e.name !== 'AbortError') {
                  console.error("Radio stream playback error:", e);
                  toast.error("Failed to connect to live stream. Please check stream URL.");
                }
                set({ isPlaying: false, isBuffering: false });
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
              });
            } else {
              toast.error("Live audio stream URL not configured in Settings.");
              set({ isPlaying: false, isBuffering: false });
            }
          })
          .catch(() => {
            toast.error("Failed to connect to audio server.");
            set({ isPlaying: false, isBuffering: false });
          });
        return;
      }

      set({ isPlaying: true, isBuffering: true });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';

      playRadioAudioWithFallback(targetUrl, volume).then(() => {
        set({ isPlaying: true, isBuffering: false });
      }).catch(e => {
        if (e.name !== 'AbortError') {
          console.error("Radio stream playback error:", e);
          toast.error("Failed to connect to audio stream. Check stream URL.");
        }
        set({ isPlaying: false, isBuffering: false });
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      });
    }
  },

  playRadio: () => {
    if (!radioAudio) return;
    const { streamUrl, volume, quality, qualityUrls } = get();

    if (podcastAudio) {
      podcastAudio.pause();
    }

    set({ activeType: 'radio' });

    let targetUrl = streamUrl || qualityUrls[quality] || qualityUrls.medium || qualityUrls.low || qualityUrls.high;
    if (!targetUrl) {
      fetch('/api/public/settings')
        .then(r => r.json())
        .then(settings => {
          if (settings && (settings.stream_url || settings.stream_url_medium)) {
            const url = settings.stream_url || settings.stream_url_medium || "";
            set({ streamUrl: url });
            playRadioAudioWithFallback(url, volume).catch(() => {});
          }
        })
        .catch(() => {});
      return;
    }

    initAudioContextIfNeeded();

    set({ isPlaying: true, isBuffering: true });
    updateMediaMetadata(get().currentTrack, get().onAirInfo);

    playRadioAudioWithFallback(targetUrl, volume).then(() => {
      set({ isPlaying: true, isBuffering: false });
    }).catch(err => {
      if (err.name === 'AbortError') return;
      console.error("Radio play error:", err);
      set({ isPlaying: false, isBuffering: false });
    });
  },

  playPodcast: (track) => {
    if (!podcastAudio) return;
    
    if (!track?.audioUrl || !track.audioUrl.trim()) {
      toast.error("Audio stream not available for this episode.");
      return;
    }

    const { podcastTrack, isPlaying, activeType } = get();
    
    if (activeType === 'podcast' && podcastTrack?.id === track.id) {
      get().togglePlay();
      return;
    }

    if (radioAudio) {
      radioAudio.pause();
      radioAudio.src = '';
    }

    set({
      activeType: 'podcast',
      podcastTrack: track,
      podcastProgress: 0,
      podcastDuration: 0,
      isPlaying: true,
      isBuffering: true
    });

    const proxiedUrl = getProxiedPodcastUrl(track.audioUrl);

    if (podcastAudio.src !== proxiedUrl) {
      podcastAudio.src = proxiedUrl;
      podcastAudio.load();
    }
    podcastAudio.muted = false;
    podcastAudio.playbackRate = get().playbackRate;
    podcastAudio.volume = get().volume;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: 'DejavuFM',
        album: 'Podcast',
        artwork: [
          { src: track.imageUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: track.imageUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
    }

    const playPromise = podcastAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        set({ isPlaying: true, isBuffering: false });
        fetch('/api/public/analytics/podcast-play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: track.title })
        })
        .then(res => { if (res.ok) return res.json(); })
        .then(data => {
          if (data && data.xpResult) {
            window.dispatchEvent(new CustomEvent('gamificationReward', { detail: data.xpResult }));
          }
        })
        .catch(() => {});
      }).catch(err => {
        if (err.name === 'AbortError') return;
        console.warn("Podcast proxy playback failed, attempting direct source fallback...", err);
        
        if (podcastAudio && track.audioUrl) {
          podcastAudio.src = track.audioUrl;
          podcastAudio.load();
          podcastAudio.play().then(() => {
            set({ isPlaying: true, isBuffering: false });
          }).catch(fallbackErr => {
            if (fallbackErr.name === 'AbortError') return;
            console.error("Direct podcast playback fallback failed:", fallbackErr);
            toast.error("Failed to load podcast audio stream.");
            set({ isPlaying: false, isBuffering: false });
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
          });
        } else {
          toast.error("Failed to play podcast");
          set({ isPlaying: false, isBuffering: false });
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        }
      });
    }
  },

  seekPodcast: (time) => {
    if (!podcastAudio) return;
    podcastAudio.currentTime = time;
    set({ podcastProgress: time });
  },

  setPlaybackRate: (rate) => {
    if (!podcastAudio) return;
    podcastAudio.playbackRate = rate;
    set({ playbackRate: rate });
  },

  setVolume: (val) => {
    if (radioAudio) radioAudio.volume = val;
    if (podcastAudio) podcastAudio.volume = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dejavufm_volume', val.toString());
    }
    set({ volume: val });
  },

  setCurrentTrack: (val) => {
    if (get().currentTrack === val) return;
    set({ currentTrack: val });
    updateMediaMetadata(val, get().onAirInfo);
  },

  setStreamUrl: (val) => {
    if (get().streamUrl === val) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dejavufm_stream_url', val);
    }
    set({ streamUrl: val });
  },

  setQuality: (quality) => {
    const { qualityUrls, isPlaying, activeType, volume } = get();
    if (get().quality === quality) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dejavufm_quality', quality);
    }
    set({ quality });
    
    const targetUrl = qualityUrls[quality] || qualityUrls.medium || qualityUrls.low || qualityUrls.high;
    if (targetUrl && activeType === 'radio') {
      set({ streamUrl: targetUrl });
      
      if (isPlaying && radioAudio) {
        playRadioAudioWithFallback(targetUrl, volume).catch(e => {
          if (e.name !== 'AbortError') console.error("Quality switch play error:", e);
        });
      }
    }
  },

  setQualityUrls: (urls) => {
    const prev = get().qualityUrls;
    if (prev && prev.low === urls.low && prev.medium === urls.medium && prev.high === urls.high) {
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('dejavufm_quality_urls', JSON.stringify(urls));
    }
    const currentQuality = get().quality;
    const updates: Partial<AudioStore> = { qualityUrls: urls };
    const bestUrl = urls[currentQuality] || urls.medium || urls.low || urls.high;
    if (bestUrl) {
      updates.streamUrl = bestUrl;
      if (typeof window !== 'undefined') {
        localStorage.setItem('dejavufm_stream_url', bestUrl);
      }
    }
    set(updates);
  },

  setOnAirInfo: (info) => {
    const current = get().onAirInfo;
    if (current === null && info === null) return;
    if (
      current !== null && 
      info !== null &&
      current.djName === info.djName &&
      current.showName === info.showName &&
      current.djPhoto === info.djPhoto &&
      current.startTime === info.startTime &&
      current.endTime === info.endTime &&
      current.djBio === info.djBio &&
      current.instagram === info.instagram
    ) {
      return;
    }
    set({ onAirInfo: info });
    updateMediaMetadata(get().currentTrack, info);
  },

  toggleCinematic: () => {
    set((state) => ({ isCinematicOpen: !state.isCinematicOpen }));
  },

  getAnalyser: () => analyser,

  stopAudio: () => {
    if (radioAudio) {
      radioAudio.pause();
      radioAudio.src = '';
    }
    if (podcastAudio) {
      podcastAudio.pause();
    }
    set({ isPlaying: false, isBuffering: false });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
}));

if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'DejavuFM Live',
    artist: 'DejavuFM',
    album: 'Live Radio',
  });

  const setSafeActionHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (e) {
      // Action not supported in this browser
    }
  };

  setSafeActionHandler('play', () => {
    const store = useAudioStore.getState();
    if (!store.isPlaying) {
      store.togglePlay();
    }
  });

  setSafeActionHandler('pause', () => {
    if (useAudioStore.getState().isPlaying) {
      useAudioStore.getState().togglePlay();
    }
  });

  setSafeActionHandler('stop', () => {
    useAudioStore.getState().stopAudio();
  });

  setSafeActionHandler('seekbackward', (details) => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast' && podcastAudio) {
      const skip = details.seekOffset || 10;
      const target = Math.max(0, podcastAudio.currentTime - skip);
      store.seekPodcast(target);
    }
  });

  setSafeActionHandler('seekforward', (details) => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast' && podcastAudio) {
      const skip = details.seekOffset || 10;
      const target = Math.min(podcastAudio.duration || Infinity, podcastAudio.currentTime + skip);
      store.seekPodcast(target);
    }
  });

  setSafeActionHandler('seekto', (details) => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast' && details.seekTime !== undefined && details.seekTime !== null) {
      store.seekPodcast(details.seekTime);
    }
  });

  setSafeActionHandler('previoustrack', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast' && podcastAudio) {
      store.seekPodcast(0);
    }
  });

  setSafeActionHandler('nexttrack', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      store.togglePlay();
    }
  });
}

// Attach Event Listeners to Radio Audio
if (typeof window !== 'undefined' && radioAudio) {
  let recoveryTimeout: ReturnType<typeof setTimeout> | null = null;
  let isRecovering = false;
  let retryCount = 0;
  const MAX_RETRIES = 5;

  let silenceCheckInterval: ReturnType<typeof setInterval> | null = null;
  let lastPosition = 0;
  let stuckTicks = 0;

  const attemptRecovery = () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') return;
    if (!store.isPlaying || !radioAudio || isRecovering) return;

    if (retryCount >= MAX_RETRIES) {
      console.warn(`[Radio] Max recovery retries (${MAX_RETRIES}) reached.`);
      retryCount = 0;
      isRecovering = false;
      useAudioStore.setState({ isPlaying: false, isBuffering: false });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      toast.error("Stream connection timed out. Tap play to retry.");
      return;
    }
    
    isRecovering = true;
    retryCount++;
    useAudioStore.setState({ isBuffering: true });
    
    if (recoveryTimeout) clearTimeout(recoveryTimeout);
    recoveryTimeout = setTimeout(() => {
      const currentStore = useAudioStore.getState();
      if (currentStore.isPlaying && currentStore.activeType === 'radio' && radioAudio) {
        // Adaptive stream fallback: on retry >= 2, try alternate lower bitrate stream if available
        let rawTarget = currentStore.streamUrl || currentStore.qualityUrls[currentStore.quality] || currentStore.qualityUrls.medium;
        if (retryCount >= 2 && currentStore.qualityUrls) {
          rawTarget = currentStore.qualityUrls.low || currentStore.qualityUrls.medium || rawTarget;
        }

        if (rawTarget && useAudioStore.getState().isPlaying) {
          playRadioAudioWithFallback(rawTarget, currentStore.volume).then(() => {
            isRecovering = false;
            useAudioStore.setState({ isBuffering: false });
          }).catch(e => {
            if (e.name !== 'AbortError') console.error("Radio recovery failed:", e);
            isRecovering = false;
          });
        } else {
          isRecovering = false;
          useAudioStore.setState({ isBuffering: false });
        }
      } else {
        isRecovering = false;
        useAudioStore.setState({ isBuffering: false });
      }
    }, 1500);
  };

  const startSilenceMonitor = () => {
    if (silenceCheckInterval) clearInterval(silenceCheckInterval);
    if (radioAudio) {
      lastPosition = radioAudio.currentTime;
    }
    stuckTicks = 0;

    silenceCheckInterval = setInterval(() => {
      const store = useAudioStore.getState();
      if (!store.isPlaying || store.activeType !== 'radio' || !radioAudio) {
        stopSilenceMonitor();
        return;
      }

      const currentPos = radioAudio.currentTime;
      if (currentPos === lastPosition && !radioAudio.paused) {
        stuckTicks++;
      } else {
        stuckTicks = 0;
        lastPosition = currentPos;
      }

      if (stuckTicks >= 4) {
        stuckTicks = 0;
        attemptRecovery();
      }
    }, 1500);
  };

  const stopSilenceMonitor = () => {
    if (silenceCheckInterval) {
      clearInterval(silenceCheckInterval);
      silenceCheckInterval = null;
    }
  };

  radioAudio.addEventListener('error', (e) => {
    const store = useAudioStore.getState();
    if (store.activeType === 'radio') {
      attemptRecovery();
    }
  });

  radioAudio.addEventListener('waiting', () => {
    if (useAudioStore.getState().activeType === 'radio') {
      useAudioStore.setState({ isBuffering: useAudioStore.getState().isPlaying });
    }
  });

  radioAudio.addEventListener('canplay', () => {
    if (useAudioStore.getState().activeType === 'radio') {
      useAudioStore.setState({ isBuffering: false });
    }
  });

  radioAudio.addEventListener('playing', () => {
    if (useAudioStore.getState().activeType === 'radio') {
      useAudioStore.setState({ isPlaying: true, isBuffering: false });
      isRecovering = false;
      retryCount = 0;
      if (recoveryTimeout) {
        clearTimeout(recoveryTimeout);
        recoveryTimeout = null;
      }
      startSilenceMonitor();
    }
  });

  radioAudio.addEventListener('play', () => {
    if (useAudioStore.getState().activeType === 'radio') {
      useAudioStore.setState({ isPlaying: true });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      startSilenceMonitor();
    }
  });

  radioAudio.addEventListener('pause', () => {
    if (useAudioStore.getState().activeType === 'radio') {
      useAudioStore.setState({ isPlaying: false, isBuffering: false });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      stopSilenceMonitor();
    }
  });
}

// Attach Event Listeners to Podcast Audio
if (typeof window !== 'undefined' && podcastAudio) {
  const updateMediaSessionPosition = () => {
    if ('mediaSession' in navigator && typeof navigator.mediaSession.setPositionState === 'function' && podcastAudio) {
      try {
        const duration = isFinite(podcastAudio.duration) && podcastAudio.duration > 0 ? podcastAudio.duration : 0;
        const position = isFinite(podcastAudio.currentTime) ? podcastAudio.currentTime : 0;
        if (duration > 0 && position <= duration) {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: podcastAudio.playbackRate || 1.0,
            position: position
          });
        }
      } catch (e) {
        // Suppress position state sync error if duration temporarily invalid
      }
    }
  };

  podcastAudio.addEventListener('timeupdate', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast' && podcastAudio) {
      useAudioStore.setState({
        podcastProgress: podcastAudio.currentTime,
        podcastDuration: isFinite(podcastAudio.duration) && podcastAudio.duration > 0 ? podcastAudio.duration : store.podcastDuration
      });
      updateMediaSessionPosition();
    }
  });

  podcastAudio.addEventListener('durationchange', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast' && podcastAudio && isFinite(podcastAudio.duration)) {
      useAudioStore.setState({ podcastDuration: podcastAudio.duration });
      updateMediaSessionPosition();
    }
  });

  podcastAudio.addEventListener('ended', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      useAudioStore.setState({ isPlaying: false, podcastProgress: 0, isBuffering: false });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }
  });

  podcastAudio.addEventListener('playing', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      useAudioStore.setState({ isPlaying: true, isBuffering: false });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    }
  });

  podcastAudio.addEventListener('play', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      useAudioStore.setState({ isPlaying: true });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    }
  });

  podcastAudio.addEventListener('pause', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      useAudioStore.setState({ isPlaying: false, isBuffering: false });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }
  });

  podcastAudio.addEventListener('waiting', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      useAudioStore.setState({ isBuffering: true });
    }
  });

  podcastAudio.addEventListener('canplay', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      useAudioStore.setState({ isBuffering: false });
    }
  });

  podcastAudio.addEventListener('canplaythrough', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      useAudioStore.setState({ isBuffering: false });
    }
  });

  podcastAudio.addEventListener('error', (e) => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      console.warn("[PodcastAudio] Error event fired:", e);
      useAudioStore.setState({ isBuffering: false });
    }
  });
}

// Global Buffering Safety Watchdog
if (typeof window !== 'undefined') {
  let bufferingSafetyTimer: ReturnType<typeof setTimeout> | null = null;

  useAudioStore.subscribe((state) => {
    if (state.isBuffering && state.isPlaying) {
      if (!bufferingSafetyTimer) {
        bufferingSafetyTimer = setTimeout(() => {
          bufferingSafetyTimer = null;
          const currentStore = useAudioStore.getState();
          if (currentStore.isBuffering) {
            useAudioStore.setState({ isBuffering: false });
          }
        }, 10000);
      }
    } else {
      if (bufferingSafetyTimer) {
        clearTimeout(bufferingSafetyTimer);
        bufferingSafetyTimer = null;
      }
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
