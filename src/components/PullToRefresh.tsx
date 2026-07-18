import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, useMotionValue, useTransform } from 'motion/react';
import { RefreshCw, ArrowDown, Sparkles } from 'lucide-react';

export function PullToRefresh() {
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const [pullProgress, setPullProgress] = useState(0); // 0 to 1
  
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);
  const isEligibleRef = useRef(false);
  const touchIdRef = useRef<number | null>(null);

  // Constants
  const TRIGGER_HEIGHT = 90; // Pull distance to trigger refresh (px)
  const MAX_PULL_HEIGHT = 160; // Max visual distance (px)

  useEffect(() => {
    // Check if running on mobile/touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    // We only enable pull-to-refresh when at the top of the document
    const handleTouchStart = (e: TouchEvent) => {
      // Only single touch
      if (e.touches.length !== 1) return;
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop <= 5) {
        isEligibleRef.current = true;
        const touch = e.touches[0];
        startYRef.current = touch.pageY;
        touchIdRef.current = touch.identifier;
        setPullState('idle');
      } else {
        isEligibleRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEligibleRef.current || startYRef.current === null || touchIdRef.current === null) return;
      
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (!touch) return;

      currentYRef.current = touch.pageY;
      const distance = currentYRef.current - startYRef.current;

      if (distance > 0) {
        // User is pulling down
        // Prevent default native overscroll refresh if possible
        if (e.cancelable) {
          e.preventDefault();
        }

        // Apply resistance curve to pull distance
        // formula: actualDistance * (1 / (1 + actualDistance / constant))
        const rawPull = distance;
        const resistedPull = Math.min(MAX_PULL_HEIGHT, rawPull * (0.5 * (1 - rawPull / (MAX_PULL_HEIGHT * 2))));
        
        const progress = Math.min(1, resistedPull / TRIGGER_HEIGHT);
        setPullProgress(progress);

        if (resistedPull >= TRIGGER_HEIGHT) {
          setPullState('ready');
        } else {
          setPullState('pulling');
        }

        // Set CSS variable to dynamically pull the viewport or element down if we want
        document.documentElement.style.setProperty('--pwa-pull-distance', `${resistedPull}px`);
      }
    };

    const handleTouchEnd = () => {
      if (!isEligibleRef.current || startYRef.current === null) {
        cleanup();
        return;
      }

      const distance = currentYRef.current && startYRef.current ? currentYRef.current - startYRef.current : 0;
      const resistedPull = Math.min(MAX_PULL_HEIGHT, distance * (0.5 * (1 - distance / (MAX_PULL_HEIGHT * 2))));

      if (resistedPull >= TRIGGER_HEIGHT) {
        triggerRefresh();
      } else {
        cancelPull();
      }
    };

    const triggerRefresh = () => {
      setPullState('refreshing');
      
      // Animate to trigger position
      document.documentElement.style.setProperty('--pwa-pull-distance', `${TRIGGER_HEIGHT}px`);
      
      // Try to trigger haptic feedback if supported (PWA/Android standard)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([15]);
        } catch (e) {
          // Ignore vibrate security blocks
        }
      }

      // Perform a premium refresh after a brief delay for visual payoff
      setTimeout(() => {
        // Clear history state to avoid reload loops, then force clean reload
        window.location.reload();
      }, 1000);
    };

    const cancelPull = () => {
      setPullState('idle');
      setPullProgress(0);
      document.documentElement.style.removeProperty('--pwa-pull-distance');
      cleanup();
    };

    const cleanup = () => {
      startYRef.current = null;
      currentYRef.current = null;
      isEligibleRef.current = false;
      touchIdRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    // touchmove needs passive: false so we can e.preventDefault() to block native overscroll
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      document.documentElement.style.removeProperty('--pwa-pull-distance');
    };
  }, []);

  if (pullState === 'idle' && pullProgress === 0) return null;

  // Visual distance based on state
  const visualHeight = pullState === 'refreshing' ? TRIGGER_HEIGHT : Math.min(MAX_PULL_HEIGHT, pullProgress * TRIGGER_HEIGHT);

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
      style={{
        height: `${visualHeight}px`,
        opacity: pullProgress,
        transition: pullState === 'refreshing' ? 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
      }}
    >
      {/* Background glow overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-[4px] border-b border-neon-purple/10"
        style={{
          opacity: pullProgress,
        }}
      />

      <div className="relative flex flex-col items-center justify-center gap-1.5 z-10">
        {/* Glowing Record/Spinner container */}
        <div 
          className="relative w-10 h-10 rounded-full bg-[#0a0c16]/90 border border-neon-purple/30 shadow-[0_0_20px_rgba(176,38,255,0.25)] flex items-center justify-center overflow-hidden"
          style={{
            transform: `scale(${0.8 + pullProgress * 0.2})`,
          }}
        >
          {/* Inner Record grooves for authentic design detail */}
          <div className="absolute inset-1 rounded-full border border-white/5 opacity-50" />
          <div className="absolute inset-2 rounded-full border border-white/5 opacity-30" />
          <div className="absolute inset-3 rounded-full border border-white/5 opacity-20" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-neon-purple/50 z-20" />

          {pullState === 'refreshing' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="relative z-10 text-neon-purple"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              style={{
                rotate: pullProgress * 360,
              }}
              className={`relative z-10 transition-colors ${pullState === 'ready' ? 'text-neon-purple' : 'text-white/60'}`}
            >
              {pullState === 'ready' ? (
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <ArrowDown className="w-4 h-4" />
                </motion.div>
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
            </motion.div>
          )}
        </div>

        {/* Dynamic labels */}
        <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-md">
          <Sparkles className="w-2.5 h-2.5 text-neon-purple animate-pulse" />
          <span className="text-[9px] uppercase tracking-[0.25em] font-black text-white/80 font-sans">
            {pullState === 'refreshing' && 'Reloading App...'}
            {pullState === 'ready' && 'Release to Refresh'}
            {pullState === 'pulling' && 'Pull to Refresh'}
            {pullState === 'idle' && 'Pull to Refresh'}
          </span>
        </div>
      </div>
    </div>
  );
}
