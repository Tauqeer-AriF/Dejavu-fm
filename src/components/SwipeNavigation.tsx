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
  const pullDistance = Math.min(76, swipeState.distance * 0.65);

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] select-none overflow-hidden">
      {/* Side Edge Visual Indicator Pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: clampedProgress * 0.95 + 0.05,
          scale: 0.85 + clampedProgress * 0.25,
          x: isBackward ? pullDistance : -pullDistance,
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        style={{
          top: `clamp(100px, ${swipeState.startY}px, calc(100vh - 160px))`,
        }}
        className={`absolute -translate-y-1/2 flex items-center justify-center ${
          isBackward ? 'left-2' : 'right-2'
        }`}
      >
        <div
          className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-2xl backdrop-blur-2xl transition-all duration-200 border ${
            swipeState.isReady
              ? isLightMode
                ? 'bg-[#000000] text-white border-black scale-105 shadow-[0_0_24px_rgba(0,0,0,0.35)]'
                : 'bg-neon-purple text-white border-neon-purple scale-105 shadow-[0_0_25px_var(--color-neon-purple)]'
              : isLightMode
              ? 'bg-[#ffffff]/90 text-black/80 border-black/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)]'
              : 'bg-[#12131a]/90 text-white/80 border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.6)]'
          }`}
        >
          {isBackward ? (
            <>
              <ChevronLeft
                className={`w-5 h-5 transition-transform duration-200 ${
                  swipeState.isReady ? '-translate-x-0.5 scale-110' : ''
                }`}
              />
              <span className="text-[11px] font-black uppercase tracking-wider">
                {swipeState.isReady ? 'Release for Back' : 'Back'}
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-black uppercase tracking-wider">
                {swipeState.isReady ? 'Release for Next' : 'Forward'}
              </span>
              <ChevronRight
                className={`w-5 h-5 transition-transform duration-200 ${
                  swipeState.isReady ? 'translate-x-0.5 scale-110' : ''
                }`}
              />
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
