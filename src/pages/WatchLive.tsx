import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Send, User, LogOut, Loader2, Instagram, Music2, Globe, Radio, Sparkles, Clock, MessageSquare, Users, Eye, EyeOff } from 'lucide-react';
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
        
        return `https://player.twitch.tv/?autoplay=true&muted=false&channel=${channel}&${parentParams}`;
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

const getSecureImageUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/public/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export default function WatchLive() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const { logoUrl, resolveDjImage, isLightMode } = useLogo();
  
  // Auth State
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [trackOverlay, setTrackOverlay] = useState<{artist: string, title: string} | null>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [studioVideoUrlState, setStudioVideoUrlState] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use react-query for settings to keep it automatically in sync
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
    refetchInterval: 3000,
  });

  const { onAirInfo, isPlaying, togglePlay } = useAudio();

  const studioVideoUrl = settings?.studio_video_url || studioVideoUrlState;
  const featChat = settings?.feat_chat !== '0';

  useEffect(() => {
    // Pause background radio if it's playing so the video audio can be heard
    if (isPlaying) {
      togglePlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const onPushTrack = (data: {artist: string, title: string}) => {
      setTrackOverlay(data);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = setTimeout(() => {
        setTrackOverlay(null);
      }, 8000); 
    };

    socket.on('chatHistory', onChatHistory);
    socket.on('chatMessage', onChatMessage);
    socket.on('pushTrack', onPushTrack);

    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      socket.off('chatHistory', onChatHistory);
      socket.off('chatMessage', onChatMessage);
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
    if (authMode === 'register' && !authUsername) {
      toast.error('Username is required for registration');
      return;
    }
    setAuthLoading(true);
    
    try {
      const endpoint = authMode === 'login' ? '/api/public/auth/login' : '/api/public/auth/register';
      const body: any = { email: authEmail, password: authPassword };
      if (authMode === 'register') {
        body.username = authUsername;
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (res.ok) {
        setLoggedInUser(data.username);
        toast.success(`Welcome to the chat, ${data.username}!`);
        setAuthEmail('');
        setAuthPassword('');
        setAuthUsername('');
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
      className="max-w-7xl mx-auto px-4 pt-4 pb-6 lg:h-[calc(100vh-140px)] lg:min-h-[650px] flex flex-col"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 items-stretch">
        
        {/* Left Side: Video Player Section */}
        <div className={`lg:col-span-8 flex flex-col h-full ${isLightMode ? 'bg-[#ffffff] border-black/10' : 'bg-black/40 border-white/5'} border rounded-3xl overflow-hidden shadow-2xl relative min-h-[450px] lg:min-h-0`}>
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
                  <div className="text-xl font-bold text-[#ffffff] break-words max-w-[250px] leading-tight mb-1">{trackOverlay.title}</div>
                  <div className="text-sm font-medium text-[#ffffff]/70 truncate max-w-[250px]">{trackOverlay.artist}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DJ and Show Info */}
          <div className={`flex p-4 ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-dark-bg/80 border-white/5'} border-t flex-row items-center gap-4 shrink-0`}>
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
               <h3 className={`${isLightMode ? 'text-black/80' : 'text-white/90'} font-bold text-xs truncate`}>{onAirInfo?.showName || "Global Underground Stream"}</h3>
             </div>
             
             {(onAirInfo?.instagram || onAirInfo?.soundcloud || onAirInfo?.mixcloud) && (
               <div className="flex gap-4 shrink-0">
                 {onAirInfo.instagram && (
                   <a href={`https://instagram.com/${onAirInfo.instagram}`} target="_blank" rel="noopener noreferrer" className={`p-2.5 rounded-xl ${isLightMode ? 'bg-black/5 hover:bg-neon-purple/15 border-black/10 text-black/50 hover:text-black' : 'bg-white/5 hover:bg-neon-purple/20 border-white/5 text-white/50 hover:text-white'} border transition-all`}>
                     <Instagram className="w-5 h-5" />
                   </a>
                 )}
                 {onAirInfo.soundcloud && (
                   <a href={`https://soundcloud.com/${onAirInfo.soundcloud}`} target="_blank" rel="noopener noreferrer" className={`p-2.5 rounded-xl ${isLightMode ? 'bg-black/5 hover:bg-neon-blue/15 border-black/10 text-black/50 hover:text-black' : 'bg-white/5 hover:bg-neon-blue/20 border-white/5 text-white/50 hover:text-white'} border transition-all`}>
                     <Music2 className="w-5 h-5" />
                   </a>
                 )}
                 {onAirInfo.mixcloud && (
                   <a href={`https://mixcloud.com/${onAirInfo.mixcloud}`} target="_blank" rel="noopener noreferrer" className={`p-2.5 rounded-xl ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black/50 hover:text-black' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/50 hover:text-white'} border transition-all`}>
                     <Globe className="w-5 h-5" />
                   </a>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Right Side: Chat Room Section */}
        <div className={`lg:col-span-4 flex flex-col h-full ${isLightMode ? 'bg-[#ffffff] border-black/10' : 'bg-black/40 border-white/5'} border rounded-3xl overflow-hidden shadow-2xl relative min-h-[400px] lg:min-h-0`}>
          
          {/* Chat Header */}
          <div className={`px-4 py-3 border-b ${isLightMode ? 'border-black/5 bg-black/5' : 'border-white/5 bg-black/20'} flex items-center justify-between shrink-0`}>
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-neon-purple" />
              <span className={`text-sm font-black font-display uppercase tracking-wider ${isLightMode ? 'text-black' : 'text-white'}`}>Live Studio Chat</span>
            </div>
          </div>

          {/* Messages List */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
          >
            {messages.length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-full opacity-20 text-center space-y-4 py-12 ${isLightMode ? 'text-black' : 'text-white'}`}>
                <Users className="w-12 h-12" />
                <p className="text-xs font-bold uppercase tracking-widest">
                  The airwaves are quiet... say something!
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`group ${msg.isSystem ? 'bg-neon-pink/10 border border-neon-pink/20 p-3 rounded-xl' : 'flex gap-3'}`}
                >
                  {!msg.isSystem && (
                    <div className={`w-8 h-8 rounded-lg overflow-hidden border ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'} shrink-0`}>
                      <img 
                        src={getSecureImageUrl((msg as any).avatar_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user}`}
                        alt={msg.user}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user}`;
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {!msg.isSystem && (
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="font-black text-neon-blue text-[11px] uppercase tracking-wider truncate">
                          {msg.user.includes('@') ? msg.user.split('@')[0] : msg.user}
                        </span>
                        <span className={`text-[8px] font-bold uppercase ${isLightMode ? 'text-black/40' : 'text-white/20'} shrink-0 ml-2`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    
                    {msg.isSystem ? (
                      <div className="space-y-1">
                        <span className="font-black text-neon-pink text-[9px] uppercase tracking-widest flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-neon-pink rounded-full animate-pulse"></span>
                          {msg.user || "System Broadcast"}
                        </span>
                        <p className="text-xs font-bold text-neon-pink/90 break-words leading-relaxed">{msg.text}</p>
                      </div>
                    ) : (
                      <p className={`text-xs ${isLightMode ? 'text-black/80' : 'text-white/80'} break-words leading-relaxed`}>{msg.text}</p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Chat Control / Input Panel */}
          {!featChat ? (
            <div className={`p-4 border-t ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/5 bg-black/30'} text-center shrink-0`}>
              <p className={`text-xs font-semibold ${isLightMode ? 'text-black/40' : 'text-white/30'} uppercase tracking-wider`}>
                Live Chat is currently offline
              </p>
            </div>
          ) : !loggedInUser ? (
            <div className={`p-4 border-t ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/5 bg-black/30'} shrink-0 space-y-3`}>
              <div className={`flex rounded-xl overflow-hidden ${isLightMode ? 'bg-black/10 border-black/5' : 'bg-black/20 border-white/5'} p-0.5 border`}>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${authMode === 'login' ? 'bg-neon-purple text-[#ffffff] shadow-md' : isLightMode ? 'text-black/50 hover:text-black/80' : 'text-white/40 hover:text-white/60'}`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${authMode === 'register' ? 'bg-neon-purple text-[#ffffff] shadow-md' : isLightMode ? 'text-black/50 hover:text-black/80' : 'text-white/40 hover:text-white/60'}`}
                >
                  Register
                </button>
              </div>
              
              <form onSubmit={handleAuth} className="space-y-2.5">
                {authMode === 'register' && (
                  <div>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={e => setAuthUsername(e.target.value)}
                      placeholder="Username"
                      className={`w-full ${isLightMode ? 'bg-black/5 border-black/15 text-black placeholder:text-black/40 focus:border-neon-purple' : 'bg-black/45 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'} border rounded-xl px-3 py-2 text-xs focus:outline-none transition-all`}
                    />
                  </div>
                )}
                <div>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="Email Address"
                    className={`w-full ${isLightMode ? 'bg-black/5 border-black/15 text-black placeholder:text-black/40 focus:border-neon-purple' : 'bg-black/45 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'} border rounded-xl px-3 py-2 text-xs focus:outline-none transition-all`}
                  />
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    placeholder="Password"
                    className={`w-full ${isLightMode ? 'bg-black/5 border-black/15 text-black placeholder:text-black/40 focus:border-neon-purple' : 'bg-black/45 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'} border rounded-xl pl-3 pr-10 py-2.5 text-xs focus:outline-none transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center ${isLightMode ? 'text-black/30 hover:text-black/60' : 'text-white/30 hover:text-white'} transition-colors`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-neon-purple hover:bg-neon-blue text-[#ffffff] font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-neon-purple/20 disabled:opacity-50"
                >
                  {authLoading ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    authMode === 'login' ? 'Join Live Chat' : 'Create Chat Account'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className={`p-4 border-t ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/5 bg-black/30'} shrink-0`}>
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={`Message as ${loggedInUser.includes('@') ? loggedInUser.split('@')[0] : loggedInUser}...`}
                  className={`flex-1 ${isLightMode ? 'bg-black/5 border-black/15 text-black placeholder:text-black/40 focus:border-neon-purple' : 'bg-black/45 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'} border rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-all`}
                />
                <button
                  type="submit"
                  className="p-2.5 bg-neon-purple hover:bg-neon-blue text-[#ffffff] rounded-xl transition-all shadow-lg shadow-neon-purple/20 shrink-0 flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="flex items-center justify-between mt-2.5 px-1">
                <span className={`text-[9px] uppercase tracking-wider font-mono ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  Logged in as <span className="text-neon-purple font-bold">{loggedInUser}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[9px] font-black uppercase tracking-wider text-red-500/50 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </motion.div>
  );
}
