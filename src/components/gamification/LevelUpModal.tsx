import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Crown, ArrowRight, X } from 'lucide-react';
import { useGamification } from '../../context/GamificationContext.tsx';
import { useLogo } from '../../hooks/useLogo.ts';

export function LevelUpModal() {
  const { levelUpModalData, closeLevelUpModal, openHub, isEnabled } = useGamification();

  const [domIsLight, setDomIsLight] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      const body = document.body;
      return html.classList.contains('light') ||
             html.classList.contains('theme-light') ||
             html.classList.contains('admin-light-mode') ||
             Boolean(body && (body.classList.contains('light') || body.classList.contains('theme-light') || body.classList.contains('admin-light-mode'))) ||
             html.getAttribute('data-theme') === 'light';
    }
    return false;
  });

  useEffect(() => {
    const checkTheme = () => {
      if (typeof document === 'undefined') return;
      const html = document.documentElement;
      const body = document.body;
      const isLight = html.classList.contains('light') ||
                      html.classList.contains('theme-light') ||
                      html.classList.contains('admin-light-mode') ||
                      Boolean(body && (body.classList.contains('light') || body.classList.contains('theme-light') || body.classList.contains('admin-light-mode'))) ||
                      html.getAttribute('data-theme') === 'light';
      setDomIsLight(isLight);
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    }
    window.addEventListener('theme-change', checkTheme);
    window.addEventListener('dashboard-theme-change', checkTheme);
    window.addEventListener('storage', checkTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('theme-change', checkTheme);
      window.removeEventListener('dashboard-theme-change', checkTheme);
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  const isLightMode = domIsLight;

  if (!isEnabled || !levelUpModalData || !levelUpModalData.show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLevelUpModal}
          className={`absolute inset-0 transition-colors ${
            isLightMode ? 'bg-slate-950/25 backdrop-blur-sm' : 'bg-black/80 backdrop-blur-md'
          }`}
        />

        {/* Modal Window */}
        <motion.div
          id="level-up-modal-card"
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 text-center overflow-hidden z-10 transition-all ${
            isLightMode
              ? 'bg-white border border-slate-200 shadow-2xl ring-1 ring-neon-purple/20 text-slate-900'
              : 'bg-[#0d0f17] border border-neon-purple/30 shadow-[0_0_80px_rgba(176,38,255,0.3)] text-white'
          }`}
        >
          {/* Background Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-neon-purple/20 to-neon-blue/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={closeLevelUpModal}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
              isLightMode
                ? 'text-slate-400 hover:text-neon-purple bg-slate-100 hover:bg-slate-200'
                : 'text-white/40 hover:text-neon-purple bg-white/5 hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Badge */}
          <div className="relative mx-auto w-24 h-24 mb-5">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              className="absolute inset-0 rounded-3xl bg-neon-purple blur-md opacity-70"
            />
            <div className="relative w-full h-full rounded-3xl bg-neon-purple p-1 flex items-center justify-center shadow-2xl">
              <div className={`w-full h-full rounded-[22px] flex flex-col items-center justify-center ${
                isLightMode ? 'bg-white' : 'bg-[#0c0e18]'
              }`}>
                {levelUpModalData.level >= 20 ? (
                  <Crown className="w-10 h-10 text-amber-500 animate-bounce" />
                ) : (
                  <Trophy className="w-10 h-10 text-neon-purple animate-bounce" />
                )}
                <span className={`text-[10px] font-black uppercase tracking-widest mt-1 font-mono ${
                  isLightMode ? 'text-neon-purple' : 'text-neon-blue'
                }`}>
                  LVL {levelUpModalData.level}
                </span>
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest mb-2 ${
            isLightMode ? 'text-neon-purple' : 'text-neon-blue'
          }`}>
            <Sparkles className="w-4 h-4" />
            <span>Level Promoted!</span>
            <Sparkles className="w-4 h-4" />
          </div>

          <h2 className={`text-2xl sm:text-3xl font-display font-black uppercase tracking-tight mb-2 ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            {levelUpModalData.title}
          </h2>

          <p className={`text-sm font-medium mb-6 leading-relaxed ${
            isLightMode ? 'text-slate-600' : 'text-white/70'
          }`}>
            You just reached <span className={`font-bold ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`}>Level {levelUpModalData.level}</span> on dejavufm! Keep listening and interacting to unlock legendary status.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                closeLevelUpModal();
                openHub('profile');
              }}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-neon-purple hover:bg-neon-purple/90 text-[#ffffff] font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View Rewards</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={closeLevelUpModal}
              className={`w-full sm:w-auto py-3 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:text-neon-purple'
                  : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-neon-purple'
              }`}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
