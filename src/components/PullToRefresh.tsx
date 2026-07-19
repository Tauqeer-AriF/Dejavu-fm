import { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowDown, Sparkles } from 'lucide-react';

export function PullToRefresh() {
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  
  // Refs for high-performance direct DOM manipulation
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const isEligibleRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastTouchYRef = useRef<number | null>(null);

  // Constants
  const TRIGGER_HEIGHT = 90; // Pull distance to trigger refresh (px)
  const MAX_PULL_HEIGHT = 150; // Max visual distance (px)
  const CONTAINER_HEIGHT = 100; // Height of our fixed pull-to-refresh pane (px)

  useEffect(() => {
    // Disable native overscroll bounce where supported, giving our custom refresh full control
    document.body.style.overscrollBehaviorY = 'none';
    document.documentElement.style.overscrollBehaviorY = 'none';

    const handleStart = (pageY: number, pageX: number, pointerId?: number) => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      // We only enable pull-to-refresh when at the top of the document
      if (scrollTop <= 5) {
        isEligibleRef.current = true;
        startYRef.current = pageY;
        startXRef.current = pageX;
        if (pointerId !== undefined) {
          pointerIdRef.current = pointerId;
        }
        setPullState('idle');

        // Reset elements to initial state
        if (containerRef.current) {
          containerRef.current.style.transition = 'none';
        }
        if (glowRef.current) {
          glowRef.current.style.transition = 'none';
        }
        if (spinnerRef.current) {
          spinnerRef.current.style.transition = 'none';
        }
      } else {
        isEligibleRef.current = false;
      }
    };

    const handleMove = (pageY: number, pageX: number) => {
      if (!isEligibleRef.current || startYRef.current === null) return;

      const diffY = pageY - startYRef.current;
      const diffX = pageX - (startXRef.current ?? pageX);

      // Horizontal swipe cancels eligibility to avoid conflict with horizontal carousels or swipe features
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 15) {
        isEligibleRef.current = false;
        cancelPull();
        return;
      }

      // Scrolling up cancels eligibility
      if (diffY < -15) {
        isEligibleRef.current = false;
        cancelPull();
        return;
      }

      if (diffY > 0) {
        // Disable text selection and dragging during active pull
        if (diffY > 5) {
          document.body.style.userSelect = 'none';
          document.body.style.webkitUserSelect = 'none';
        }

        // Apply a highly refined, buttery-smooth natural logarithmic curve that never caps or curves backward
        const resistedPull = Math.min(
          MAX_PULL_HEIGHT,
          TRIGGER_HEIGHT * Math.log(1 + (diffY * 0.85) / TRIGGER_HEIGHT)
        );
        const progress = Math.min(1, resistedPull / TRIGGER_HEIGHT);

        // Update elements directly in DOM for buttery-smooth 120fps movement (bypassing React re-renders)
        if (containerRef.current) {
          containerRef.current.style.transform = `translateY(${resistedPull - CONTAINER_HEIGHT}px)`;
          containerRef.current.style.opacity = `${progress}`;
        }
        if (glowRef.current) {
          glowRef.current.style.opacity = `${progress * 0.95}`;
        }
        if (spinnerRef.current) {
          spinnerRef.current.style.transform = `scale(${0.85 + progress * 0.15})`;
        }
        if (iconRef.current) {
          iconRef.current.style.transform = `rotate(${progress * 360}deg)`;
        }

        const nextState = resistedPull >= TRIGGER_HEIGHT ? 'ready' : 'pulling';
        setPullState(prev => {
          if (prev !== nextState) {
            // Update UI elements on state boundary cross
            if (textRef.current) {
              textRef.current.textContent = nextState === 'ready' ? 'Release to Refresh' : 'Pull to Refresh';
            }
            if (spinnerRef.current) {
              if (nextState === 'ready') {
                spinnerRef.current.classList.add('border-neon-purple', 'shadow-[0_0_20px_rgba(176,38,255,0.45)]');
                spinnerRef.current.classList.remove('border-white/10');
                
                // Trigger a light tactile "tick" when reaching the trigger threshold
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try {
                    navigator.vibrate(12);
                  } catch (e) {}
                }
              } else {
                spinnerRef.current.classList.remove('border-neon-purple', 'shadow-[0_0_20px_rgba(176,38,255,0.45)]');
                spinnerRef.current.classList.add('border-white/10');
              }
            }
            return nextState;
          }
          return prev;
        });
      }
    };

    const handleEnd = (pageY: number) => {
      if (!isEligibleRef.current || startYRef.current === null) {
        cleanup();
        return;
      }

      const diffY = pageY - startYRef.current;
      const resistedPull = Math.min(
        MAX_PULL_HEIGHT,
        TRIGGER_HEIGHT * Math.log(1 + (diffY * 0.85) / TRIGGER_HEIGHT)
      );

      if (resistedPull >= TRIGGER_HEIGHT) {
        triggerRefresh();
      } else {
        cancelPull();
      }
    };

    const triggerRefresh = () => {
      setPullState('refreshing');

      if (textRef.current) {
        textRef.current.textContent = 'Reloading App...';
      }

      // Smooth animate spinner to resting position
      if (containerRef.current) {
        containerRef.current.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
        containerRef.current.style.transform = `translateY(${TRIGGER_HEIGHT - CONTAINER_HEIGHT}px)`;
        containerRef.current.style.opacity = '1';
      }

      if (glowRef.current) {
        glowRef.current.style.transition = 'opacity 0.3s ease';
        glowRef.current.style.opacity = '0.95';
      }

      if (spinnerRef.current) {
        spinnerRef.current.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        spinnerRef.current.style.transform = 'scale(1.05)';
        spinnerRef.current.classList.add('border-neon-purple', 'shadow-[0_0_25px_rgba(176,38,255,0.6)]');
      }

      // Try to trigger premium success haptic feedback if supported (PWA standard double-tap pattern)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([15, 30, 20]);
        } catch (e) {
          // Ignore
        }
      }

      // Perform refresh with visual payoff
      setTimeout(() => {
        window.location.reload();
      }, 950);
    };

    const cancelPull = () => {
      setPullState('idle');

      if (containerRef.current) {
        containerRef.current.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease';
        containerRef.current.style.transform = `translateY(${-CONTAINER_HEIGHT}px)`;
        containerRef.current.style.opacity = '0';
      }

      if (glowRef.current) {
        glowRef.current.style.transition = 'opacity 0.35s ease';
        glowRef.current.style.opacity = '0';
      }

      if (spinnerRef.current) {
        spinnerRef.current.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
        spinnerRef.current.style.transform = 'scale(0.85)';
        spinnerRef.current.classList.remove('border-neon-purple', 'shadow-[0_0_20px_rgba(176,38,255,0.45)]');
        spinnerRef.current.classList.add('border-white/10');
      }

      cleanup();
    };

    const cleanup = () => {
      startYRef.current = null;
      startXRef.current = null;
      isEligibleRef.current = false;
      pointerIdRef.current = null;
      lastTouchYRef.current = null;
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('-webkit-user-select');
    };

    // TOUCH EVENTS - Dedicated for mobile devices to bypass and block native elastic scrolling completely
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return; // Ignore multitouch gestures
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollTop <= 5) {
        const touch = e.touches[0];
        lastTouchYRef.current = touch.pageY;
        handleStart(touch.pageY, touch.pageX);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isEligibleRef.current || startYRef.current === null) return;
      const touch = e.touches[0];
      lastTouchYRef.current = touch.pageY;
      const diffY = touch.pageY - startYRef.current;
      
      if (diffY > 0) {
        // Crucial for iOS: cancel native rubber-banding scroll immediately
        if (e.cancelable) {
          e.preventDefault();
        }
        handleMove(touch.pageY, touch.pageX);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isEligibleRef.current || startYRef.current === null) {
        cleanup();
        return;
      }
      const touch = e.changedTouches[0] || e.touches[0];
      const endY = touch ? touch.pageY : (lastTouchYRef.current ?? startYRef.current);
      handleEnd(endY);
    };

    // POINTER EVENTS - Restricted to desktop mouse for high efficiency on Windows Chrome
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // Let touch events handle touchscreens
      if (e.button !== 0) return; // Only left clicks
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollTop <= 5) {
        handleStart(e.pageY, e.pageX, e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
      
      if (isEligibleRef.current && startYRef.current !== null) {
        const diffY = e.pageY - startYRef.current;
        if (diffY > 0) {
          if (e.cancelable) {
            e.preventDefault();
          }
          if (diffY > 2) {
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
          }
        }
      }
      handleMove(e.pageY, e.pageX);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
      handleEnd(e.pageY);
    };

    // Block browser image/text ghost drag visual during active pulls
    const onDragStart = (e: DragEvent) => {
      if (isEligibleRef.current && startYRef.current !== null) {
        e.preventDefault();
      }
    };

    // Block browser native selection start during active pulls
    const onSelectStart = (e: Event) => {
      if (isEligibleRef.current && startYRef.current !== null) {
        e.preventDefault();
      }
    };

    // Register active non-passive listeners for touch
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // Register listeners for mouse pointer
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    window.addEventListener('dragstart', onDragStart, { capture: true });
    window.addEventListener('selectstart', onSelectStart, { capture: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);

      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      window.removeEventListener('dragstart', onDragStart, { capture: true });
      window.removeEventListener('selectstart', onSelectStart, { capture: true });

      document.body.style.removeProperty('overscroll-behavior-y');
      document.documentElement.style.removeProperty('overscroll-behavior-y');
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('-webkit-user-select');
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
      style={{
        height: `${CONTAINER_HEIGHT}px`,
        transform: `translateY(${-CONTAINER_HEIGHT}px)`,
        opacity: 0,
      }}
    >
      {/* Premium dark backdrop blur glow */}
      <div 
        ref={glowRef}
        className="absolute inset-0 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-[6px] border-b border-white/[0.03] opacity-0"
      />

      <div className="relative flex flex-col items-center justify-center gap-2 z-10 pt-2">
        {/* Record/Vinyl visual design with glowing ring */}
        <div 
          ref={spinnerRef}
          className="relative w-10 h-10 rounded-full bg-[#08090d] border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-300"
        >
          {/* Authentic record style vinyl grooves */}
          <div className="absolute inset-1 rounded-full border border-white/5 opacity-40" />
          <div className="absolute inset-2 rounded-full border border-white/5 opacity-25" />
          <div className="absolute inset-3 rounded-full border border-white/5 opacity-15" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-neon-purple/60 z-20" />

          <div ref={iconRef} className="relative z-10 transition-colors duration-300">
            {pullState === 'refreshing' ? (
              <RefreshCw className="w-4 h-4 text-neon-purple animate-spin" />
            ) : (
              <ArrowDown className={`w-4 h-4 transition-colors duration-300 ${pullState === 'ready' ? 'text-neon-purple' : 'text-white/60'}`} />
            )}
          </div>
        </div>

        {/* Glossy label */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md shadow-lg">
          <Sparkles className="w-2.5 h-2.5 text-neon-purple animate-pulse" />
          <span ref={textRef} className="text-[9px] uppercase tracking-[0.25em] font-black text-white/80 font-sans">
            Pull to Refresh
          </span>
        </div>
      </div>
    </div>
  );
}
