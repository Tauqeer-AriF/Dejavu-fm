import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  Play,
  ArrowRight,
  Volume2,
  X
} from 'lucide-react';
import { useGreeting } from '../hooks/useGreeting.ts';
import { useLogo } from '../hooks/useLogo.ts';
import { GreetingCTA, GreetingResult } from '../types/greeting.ts';

const SESSION_STORAGE_KEY = 'dejavu_greeting_dismissed';

export function PersonalizedGreetingModal() {
  const location = useLocation();
  const { greetingData, isLoading, handleCtaClick, isPlaying } = useGreeting();
  const { settings, isLightMode } = useLogo();

  // Check if dismissed in this browser session
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Listen for manual re-trigger event if needed
  useEffect(() => {
    const handleOpen = () => setIsDismissed(false);
    window.addEventListener('open-greeting', handleOpen);
    return () => window.removeEventListener('open-greeting', handleOpen);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('[GreetingModal] Could not access sessionStorage:', e);
    }
  }, []);

  const onExecuteCta = useCallback(
    (cta?: GreetingCTA) => {
      if (!cta) return;
      handleCtaClick(cta);
      handleDismiss();
    },
    [handleCtaClick, handleDismiss]
  );

  // Check if greeting feature is enabled in admin settings
  const isGreetingEnabled = settings?.feat_greeting !== '0';

  // Exclude dashboard / admin routes
  const isDashboardRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/station-admin');

  if (!isGreetingEnabled || isDashboardRoute || isDismissed || isLoading || !greetingData) {
    return null;
  }

  const getBadgeStyle = (badgeType?: GreetingResult['badgeType']) => {
    if (isLightMode) {
      switch (badgeType) {
        case 'live':
          return 'bg-red-50 text-red-600 border-red-200';
        case 'streak':
          return 'bg-neon-purple/10 text-neon-purple border-neon-purple/30';
        case 'welcome':
          return 'bg-neon-purple/10 text-neon-purple border-neon-purple/30';
        case 'vip':
          return 'bg-neon-blue/10 text-neon-blue border-neon-blue/30';
        case 'music':
        default:
          return 'bg-neon-purple/5 text-neon-purple border-neon-purple/20';
      }
    }

    switch (badgeType) {
      case 'live':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'streak':
        return 'bg-neon-purple/15 text-neon-purple border-neon-purple/30 shadow-[0_0_12px_rgba(176,38,255,0.2)]';
      case 'welcome':
        return 'bg-neon-purple/15 text-neon-purple border-neon-purple/30 shadow-[0_0_12px_rgba(176,38,255,0.2)]';
      case 'vip':
        return 'bg-neon-blue/15 text-neon-blue border-neon-blue/30 shadow-[0_0_12px_rgba(0,210,255,0.2)]';
      case 'music':
      default:
        return 'bg-neon-purple/10 text-neon-purple border-neon-purple/20';
    }
  };

  const faviconSrc = settings?.favicon || '/favicon.svg';

  return (
    <AnimatePresence>
      {!isDismissed && (
        <div
          id="personalized-greeting-modal-backdrop"
          className={`fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 backdrop-blur-md select-none overflow-y-auto overscroll-contain transition-colors duration-300 ${
            isLightMode ? 'bg-slate-950/20' : 'bg-black/75'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleDismiss();
            }
          }}
        >
          {/* Centered Scrollable Wrapper with Safe Margin Top/Bottom */}
          <div
            className="w-full max-w-lg sm:max-w-xl my-auto py-3 sm:py-6 flex items-center justify-center pointer-events-none"
          >
            {/* Modal Card - Ultra-Premium Glassmorphism Container */}
            <motion.div
              id="personalized-greeting-modal-card"
              initial={{ opacity: 0, scale: 0.93, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{
                duration: 0.28,
                ease: [0.16, 1, 0.3, 1]
              }}
              className={`relative w-full overflow-hidden rounded-[28px] sm:rounded-[34px] p-6 sm:p-9 text-center border transition-all duration-300 pointer-events-auto backdrop-blur-3xl backdrop-saturate-200 ${
                isLightMode
                  ? 'bg-gradient-to-b from-white/95 via-white/90 to-slate-50/85 border-white shadow-[0_30px_65px_-15px_rgba(15,23,42,0.08),0_15px_35px_-10px_rgba(176,38,255,0.07),0_6px_16px_-4px_rgba(15,23,42,0.04),inset_0_2px_3px_0_#ffffff,inset_0_-3px_8px_0_rgba(15,23,42,0.02),inset_0_0_28px_0_rgba(255,255,255,0.8)] text-slate-900'
                  : 'bg-gradient-to-b from-[#14161f]/75 via-[#0e1017]/70 to-[#0a0b0f]/80 border-white/[0.14] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.8),inset_0_1px_1.5px_0_rgba(255,255,255,0.22),inset_0_-1px_1px_0_rgba(0,0,0,0.5),0_0_50px_rgba(176,38,255,0.14)] text-white'
              }`}
            >
              {/* Ambient Frosted Light Blooms inside the Glass Container */}
              <div
                className={`pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl ${
                  isLightMode ? 'bg-purple-300/30 opacity-50' : 'bg-neon-purple/25 opacity-70'
                }`}
              />
              <div
                className={`pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-3xl ${
                  isLightMode ? 'bg-sky-200/30 opacity-50' : 'bg-neon-blue/20 opacity-70'
                }`}
              />

              {/* Top Close Button */}
              <button
                id="greeting-modal-close-btn"
                type="button"
                onClick={handleDismiss}
                aria-label="Close"
                className={`absolute top-4 right-4 sm:top-5 sm:right-5 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer backdrop-blur-xl ${
                  isLightMode
                    ? 'bg-slate-100/80 hover:bg-white border-slate-200/90 text-slate-600 hover:text-neon-purple shadow-[0_2px_6px_rgba(0,0,0,0.03),inset_0_1px_1px_#ffffff]'
                    : 'bg-white/[0.07] hover:bg-white/[0.14] border-white/15 text-neutral-300 hover:text-white shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Centered Modal Body Content */}
              <div className="relative z-10 flex flex-col items-center justify-center space-y-3.5 sm:space-y-4.5 pt-1 sm:pt-0">
                {/* Favicon in Frosted Glass Pod */}
                <div
                  id="greeting-modal-favicon-container"
                  className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center p-2 sm:p-2.5 transition-all duration-300 backdrop-blur-xl overflow-hidden ${
                    isLightMode
                      ? 'bg-gradient-to-b from-white to-slate-50/90 border border-slate-200/80 shadow-[0_6px_18px_rgba(0,0,0,0.04),inset_0_1px_2px_#ffffff]'
                      : 'bg-white/[0.08] border border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.4),inset_0_1px_1.5px_rgba(255,255,255,0.25),0_0_20px_rgba(176,38,255,0.18)]'
                  }`}
                >
                  <img
                    src={faviconSrc}
                    alt="Dejavu FM"
                    className="w-full h-full object-contain rounded-xl drop-shadow-sm"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/favicon.svg';
                    }}
                  />
                </div>

                {/* Centered Status Badge with Glass Treatment */}
                {greetingData.badgeText && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-xs ${getBadgeStyle(
                      greetingData.badgeType
                    )}`}
                  >
                    {greetingData.badgeType === 'live' && (
                      <span
                        className={`w-2 h-2 rounded-full animate-pulse ${
                          isLightMode ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]'
                        }`}
                      />
                    )}
                    {greetingData.badgeText}
                  </span>
                )}

                {/* Title & Messages - Fully Centered */}
                <div className="space-y-1.5 sm:space-y-2 text-center w-full max-w-md mx-auto">
                  <h2
                    className={`text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight drop-shadow-xs ${
                      isLightMode ? 'text-slate-950' : 'text-white'
                    }`}
                  >
                    {greetingData.greeting}
                  </h2>

                  <p
                    className={`text-xs sm:text-sm md:text-base font-medium leading-relaxed ${
                      isLightMode ? 'text-slate-700' : 'text-neutral-200'
                    }`}
                  >
                    {greetingData.message}
                  </p>

                  {greetingData.supportingInfo && (
                    <p
                      className={`greeting-support-text text-xs sm:text-sm font-normal ${
                        isLightMode ? 'text-slate-500' : 'text-neutral-400'
                      }`}
                    >
                      {greetingData.supportingInfo}
                    </p>
                  )}
                </div>

                {/* Centered Action Buttons */}
                <div className="w-full pt-2 sm:pt-3 space-y-2.5 sm:space-y-3 max-w-md mx-auto">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full">
                    {/* Primary CTA */}
                    {greetingData.cta && (
                      <button
                        id="greeting-modal-primary-cta"
                        type="button"
                        onClick={() => onExecuteCta(greetingData.cta)}
                        className={`w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 cursor-pointer min-h-[44px] sm:min-h-[48px] ${
                          isLightMode
                            ? 'bg-gradient-to-r from-neon-purple to-purple-600 hover:brightness-105 text-white shadow-[0_8px_24px_-4px_rgba(176,38,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)]'
                            : 'bg-gradient-to-r from-neon-purple via-[#8f24ea] to-neon-blue hover:brightness-110 text-white shadow-[0_0_24px_rgba(176,38,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_0_30px_rgba(176,38,255,0.6)]'
                        }`}
                      >
                        {greetingData.cta.action === 'play_live' ? (
                          isPlaying ? (
                            <Volume2 className="w-4 h-4 animate-pulse text-white" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-white text-white" />
                          )
                        ) : (
                          <Radio className="w-4 h-4 text-white" />
                        )}
                        <span>{greetingData.cta.label}</span>
                      </button>
                    )}

                    {/* Secondary CTA: Frosted Glass Button */}
                    {greetingData.secondaryCta && (
                      <button
                        id="greeting-modal-secondary-cta"
                        type="button"
                        onClick={() => onExecuteCta(greetingData.secondaryCta)}
                        className={`w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 rounded-full text-xs sm:text-sm font-semibold border transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-xl min-h-[44px] sm:min-h-[48px] ${
                          isLightMode
                            ? 'text-slate-800 hover:text-neon-purple bg-white/60 hover:bg-white/85 border-white/80 hover:border-neon-purple/40 shadow-[0_4px_14px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)]'
                            : 'text-neutral-100 hover:text-white bg-white/[0.07] hover:bg-white/[0.13] border-white/15 hover:border-neon-purple/40 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                        }`}
                      >
                        <Radio
                          className={`w-3.5 h-3.5 ${
                            isLightMode ? 'text-slate-700' : 'text-neutral-300'
                          }`}
                        />
                        <span>{greetingData.secondaryCta.label}</span>
                        <ArrowRight
                          className={`w-3.5 h-3.5 ${
                            isLightMode ? 'text-slate-500' : 'text-neutral-400'
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Dismiss Text */}
                  <div>
                    <button
                      id="greeting-modal-dismiss-btn"
                      type="button"
                      onClick={handleDismiss}
                      className={`text-xs font-medium transition-colors cursor-pointer py-1.5 ${
                        isLightMode
                          ? 'text-slate-500 hover:text-slate-900'
                          : 'text-neutral-400 hover:text-neutral-100'
                      }`}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
