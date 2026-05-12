import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Send, User, LogOut, Loader2, Instagram, Music2, Globe, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useAudio } from '../context/AudioContext';

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
          'run.app'
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
  
  // Auth State
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [trackOverlay, setTrackOverlay] = useState<{artist: string, title: string} | null>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
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
    if (!authUsername || !authPassword) return;
    setAuthLoading(true);
    
    try {
      const endpoint = authMode === 'login' ? '/api/public/auth/login' : '/api/public/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        setLoggedInUser(data.username);
        toast.success(`Welcome to the chat, ${data.username}!`);
        setAuthUsername('');
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 pt-4 lg:h-[calc(100vh-220px)] lg:min-h-[600px]"
    >
      {/* Video Player Section */}
      <div className="flex-1 glass-panel rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/5 relative bg-black/40 min-h-[300px] sm:min-h-[400px] lg:min-h-0">
        <div className="flex-1 w-full relative bg-black group flex items-center justify-center aspect-video lg:aspect-auto">
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
        <div className="p-4 md:p-6 bg-dark-bg/80 border-t border-white/5 flex flex-col md:flex-row items-center gap-6">
           {onAirInfo?.djPhoto && (
             <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-neon-purple/30 shrink-0">
               <img src={onAirInfo.djPhoto} alt={onAirInfo.djName} className="w-full h-full object-cover" />
             </div>
           )}
           <div className="flex-1 text-center md:text-left">
             <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
               <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue italic">
                 {onAirInfo?.djName || "DEJAVU FM"}
               </h2>
               <div className="px-2 py-0.5 bg-red-500 rounded flex items-center space-x-1 shadow-[0_0_15px_rgba(239,68,68,0.3)] shrink-0">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest leading-none">Live</span>
               </div>
             </div>
             <h3 className="text-white/90 font-bold text-sm md:text-lg mb-2">{onAirInfo?.showName || "Global Underground Stream"}</h3>
             {onAirInfo?.djBio && (
               <p className="text-white/50 text-xs md:text-sm line-clamp-2 md:line-clamp-none max-w-2xl">{onAirInfo.djBio}</p>
             )}
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

      {/* Right Sidebar - Chat & Stats */}
      <div className="w-full lg:w-96 flex flex-col gap-6 lg:h-full lg:max-h-full">
        {/* Elite Sound System Status Widget */}
        <div className="glass-panel rounded-3xl p-5 md:p-6 border border-white/5 space-y-4 hidden md:block">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Signal Analytics</h4>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-bold text-green-500 uppercase">OPTIMAL</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="space-y-1 text-left">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Latency</div>
              <motion.div 
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-sm font-mono text-neon-blue"
              >
                {Math.floor(80 + Math.random() * 40)}ms
              </motion.div>
            </div>
            <div className="space-y-1 text-left">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Quality</div>
              <div className="text-sm font-mono text-neon-purple">320kbps</div>
            </div>
            <div className="space-y-1 text-left">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Global Load</div>
              <div className="text-sm font-mono text-white/60">{(listeners * 0.012).toFixed(3)}%</div>
            </div>
            <div className="space-y-1 text-left">
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Codecs</div>
              <div className="text-sm font-mono text-white/60">Opus/HD</div>
            </div>
          </div>
          <div className="pt-2">
             <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: ["90%", "95%", "92%"] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="h-full bg-gradient-to-r from-neon-purple to-neon-blue"
                />
             </div>
          </div>
        </div>

        {featChat && (
        <div className="glass-panel rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/5 flex-1 min-h-[450px] lg:min-h-0 lg:max-h-full">
        <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-neon-purple rounded-full animate-pulse"></span>
            Studio Chat
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-neon-blue font-black uppercase tracking-widest">{listeners} Live</div>
            <div className="text-[10px] text-white/30 font-bold uppercase">{messages.length} msgs</div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin lg:h-0" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center text-white/30 text-sm mt-10">No messages yet. Be the first!</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`animate-in fade-in slide-in-from-bottom-2 ${msg.isSystem ? 'bg-neon-pink/10 border border-neon-pink/30 p-2 rounded-lg' : ''}`}>
                {!msg.isSystem && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-neon-blue text-sm">{msg.user}</span>
                    <span className="text-[10px] text-white/30">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {msg.isSystem ? (
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-neon-pink rounded-full animate-pulse"></span>
                    <p className="text-sm font-bold text-neon-pink break-words mt-0.5 leading-snug">{msg.text}</p>
                  </div>
                ) : (
                  <p className="text-sm text-white/80 break-words mt-0.5 leading-snug">{msg.text}</p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/10 shrink-0">
          {isCheckingAuth ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-white/50" />
            </div>
          ) : !loggedInUser ? (
            <form onSubmit={handleAuth} className="space-y-3">
              <div className="text-sm text-center mb-2 font-medium text-white/80">
                {authMode === 'login' ? 'Login to chat' : 'Register to chat'}
              </div>
              <input
                type="text"
                required
                value={authUsername}
                onChange={e => setAuthUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neon-purple/50 text-white placeholder-white/30"
              />
              <input
                type="password"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neon-purple/50 text-white placeholder-white/30"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-neon-purple hover:bg-neon-blue transition-colors text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center disabled:opacity-50"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authMode === 'login' ? 'Login' : 'Register')}
              </button>
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs text-neon-blue hover:text-white"
                >
                  {authMode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-white/50">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  <span>Chatting as: <strong className="text-white/80">{loggedInUser}</strong></span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1 hover:text-red-400 transition-colors">
                  <LogOut className="w-3 h-3" /> Logout
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                  onClick={() => setInputText(t => t ? `[REQUEST] ${t}` : '[REQUEST] ')}
                  className="whitespace-nowrap px-2 py-1 rounded bg-neon-purple/20 border border-neon-purple/40 text-neon-purple text-[8px] font-bold uppercase tracking-widest hover:bg-neon-purple hover:text-white transition-all"
                >
                  + Request
                </button>
                <button 
                  onClick={() => setInputText(t => t ? `[SHOUTOUT] ${t}` : '[SHOUTOUT] ')}
                  className="whitespace-nowrap px-2 py-1 rounded bg-neon-blue/20 border border-neon-blue/40 text-neon-blue text-[8px] font-bold uppercase tracking-widest hover:bg-neon-blue hover:text-white transition-all"
                >
                  + Shoutout
                </button>
                <button 
                  onClick={() => setInputText(t => t ? `BIG TUNES! ${t}` : 'BIG TUNES! 🔥')}
                  className="whitespace-nowrap px-2 py-1 rounded bg-white/10 border border-white/10 text-white/40 text-[8px] font-bold uppercase tracking-widest hover:bg-white/20 hover:text-white transition-all"
                >
                  + 🔥
                </button>
              </div>

              <form onSubmit={sendMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-black/50 border border-white/10 rounded-full pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/50 transition-all text-white placeholder-white/30"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-1 w-8 h-8 flex items-center justify-center rounded-full bg-neon-purple text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neon-blue transition-colors"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          )}
        </div>
        </div>
        )}
      </div>
    </motion.div>
  );
}
