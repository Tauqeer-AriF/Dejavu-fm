import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trophy,
  Flame,
  Zap,
  Award,
  Crown,
  Sparkles,
  Headphones,
  Moon,
  Compass,
  Heart,
  MessageSquare,
  Globe,
  Music,
  Share2,
  Radio,
  Clock,
  CheckCircle2,
  Lock,
  ChevronRight,
  Copy,
  Check,
  Shield,
  Eye,
  EyeOff,
  User,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Play,
  Users
} from 'lucide-react';
import { useGamification } from '../../context/GamificationContext.tsx';
import { useAudio } from '../../context/AudioContext.tsx';
import { useLogo } from '../../hooks/useLogo.ts';
import { GamificationBadge, LeaderboardEntry } from '../../types/gamification.ts';
import { toast } from 'sonner';

// Helper to render badge icon dynamically
function renderBadgeIcon(iconName: string, className = 'w-6 h-6') {
  switch (iconName?.toLowerCase()) {
    case 'headphones':
      return <Headphones className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'moon':
      return <Moon className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'messagesquare':
    case 'message-square':
    case 'chat':
      return <MessageSquare className={className} />;
    case 'globe':
      return <Globe className={className} />;
    case 'music':
      return <Music className={className} />;
    case 'share2':
    case 'share':
      return <Share2 className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'radio':
      return <Radio className={className} />;
    default:
      return <Award className={className} />;
  }
}

