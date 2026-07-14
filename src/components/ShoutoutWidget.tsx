import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, Flame, X, User, Sparkles, Mic2, Radio, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const getSecureImageUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/public/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export function ShoutoutWidget({ isChatOpen = false }: { isChatOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('dejavu_shoutout_email') || '';
    } catch {
      return '';
    }
  });
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'text' | 'reaction'>('text');
  const [isSending, setIsSending] = useState(false);
  const [recentShoutouts, setRecentShoutouts] = useState<any[]>([]);
  const [showBoothClear, setShowBoothClear] = useState(false);
  const prevCountRef = useRef(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Check auth status on mount and when modal opens
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/public/auth/check');
      const data = await res.json();
      if (data.loggedIn) {
        setIsLoggedIn(true);
        setUserName(data.username);
        const resolvedEmail = data.email || data.username;
        setUserEmail(resolvedEmail);
        setEmail(resolvedEmail);
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
        setUserName('');
        try {
          setEmail(localStorage.getItem('dejavu_shoutout_email') || '');
        } catch {
          setEmail('');
        }
      }
    } catch (err) {
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      if (!isLoggedIn && email) {
        localStorage.setItem('dejavu_shoutout_email', email);
      }
    } catch {}
  }, [email, isLoggedIn]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleRemoteOpen = () => setIsOpen(true);
    window.addEventListener('open-shoutout', handleRemoteOpen);
    return () => window.removeEventListener('open-shoutout', handleRemoteOpen);
  }, []);


  // Listen for direct replies to the user's shoutouts
  useEffect(() => {
    const socket = (window as any).socket;
    if (socket) {
      const handleReply = (data: { shoutoutId: string; repliedBy: string; replyText: string }) => {
        const replyShoutout = {
          id: `reply-${data.shoutoutId}-${Date.now()}`,
          isReply: true,
          listener_name: data.repliedBy,
          message: `"${data.replyText}"`,
        };

        setRecentShoutouts(prev => {
          if (prev.some(s => s.id === replyShoutout.id)) return prev;
          return [replyShoutout, ...prev].slice(0, 3);
        });
      };

      socket.on('shoutoutReply', handleReply);
      return () => { socket.off('shoutoutReply', handleReply); };
    }
  }, []);

  useEffect(() => {
    const socket = (window as any).socket;
    if (socket) {
      const handler = (shoutout: any) => {
        setRecentShoutouts(prev => {
          // Guard against duplicates
          if (prev.some(s => s.id === shoutout.id)) return prev;
          return [shoutout, ...prev].slice(0, 3);
        });
      };
      const onCleared = () => {
        setRecentShoutouts([]);
      };
      
      socket.on('new_shoutout', handler);
      socket.on('shoutouts_cleared', onCleared);
      
      return () => {
        socket.off('new_shoutout', handler);
        socket.off('shoutouts_cleared', onCleared);
      };
    }
  }, []);

  // Auto-hide shoutouts with dynamic duration based on screen size
  useEffect(() => {
    if (recentShoutouts.length === 0) return;

    // Check for small screens (Tailwind's sm breakpoint is 640px)
    const duration = isMobile ? 4000 : 8000; 

    const timer = setTimeout(() => {
      setRecentShoutouts(prev => prev.slice(0, -1)); // Remove the oldest entry
    }, duration);

    return () => clearTimeout(timer);
  }, [recentShoutouts, isMobile]);

  // Handle "Booth Clear" temporary visibility logic
  useEffect(() => {
    // If shoutouts just went from active to empty
    if (prevCountRef.current > 0 && recentShoutouts.length === 0) {
      setShowBoothClear(true);
      const timer = setTimeout(() => setShowBoothClear(false), 5000);
      return () => clearTimeout(timer);
    }
    
    // If a new shoutout arrives, hide the "Clear" message immediately
    if (recentShoutouts.length > 0) {
      setShowBoothClear(false);
    }
    
    prevCountRef.current = recentShoutouts.length;
  }, [recentShoutouts]);

  const sendShoutout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/public/shoutout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message, type })
      });
      if (res.ok) {
        toast.success('Shoutout sent to studio!');
        setMessage('');
        setIsOpen(false);
      }
    } catch (err) {
      toast.error('Failed to reach studio.');
    } finally {
      setIsSending(false);
    }
  };

  const sendReaction = async (emoji: string) => {
    let resolvedEmail = email;
    if (!resolvedEmail.trim()) {
      try {
        const res = await fetch('/api/public/auth/check');
        const data = await res.json();
        if (data.loggedIn) {
          const emailVal = data.email || data.username;
          resolvedEmail = emailVal;
          setIsLoggedIn(true);
          setUserName(data.username);
          setUserEmail(emailVal);
          setEmail(emailVal);
        }
      } catch (err) {}
    }

    if (!resolvedEmail.trim()) {
      toast.error('Enter your email first!');
      setIsOpen(true);
      return;
    }
    fetch('/api/public/shoutout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resolvedEmail, message: emoji, type: 'reaction' })
    });
    toast.success(`${emoji} Sent!`);
  };

  return (
    <div className={`fixed bottom-28 sm:bottom-[180px] xl:bottom-32 z-[10020] flex flex-col items-end gap-5 pointer-events-none transition-all duration-500 ease-in-out ${
      isChatOpen ? 'right-6 sm:right-[472px] xl:right-[480px]' : 'right-6 xl:right-8'
    }`}>
      <AnimatePresence>
        {recentShoutouts.map((s, i) => (
          <motion.div
            key={s.id || `shoutout-${i}`}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.5 }}
            className="flex bg-black/60 backdrop-blur-2xl border-l-4 border-l-neon-purple border-y border-r border-white/10 px-5 py-3 rounded-2xl shadow-2xl items-center space-x-4 pointer-events-auto max-w-[280px] sm:max-w-[320px]"
          >
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${s.isReply ? 'bg-neon-blue/10 border-neon-blue/20' : 'bg-neon-purple/10 border-neon-purple/20'}`}>
                {s.isReply ? (
                  <MessageSquare className="w-5 h-5 text-neon-blue" />
                ) : (
                  <Radio className="w-5 h-5 text-neon-purple" />
                )}
             </div>
             <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">
                  {s.isReply ? 'Reply from DJ' : 'Broadcast Alert'}
                </p>
                <p className={`text-[11px] font-bold truncate tracking-tight mb-1 ${s.isReply ? 'text-neon-blue' : 'text-neon-purple'}`}>
                  {s.listener_name}
                </p>
                <p className="text-xs text-white/90 line-clamp-2 font-medium leading-relaxed italic mb-2">"{s.message}"</p>
                
                {/* Media Content */}
                {s.imageUrl && (
                  <div className="relative mt-2 max-w-full rounded-lg overflow-hidden border border-white/10 bg-black/40">
                    <img 
                      src={getSecureImageUrl(s.imageUrl)} 
                      alt="Attached Image" 
                      className="max-h-24 w-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                {s.videoUrl && (
                  <div className="relative mt-2 max-w-full rounded-lg overflow-hidden border border-white/10 bg-black/40">
                    <video 
                      src={getSecureImageUrl(s.videoUrl)} 
                      className="max-h-24 w-full object-cover bg-black" 
                      autoPlay 
                      muted 
                      loop 
                      playsInline
                    />
                  </div>
                )}
                {s.audioUrl && (
                  <div className="mt-2 w-full p-1.5 rounded-lg bg-black/30 border border-white/5">
                    <audio 
                      src={getSecureImageUrl(s.audioUrl)} 
                      controls 
                      className="w-full h-6 accent-neon-purple" 
                    />
                  </div>
                )}
             </div>
          </motion.div>
        ))}

        {showBoothClear && recentShoutouts.length === 0 && (
          <motion.div
            key="empty-shoutouts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="hidden sm:flex bg-white/5 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full items-center space-x-3 pointer-events-auto shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-white/20" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Deck Reset</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden sm:flex pointer-events-auto items-center group relative">
        <div className="flex items-center space-x-3 overflow-hidden max-w-0 opacity-0 px-0 group-hover:max-w-[200px] group-hover:opacity-100 group-hover:px-4 group-hover:mr-2 transition-all duration-500 ease-out origin-right">
          <button 
            onClick={() => sendReaction('🔥')}
            className="w-11 h-11 bg-black/40 hover:bg-neon-purple/20 border border-white/10 hover:border-neon-purple/40 rounded-full flex items-center justify-center shrink-0 transition-all hover:-translate-y-1 shadow-xl"
          >
            <Flame className="w-5 h-5 text-orange-500" />
          </button>
          <button 
            onClick={() => sendReaction('❤️')}
            className="w-11 h-11 bg-black/40 hover:bg-neon-blue/20 border border-white/10 hover:border-neon-blue/40 rounded-full flex items-center justify-center shrink-0 transition-all hover:-translate-y-1 shadow-xl"
          >
            <Heart className="w-5 h-5 text-red-500" />
          </button>
        </div>
        
        <motion.button 
          onClick={() => setIsOpen(true)}
          whileHover="hover"
          className="bg-white text-dark-bg px-6 py-4 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.4)] hover:shadow-neon-purple/20 transition-all flex items-center space-x-3 z-10 relative overflow-hidden group/btn"
        >
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-black/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
          />
          <div className="relative">
            <Mic2 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.15em] hidden md:block">
            Live Shoutout
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10010] sm:hidden pointer-events-auto"
            />
            
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              drag={isMobile ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) setIsOpen(false);
              }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 sm:absolute sm:bottom-16 sm:md:bottom-24 sm:right-0 sm:left-auto w-full sm:w-[360px] bg-dark-bg/95 backdrop-blur-3xl border-t sm:border border-white/10 rounded-t-[3rem] sm:rounded-[2.5rem] p-8 sm:p-10 shadow-[0_-20px_80px_rgba(0,0,0,0.6)] pointer-events-auto z-[10011] overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/10 blur-[60px] pointer-events-none" />
              
              {/* Visual Drag Handle for Mobile */}
              <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-8 sm:hidden" />

             <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-2xl font-display font-black uppercase tracking-tight text-white">Studio <span className="text-neon-purple">Link</span></h3>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Contact the DJ directly</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
             </div>

             <form onSubmit={sendShoutout} className="space-y-6 relative z-10">
                {isLoggedIn ? (
                  <div className="bg-neon-purple/15 border border-neon-purple/30 rounded-2xl px-5 py-4 flex items-center space-x-3.5 shadow-md">
                    <div className="w-9 h-9 rounded-xl bg-neon-purple/20 flex items-center justify-center text-neon-purple border border-neon-purple/20 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black text-neon-purple uppercase tracking-[0.2em] mb-0.5">Logged In Profile</p>
                      <p className="text-xs font-bold text-white truncate">{userName}</p>
                      <p className="text-[10px] text-white/50 truncate font-medium">{userEmail}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-white/30 ml-2 tracking-widest">Identification (Email)</label>
                     <input 
                       type="email"
                       required
                       value={email}
                       onChange={e => setEmail(e.target.value)}
                       placeholder="email@example.com"
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-neon-purple transition-all"
                     />
                  </div>
                )}
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-white/40 ml-2">Message</label>
                   <textarea 
                     value={message}
                     onChange={e => setMessage(e.target.value)}
                     placeholder="Wheel it up! This tune is fire..."
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-neon-purple transition-all resize-none"
                     rows={3}
                   />
                </div>
                <motion.button 
                  disabled={isSending}
                  whileHover="hover"
                  className="w-full bg-white text-dark-bg py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:shadow-neon-purple/20 transition-all flex items-center justify-center space-x-3 relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-dark-bg/5 to-transparent -skew-x-12"
                    variants={{ hover: { x: ['-150%', '150%'] } }}
                    transition={{ duration: 0.75, ease: "easeInOut" }}
                  />
                  <Send className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Transmit to Studio</span>
                </motion.button>
             </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
