import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../lib/hapticHelper';
import { useLogo } from '../hooks/useLogo';

interface SwipeState {
  isActive: boolean;
  direction: 'backward' | 'forward' | null;
  distance: number; // in pixels
  progress: number; // 0 to 1
  isReady: boolean; // passed trigger threshold
  startY: number;
}

const SWIPE_THRESHOLD_PX = 72; // pixels needed to trigger navigation
const VELOCITY_THRESHOLD = 0.42; // px/ms for flick gesture
const EDGE_SENSITIVITY_MARGIN = 50; // extra sensitive near screen edges

export function SwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLightMode } = useLogo();

  // Robust, real-time light mode detection
  const checkIsLight = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return (
      document.documentElement.classList.contains('light') ||
      document.documentElement.classList.contains('contrast-high-light') ||
      localStorage.getItem('theme') === 'light' ||
      localStorage.getItem('contrast_mode') === 'high-light' ||
      Boolean(isLightMode)
    );
  }, [isLightMode]);

  const [isLight, setIsLight] = useState<boolean>(checkIsLight);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      setIsLight(checkIsLight());
    };
    update();

    const observer = new MutationObserver(() => {
      update();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    window.addEventListener('theme-change', update);
    window.addEventListener('storage', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('theme-change', update);
      window.removeEventListener('storage', update);
    };
  }, [checkIsLight]);

  const [swipeState, setSwipeState] = useState<SwipeState>({
    isActive: false,
    direction: null,
    distance: 0,
    progress: 0,
    isReady: false,
    startY: 0,
  });

  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    isEdgeSwipe: boolean;
    isExcluded: boolean;
    gestureLocked: 'horizontal' | 'vertical' | null;
  } | null>(null);

  const hasFiredReadyHaptic = useRef(false);

  // Helper to detect if touch originated on interactive or swipe-conflicting element
  const isExcludedElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;

    // Check if within admin dashboard, carousels, sliders, modals, text inputs or canvas
    const excludedSelectors = [
      '.swiper',
      '.swiper-slide',
      '.swiper-wrapper',
      '.ad-sliders-container',
      '.features-swiper',
      '.triple-swiper',
      'input[type="range"]',
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'input[type="search"]',
      'textarea',
      '[contenteditable="true"]',
      '.chat-sidebar',
      '#chat-sidebar-container',
      '.front-mobile-menu-drawer',
      '[role="dialog"]',
      '.modal-backdrop',
      '.turntable-container',
      '.dj-disk-play-btn',
      '.admin-page-wrapper',
      '.admin-dashboard-container',
      '.player-bar-scrubber',
      'button.interactive-canvas',
      'audio',
      'video',
    ];

    for (const selector of excludedSelectors) {
      if (target.closest(selector)) {
        return true;
      }
    }

    // Check if target is inside an element that has active horizontal scrolling
    let el: Element | null = target;
    while (el && el !== document.body && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const isScrollableX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 10;
      if (isScrollableX) {
        return true;
      }
      el = el.parentElement;
    }

    return false;
  }, []);

  useEffect(() => {
    // Disable on admin routes
    if (location.pathname.startsWith('/admin')) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const screenWidth = window.innerWidth;

      // Check if touch starts on excluded interactive items
      const isExcluded = isExcludedElement(e.target);
      const isNearLeftEdge = startX <= EDGE_SENSITIVITY_MARGIN;
      const isNearRightEdge = startX >= screenWidth - EDGE_SENSITIVITY_MARGIN;

      touchStartRef.current = {
        x: startX,
        y: startY,
        time: Date.now(),
        isEdgeSwipe: isNearLeftEdge || isNearRightEdge,
        isExcluded,
        gestureLocked: null,
      };

      hasFiredReadyHaptic.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;

      const deltaX = currentX - touchStartRef.current.x;
      const deltaY = currentY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Early direction locking
      if (touchStartRef.current.gestureLocked === null) {
        // If vertical movement dominates early on, lock to vertical and ignore swipe
        if (absY > 8 && absY > absX * 1.2) {
          touchStartRef.current.gestureLocked = 'vertical';
          setSwipeState({
            isActive: false,
            direction: null,
            distance: 0,
            progress: 0,
            isReady: false,
            startY: currentY,
          });
          return;
        }

        // If horizontal movement dominates and past initial jitter threshold
        if (absX > 14 && absX > absY * 1.3) {
          // If the gesture started on an excluded element (like a carousel), ignore horizontal gesture
          if (touchStartRef.current.isExcluded) {
            touchStartRef.current.gestureLocked = 'vertical';
            return;
          }
          touchStartRef.current.gestureLocked = 'horizontal';
        } else {
          return;
        }
      }

      if (touchStartRef.current.gestureLocked === 'vertical') {
        return;
      }

      // Horizontal gesture is active
      const direction: 'backward' | 'forward' = deltaX > 0 ? 'backward' : 'forward';
      const distance = absX;
      const progress = Math.min(1, distance / SWIPE_THRESHOLD_PX);
      const isReady = distance >= SWIPE_THRESHOLD_PX;

      // Tactile feedback on crossing the trigger threshold
      if (isReady && !hasFiredReadyHaptic.current) {
        triggerHaptic('light');
        hasFiredReadyHaptic.current = true;
      } else if (!isReady && hasFiredReadyHaptic.current) {
        hasFiredReadyHaptic.current = false;
      }

      setSwipeState({
        isActive: true,
        direction,
        distance,
        progress,
        isReady,
        startY: touchStartRef.current.y,
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const state = touchStartRef.current;
      touchStartRef.current = null;

      if (state.gestureLocked !== 'horizontal') {
        setSwipeState((prev) => ({ ...prev, isActive: false }));
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - state.x;
      const deltaTime = Math.max(1, Date.now() - state.time);
      const velocity = Math.abs(deltaX) / deltaTime;
      const absX = Math.abs(deltaX);

      const willNavigate = absX >= SWIPE_THRESHOLD_PX || (absX >= 35 && velocity >= VELOCITY_THRESHOLD);

      if (willNavigate) {
        triggerHaptic('selection');
        if (deltaX > 0) {
          // Swipe Right -> Backward
          navigate(-1);
        } else {
          // Swipe Left -> Forward
          navigate(1);
        }
      }

      // Smoothly hide indicator
      setSwipeState({
        isActive: false,
        direction: null,
        distance: 0,
        progress: 0,
        isReady: false,
        startY: 0,
      });
    };

    const handleTouchCancel = () => {
      touchStartRef.current = null;
      setSwipeState({
        isActive: false,
        direction: null,
        distance: 0,
        progress: 0,
        isReady: false,
        startY: 0,
      });
    };

    // Attach non-intrusive listeners
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isExcludedElement, location.pathname, navigate]);

  if (!swipeState.isActive || !swipeState.direction) {
    return null;
  }

  const isBackward = swipeState.direction === 'backward';
  const clampedProgress = Math.min(1, Math.max(0, swipeState.progress));
  const pullDistance = Math.min(92, swipeState.distance * 0.75);
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - clampedProgress * circumference;

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] select-none overflow-hidden font-display">
      {/* Subtle Specular Edge Refraction Arc (Minimalist Glass Horizon) */}
      <motion.div
        id="swipe-nav-edge-glow"
        initial={{ opacity: 0 }}
        animate={{
          opacity: clampedProgress * (swipeState.isReady ? 0.9 : 0.4),
          scaleY: 0.8 + clampedProgress * 0.4,
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        style={{
          top: `clamp(70px, ${swipeState.startY}px, calc(100vh - 140px))`,
          background: isLight
            ? isBackward
              ? 'radial-gradient(ellipse at 0% 50%, rgba(0, 210, 255, 0.18) 0%, rgba(255, 255, 255, 0.6) 40%, rgba(255, 255, 255, 0) 75%)'
              : 'radial-gradient(ellipse at 100% 50%, rgba(0, 210, 255, 0.18) 0%, rgba(255, 255, 255, 0.6) 40%, rgba(255, 255, 255, 0) 75%)'
            : isBackward
            ? 'radial-gradient(ellipse at 0% 50%, rgba(0, 210, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 35%, rgba(0, 0, 0, 0) 75%)'
            : 'radial-gradient(ellipse at 100% 50%, rgba(0, 210, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 35%, rgba(0, 0, 0, 0) 75%)',
        }}
        className={`absolute -translate-y-1/2 w-16 h-56 blur-md ${
          isBackward ? 'left-0' : 'right-0'
        }`}
      />

      {/* Floating Minimal Luxury Glass Pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: clampedProgress * 0.95 + 0.05,
          scale: 0.88 + clampedProgress * 0.15 + (swipeState.isReady ? 0.05 : 0),
          x: isBackward ? pullDistance : -pullDistance,
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 520, damping: 28 }}
        style={{
          top: `clamp(90px, ${swipeState.startY}px, calc(100vh - 140px))`,
        }}
        className={`absolute -translate-y-1/2 flex items-center justify-center ${
          isBackward ? 'left-3 sm:left-5' : 'right-3 sm:right-5'
        }`}
      >
        <div
          id="swipe-nav-indicator"
          data-light={isLight ? "true" : "false"}
          data-ready={swipeState.isReady ? "true" : "false"}
          className={`relative flex items-center gap-2.5 px-3.5 py-2 rounded-full backdrop-blur-2xl transition-all duration-200 border ${
            isLight
              ? swipeState.isReady
                ? 'bg-white text-slate-950 border-[var(--color-neon-blue,#00d2ff)] shadow-[0_10px_30px_rgba(0,0,0,0.08),0_0_20px_rgba(0,210,255,0.25)]'
                : 'bg-white/95 text-slate-800 border-[var(--color-neon-blue,#00d2ff)]/40 shadow-[0_6px_20px_rgba(0,0,0,0.06)]'
              : swipeState.isReady
              ? 'bg-[#0b0d14]/90 text-white border-[var(--color-neon-blue,#00d2ff)]/70 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_24px_rgba(0,210,255,0.25)]'
              : 'bg-[#0b0d14]/75 text-neutral-200 border-[var(--color-neon-blue,#00d2ff)]/30 shadow-[0_6px_28px_rgba(0,0,0,0.45)]'
          }`}
        >
          {isBackward ? (
            <>
              {/* Minimalist Circular Progress Indicator with Secondary Color */}
              <div className="relative flex items-center justify-center w-6 h-6 flex-shrink-0">
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 30 30">
                  <circle
                    cx="15"
                    cy="15"
                    r={radius}
                    className={isLight ? 'stroke-slate-200' : 'stroke-[var(--color-neon-blue,#00d2ff)]/20'}
                    strokeWidth="2.2"
                    fill="transparent"
                  />
                  <circle
                    cx="15"
                    cy="15"
                    r={radius}
                    style={{
                      stroke: 'var(--color-neon-blue, #00d2ff)',
                    }}
                    className={`transition-all duration-75 ${
                      swipeState.isReady ? 'filter drop-shadow-[0_0_5px_var(--color-neon-blue,#00d2ff)]' : ''
                    }`}
                    strokeWidth="2.2"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <ChevronLeft
                  style={{
                    color: swipeState.isReady ? 'var(--color-neon-blue, #00d2ff)' : undefined,
                  }}
                  className={`w-3.5 h-3.5 absolute inset-0 m-auto transition-transform duration-200 ${
                    swipeState.isReady
                      ? '-translate-x-0.5 scale-110'
                      : isLight
                      ? 'text-slate-700'
                      : 'text-neutral-200'
                  }`}
                />
              </div>

              {/* Minimalist Label */}
              <span className="text-[11px] font-bold tracking-wider uppercase pr-0.5 select-none swipe-nav-text">
                {swipeState.isReady ? (
                  <span style={{ color: 'var(--color-neon-blue, #00d2ff)' }}>Release</span>
                ) : (
                  'Back'
                )}
              </span>
            </>
          ) : (
            <>
              {/* Minimalist Label */}
              <span className="text-[11px] font-bold tracking-wider uppercase pl-0.5 select-none swipe-nav-text">
                {swipeState.isReady ? (
                  <span style={{ color: 'var(--color-neon-blue, #00d2ff)' }}>Release</span>
                ) : (
                  'Forward'
                )}
              </span>

              {/* Minimalist Circular Progress Indicator with Secondary Color */}
              <div className="relative flex items-center justify-center w-6 h-6 flex-shrink-0">
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 30 30">
                  <circle
                    cx="15"
                    cy="15"
                    r={radius}
                    className={isLight ? 'stroke-slate-200' : 'stroke-[var(--color-neon-blue,#00d2ff)]/20'}
                    strokeWidth="2.2"
                    fill="transparent"
                  />
                  <circle
                    cx="15"
                    cy="15"
                    r={radius}
                    style={{
                      stroke: 'var(--color-neon-blue, #00d2ff)',
                    }}
                    className={`transition-all duration-75 ${
                      swipeState.isReady ? 'filter drop-shadow-[0_0_5px_var(--color-neon-blue,#00d2ff)]' : ''
                    }`}
                    strokeWidth="2.2"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <ChevronRight
                  style={{
                    color: swipeState.isReady ? 'var(--color-neon-blue, #00d2ff)' : undefined,
                  }}
                  className={`w-3.5 h-3.5 absolute inset-0 m-auto transition-transform duration-200 ${
                    swipeState.isReady
                      ? 'translate-x-0.5 scale-110'
                      : isLight
                      ? 'text-slate-700'
                      : 'text-neutral-200'
                  }`}
                />
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
