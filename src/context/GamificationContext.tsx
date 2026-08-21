import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { UserGamificationProfile, XPAwardResult } from '../types/gamification.ts';
import { useAudio } from './AudioContext.tsx';
import { useLogo } from '../hooks/useLogo.ts';
import { Trophy, Flame, Zap, Award, Sparkles } from 'lucide-react';

interface GamificationContextType {
  profile: UserGamificationProfile | null;
  isLoading: boolean;
  isEnabled: boolean;
  isHubOpen: boolean;
  activeHubTab: 'profile' | 'badges' | 'leaderboard' | 'quests';
  openHub: (tab?: 'profile' | 'badges' | 'leaderboard' | 'quests') => void;
  closeHub: () => void;
  setActiveHubTab: (tab: 'profile' | 'badges' | 'leaderboard' | 'quests') => void;
  refreshProfile: () => Promise<void>;
  toggleFollowDj: (djId: string) => Promise<boolean>;
  claimShareXp: (showName?: string, url?: string) => Promise<void>;
  levelUpModalData: { level: number; title: string; show: boolean } | null;
  closeLevelUpModal: () => void;
  isFollowingDj: (djId: string) => boolean;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

// Sound effect player for gamification milestones (non-intrusive, web audio synthesizer)
function playCelebrationSound(type: 'xp' | 'badge' | 'levelup' | 'streak') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'levelup') {
      // Ascending major arpeggio
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5
      osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
      osc.frequency.setValueAtTime(880, now + 0.3); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (type === 'badge' || type === 'streak') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Subtle short chime for normal XP
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // Audio context not allowed or failed silently
  }
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { settings, isLightMode } = useLogo();
  const featChat = settings?.feat_chat !== '0';
  const isEnabled = featChat && settings?.feat_gamification !== '0';

  const [profile, setProfile] = useState<UserGamificationProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHubOpen, setIsHubOpen] = useState<boolean>(false);
  const [activeHubTab, setActiveHubTab] = useState<'profile' | 'badges' | 'leaderboard' | 'quests'>('profile');
  const [levelUpModalData, setLevelUpModalData] = useState<{ level: number; title: string; show: boolean } | null>(null);
  const [tabId] = useState<string>(() => 'tab_' + Math.random().toString(36).substring(2, 9));

  const audioState = useAudio();
  const heartbeatTimerRef = useRef<any>(null);

  // Fetch gamification profile
  const fetchProfile = useCallback(async () => {
    if (!isEnabled) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/public/gamification/profile', {
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.is_admin_or_dj) {
          setProfile(null);
        } else {
          setProfile(data);
        }
      } else {
        setProfile(null);
      }
    } catch (err) {
      // Network or unauthenticated
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled]);

  useEffect(() => {
    if (isEnabled) {
      fetchProfile();
    } else {
      setProfile(null);
      setIsLoading(false);
    }

    // Listen for auth state change events
    const handleAuthSync = () => {
      if (isEnabled) {
        fetchProfile();
      }
    };

    window.addEventListener('chat_auth_sync', handleAuthSync);
    return () => {
      window.removeEventListener('chat_auth_sync', handleAuthSync);
    };
  }, [fetchProfile, isEnabled]);

  // Handle incoming XP reward notification
  const handleRewardNotification = useCallback((res: XPAwardResult) => {
    if (!isEnabled) return;
    if (!res || !res.success || res.xp_awarded <= 0) return;

    // Trigger celebration sound
    if (res.leveled_up) {
      playCelebrationSound('levelup');
      setLevelUpModalData({
        level: res.new_level || res.current_level,
        title: res.level_title,
        show: true
      });
    } else if (res.unlocked_badges && res.unlocked_badges.length > 0) {
      playCelebrationSound('badge');
    } else if (res.activity_type.includes('streak')) {
      playCelebrationSound('streak');
    } else {
      playCelebrationSound('xp');
    }

    // Display rich toast notification
    toast.custom((t) => {
      const isLight = isLightMode;

      return (
        <div 
          style={{ borderRadius: '1rem', overflow: 'hidden' }}
          className={`gamification-toast gamification-xp-toast backdrop-blur-xl rounded-2xl p-4 flex items-center gap-3.5 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300 transition-all ${
            isLight
              ? 'bg-white/95 border border-neon-blue/30 text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.12),0_0_20px_rgba(0,210,255,0.15)]'
              : 'bg-[#0f1117]/95 border border-neon-blue/40 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(0,210,255,0.2)]'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            isLight
              ? 'bg-neon-blue/10 border-neon-blue/20'
              : 'bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border-neon-blue/30'
          }`}>
            {res.activity_type.includes('streak') ? (
              <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
            ) : res.leveled_up ? (
              <Sparkles className="w-5 h-5 text-yellow-500 animate-spin" />
            ) : (
              <Zap className={`w-5 h-5 ${isLight ? 'text-neon-purple' : 'text-neon-blue'}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider ${
                isLight ? 'text-neon-purple' : 'text-neon-blue'
              }`}>
                +{res.xp_awarded} XP
              </span>
              <span className={`text-[10px] font-mono font-bold ${
                isLight ? 'text-slate-400' : 'text-white/50'
              }`}>
                LVL {res.current_level}
              </span>
            </div>
            <p className={`text-xs font-semibold truncate mt-0.5 ${
              isLight ? 'text-slate-800' : 'text-white/90'
            }`}>
              {res.description}
            </p>
          </div>
        </div>
      );
    }, { duration: 4000 });

    // If badges unlocked, show badge toast
    if (res.unlocked_badges && res.unlocked_badges.length > 0) {
      res.unlocked_badges.forEach((b) => {
        toast.custom((t) => {
          const isLight = isLightMode;

          return (
            <div 
              style={{ borderRadius: '1rem', overflow: 'hidden' }}
              className={`gamification-toast gamification-badge-toast backdrop-blur-xl rounded-2xl p-4 flex items-center gap-3.5 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300 transition-all ${
                isLight
                  ? 'bg-white/95 border border-neon-purple/40 text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.12),0_0_25px_rgba(176,38,255,0.2)]'
                  : 'bg-[#120f24]/95 border border-neon-purple/50 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_25px_rgba(176,38,255,0.3)]'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight
                  ? 'bg-neon-purple/10 border-neon-purple/20'
                  : 'bg-neon-purple/20 border-neon-purple/40'
              }`}>
                <Trophy className="w-6 h-6 text-amber-500 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-black uppercase tracking-widest ${
                  isLight ? 'text-neon-purple' : 'text-neon-purple'
                }`}>
                  Badge Unlocked!
                </div>
                <div className={`text-sm font-bold truncate ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {b.name}
                </div>
                <p className={`text-[11px] font-medium truncate ${
                  isLight ? 'text-slate-600' : 'text-white/60'
                }`}>
                  {b.description}
                </p>
              </div>
            </div>
          );
        }, { duration: 5000 });
      });
    }

    // Refresh profile in background
    fetchProfile();
  }, [fetchProfile]);

  // Socket listener & window listener for real-time rewards (e.g. from chat messages or podcasts)
  useEffect(() => {
    const socket = (window as any).socket;
    
    const onGamificationReward = (data: XPAwardResult) => {
      handleRewardNotification(data);
    };

    if (socket) {
      socket.on('gamificationReward', onGamificationReward);
    }

    const handleCustomReward = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        handleRewardNotification(customEvent.detail);
      }
    };

    window.addEventListener('gamificationReward', handleCustomReward);

    return () => {
      if (socket) {
        socket.off('gamificationReward', onGamificationReward);
      }
      window.removeEventListener('gamificationReward', handleCustomReward);
    };
  }, [handleRewardNotification]);

  // Listening heartbeat engine
  useEffect(() => {
    if (!profile) return;

    const isPlaying = audioState.isPlaying;

    if (!isPlaying) {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    // Function to send heartbeat tick
    const sendHeartbeatTick = async () => {
      try {
        const res = await fetch('/api/public/gamification/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            durationSeconds: 60,
            isPlaying: true,
            djName: audioState.onAirInfo?.djName || 'DejavuFM',
            showName: audioState.onAirInfo?.showName || 'Live Radio',
            trackTitle: audioState.currentTrack || '',
            tabId
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.xpResults && Array.isArray(data.xpResults)) {
            data.xpResults.forEach((r: XPAwardResult) => {
              handleRewardNotification(r);
            });
          }
        }
      } catch (err) {
        // Silent catch for network heartbeat ticks
      }
    };

    // Trigger immediate first heartbeat tick when audio starts playing
    sendHeartbeatTick();

    // Heartbeat every 60 seconds
    heartbeatTimerRef.current = setInterval(sendHeartbeatTick, 60000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [audioState.isPlaying, audioState.onAirInfo, audioState.currentTrack, profile, tabId, handleRewardNotification]);

  // Toggle DJ Follow
  const toggleFollowDj = async (djId: string): Promise<boolean> => {
    if (!profile) {
      toast.error('Please log in first to follow DJs and earn XP!', {
        action: {
          label: 'Log In',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('open-chat'));
            const chatBtn = document.getElementById('toggle-chat-button');
            if (chatBtn) chatBtn.click();
          }
        }
      });
      return false;
    }

    try {
      const res = await fetch(`/api/public/gamification/follow-dj/${encodeURIComponent(djId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.xpResult) {
          handleRewardNotification(data.xpResult);
        }
        await fetchProfile();
        return !!data.isFollowing;
      } else if (res.status === 401) {
        toast.error('Please log in first to follow DJs and earn XP!');
      }
    } catch (e) {
      toast.error('Failed to update DJ follow');
    }
    return false;
  };

  // Claim Share XP
  const claimShareXp = async (showName?: string, url?: string) => {
    try {
      const res = await fetch('/api/public/gamification/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ showName, url })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.xp_awarded > 0) {
          handleRewardNotification(data);
        }
      }
    } catch (e) {}
  };

  const isFollowingDj = (djId: string) => {
    if (!profile || !profile.followed_dj_ids) return false;
    return profile.followed_dj_ids.includes(djId);
  };

  const openHub = (tab: 'profile' | 'badges' | 'leaderboard' | 'quests' = 'profile') => {
    if (!isEnabled) return;
    setActiveHubTab(tab);
    setIsHubOpen(true);
    fetchProfile();
  };

  const closeHub = () => {
    setIsHubOpen(false);
  };

  const closeLevelUpModal = () => {
    setLevelUpModalData(null);
  };

  return (
    <GamificationContext.Provider
      value={{
        profile,
        isLoading,
        isEnabled,
        isHubOpen,
        activeHubTab,
        openHub,
        closeHub,
        setActiveHubTab,
        refreshProfile: fetchProfile,
        toggleFollowDj,
        claimShareXp,
        levelUpModalData,
        closeLevelUpModal,
        isFollowingDj
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

const defaultGamificationContext: GamificationContextType = {
  profile: null,
  isLoading: false,
  isEnabled: true,
  isHubOpen: false,
  activeHubTab: 'profile',
  openHub: () => {},
  closeHub: () => {},
  setActiveHubTab: () => {},
  refreshProfile: async () => {},
  toggleFollowDj: async () => false,
  claimShareXp: async () => {},
  levelUpModalData: null,
  closeLevelUpModal: () => {},
  isFollowingDj: () => false
};

export function useGamification() {
  const ctx = useContext(GamificationContext);
  return ctx || defaultGamificationContext;
}
