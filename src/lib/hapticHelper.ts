/**
 * hapticHelper.ts
 * Lightweight haptic feedback manager for mobile web.
 * Supports standard Navigator Vibration API, iOS WebKit form haptic triggers,
 * and Web Audio tactile sub-bass impulse on iOS.
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

// Reusable hidden switch element for iOS WebKit selection haptic trigger
let iosHapticElement: HTMLInputElement | null = null;
let audioCtx: (AudioContext | null) = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Triggers iOS WebKit native haptic feedback via switch-input toggle trick.
 * On newer iOS WebKit versions, toggling a native switch input programmatically inside a user touch event triggers the Taptic Engine.
 */
function triggerIosWebKitHaptic(): void {
  if (typeof document === 'undefined') return;
  try {
    if (!iosHapticElement) {
      iosHapticElement = document.createElement('input');
      iosHapticElement.type = 'checkbox';
      (iosHapticElement as any).setAttribute('role', 'switch');
      iosHapticElement.style.position = 'fixed';
      iosHapticElement.style.top = '-9999px';
      iosHapticElement.style.left = '-9999px';
      iosHapticElement.style.opacity = '0';
      iosHapticElement.style.pointerEvents = 'none';
      iosHapticElement.style.zIndex = '-9999';
      document.body.appendChild(iosHapticElement);
    }
    iosHapticElement.checked = !iosHapticElement.checked;
  } catch {}
}

/**
 * Generates an ultra-low frequency sub-bass acoustic click (30Hz - 60Hz)
 * which resonates the iPhone's bottom stereo speaker driver to produce tactile haptic resonance.
 */
function triggerTactileSound(style: HapticStyle): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const duration = style === 'heavy' ? 0.04 : style === 'medium' ? 0.025 : 0.015;
    const freq = style === 'heavy' ? 45 : style === 'medium' ? 65 : 90;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(15, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

/**
 * Triggers subtle haptic feedback across Android, iOS WebKit, and PWA environments.
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  // 1. Android & Standards-compliant browser Vibration API
  if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      switch (style) {
        case 'selection':
          navigator.vibrate(8);
          break;
        case 'light':
          navigator.vibrate(12);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'heavy':
          navigator.vibrate(35);
          break;
        case 'success':
          navigator.vibrate([15, 40, 15]);
          break;
        case 'warning':
          navigator.vibrate([25, 40, 25]);
          break;
        case 'error':
          navigator.vibrate([40, 50, 40, 50, 40]);
          break;
        default:
          navigator.vibrate(12);
          break;
      }
      return;
    } catch {}
  }

  // 2. iOS Safari / WebKit Haptic Trigger Techniques
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    // A. Native iOS switch role state toggle (Taptic feedback in iOS Safari)
    triggerIosWebKitHaptic();

    // B. Sub-bass physical speaker acoustic thump (feels like physical click in palm)
    triggerTactileSound(style);
  }
}

