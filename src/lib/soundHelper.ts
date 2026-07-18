/**
 * soundHelper.ts
 * High-performance, iOS-compatible sound notification manager.
 * Reuses a single AudioContext singleton and automatically manages
 * the user-interaction unlock requirements for iOS/Safari.
 */

let sharedAudioContext: AudioContext | null = null;
let isUnlocked = false;

/**
 * Safely retrieves or creates the shared AudioContext instance.
 */
export const getSharedAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  if (!sharedAudioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        sharedAudioContext = new AudioContextClass();
      }
    } catch (err) {
      console.warn("Web Audio API not supported or failed to initialize:", err);
    }
  }
  return sharedAudioContext;
};

/**
 * Attempts to resume the AudioContext to unlock audio playback on iOS/Safari.
 * This should be triggered by a user gesture (touch, click).
 */
export const unlockAudio = async (): Promise<boolean> => {
  if (isUnlocked) return true;

  const ctx = getSharedAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Play a silent buffer to fully warm up and unlock the iOS audio hardware
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    isUnlocked = true;
    return true;
  } catch (err) {
    console.warn("Failed to unlock AudioContext:", err);
    return false;
  }
};

// Automatically register global touch/click listeners to unlock audio as soon as possible on user interaction
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const handleUnlock = () => {
    unlockAudio().then((success) => {
      if (success) {
        // Clean up listeners once successfully unlocked
        document.removeEventListener('click', handleUnlock);
        document.removeEventListener('touchstart', handleUnlock);
        document.removeEventListener('touchend', handleUnlock);
      }
    });
  };

  document.addEventListener('click', handleUnlock, { passive: true });
  document.addEventListener('touchstart', handleUnlock, { passive: true });
  document.addEventListener('touchend', handleUnlock, { passive: true });
}

interface PlaySoundOptions {
  frequencyStart?: number;
  frequencyEnd?: number;
  duration?: number;
  volume?: number;
  type?: OscillatorType;
}

/**
 * Plays a clean, efficient notification chime using the shared AudioContext.
 * Ensures the context is resumed and nodes are properly cleaned up.
 */
export const playUINotificationSound = async (options: PlaySoundOptions = {}): Promise<void> => {
  const {
    frequencyStart = 800,
    frequencyEnd = 550,
    duration = 0.15,
    volume = 0.12,
    type = 'sine'
  } = options;

  const ctx = getSharedAudioContext();
  if (!ctx) return;

  try {
    // If suspended (common on iOS when gesture was missed), attempt a quick resume
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    
    // Set up the frequency sweep (ping/pop effect)
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(frequencyStart, now);
    osc.frequency.exponentialRampToValueAtTime(frequencyEnd, now + duration);

    // Set up volume envelope (fade out nicely to prevent audio clicks/pops)
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Connect nodes
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Start and stop
    osc.start(now);
    osc.stop(now + duration + 0.01);

    // Clean up node connections after playback completes to prevent memory leaks
    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (e) {
        // Safe to ignore if already disconnected or garbage collected
      }
    }, (duration + 0.05) * 1000);

  } catch (err) {
    console.warn("Failed to play notification sound:", err);
  }
};
