import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Send, User, LogOut, Loader2, Instagram, Music2, Globe, Radio, Sparkles, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useAudio } from '../context/AudioContext';
import { useLogo } from '../hooks/useLogo';
import { convertToLocalTime } from '../lib/timeUtils';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

function getEmbedUrl(url: string | null) {
  if (!url) return null;
  
  try {
    const parsedUrl = new URL(url);
    const hostname = window.location.hostname;
    
    // Handle Twitch
    if (parsedUrl.hostname.includes('twitch.tv')) {
      let channel = parsedUrl.searchParams.get('channel');
      if (!channel) {
         // Fallback to pathname (e.g. https://www.twitch.tv/dejavufmlive)
         const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
         if (pathParts.length > 0) {
           channel = pathParts[0];
         }
      }
      
      if (channel) {
        // Twitch requires parent parameters for all frames in the chain
        const parents = [
          hostname,
          'localhost',
          'ai.studio',
          'aistudio.google.com',
          'google.com',
          'run.app',
          'dejavufm.com',
          'www.dejavufm.com'
        ];
        
        // Also extract any parents already provided in the input URL
        const existingParents = parsedUrl.searchParams.getAll('parent').map(p => p.replace(/\/+$/, ''));
        
        // Remove duplicates and empty strings
        const uniqueParents = Array.from(new Set([...parents, ...existingParents].filter(Boolean)));
        const parentParams = uniqueParents.map(p => `parent=${p}`).join('&');
        
        return `https://player.twitch.tv/?autoplay=true&muted=true&channel=${channel}&${parentParams}`;
      }
    }
    
    // Handle YouTube
    if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')) {
      let videoId = parsedUrl.searchParams.get('v');
      
      // youtu.be/VIDEO_ID
      if (parsedUrl.hostname.includes('youtu.be')) {
        videoId = parsedUrl.pathname.slice(1);
      }
      // youtube.com/embed/VIDEO_ID
      if (parsedUrl.pathname.includes('/embed/')) {
        videoId = parsedUrl.pathname.split('/embed/')[1];
      }
      // youtube.com/live/VIDEO_ID
      if (parsedUrl.pathname.includes('/live/')) {
        videoId = parsedUrl.pathname.split('/live/')[1];
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0`;
      }
    }
    
    // Return original url if no special formatting needed
    return url;
  } catch (e) {
    return url;
  }
}

export default function WatchLive() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const { logoUrl, resolveDjImage } = useLogo();
  
  // Auth State
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [trackOverlay, setTrackOverlay] = useState<{artist: string, title: string} | null>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [listeners, setListeners] = useState(0);
  const [studioVideoUrlState, setStudioVideoUrlState] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use react-query for settings to keep it automatically in sync
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
    refetchInterval: 3000,
  });

  const { onAirInfo } = useAudio();

  const studioVideoUrl = settings?.studio_video_url || studioVideoUrlState;
  const featChat = settings?.feat_chat !== '0';

  useEffect(() => {
    // Check initial auth state
    fetch('/api/public/auth/check')
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) setLoggedInUser(data.username);
        setIsCheckingAuth(false);
      })
      .catch(() => setIsCheckingAuth(false));

    const socket = (window as any).socket;
    if (!socket) return;
    
    socketRef.current = socket;

    const onChatHistory = (history: ChatMessage[]) => {
      setMessages(history);
    };

    const onChatMessage = (msg: ChatMessage) => {
      setMessages(prev => {
        const newArr = [...prev, msg];
        if (newArr.length > 100) newArr.shift();
        return newArr;
      });
    };

    const onOnlineCount = (count: number) => {
      setListeners(count);
    };

    const onPushTrack = (data: {artist: string, title: string}) => {
      setTrackOverlay(data);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = setTimeout(() => {
        setTrackOverlay(null);
      }, 8000); 
    };

    socket.on('chatHistory', onChatHistory);
    socket.on('chatMessage', onChatMessage);
    socket.on('onlineCount', onOnlineCount);
    socket.on('pushTrack', onPushTrack);

    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      socket.off('chatHistory', onChatHistory);
      socket.off('chatMessage', onChatMessage);
      socket.off('onlineCount', onOnlineCount);
      socket.off('pushTrack', onPushTrack);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setAuthLoading(true);
    
    try {
      const endpoint = authMode === 'login' ? '/api/public/auth/login' : '/api/public/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        setLoggedInUser(data.username);
        toast.success(`Welcome to the chat, ${data.username}!`);
        setAuthEmail('');
        setAuthPassword('');
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch (err) {
      toast.error('Network error. Try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/public/auth/logout', { method: 'POST' });
      setLoggedInUser(null);
      toast.success('Logged out successfully');
    } catch(err) {}
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current || !loggedInUser) return;
    socketRef.current.emit('chatMessage', { user: loggedInUser, text: inputText });
    setInputText('');
  };

  const { data: scheduleData } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetch('/api/public/schedule').then(res => res.json())
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto pt-4 lg:h-[calc(100vh-220px)] lg:min-h-[600px]"
    >
      {/* Video Player Section */}
      <div className="w-full h-full glass-panel rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/5 relative bg-black/40 min-h-[450px] sm:min-h-[500px] lg:min-h-0">
        <div className="flex-1 w-full relative bg-black group flex items-center justify-center aspect-[4/3] sm:aspect-video lg:aspect-auto">
            {getEmbedUrl(studioVideoUrl) ? (
              <iframe 
                key={getEmbedUrl(studioVideoUrl) || 'empty'}
                src={getEmbedUrl(studioVideoUrl) || undefined} 
                className="w-full h-full border-none absolute inset-0 z-10" 
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; clipboard-write; gyroscope"
                allowFullScreen>
              </iframe>
            ) : (
              <>
                <div className="absolute inset-0 z-0">
                  <img src="https://images.unsplash.com/photo-1542628682-88321d2a4828?auto=format&fit=crop&w=1200&q=80" 
                       alt="Live Studio" className="w-full h-full object-cover opacity-60" />
                </div>
                <div className="relative z-10 text-center space-y-4">
                  <div className="inline-flex items-center space-x-2 bg-red-500/20 text-red-500 px-4 py-1.5 rounded-full border border-red-500/30">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-sm font-bold uppercase tracking-widest">Live Studio Cam</span>
                  </div>
                </div>
              </>
            )}

          {/* Animated Track overlay */}
          <AnimatePresence>
            {trackOverlay && (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute bottom-6 left-6 z-[60] bg-black/80 backdrop-blur-md border-l-4 border-l-neon-pink p-4 rounded-xl shadow-2xl pointer-events-none"
              >
                <div className="text-neon-pink text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-neon-pink rounded-full animate-pulse"></span>
                  <span>Now Playing</span>
                </div>
                <div className="text-xl font-bold text-white break-words max-w-[250px] leading-tight mb-1">{trackOverlay.title}</div>
                <div className="text-sm font-medium text-white/70 truncate max-w-[250px]">{trackOverlay.artist}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex p-4 bg-dark-bg/80 border-t border-white/5 flex-row items-center gap-4">
           {resolveDjImage(onAirInfo?.djPhoto) && (
             <div className="w-16 h-16 rounded-xl overflow-hidden shadow-2xl border-2 border-neon-purple/30 shrink-0 bg-white/5">
               <img src={resolveDjImage(onAirInfo?.djPhoto)} alt={onAirInfo?.djName || "DJ"} className={`w-full h-full ${resolveDjImage(onAirInfo?.djPhoto) === logoUrl && logoUrl ? 'object-contain p-2' : 'object-cover'}`} />
             </div>
           )}
           <div className="flex-1 text-left min-w-0">
             <div className="flex items-center justify-start gap-2 mb-0.5">
               <h2 className="text-lg font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue italic truncate">
                 {onAirInfo?.djName || "DEJAVU FM"}
               </h2>
               <div className="px-2 py-0.5 bg-red-500 rounded flex items-center space-x-1 shadow-[0_0_15px_rgba(239,68,68,0.3)] shrink-0">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest leading-none">Live</span>
               </div>
             </div>
             <h3 className="text-white/90 font-bold text-xs truncate">{onAirInfo?.showName || "Global Underground Stream"}</h3>
           </div>
           
           {(onAirInfo?.instagram || onAirInfo?.soundcloud || onAirInfo?.mixcloud) && (
             <div className="flex gap-4 shrink-0">
               {onAirInfo.instagram && (
                 <a href={`https://instagram.com/${onAirInfo.instagram}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-white/5 hover:bg-neon-purple/20 border border-white/5 hover:border-neon-purple/50 transition-all text-white/50 hover:text-white">
                   <Instagram className="w-5 h-5" />
                 </a>
               )}
               {onAirInfo.soundcloud && (
                 <a href={`https://soundcloud.com/${onAirInfo.soundcloud}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-white/5 hover:bg-neon-blue/20 border border-white/5 hover:border-neon-blue/50 transition-all text-white/50 hover:text-white">
                   <Music2 className="w-5 h-5" />
                 </a>
               )}
               {onAirInfo.mixcloud && (
                 <a href={`https://mixcloud.com/${onAirInfo.mixcloud}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/30 transition-all text-white/50 hover:text-white">
                   <Globe className="w-5 h-5" />
                 </a>
               )}
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
}