export function GamificationHubModal() {
  const navigate = useNavigate();
  const { isPlaying, playRadio } = useAudio();
  const {
    profile,
    isHubOpen,
    closeHub,
    activeHubTab,
    setActiveHubTab,
    refreshProfile,
    claimShareXp,
    isEnabled
  } = useGamification();

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

  const isLightMode = domIsLight;
  const isGamificationActive = isEnabled ?? (settings?.feat_chat !== '0' && settings?.feat_gamification !== '0');

  // Leaderboard state
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<'weekly' | 'monthly' | 'all_time'>('all_time');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  // Daily login claiming state
  const [isClaimingLogin, setIsClaimingLogin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [privacyToggling, setPrivacyToggling] = useState(false);

  // Fetch leaderboard when tab or timeframe changes
  useEffect(() => {
    if (!isHubOpen || activeHubTab !== 'leaderboard') return;

    let isMounted = true;
    setIsLeaderboardLoading(true);

    fetch(`/api/public/gamification/leaderboard?timeframe=${leaderboardTimeframe}&limit=50`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setLeaderboardData(data.entries || []);
        }
      })
      .catch(err => {
        console.error('Error fetching leaderboard:', err);
      })
      .finally(() => {
        if (isMounted) setIsLeaderboardLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isHubOpen, activeHubTab, leaderboardTimeframe]);

  if (!isHubOpen || !isGamificationActive) return null;

  // Handle Daily Login Claim
  const handleClaimDailyLogin = async () => {
    setIsClaimingLogin(true);
    try {
      const res = await fetch('/api/public/gamification/daily-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && data.xp_awarded > 0) {
        toast.success(`Claimed +${data.xp_awarded} XP daily login bonus!`);
        refreshProfile();
      } else {
        toast.info(data.description || 'Daily login bonus already claimed today!');
      }
    } catch (e) {
      toast.error('Failed to claim daily login bonus');
    } finally {
      setIsClaimingLogin(false);
    }
  };

  // Handle Share Show
  const handleShareShow = async () => {
    const shareUrl = window.location.origin;
    const shareData = {
      title: 'Dejavu FM | London Underground Radio',
      text: 'Listen live to Underground House, Garage, Jungle & Grime on Dejavu FM!',
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        await claimShareXp('Dejavu FM Live', shareUrl);
        toast.success('Thanks for sharing Dejavu FM! +25 XP');
      } catch (err) {
        // User canceled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        await claimShareXp('Dejavu FM Live', shareUrl);
        toast.success('Link copied to clipboard! +25 XP');
      } catch (e) {
        toast.error('Could not copy link');
      }
    }
  };

  // Toggle Leaderboard Visibility
  const handleTogglePrivacy = async () => {
    if (!profile) return;
    setPrivacyToggling(true);
    const newStatus = !profile.show_on_leaderboard;
    try {
      const res = await fetch('/api/public/gamification/settings/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ show_on_leaderboard: newStatus })
      });
      if (res.ok) {
        toast.success(newStatus ? 'Your name is now visible on public leaderboards' : 'Your name is now anonymized on leaderboards');
        refreshProfile();
      }
    } catch (e) {
      toast.error('Failed to update privacy');
    } finally {
      setPrivacyToggling(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeHub}
          className={`fixed inset-0 transition-colors ${
            isLightMode ? 'bg-slate-950/25 backdrop-blur-sm' : 'bg-black/80 backdrop-blur-md'
          }`}
        />

        {/* Modal Card */}
        <motion.div
          id="gamification-hub-modal-card"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-4xl rounded-3xl border overflow-hidden flex flex-col max-h-[92vh] z-10 transition-colors ${
            isLightMode
              ? 'bg-white border-slate-200 text-slate-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)]'
              : 'bg-[#0e1017] border-white/10 text-white shadow-[0_0_80px_rgba(0,0,0,0.9)]'
          }`}
        >
          {/* Header Bar */}
          <div className={`relative p-3.5 sm:p-6 border-b flex items-center justify-between shrink-0 ${
            isLightMode
              ? 'border-slate-200 bg-slate-50/90'
              : 'border-white/10 bg-gradient-to-r from-neon-purple/10 via-neon-blue/5 to-transparent'
          }`}>
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 pr-2">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue p-[1.5px] shadow-lg flex items-center justify-center shrink-0">
                <div className={`w-full h-full rounded-[10px] sm:rounded-[14px] flex items-center justify-center ${
                  isLightMode ? 'bg-white' : 'bg-[#0c0d14]'
                }`}>
                  <Trophy className={`w-4 h-4 sm:w-5 sm:h-5 ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className={`text-sm sm:text-xl font-display font-black uppercase tracking-tight truncate ${
                    isLightMode ? 'text-slate-900' : 'text-white'
                  }`}>
                    Listener Rewards Hub
                  </h2>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-bold uppercase shrink-0 ${
                    isLightMode
                      ? 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple'
                      : 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
                  }`}>
                    Level Up
                  </span>
                </div>
                <p className={`text-[11px] sm:text-xs font-medium truncate sm:whitespace-normal ${
                  isLightMode ? 'text-slate-500' : 'text-white/60'
                }`}>
                  Tune in, support DJs, chat & unlock achievements
                </p>
              </div>
            </div>

            <button
              onClick={closeHub}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
              }`}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-6 border-b shrink-0 overflow-x-auto scrollbar-none ${
            isLightMode
              ? 'border-slate-200 bg-slate-50'
              : 'border-white/10 bg-white/[0.02]'
          }`}>
            <button
              onClick={() => setActiveHubTab('profile')}
              title="My Profile"
              className={`gamification-nav-tab flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeHubTab === 'profile'
                  ? 'active bg-neon-purple text-[#ffffff] shadow-md'
                  : isLightMode
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">My Profile</span>
            </button>

            <button
              onClick={() => setActiveHubTab('quests')}
              title="Earn Up"
              className={`gamification-nav-tab flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeHubTab === 'quests'
                  ? 'active bg-neon-purple text-[#ffffff] shadow-md'
                  : isLightMode
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Earn Up</span>
            </button>

            <button
              onClick={() => setActiveHubTab('badges')}
              title="Badges"
              className={`gamification-nav-tab flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer relative ${
                activeHubTab === 'badges'
                  ? 'active bg-neon-purple text-[#ffffff] shadow-md'
                  : isLightMode
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="relative flex items-center">
                <Award className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
                {profile?.badges && profile.badges.some(b => b.unlocked) && (
                  <span className="sm:hidden absolute -top-1.5 -right-2 px-1 py-0.2 bg-neon-purple text-white text-[8px] font-mono rounded-full font-bold">
                    {profile.badges.filter(b => b.unlocked).length}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">
                Badges ({profile?.badges ? profile.badges.filter(b => b.unlocked).length : 0})
              </span>
            </button>

            <button
              onClick={() => setActiveHubTab('leaderboard')}
              title="Leaderboard"
              className={`gamification-nav-tab flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeHubTab === 'leaderboard'
                  ? 'active bg-neon-purple text-[#ffffff] shadow-md'
                  : isLightMode
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* ----------------- TAB: MY PROFILE ----------------- */}
            {activeHubTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {!profile ? (
                  <div className={`p-8 rounded-3xl text-center space-y-4 ${
                    isLightMode ? 'bg-slate-50 border border-slate-200' : 'bg-white/5 border border-white/10'
                  }`}>
                    <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                      isLightMode ? 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple' : 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
                    }`}>
                      <Lock className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Join the Listener Community</h3>
                      <p className={`text-sm max-w-md mx-auto mt-1 ${isLightMode ? 'text-slate-600' : 'text-white/60'}`}>
                        Log in or create a free listener account in the live chat sidebar to track your listening streaks, collect exclusive badges, and climb the leaderboard.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        closeHub();
                        // Trigger chat sidebar
                        const chatBtn = document.getElementById('toggle-chat-button');
                        if (chatBtn) chatBtn.click();
                      }}
                      className="px-6 py-3 rounded-2xl bg-neon-purple hover:bg-neon-purple/90 text-[#ffffff] font-black text-xs uppercase tracking-widest transition-all shadow-lg inline-flex items-center gap-2"
                    >
                      <span>Open Live Chat to Log In</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Top Identity Banner */}
                    <div className={`gamification-banner-surface p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden ${
                      isLightMode
                        ? 'bg-slate-50/80 border border-slate-200 shadow-sm'
                        : 'bg-gradient-to-br from-neon-purple/10 via-neon-blue/5 to-transparent border border-white/10'
                    }`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <img
                            src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`}
                            alt={profile.username}
                            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border-2 border-neon-purple/40 p-1 shadow-sm shrink-0 object-cover ${
                              isLightMode ? 'bg-white' : 'bg-black/40'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`text-base sm:text-xl font-display font-black uppercase tracking-tight truncate ${
                                isLightMode ? 'text-slate-900' : 'text-white'
                              }`}>
                                {profile.username}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                isLightMode
                                  ? 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple'
                                  : 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
                              }`}>
                                {profile.level_title}
                              </span>
                            </div>
                            <p className={`text-[11px] sm:text-xs font-mono mt-0.5 truncate ${
                              isLightMode ? 'text-slate-500' : 'text-white/50'
                            }`}>
                              Ranked Level {profile.current_level} • {profile.total_xp} Total XP
                            </p>
                          </div>
                        </div>

                        {/* Streak Badge */}
                        <div className={`gamification-card-surface flex items-center gap-2.5 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shrink-0 w-full sm:w-auto justify-between sm:justify-start ${
                          isLightMode ? 'bg-white border border-slate-200 shadow-sm text-slate-900' : 'bg-black/40 border border-white/10 text-white'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                              isLightMode
                                ? 'bg-amber-50 border border-amber-200 text-amber-600'
                                : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                            }`}>
                              <Flame className="w-4 h-4 sm:w-6 sm:h-6 animate-pulse fill-amber-400/30" />
                            </div>
                            <div>
                              <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                                isLightMode ? 'text-slate-500' : 'text-white/50'
                              }`}>
                                Daily Streak
                              </div>
                              <div className={`text-sm sm:text-base font-black font-mono ${
                                isLightMode ? 'text-amber-600' : 'text-amber-400'
                              }`}>
                                {profile.current_streak} {profile.current_streak === 1 ? 'Day' : 'Days'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Level XP Progress Bar */}
                      <div className={`mt-4 sm:mt-6 pt-3.5 sm:pt-5 border-t ${
                        isLightMode ? 'border-slate-200' : 'border-white/10'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] sm:text-xs font-mono mb-2">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className={isLightMode ? 'text-slate-600' : 'text-white/60'}>Level {profile.current_level}</span>
                            <span className={isLightMode ? 'text-slate-400' : 'text-white/30'}>→</span>
                            <span className={isLightMode ? 'text-neon-purple font-bold' : 'text-neon-blue font-bold'}>
                              {profile.next_level_min_xp !== null ? `Level ${profile.current_level + 1}` : 'Max Level'}
                            </span>
                          </div>
                          <span className={isLightMode ? 'text-slate-600' : 'text-white/60'}>
                            {profile.next_level_min_xp !== null ? (
                              <>
                                <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>{profile.xp_in_current_level}</strong> / {profile.next_level_min_xp - profile.current_level_min_xp} XP ({profile.xp_needed_for_next_level} to go)
                              </>
                            ) : (
                              <strong className={isLightMode ? 'text-neon-purple' : 'text-neon-blue'}>MAX LEVEL ACHIEVED</strong>
                            )}
                          </span>
                        </div>
                        <div className={`w-full h-2.5 sm:h-3 rounded-full overflow-hidden border relative p-0.5 ${
                          isLightMode ? 'bg-slate-200 border-slate-300' : 'bg-black/50 border-white/10'
                        }`}>
                          <motion.div
                            className="h-full bg-gradient-to-r from-neon-purple via-indigo-500 to-neon-blue rounded-full shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${profile.progress_percentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stats Metric Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                      <div className={`gamification-card-surface p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                        isLightMode ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300' : 'bg-white/[0.03] border border-white/10'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Total Time</span>
                          <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
                        </div>
                        <div className={`text-base sm:text-lg font-black font-mono ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{profile.total_listening_hours} hrs</div>
                        <p className={`text-[9px] sm:text-[10px] mt-0.5 truncate ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>Live stream tune-in</p>
                      </div>

                      <div className={`gamification-card-surface p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                        isLightMode ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300' : 'bg-white/[0.03] border border-white/10'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Today</span>
                          <Headphones className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isLightMode ? 'text-neon-purple' : 'text-neon-purple'}`} />
                        </div>
                        <div className={`text-base sm:text-lg font-black font-mono ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{profile.today_listening_minutes} mins</div>
                        <p className={`text-[9px] sm:text-[10px] mt-0.5 truncate ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>
                          {profile.qualified_today ? 'Streak verified' : 'Listen 10m to qualify'}
                        </p>
                      </div>

                      <div className={`gamification-card-surface p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                        isLightMode ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300' : 'bg-white/[0.03] border border-white/10'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Badges</span>
                          <Award className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isLightMode ? 'text-amber-500' : 'text-yellow-400'}`} />
                        </div>
                        <div className={`text-base sm:text-lg font-black font-mono ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                          {profile.badges ? profile.badges.filter(b => b.unlocked).length : 0} / {profile.badges ? profile.badges.length : 0}
                        </div>
                        <p className={`text-[9px] sm:text-[10px] mt-0.5 truncate ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>Achievements earned</p>
                      </div>

                      <div className={`gamification-card-surface p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                        isLightMode ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300' : 'bg-white/[0.03] border border-white/10'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Followed DJs</span>
                          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isLightMode ? 'text-pink-600' : 'text-pink-400'}`} />
                        </div>
                        <div className={`text-base sm:text-lg font-black font-mono ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                          {profile.followed_dj_ids ? profile.followed_dj_ids.length : 0}
                        </div>
                        <p className={`text-[9px] sm:text-[10px] mt-0.5 truncate ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>Resident favourites</p>
                      </div>
                    </div>

                    {/* Leaderboard Privacy Toggle & Settings */}
                    <div className={`gamification-card-surface p-4 rounded-2xl flex items-center justify-between gap-4 ${
                      isLightMode ? 'bg-white border border-slate-200 shadow-sm' : 'bg-white/[0.02] border border-white/10'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isLightMode ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-white/5 text-white/70'
                        }`}>
                          {profile.show_on_leaderboard ? (
                            <Eye className={`w-4 h-4 ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
                          ) : (
                            <EyeOff className={`w-4 h-4 ${isLightMode ? 'text-slate-400' : 'text-white/40'}`} />
                          )}
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Public Leaderboard Visibility</h4>
                          <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>
                            {profile.show_on_leaderboard
                              ? 'Your username and avatar are shown on public ranking boards.'
                              : 'Your name appears as "Anonymous Listener" on public leaderboards.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleTogglePrivacy}
                        disabled={privacyToggling}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          profile.show_on_leaderboard
                            ? isLightMode
                              ? 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20 shadow-sm'
                              : 'bg-neon-purple/20 border-neon-purple/40 text-neon-purple hover:bg-neon-purple/30'
                            : isLightMode
                              ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {profile.show_on_leaderboard ? 'Visible' : 'Anonymized'}
                      </button>
                    </div>

                    {/* Recent XP Activity Ledger */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-black uppercase tracking-wider ${
                          isLightMode ? 'text-slate-700' : 'text-white/70'
                        }`}>
                          Recent XP Activity
                        </h4>
                        <button
                          onClick={refreshProfile}
                          className={`text-[10px] font-mono flex items-center gap-1 font-bold cursor-pointer ${
                            isLightMode ? 'text-neon-purple hover:opacity-80' : 'text-neon-blue hover:underline'
                          }`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Refresh</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {profile.recent_transactions && profile.recent_transactions.length > 0 ? (
                          profile.recent_transactions.map(tx => (
                            <div
                              key={tx.id}
                              className={`gamification-card-surface p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isLightMode ? 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple' : 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
                                }`}>
                                  <Zap className="w-3.5 h-3.5" />
                                </div>
                                <div className="truncate">
                                  <p className={`font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{tx.description}</p>
                                  <span className={`text-[10px] font-mono ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>
                                    {new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <span className={`font-mono font-black shrink-0 ${
                                isLightMode ? 'text-neon-purple' : 'text-neon-blue'
                              }`}>
                                +{tx.amount} XP
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className={`gamification-card-surface p-4 rounded-xl text-center text-xs ${
                            isLightMode ? 'bg-slate-50 text-slate-500 border border-slate-200' : 'bg-white/[0.02] text-white/40'
                          }`}>
                            No XP activity recorded yet. Start tuning in and chatting to earn points!
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ----------------- TAB: EARN UP (QUESTS) ----------------- */}
            {activeHubTab === 'quests' && (
              <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className={`text-sm sm:text-base font-display font-black uppercase tracking-tight ${
                    isLightMode ? 'text-slate-900' : 'text-white'
                  }`}>
                    Daily Quests & Ways to Earn
                  </h3>
                  <p className={`text-[11px] sm:text-xs ${
                    isLightMode ? 'text-slate-600' : 'text-white/60'
                  }`}>
                    Complete activities to level up your listener profile, unlock rare badges, and climb the leaderboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                  {/* Quest 1: Daily Check-In */}
                  <div className={`gamification-card-surface p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 sm:space-y-4 transition-all ${
                    isLightMode
                      ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                      : 'bg-white/[0.03] border border-white/10 hover:border-amber-500/30'
                  }`}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isLightMode
                            ? 'bg-amber-50 border border-amber-200 text-amber-700'
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        }`}>
                          <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            isLightMode ? 'text-slate-900' : 'text-white'
                          }`}>Daily Login Bonus</h4>
                          <p className={`text-[10px] sm:text-xs truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Check in once every 24 hours</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold shrink-0 ${
                        isLightMode
                          ? 'bg-amber-50 border border-amber-200 text-amber-800'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}>
                        +20 XP
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (!profile) {
                          closeHub();
                          window.dispatchEvent(new CustomEvent('open-chat'));
                          const chatBtn = document.getElementById('toggle-chat-button');
                          if (chatBtn) chatBtn.click();
                          toast.info("Join the live chat to set your listener username and claim your daily XP!");
                          return;
                        }
                        handleClaimDailyLogin();
                      }}
                      disabled={isClaimingLogin}
                      className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isLightMode
                          ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 shadow-sm'
                          : 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{isClaimingLogin ? 'Claiming Bonus...' : 'Claim Daily Check-In'}</span>
                    </button>
                  </div>

                  {/* Quest 2: 10 Min Listening Streak */}
                  <div className={`gamification-card-surface p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 sm:space-y-4 transition-all ${
                    isLightMode
                      ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                      : 'bg-white/[0.03] border border-white/10 hover:border-neon-purple/30'
                  }`}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isLightMode
                            ? 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple'
                            : 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
                        }`}>
                          <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            isLightMode ? 'text-slate-900' : 'text-white'
                          }`}>10-Minute Tune-In</h4>
                          <p className={`text-[10px] sm:text-xs truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Listen live & verify daily streak</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold shrink-0 ${
                        isLightMode
                          ? 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple'
                          : 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
                      }`}>
                        +10 XP
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className={`text-[11px] sm:text-xs px-2.5 py-1.5 rounded-xl flex items-center justify-between ${
                        isLightMode ? 'bg-slate-50 text-slate-700 border border-slate-200' : 'bg-black/30 text-white/60'
                      }`}>
                        <span>Today's Progress:</span>
                        <span className={`font-mono font-bold ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`}>
                          {profile?.today_listening_minutes || 0} / 10 mins
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (!isPlaying) {
                            playRadio();
                          }
                          closeHub();
                          toast.success("Streaming Dejavu FM Live! Keep listening to build your daily streak.");
                        }}
                        className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isLightMode
                            ? 'bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 text-slate-900 shadow-sm'
                            : 'bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 hover:from-neon-purple/30 hover:to-neon-blue/30 border border-neon-purple/30 text-white'
                        }`}
                      >
                        <Play className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLightMode ? 'text-neon-purple fill-neon-purple/20' : 'fill-neon-blue/20'}`} />
                        <span>{isPlaying ? 'Currently Streaming Live' : 'Tune In Live Stream'}</span>
                        <ArrowUpRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Quest 3: Live Chat Participation */}
                  <div className={`gamification-card-surface p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 sm:space-y-4 transition-all ${
                    isLightMode
                      ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                      : 'bg-white/[0.03] border border-white/10 hover:border-neon-purple/30'
                  }`}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isLightMode
                            ? 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple'
                            : 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
                        }`}>
                          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            isLightMode ? 'text-slate-900' : 'text-white'
                          }`}>Live Chat Message</h4>
                          <p className={`text-[10px] sm:text-xs truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Interact with DJs & listeners (50 XP/day)</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold shrink-0 ${
                        isLightMode
                          ? 'bg-neon-purple/10 border border-neon-purple/30 text-neon-purple'
                          : 'bg-neon-purple/20 border border-neon-purple/40 text-neon-purple'
                      }`}>
                        +5 XP / msg
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        closeHub();
                        window.dispatchEvent(new CustomEvent('open-chat'));
                        const chatBtn = document.getElementById('toggle-chat-button');
                        if (chatBtn) chatBtn.click();
                        toast.success("Opened Live Chat Room — Say hello to DJs and listeners!");
                      }}
                      className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isLightMode
                          ? 'bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 text-slate-900 shadow-sm'
                          : 'bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 hover:from-neon-purple/30 hover:to-neon-blue/30 border border-neon-purple/30 text-white'
                      }`}
                    >
                      <MessageSquare className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
                      <span>Open Live Chat</span>
                      <ArrowUpRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
                    </button>
                  </div>

                  {/* Quest 4: Follow Resident DJs */}
                  <div className={`gamification-card-surface p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 sm:space-y-4 transition-all ${
                    isLightMode
                      ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                      : 'bg-white/[0.03] border border-white/10 hover:border-pink-500/30'
                  }`}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isLightMode
                            ? 'bg-pink-50 border border-pink-200 text-pink-700'
                            : 'bg-pink-500/10 border border-pink-500/20 text-pink-400'
                        }`}>
                          <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            isLightMode ? 'text-slate-900' : 'text-white'
                          }`}>Follow a Resident DJ</h4>
                          <p className={`text-[10px] sm:text-xs truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Support your favourite underground hosts</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold shrink-0 ${
                        isLightMode
                          ? 'bg-pink-50 border border-pink-200 text-pink-800'
                          : 'bg-pink-500/10 border border-pink-500/30 text-pink-400'
                      }`}>
                        +50 XP / DJ
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        closeHub();
                        navigate('/djs');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        toast.success("Browse resident DJs and tap the heart icon on any DJ to earn +50 XP!");
                      }}
                      className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isLightMode
                          ? 'bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-900 shadow-sm'
                          : 'bg-gradient-to-r from-pink-500/20 to-rose-600/20 hover:from-pink-500/30 hover:to-rose-600/30 border border-pink-500/30 text-pink-300'
                      }`}
                    >
                      <Users className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLightMode ? 'text-pink-800' : 'text-pink-400'}`} />
                      <span>Explore DJ Roster</span>
                      <ArrowUpRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLightMode ? 'text-pink-800' : 'text-pink-400'}`} />
                    </button>
                  </div>

                  {/* Quest 5: Share Station / Show */}
                  <div className={`gamification-card-surface p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 sm:space-y-4 transition-all ${
                    isLightMode
                      ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                      : 'bg-white/[0.03] border border-white/10 hover:border-emerald-500/30'
                  }`}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isLightMode
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        }`}>
                          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            isLightMode ? 'text-slate-900' : 'text-white'
                          }`}>Share Live Station</h4>
                          <p className={`text-[10px] sm:text-xs truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Spread underground sound with friends</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold shrink-0 ${
                        isLightMode
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      }`}>
                        +25 XP
                      </span>
                    </div>
                    <button
                      onClick={handleShareShow}
                      className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isLightMode
                          ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 shadow-sm'
                          : 'bg-gradient-to-r from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30 border border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      <span>{copiedLink ? 'Link Copied (+25 XP)' : 'Share Station Link'}</span>
                    </button>
                  </div>

                  {/* Quest 6: Send Shoutout & Song Request */}
                  <div className={`gamification-card-surface p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3 sm:space-y-4 transition-all ${
                    isLightMode
                      ? 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                      : 'bg-white/[0.03] border border-white/10 hover:border-yellow-500/30'
                  }`}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isLightMode
                            ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                            : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                        }`}>
                          <Music className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            isLightMode ? 'text-slate-900' : 'text-white'
                          }`}>Submit / Send Shoutout</h4>
                          <p className={`text-[10px] sm:text-xs truncate ${
                            isLightMode ? 'text-slate-500' : 'text-white/50'
                          }`}>Send live shoutouts & track requests</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold shrink-0 ${
                        isLightMode
                          ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                          : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                      }`}>
                        +20 XP
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        closeHub();
                        window.dispatchEvent(new CustomEvent('open-shoutout'));
                        const reqBtn = document.getElementById('song-request-trigger-btn');
                        if (reqBtn) reqBtn.click();
                        toast.success("Opened Studio Link — Send your song request or shoutout to on-air DJs!");
                      }}
                      className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isLightMode
                          ? 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-900 shadow-sm'
                          : 'bg-gradient-to-r from-yellow-500/20 to-amber-600/20 hover:from-yellow-500/30 hover:to-amber-600/30 border border-yellow-500/30 text-yellow-300'
                      }`}
                    >
                      <Music className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLightMode ? 'text-yellow-800' : 'text-yellow-400'}`} />
                      <span>Send Shoutout & Track Request</span>
                      <ArrowUpRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLightMode ? 'text-yellow-800' : 'text-yellow-400'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- TAB: BADGES & ACHIEVEMENTS ----------------- */}
            {activeHubTab === 'badges' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-base font-display font-black uppercase tracking-tight ${
                      isLightMode ? 'text-slate-900' : 'text-white'
                    }`}>
                      Badges & Milestones
                    </h3>
                    <p className={`text-xs ${
                      isLightMode ? 'text-slate-600' : 'text-white/60'
                    }`}>
                      Collect exclusive badges for listener dedication, genre exploration, and community support.
                    </p>
                  </div>
                  <div className={`text-xs font-mono px-3 py-1.5 rounded-xl font-bold ${
                    isLightMode
                      ? 'text-neon-purple bg-neon-purple/10 border border-neon-purple/30'
                      : 'text-neon-purple bg-neon-purple/20 border border-neon-purple/40'
                  }`}>
                    {profile?.badges ? profile.badges.filter(b => b.unlocked).length : 0} / {profile?.badges ? profile.badges.length : 0} Unlocked
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {profile?.badges && profile.badges.map((b: GamificationBadge) => (
                    <div
                      key={b.id}
                      className={`gamification-card-surface p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                        b.unlocked
                          ? isLightMode
                            ? 'bg-white border-neon-purple/40 shadow-sm ring-1 ring-neon-purple/20'
                            : 'bg-gradient-to-br from-neon-purple/15 via-neon-blue/10 to-transparent border-neon-purple/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                          : isLightMode
                            ? 'bg-slate-50 border-slate-200 opacity-80'
                            : 'bg-white/[0.02] border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                            b.unlocked
                              ? 'bg-neon-purple border-neon-purple/50 text-[#ffffff] shadow-md'
                              : isLightMode
                                ? 'bg-slate-100 border-slate-200 text-slate-400'
                                : 'bg-white/5 border-white/10 text-white/30'
                          }`}
                        >
                          {b.unlocked ? (
                            renderBadgeIcon(b.icon, 'w-6 h-6')
                          ) : (
                            <Lock className={`w-5 h-5 ${isLightMode ? 'text-slate-400' : 'text-white/30'}`} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className={`text-sm font-bold truncate ${
                              isLightMode ? 'text-slate-900' : 'text-white'
                            }`}>{b.name}</h4>
                            {b.unlocked && <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />}
                          </div>
                          <p className={`text-xs line-clamp-2 mt-0.5 ${
                            isLightMode ? 'text-slate-600' : 'text-white/60'
                          }`}>{b.description}</p>
                        </div>
                      </div>

                      {/* Progress Bar / Unlocked Status */}
                      <div className={`pt-2 border-t ${isLightMode ? 'border-slate-200' : 'border-white/5'}`}>
                        {b.unlocked ? (
                          <div className={`flex items-center justify-between text-[10px] font-mono ${
                            isLightMode ? 'text-neon-purple font-bold' : 'text-neon-blue'
                          }`}>
                            <span>UNLOCKED</span>
                            <span>{b.unlocked_at ? new Date(b.unlocked_at).toLocaleDateString() : 'Active'}</span>
                          </div>
                        ) : (
                          <div>
                            <div className={`flex items-center justify-between text-[10px] font-mono mb-1 ${
                              isLightMode ? 'text-slate-500' : 'text-white/40'
                            }`}>
                              <span>Progress</span>
                              <span>
                                {b.progress || 0} / {b.max_progress || b.requirement}
                              </span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                              isLightMode ? 'bg-slate-200' : 'bg-black/40'
                            }`}>
                              <div
                                className={`h-full rounded-full ${isLightMode ? 'bg-slate-400' : 'bg-white/20'}`}
                                style={{
                                  width: `${Math.min(100, Math.round(((b.progress || 0) / (b.max_progress || b.requirement || 1)) * 100))}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ----------------- TAB: LEADERBOARD ----------------- */}
            {activeHubTab === 'leaderboard' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-base font-display font-black uppercase tracking-tight ${
                      isLightMode ? 'text-slate-900' : 'text-white'
                    }`}>
                      Top Listener Rankings
                    </h3>
                    <p className={`text-xs ${
                      isLightMode ? 'text-slate-600' : 'text-white/60'
                    }`}>
                      Community members with the highest listening time and activity.
                    </p>
                  </div>

                  {/* Timeframe Filter Buttons */}
                  <div className={`gamification-timeframe-container flex items-center gap-1 p-1 rounded-xl shrink-0 ${
                    isLightMode ? 'bg-slate-100 border border-slate-200' : 'bg-black/40 border border-white/10'
                  }`}>
                    <button
                      onClick={() => setLeaderboardTimeframe('weekly')}
                      className={`gamification-timeframe-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        leaderboardTimeframe === 'weekly'
                          ? 'active ' + (isLightMode
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                            : 'bg-neon-purple text-[#ffffff] shadow')
                          : isLightMode
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                            : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setLeaderboardTimeframe('monthly')}
                      className={`gamification-timeframe-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        leaderboardTimeframe === 'monthly'
                          ? 'active ' + (isLightMode
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                            : 'bg-neon-purple text-[#ffffff] shadow')
                          : isLightMode
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                            : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setLeaderboardTimeframe('all_time')}
                      className={`gamification-timeframe-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        leaderboardTimeframe === 'all_time'
                          ? 'active ' + (isLightMode
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                            : 'bg-neon-purple text-[#ffffff] shadow')
                          : isLightMode
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                            : 'text-white/60 hover:text-white'
                      }`}
                    >
                      All-Time
                    </button>
                  </div>
                </div>

                {isLeaderboardLoading ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw className={`w-6 h-6 animate-spin mx-auto ${isLightMode ? 'text-neon-purple' : 'text-neon-blue'}`} />
                    <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-white/50'} font-mono`}>Loading rankings...</p>
                  </div>
                ) : leaderboardData.length === 0 ? (
                  <div className={`py-16 text-center text-xs rounded-2xl border ${
                    isLightMode ? 'text-slate-500 bg-slate-50 border-slate-200' : 'text-white/40 bg-white/[0.02] border-white/5'
                  }`}>
                    No leaderboard entries found for this timeframe yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Top 3 Podium if Available */}
                    {leaderboardData.length >= 3 && (
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mb-4 sm:mb-6 pt-2 sm:pt-4">
                        {/* Rank 2 */}
                        <div className={`gamification-card-surface p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border flex flex-col items-center text-center relative overflow-hidden ${
                          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.03] border-white/10'
                        }`}>
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full font-black text-[10px] sm:text-xs flex items-center justify-center mb-1.5 sm:mb-2 ${
                            isLightMode ? 'bg-slate-200 border border-slate-300 text-slate-700' : 'bg-slate-300/20 border border-slate-300/40 text-slate-300'
                          }`}>
                            #2
                          </div>
                          <img
                            src={leaderboardData[1].avatar_url}
                            alt=""
                            className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full border p-0.5 object-cover mb-1 sm:mb-2 ${
                              isLightMode ? 'border-slate-300 bg-slate-100' : 'border-slate-300/40 bg-black/40'
                            }`}
                          />
                          <h4 className={`text-[11px] sm:text-xs font-bold truncate max-w-full ${
                            isLightMode ? 'text-slate-900' : 'text-white'
                          }`}>
                            {leaderboardData[1].username}
                          </h4>
                          <span className={`text-[9px] sm:text-[10px] font-mono font-bold mt-0.5 sm:mt-1 ${
                            isLightMode ? 'text-neon-purple' : 'text-neon-blue'
                          }`}>
                            {leaderboardData[1].period_xp || leaderboardData[1].total_xp} XP
                          </span>
                        </div>

                        {/* Rank 1 */}
                        <div className={`gamification-card-surface p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border flex flex-col items-center text-center relative -translate-y-1.5 sm:-translate-y-2 ${
                          isLightMode
                            ? 'bg-amber-50/90 border-amber-300 shadow-md'
                            : 'bg-gradient-to-b from-yellow-500/20 to-transparent border-yellow-500/40 shadow-[0_0_25px_rgba(234,179,8,0.15)]'
                        }`}>
                          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mb-0.5 sm:mb-1 animate-bounce" />
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full font-black text-[10px] sm:text-xs flex items-center justify-center mb-1.5 sm:mb-2 ${
                            isLightMode
                              ? 'bg-amber-200 border border-amber-400 text-amber-900'
                              : 'bg-yellow-400/20 border border-yellow-400/50 text-yellow-300'
                          }`}>
                            #1
                          </div>
                          <img
                            src={leaderboardData[0].avatar_url}
                            alt=""
                            className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 p-0.5 object-cover mb-1 sm:mb-2 ${
                              isLightMode ? 'border-amber-400 bg-white' : 'border-yellow-400/80 bg-black/40'
                            }`}
                          />
                          <h4 className={`text-[11px] sm:text-xs font-black truncate max-w-full ${
                            isLightMode ? 'text-amber-950' : 'text-yellow-300'
                          }`}>
                            {leaderboardData[0].username}
                          </h4>
                          <span className={`text-[10px] sm:text-[11px] font-mono font-black mt-0.5 sm:mt-1 ${
                            isLightMode ? 'text-amber-700' : 'text-yellow-400'
                          }`}>
                            {leaderboardData[0].period_xp || leaderboardData[0].total_xp} XP
                          </span>
                        </div>

                        {/* Rank 3 */}
                        <div className={`gamification-card-surface p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border flex flex-col items-center text-center relative overflow-hidden ${
                          isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.03] border-white/10'
                        }`}>
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full font-black text-[10px] sm:text-xs flex items-center justify-center mb-1.5 sm:mb-2 ${
                            isLightMode ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-amber-700/20 border border-amber-700/40 text-amber-600'
                          }`}>
                            #3
                          </div>
                          <img
                            src={leaderboardData[2].avatar_url}
                            alt=""
                            className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full border p-0.5 object-cover mb-1 sm:mb-2 ${
                              isLightMode ? 'border-amber-300 bg-slate-100' : 'border-amber-700/40 bg-black/40'
                            }`}
                          />
                          <h4 className={`text-[11px] sm:text-xs font-bold truncate max-w-full ${
                            isLightMode ? 'text-slate-900' : 'text-white'
                          }`}>
                            {leaderboardData[2].username}
                          </h4>
                          <span className={`text-[9px] sm:text-[10px] font-mono font-bold mt-0.5 sm:mt-1 ${
                            isLightMode ? 'text-neon-purple' : 'text-neon-blue'
                          }`}>
                            {leaderboardData[2].period_xp || leaderboardData[2].total_xp} XP
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Table Rows */}
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
                      {leaderboardData.map(entry => (
                        <div
                          key={entry.rank + entry.username}
                          className={`gamification-card-surface p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 sm:gap-3 text-xs transition-all ${
                            entry.is_current_user
                              ? isLightMode
                                ? 'bg-neon-purple/10 border-neon-purple/30 shadow-sm'
                                : 'bg-neon-purple/20 border-neon-purple/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                              : isLightMode
                                ? 'bg-white border-slate-200 hover:bg-slate-50'
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <span className={`font-mono font-bold w-5 sm:w-6 text-center text-[11px] sm:text-xs shrink-0 ${
                              isLightMode ? 'text-slate-500' : 'text-white/50'
                            }`}>
                              #{entry.rank}
                            </span>
                            <img
                              src={entry.avatar_url}
                              alt=""
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border p-0.5 object-cover shrink-0 ${
                                isLightMode ? 'bg-white border-slate-200' : 'bg-black/40 border-white/10'
                              }`}
                            />
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold truncate text-[11px] sm:text-xs ${
                                  isLightMode ? 'text-slate-900' : 'text-white'
                                }`}>{entry.username}</span>
                                {entry.is_current_user && (
                                  <span className={`px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-mono font-bold uppercase shrink-0 ${
                                    isLightMode ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' : 'bg-neon-purple/30 text-neon-purple'
                                  }`}>
                                    You
                                  </span>
                                )}
                              </div>
                              <span className={`text-[9px] sm:text-[10px] font-mono truncate block ${
                                isLightMode ? 'text-slate-500' : 'text-white/40'
                              }`}>
                                Lvl {entry.current_level} • {entry.level_title}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            {entry.current_streak > 0 && (
                              <div className={`hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold ${
                                isLightMode ? 'text-amber-600' : 'text-amber-400'
                              }`}>
                                <Flame className={`w-3 h-3 ${isLightMode ? 'fill-amber-500/40 text-amber-600' : 'fill-amber-400/40'}`} />
                                <span>{entry.current_streak}d</span>
                              </div>
                            )}

                            <div className="text-right">
                              <div className={`font-mono font-black text-[11px] sm:text-xs ${
                                isLightMode ? 'text-neon-purple' : 'text-neon-blue'
                              }`}>
                                {entry.period_xp !== undefined ? entry.period_xp : entry.total_xp} XP
                              </div>
                              <div className={`text-[8px] sm:text-[9px] font-mono ${
                                isLightMode ? 'text-slate-400' : 'text-white/40'
                              }`}>
                                {entry.badges_count} badges
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
