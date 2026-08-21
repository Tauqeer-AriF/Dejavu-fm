import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Trophy, Crown, Sparkles, ChevronRight } from 'lucide-react';
import { useGamification } from '../../context/GamificationContext.tsx';
import { useLogo } from '../../hooks/useLogo.ts';

interface GamificationNavBadgeProps {
  mobileMenu?: boolean;
  onItemClick?: () => void;
  className?: string;
  isLightMode?: boolean;
}

export function GamificationNavBadge({ mobileMenu, onItemClick, className, isLightMode: passedIsLightMode }: GamificationNavBadgeProps = {}) {
  const { profile, openHub, isLoading, isEnabled } = useGamification();
  const { settings } = useLogo();

  const [domIsLight, setDomIsLight] = useState(() => {
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
    const checkDom = () => {
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
    checkDom();
    window.addEventListener('theme-change', checkDom);
    window.addEventListener('storage', checkDom);
    window.addEventListener('dashboard-theme-change', checkDom);
    const observer = new MutationObserver(checkDom);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    }
    return () => {
      window.removeEventListener('theme-change', checkDom);
      window.removeEventListener('storage', checkDom);
      window.removeEventListener('dashboard-theme-change', checkDom);
      observer.disconnect();
    };
  }, []);

  const isLightMode = passedIsLightMode !== undefined ? passedIsLightMode : domIsLight;

  const isGamificationActive = isEnabled ?? (settings?.feat_gamification !== '0');

  if (!isGamificationActive) {
    return null;
  }

  if (isLoading) {
    if (mobileMenu) {
      return (
        <div className={`w-full h-20 rounded-2xl animate-pulse flex items-center justify-center border ${
          isLightMode ? 'bg-slate-200/60 border-slate-200' : 'bg-white/5 border-white/5'
        } ${className || ''}`} />
      );
    }
    return (
      <div className={`h-10 w-28 rounded-2xl animate-pulse flex items-center justify-center border ${
        isLightMode ? 'bg-slate-200/50 border-slate-200' : 'bg-white/5 border-white/5'
      } ${className || ''}`} />
    );
  }

  if (!profile) {
    if (mobileMenu) {
      return (
        <div
          id="gamification-mobile-menu-guest-card"
          onClick={() => {
            openHub('quests');
            if (onItemClick) onItemClick();
          }}
          className={`w-full p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group hover:border-neon-purple/50 ${
            isLightMode
              ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
              : 'bg-gradient-to-r from-neon-purple/20 via-neon-blue/10 to-slate-900/80 border-neon-purple/30 text-white shadow-xl backdrop-blur-md'
          } ${className || ''}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neon-purple to-neon-blue p-[1.5px] shadow-[0_0_15px_rgba(176,38,255,0.4)] flex items-center justify-center shrink-0">
                <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${isLightMode ? 'bg-slate-50' : 'bg-[#0c0d14]'}`}>
                  <Trophy className={`w-5 h-5 ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-black uppercase tracking-wider truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                    Listener Rewards Hub
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                    isLightMode 
                      ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20' 
                      : 'bg-neon-purple/20 text-neon-purple'
                  }`}>
                    Earn XP
                  </span>
                </div>
                <p className={`text-[11px] mt-0.5 truncate ${isLightMode ? 'text-slate-500 font-medium' : 'text-white/60'}`}>
                  Level up, unlock badges & claim daily bonuses
                </p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0 ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
          </div>
        </div>
      );
    }

    return (
      <div
        id="gamification-guest-btn"
        role="button"
        tabIndex={0}
        onClick={() => openHub('quests')}
        className={`gamification-widget-btn flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border transition-all group shrink-0 cursor-pointer shadow-lg hover:border-neon-purple/50 ${
          isLightMode
            ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
            : 'bg-[#09090b]/60 border-white/10 text-white backdrop-blur-md'
        } ${className || ''}`}
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-neon-purple to-neon-blue flex items-center justify-center text-white shrink-0">
          <Trophy className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col text-left">
          <span className={`text-[10px] font-black uppercase tracking-wider leading-none ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            Rewards
          </span>
          <span className={`text-[9px] font-mono tracking-tight ${isLightMode ? 'text-neon-purple font-bold' : 'text-neon-blue'}`}>
            Earn XP & Badges
          </span>
        </div>
      </div>
    );
  }

  const {
    current_level,
    total_xp,
    level_title = 'New Listener',
    current_streak,
    progress_percentage
  } = profile;

  if (mobileMenu) {
    return (
      <div
        id="gamification-mobile-menu-profile-card"
        onClick={() => {
          openHub('profile');
          if (onItemClick) onItemClick();
        }}
        className={`w-full p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group hover:border-neon-purple/50 ${
          isLightMode
            ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
            : 'bg-gradient-to-r from-[#0d1322] via-[#121629] to-[#181128] border-neon-purple/30 text-white shadow-xl backdrop-blur-md'
        } ${className || ''}`}
      >
        {/* Ambient top border glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon-purple to-neon-blue" />

        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue p-[1.5px] shadow-[0_0_12px_rgba(176,38,255,0.4)] shrink-0">
              <div className={`w-full h-full rounded-[10px] flex items-center justify-center font-display font-black text-sm ${
                isLightMode ? 'bg-slate-50 text-neon-purple' : 'bg-[#0c0d14] text-neon-blue'
              }`}>
                {current_level >= 7 ? (
                  <Crown className="w-5 h-5 text-amber-500" />
                ) : current_level >= 4 ? (
                  <Sparkles className="w-5 h-5 text-neon-purple" />
                ) : (
                  <span>L{current_level}</span>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-black truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  {profile.username}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 border ${
                  isLightMode
                    ? 'bg-neon-purple/10 text-neon-purple border-neon-purple/20 font-bold'
                    : 'bg-neon-purple/20 border border-neon-purple/40 text-purple-300'
                }`}>
                  {level_title}
                </span>
              </div>
              <p className={`text-[10px] font-mono mt-0.5 truncate ${isLightMode ? 'text-slate-500 font-medium' : 'text-white/50'}`}>
                Level {current_level} • {total_xp} Total XP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {current_streak > 0 && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl shrink-0 border ${
                isLightMode 
                  ? 'bg-amber-100 border-amber-200 text-amber-800 font-bold' 
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
              }`}>
                <Flame className={`w-4 h-4 fill-amber-500/80 animate-pulse ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`} />
                <span className="text-xs font-mono font-bold">{current_streak}d</span>
              </div>
            )}
            <ChevronRight className={`w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className={isLightMode ? 'text-slate-600 font-medium' : 'text-white/60'}>Level {current_level} Progress</span>
            <span className={`font-bold ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`}>{progress_percentage}%</span>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden relative p-0.5 border ${
            isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-white/10 border-white/5'
          }`}>
            <motion.div
              className="h-full bg-gradient-to-r from-neon-purple to-neon-blue rounded-full shadow-[0_0_8px_rgba(176,38,255,0.6)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress_percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      id="gamification-profile-badge-btn"
      role="button"
      tabIndex={0}
      onClick={() => openHub('profile')}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`gamification-widget-btn flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl border transition-all group shrink-0 relative overflow-hidden cursor-pointer shadow-lg backdrop-blur-md hover:border-neon-purple/50 ${
        isLightMode
          ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
          : 'bg-[#09090b]/60 border-white/10 text-white shadow-xl'
      } ${className || ''}`}
      title={`${profile.username} - Level ${current_level} (${level_title})`}
    >
      {/* Ambient subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 via-neon-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Level Badge Icon */}
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue p-[1.5px] shadow-[0_0_12px_rgba(176,38,255,0.35)]">
          <div className={`w-full h-full rounded-[10px] flex items-center justify-center font-display font-black text-xs ${
            isLightMode ? 'bg-slate-50 text-neon-purple' : 'bg-[#0c0d14] text-neon-blue'
          }`}>
            {current_level >= 7 ? (
              <Crown className="w-4 h-4 text-amber-400" />
            ) : current_level >= 4 ? (
              <Sparkles className="w-4 h-4 text-neon-purple" />
            ) : (
              <span>L{current_level}</span>
            )}
          </div>
        </div>
      </div>

      {/* User Stats Snippet */}
      <div className="flex flex-col text-left min-w-[70px] sm:min-w-[90px]">
        <div className="flex items-center justify-between gap-1.5">
          <span className={`text-[10px] font-black uppercase tracking-wider truncate max-w-[80px] sm:max-w-[100px] ${
            isLightMode ? 'text-slate-800' : 'text-slate-300'
          }`}>
            {level_title}
          </span>
          <span className={`text-[9px] font-mono shrink-0 font-bold ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`}>
            {total_xp} XP
          </span>
        </div>

        {/* Level XP Progress Bar */}
        <div className={`w-full h-1.5 rounded-full mt-1 overflow-hidden relative ${
          isLightMode ? 'bg-slate-100' : 'bg-white/10'
        }`}>
          <motion.div
            className="h-full bg-gradient-to-r from-neon-purple to-neon-blue rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress_percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Daily Streak Indicator */}
      {current_streak > 0 && (
        <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg shrink-0 border ${
          isLightMode 
            ? 'bg-amber-100 border-amber-200 text-amber-700' 
            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
        }`}>
          <Flame className={`w-3.5 h-3.5 fill-amber-400/80 animate-pulse ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`} />
          <span className="text-[10px] font-mono font-bold">{current_streak}d</span>
        </div>
      )}
    </motion.div>
  );
}

