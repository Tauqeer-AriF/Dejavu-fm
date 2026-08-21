import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../context/AudioContext.tsx';
import { useGamification } from '../context/GamificationContext.tsx';
import { GreetingCTA, GreetingResult } from '../types/greeting.ts';
import { resolveGreeting } from '../utils/greetingResolver.ts';

export function useGreeting() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { onAirInfo, isPlaying, playRadio, togglePlay, activeType } = useAudio();
  const gamification = useGamification();

  // Local client time state updated periodically
  const [clientTime, setClientTime] = useState<{ hour: number; tz: string }>(() => {
    const now = new Date();
    return {
      hour: now.getHours(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London'
    };
  });

  // Keep client local hour updated every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setClientTime({
        hour: now.getHours(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London'
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch greeting from the backend
  const { data: serverGreeting, isLoading, refetch } = useQuery<GreetingResult>({
    queryKey: ['personalized-greeting', clientTime.hour, clientTime.tz],
    queryFn: async () => {
      const res = await fetch(`/api/public/greeting?hour=${clientTime.hour}&tz=${encodeURIComponent(clientTime.tz)}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch greeting');
      }
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: true
  });

  // Compute live synthesized greeting to instantly reflect immediate UI changes (like onAir DJ changes or audio playback)
  const greetingData: GreetingResult | null = useMemo(() => {
    if (!serverGreeting) return null;

    // If server already resolved greeting, check if client has real-time onAirInfo override
    if (onAirInfo && serverGreeting.isAuthenticated && gamification?.profile) {
      const isDjLive = Boolean(onAirInfo.djName);
      const isFollowed = Boolean(onAirInfo.djName && gamification.profile?.followed_dj_ids?.length);

      // If a followed DJ just went live on air
      if (isDjLive && isFollowed && serverGreeting.type !== 'new_user') {
        const clientResolved = resolveGreeting({
          user: {
            username: serverGreeting.username || gamification.profile?.username,
            displayName: serverGreeting.displayName
          },
          gamification: {
            currentStreak: gamification.profile?.current_streak || 0,
            totalListeningSeconds: gamification.profile?.total_listening_seconds || 0,
            followedDjIds: gamification.profile?.followed_dj_ids || []
          },
          liveShow: {
            djName: onAirInfo.djName,
            showName: onAirInfo.showName,
            isLive: true
          },
          clientTime: {
            hour: clientTime.hour,
            timezone: clientTime.tz
          }
        });
        return clientResolved;
      }
    }

    return serverGreeting;
  }, [serverGreeting, onAirInfo, gamification?.profile, clientTime]);

  // Unified CTA action executor
  const handleCtaClick = useCallback((cta?: GreetingCTA) => {
    if (!cta) return;

    if (cta.action === 'play_live') {
      if (activeType === 'podcast') {
        playRadio();
      } else if (!isPlaying) {
        togglePlay();
      }
      return;
    }

    if (cta.action === 'open_hub') {
      gamification?.openHub?.('profile');
      return;
    }

    if (cta.action === 'open_auth') {
      window.dispatchEvent(new CustomEvent('open-chat', { detail: { mode: 'login' } }));
      return;
    }

    if (cta.action === 'navigate' && cta.url) {
      navigate(cta.url);
    }
  }, [activeType, isPlaying, playRadio, togglePlay, gamification, navigate]);

  return {
    greetingData,
    isLoading,
    refetch,
    handleCtaClick,
    isPlaying
  };
}
