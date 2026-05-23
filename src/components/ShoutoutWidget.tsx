import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, Flame, MessageSquare, X, Ghost, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function ShoutoutWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'text' | 'reaction'>('text');
  const [isSending, setIsSending] = useState(false);
  const [recentShoutouts, setRecentShoutouts] = useState<any[]>([]);
  const [showBoothClear, setShowBoothClear] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const handleRemoteOpen = () => setIsOpen(true);
    window.addEventListener('open-shoutout', handleRemoteOpen);
    return () => window.removeEventListener('open-shoutout', handleRemoteOpen);
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
    const isSmallScreen = window.innerWidth < 640;
    const duration = isSmallScreen ? 4000 : 8000; 

    const timer = setTimeout(() => {
      setRecentShoutouts(prev => prev.slice(0, -1)); // Remove the oldest entry
    }, duration);

    return () => clearTimeout(timer);
  }, [recentShoutouts]);

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

  const sendReaction = (emoji: string) => {
    if (!email.trim()) {
      toast.error('Enter your email first!');
      setIsOpen(true);
      return;
    }
    fetch('/api/public/shoutout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, message: emoji, type: 'reaction' })
    });
    toast.success(`${emoji} Sent!`);
  };

  return (
    <div className="fixed bottom-28 sm:bottom-[180px] xl:bottom-32 right-6 xl:right-8 z-[60] flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {recentShoutouts.map((s, i) => (
          <motion.div
            key={s.id || `shoutout-${i}`}
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.5 }}
            className="hidden sm:flex bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl shadow-2xl items-center space-x-3 pointer-events-auto max-w-[280px]"
          >
             <div className="w-8 h-8 bg-neon-purple/20 rounded-lg flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-neon-purple" />
             </div>
             <div className="min-w-0">
                <p className="text-[10px] font-black text-neon-purple truncate tracking-tight">{s.listener_name}</p>
                <p className="text-xs text-white/80 line-clamp-2">{s.message}</p>
             </div>
          </motion.div>
        ))}

        {showBoothClear && recentShoutouts.length === 0 && (
          <motion.div
            key="empty-shoutouts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center space-x-2 pointer-events-auto shadow-lg"
          >
            <Sparkles className="w-3 h-3 text-white/20" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Booth Clear</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden sm:flex pointer-events-auto items-center group">
        <div className="flex items-center space-x-2 overflow-hidden max-w-0 opacity-0 px-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:px-2 group-hover:mr-2 transition-all duration-500 ease-out origin-right">
          <button 
            onClick={() => sendReaction('🔥')}
            className="w-10 h-10 md:w-12 md:h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95"
          >
            <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-500 transition-transform" />
          </button>
          <button 
            onClick={() => sendReaction('❤️')}
            className="w-10 h-10 md:w-12 md:h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95"
          >
            <Heart className="w-4 h-4 md:w-5 md:h-5 text-red-500 transition-transform" />
          </button>
        </div>
        
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-white text-dark-bg p-3.5 md:p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all ring-4 md:ring-8 ring-white/5 z-10 relative"
        >
          <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
        </button>
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] sm:hidden pointer-events-auto"
            />
            
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 sm:absolute sm:bottom-16 sm:md:bottom-20 sm:right-0 sm:left-auto w-full sm:w-80 sm:max-w-[320px] bg-dark-bg/95 sm:bg-white/10 backdrop-blur-3xl border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2rem] p-8 sm:p-6 shadow-2xl pointer-events-auto z-[100]"
            >
              {/* Visual Drag Handle for Mobile */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />

             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Direct Shoutout</h3>
                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
             </div>

             <form onSubmit={sendShoutout} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-white/40 ml-2">Your Email</label>
                   <input 
                     type="email"
                     required
                     value={email}
                     onChange={e => setEmail(e.target.value)}
                     placeholder="email@example.com"
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-neon-purple transition-all"
                   />
                </div>
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
                <button 
                  disabled={isSending}
                  className="w-full bg-neon-purple hover:bg-neon-purple/80 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-neon-purple/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Send className="w-3 h-3" />
                  <span>Send to Booth</span>
                </button>
             </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
