import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, Flame, MessageSquare, X, Ghost, User } from 'lucide-react';
import { toast } from 'sonner';

export function ShoutoutWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'text' | 'reaction'>('text');
  const [isSending, setIsSending] = useState(false);
  const [recentShoutouts, setRecentShoutouts] = useState<any[]>([]);

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

  const sendShoutout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/public/shoutout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listener_name: name, message, type })
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
    if (!name.trim()) {
      toast.error('Enter your name first!');
      setIsOpen(true);
      return;
    }
    fetch('/api/public/shoutout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listener_name: name, message: emoji, type: 'reaction' })
    });
    toast.success(`${emoji} Sent!`);
  };

  return (
    <div className="fixed bottom-[170px] sm:bottom-[180px] xl:bottom-32 right-6 xl:right-8 z-[60] flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {recentShoutouts.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.5 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl shadow-2xl flex items-center space-x-3 pointer-events-auto max-w-[280px]"
          >
             <div className="w-8 h-8 bg-neon-purple/20 rounded-lg flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-neon-purple" />
             </div>
             <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-neon-purple truncate">{s.listener_name}</p>
                <p className="text-xs text-white/80 line-clamp-2">{s.message}</p>
             </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="pointer-events-auto flex items-center group">
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
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 md:bottom-20 right-0 w-[calc(100vw-3rem)] sm:w-80 max-w-[320px] bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 md:p-6 shadow-2xl pointer-events-auto"
          >
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Direct Shoutout</h3>
                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
             </div>

             <form onSubmit={sendShoutout} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-white/40 ml-2">Your Handle</label>
                   <input 
                     value={name}
                     onChange={e => setName(e.target.value)}
                     placeholder="DJ_FAN_99"
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
        )}
      </AnimatePresence>
    </div>
  );
}
