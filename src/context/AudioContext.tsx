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

function getProxiedPodcastUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) {
    return `/api/public/podcast-stream?url=${encodeURIComponent(url)}`;
  }
  return url;
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
    if (!audio) return;

    if (activeType === 'podcast') {
      if (isPlaying) {
        audio.pause();
        set({ isPlaying: false });
      } else {
        if (podcastTrack?.audioUrl) {
          const proxiedUrl = getProxiedPodcastUrl(podcastTrack.audioUrl);
          const isSameSource = audio.src && (audio.src === proxiedUrl || audio.src.endsWith(proxiedUrl));
          if (!isSameSource) {
            audio.src = proxiedUrl;
            audio.load();
          }
          audio.playbackRate = get().playbackRate;
          audio.volume = get().volume;
          audio.play().then(() => {
            set({ isPlaying: true });
          }).catch(e => {
            console.error("Podcast play error:", e);
            toast.error("Failed to play podcast");
            set({ isPlaying: false });
          });
        }
      }
      return;
    }

    
    // Choose the best URL based on quality if streamUrl isn't explicitly set to something else
    let targetUrl = streamUrl;
    if (!targetUrl && qualityUrls[quality]) {
      targetUrl = qualityUrls[quality];
    }
    
    if (!isPlaying && !targetUrl) {
      toast.error("Connecting to station feed...");
      // Trigger a direct, synchronous-feeling fetch inside the click gesture flow
      fetch('/api/public/settings')
        .then(res => res.json())
        .then(settings => {
          if (settings && settings.stream_url) {
            const lowUrl = settings.stream_url_low || settings.stream_url;
            const medUrl = settings.stream_url_medium || settings.stream_url;
            const hiUrl = settings.stream_url_high || settings.stream_url;
            const fetchedUrls = { low: lowUrl, medium: medUrl, high: hiUrl };
            const selectedUrl = fetchedUrls[quality];
            
            // Instantly cache in localStorage so it's always ready immediately next time
            localStorage.setItem('dejavufm_stream_url', settings.stream_url);
            localStorage.setItem('dejavufm_quality_urls', JSON.stringify(fetchedUrls));
            
            set({ 
              streamUrl: settings.stream_url,
              qualityUrls: fetchedUrls
            });
            
            if (audio) {
              audio.src = selectedUrl;
              audio.load();
              audio.volume = volume;
              
              set({ isPlaying: true });
              if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
              
              audio.play().catch(e => {
                console.error("Delayed load stream play failed:", e);
                toast.error("Playback failed. Please try again.");
                set({ isPlaying: false });
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
              });
            }
          } else {
            toast.error("Station broadcast feed is currently unavailable.");
          }
        })
        .catch(err => {
          console.error("Direct fallback fetch failed:", err);
          toast.error("Network error. Please try again in a moment.");
        });
      return;
    }
    
    // Init Audio Context on first play if needed
    // Bypassing AudioContext on all mobile devices is vital for reliable background sleep playback
    const isMobile = typeof navigator !== 'undefined' && (
      /Mobi|Android|iPhone|iPad|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
    );
    const isSafari = typeof navigator !== 'undefined' && (
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    );
    const shouldBypassAudioContext = isMobile || isSafari;

    if (!isPlaying && !audioContext && !shouldBypassAudioContext) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          // Use 'playback' latencyHint to optimize buffering/performance on desktop
          const ctx = new AudioContextClass({ latencyHint: 'playback' });
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
      // For live radio, always force load a fresh stream to pull the latest live segment.
      // This prevents the browser from trying to resume a dead/stale HTTP stream buffer.
      if (activeType === 'radio') {
        audio.src = targetUrl;
        audio.load();
      } else if (audio.src !== targetUrl) {
        audio.src = targetUrl;
        audio.load();
      }
      audio.volume = volume;
      
      // Set playing to true immediately to render a pause icon and lock state to prevent click-spamming
      set({ isPlaying: true });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';

      audio.play().then(() => {
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
        toast.error("Failed to connect to stream. Please try again.");
        set({ isPlaying: false });
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      });
    } else {
      audio.pause();
      if (activeType === 'radio') {
        // Disconnect stream completely when paused to save user data,
        // prevent server connection slots leak, and ensure fresh play on resume.
        audio.src = '';
      }
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
    if (val) {
      localStorage.setItem('dejavufm_stream_url', val);
    }
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
    localStorage.setItem('dejavufm_quality_urls', JSON.stringify(urls));
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

  playRadio: () => {
    const { isPlaying, activeType } = get();
    if (!audio) return;
    
    if (activeType !== 'radio') {
      audio.pause();
      // Clear audio source to ensure we fetch fresh stream next
      audio.src = '';
      set({ activeType: 'radio', isPlaying: false });
    }
    
    if (!get().isPlaying) {
      get().togglePlay();
    }
  },

  playPodcast: (track) => {
    if (!audio) return;
    
    const { podcastTrack, isPlaying, activeType } = get();
    
    // If it's already the active podcast track, toggle play/pause
    if (activeType === 'podcast' && podcastTrack?.id === track.id) {
      get().togglePlay();
      return;
    }

    audio.pause();

    set({
      activeType: 'podcast',
      podcastTrack: track,
      podcastProgress: 0,
      podcastDuration: 0,
      isPlaying: true
    });

    const proxiedUrl = getProxiedPodcastUrl(track.audioUrl);
    audio.src = proxiedUrl;
    audio.playbackRate = get().playbackRate;
    audio.load();
    audio.volume = get().volume;
    
    // Update MediaSession metadata
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

    audio.play().then(() => {
      // Track analytics
      fetch('/api/public/analytics/podcast-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: track.title })
      }).catch(() => {});
    }).catch(err => {
      if (err.name === 'AbortError') return;
      console.error("Podcast play error:", err);
      toast.error("Failed to play podcast");
      set({ isPlaying: false });
    });
  },

  seekPodcast: (time) => {
    if (!audio) return;
    audio.currentTime = time;
    set({ podcastProgress: time });
  },

  setPlaybackRate: (rate) => {
    if (!audio) return;
    audio.playbackRate = rate;
    set({ playbackRate: rate });
  },

  getAnalyser: () => analyser
}));

