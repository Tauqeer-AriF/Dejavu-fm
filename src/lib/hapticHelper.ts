/**
 * hapticHelper.ts
 * Lightweight, zero-dependency haptic feedback manager for modern mobile web.
 * Supports standard Navigator Vibration API with graceful fallbacks.
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Triggers subtle haptic feedback on supported mobile devices.
 * Safe to call in any environment (SSR, desktop, non-supported mobile browsers).
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
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
    }
  } catch {
    // Gracefully ignore if device permissions or hardware do not allow vibration
  }
}