if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'DejavuFM Live',
    artist: 'DejavuFM',
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

  let silenceCheckInterval: ReturnType<typeof setInterval> | null = null;
  let lastPosition = 0;
  let stuckTicks = 0;
  let silenceTicks = 0;

  const attemptRecovery = () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') return; // Do not recover for podcasts
    if (!store.isPlaying || !audio || isRecovering) return;

    if (retryCount >= MAX_RETRIES) {
      console.warn(`[Audio] Max recovery retries (${MAX_RETRIES}) reached. Halting playback.`);
      retryCount = 0;
      isRecovering = false;
      useAudioStore.setState({ isPlaying: false, isBuffering: false });
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      toast.error("Stream connection timed out. Tap play to retry.");
      return;
    }
    
    isRecovering = true;
    retryCount++;
    console.log(`Audio stream interrupted. Attempting recovery ${retryCount}/${MAX_RETRIES}...`);
    useAudioStore.setState({ isBuffering: true });
    
    // Slight delay to handle brief network switching (e.g., WiFi to Cellular)
    if (recoveryTimeout) clearTimeout(recoveryTimeout);
    recoveryTimeout = setTimeout(() => {
      const currentStore = useAudioStore.getState();
      if (currentStore.isPlaying && audio) {
        console.log("Reloading stream buffer...");
        const currentSrc = audio.src || currentStore.streamUrl || currentStore.qualityUrls[currentStore.quality];
        audio.src = ''; // Force resource release
        setTimeout(() => {
          if (audio && currentSrc && useAudioStore.getState().isPlaying) {
            audio.src = currentSrc;
            audio.load();
            audio.play().catch(e => {
              if (e.name !== 'AbortError') console.error("Background stream recovery failed:", e);
            }).finally(() => {
              isRecovering = false;
            });
          } else {
            isRecovering = false;
            useAudioStore.setState({ isBuffering: false });
          }
        }, 100);
      } else {
        isRecovering = false;
        useAudioStore.setState({ isBuffering: false });
      }
    }, 1500);
  };

  const startSilenceMonitor = () => {
    if (silenceCheckInterval) clearInterval(silenceCheckInterval);
    
    if (audio) {
      lastPosition = audio.currentTime;
    }
    stuckTicks = 0;
    silenceTicks = 0;

    silenceCheckInterval = setInterval(() => {
      const store = useAudioStore.getState();
      if (!store.isPlaying || !audio) {
        stopSilenceMonitor();
        return;
      }

      // Check 1: Is playhead moving?
      const currentPos = audio.currentTime;
      if (currentPos === lastPosition && !audio.paused) {
        stuckTicks++;
        console.log(`[Audio Monitor] Audio playhead is stuck. Stuck count: ${stuckTicks}`);
      } else {
        stuckTicks = 0;
        lastPosition = currentPos;
      }

      // Check 2: Silence check using Web Audio Analyser if active
      let isSilent = false;
      if (analyser && audioContext && audioContext.state === 'running') {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        if (sum < 5) {
          isSilent = true;
          silenceTicks++;
          console.log(`[Audio Monitor] Audio output is silent. Silence count: ${silenceTicks}`);
        } else {
          silenceTicks = 0;
        }
      }

      // Trigger recovery if:
      // - Playhead is stuck for 3 ticks (4.5s)
      // - OR live stream is totally silent for 4 ticks (6.0s)
      const isRadio = store.activeType === 'radio';
      if (stuckTicks >= 3 || (isRadio && silenceTicks >= 4)) {
        console.warn(`[Audio Monitor] Detecting dead/silent stream (stuckTicks: ${stuckTicks}, silenceTicks: ${silenceTicks}). Reconnecting...`);
        stuckTicks = 0;
        silenceTicks = 0;
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

  audio.addEventListener('error', attemptRecovery);
  
  // Note: We deliberately DO NOT listen to the 'stalled' event for recovery.
  // The 'stalled' event fires normally when the browser halts downloading because the buffer is completely full.
  // Triggering recovery on 'stalled' would wipe the buffer and disconnect the stream, causing endless buffering.

  audio.addEventListener('waiting', () => {
    console.log("[Audio] Waiting for data (buffering)...");
    if (useAudioStore.getState().isPlaying) {
      useAudioStore.setState({ isBuffering: true });
    } else {
      useAudioStore.setState({ isBuffering: false });
    }
  });

  audio.addEventListener('stalled', () => {
    console.log("[Audio] Stream stalled...");
    if (useAudioStore.getState().isPlaying) {
      useAudioStore.setState({ isBuffering: true });
    } else {
      useAudioStore.setState({ isBuffering: false });
    }
  });

  audio.addEventListener('canplay', () => {
    useAudioStore.setState({ isBuffering: false });
  });

  audio.addEventListener('canplaythrough', () => {
    useAudioStore.setState({ isBuffering: false });
  });

  audio.addEventListener('ended', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast') {
      useAudioStore.setState({ isPlaying: false, podcastProgress: 0, isBuffering: false });
    } else {
      attemptRecovery();
    }
  });

  audio.addEventListener('timeupdate', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast' && audio) {
      useAudioStore.setState({ podcastProgress: audio.currentTime });
    }
  });

  audio.addEventListener('durationchange', () => {
    const store = useAudioStore.getState();
    if (store.activeType === 'podcast' && audio && isFinite(audio.duration)) {
      useAudioStore.setState({ podcastDuration: audio.duration });
    }
  });
  
  audio.addEventListener('playing', () => {
    console.log("[Audio] Playback started/resumed successfully.");
    useAudioStore.setState({ isBuffering: false });
    isRecovering = false;
    retryCount = 0; // Reset retry counter on successful play!
    if (recoveryTimeout) {
      clearTimeout(recoveryTimeout);
      recoveryTimeout = null;
    }
    startSilenceMonitor();
  });

  // Keep Zustand state perfectly in sync with native audio actions (headphone unplugs, lock screen, bluetooth, etc.)
  audio.addEventListener('play', () => {
    useAudioStore.setState({ isPlaying: true });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    startSilenceMonitor();
  });

  audio.addEventListener('pause', () => {
    useAudioStore.setState({ isPlaying: false, isBuffering: false });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    stopSilenceMonitor();
  });

  // Handle network restoration online/offline events
  window.addEventListener('online', () => {
    console.log("[Audio] Network connection restored online. Testing stream connectivity...");
    const store = useAudioStore.getState();
    if (store.isPlaying) {
      attemptRecovery();
    }
  });

  // Handle minimizing/reopening or locking/unlocking background-to-foreground PWA state recovery
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log("[Audio] App brought to foreground. Checking stream synchronization...");
      const store = useAudioStore.getState();
      
      // Auto-resume AudioContext if it was suspended by the browser (desktop)
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log("[Audio] AudioContext resumed on foreground visibility.");
        }).catch(err => {
          console.error("[Audio] Failed to resume AudioContext on visibilitychange:", err);
        });
      }
      
      // If our app state thinks it should be playing, but the hardware audio element is paused/ended
      if (store.isPlaying && audio) {
        if (audio.paused || audio.ended) {
          console.warn("[Audio] Audio is paused/ended but state is playing. Attempting smooth play resume...");
          useAudioStore.setState({ isBuffering: true });
          audio.play()
            .then(() => {
              console.log("[Audio] Smooth play resume successful.");
              useAudioStore.setState({ isBuffering: false });
            })
            .catch(e => {
              console.warn("[Audio] Smooth play resume blocked. Retrying with full stream reload...", e);
              // Only reload the source as a fallback if standard play() is blocked or fails
              const currentSrc = store.activeType === 'podcast'
                ? getProxiedPodcastUrl(store.podcastTrack?.audioUrl)
                : (audio.src || store.streamUrl || store.qualityUrls[store.quality]);
              if (currentSrc) {
                audio.src = ''; // Force release
                setTimeout(() => {
                  if (audio) {
                    audio.src = currentSrc;
                    audio.load();
                    audio.play()
                      .then(() => {
                        console.log("[Audio] Foreground automatic stream recovery successful.");
                      })
                      .catch(err => {
                        console.warn("[Audio] Foreground recovery auto-play blocked by browser.", err);
                        useAudioStore.setState({ isPlaying: false, isBuffering: false });
                        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                      });
                  }
                }, 100);
              } else {
                useAudioStore.setState({ isPlaying: false, isBuffering: false });
              }
            });
        } else {
          // If it's already playing, ensure silence monitor is fully active
          startSilenceMonitor();
        }
      }
    }
  });
}

// Global Buffering Safety Watchdog to prevent endless loading spinner
if (typeof window !== 'undefined') {
  let bufferingSafetyTimer: ReturnType<typeof setTimeout> | null = null;

  useAudioStore.subscribe((state) => {
    if (state.isBuffering && state.isPlaying) {
      if (!bufferingSafetyTimer) {
        bufferingSafetyTimer = setTimeout(() => {
          bufferingSafetyTimer = null;
          const currentStore = useAudioStore.getState();
          if (currentStore.isBuffering) {
            console.warn("[Audio Watchdog] Buffering safety timeout (10s) reached. Force stopping buffer state.");
            useAudioStore.setState({ isBuffering: false });
            if (audio && (audio.paused || audio.readyState < 2)) {
              useAudioStore.setState({ isPlaying: false });
              if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
              toast.error("Stream connection timed out. Tap play to retry.");
            }
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
