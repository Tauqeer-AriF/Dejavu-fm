import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Send, User, LogOut, Loader2, X, MessageSquare, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export function ChatSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [listeners, setListeners] = useState(0);

  const socketRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

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

    socket.on('chatHistory', (history: ChatMessage[]) => {
      setMessages(history);
    });

    socket.on('chatMessage', (msg: ChatMessage) => {
      setMessages(prev => {
        const newArr = [...prev, msg];
        if (newArr.length > 100) newArr.shift();
        return newArr;
      });
    });

    socket.on('onlineCount', (count: number) => {
      setListeners(count);
    });

    return () => {
      socket.off('chatHistory');
      socket.off('chatMessage');
      socket.off('onlineCount');
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

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
        toast.success(`Welcome, ${data.username}!`);
        setAuthUsername('');
        setAuthPassword('');
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/public/auth/logout', { method: 'POST' });
      setLoggedInUser(null);
      toast.success('Logged out');
    } catch(err) {}
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current || !loggedInUser) return;
    socketRef.current.emit('chatMessage', { user: loggedInUser, text: inputText });
    setInputText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-dark-bg/95 backdrop-blur-2xl border-l border-white/10 z-[101] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight uppercase tracking-widest">Community Hub</h3>
                  <div className="flex items-center text-[10px] text-white/40 uppercase tracking-widest font-black">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-blue mr-2 animate-pulse"></span>
                    {listeners} Online now
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-20 text-center space-y-4">
                  <Users className="w-16 h-16" />
                  <p className="text-sm font-bold uppercase tracking-widest">The airwaves are quiet... say something!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={`group ${msg.isSystem ? 'bg-neon-pink/10 border border-neon-pink/30 p-3 rounded-xl' : ''}`}
                  >
                    {!msg.isSystem && (
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="font-black text-neon-blue text-xs uppercase tracking-widest">{msg.user}</span>
                        <span className="text-[9px] text-white/20 font-bold uppercase">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    {msg.isSystem ? (
                      <div className="flex items-center space-x-2">
                         <span className="w-1.5 h-1.5 bg-neon-pink rounded-full animate-pulse"></span>
                         <p className="text-sm font-bold text-neon-pink break-words leading-relaxed">{msg.text}</p>
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-2xl rounded-tl-none p-4 border border-white/5 group-hover:border-white/10 transition-all">
                        <p className="text-sm text-white/80 break-words leading-relaxed">{msg.text}</p>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-6 bg-white/5 border-t border-white/10">
              {isCheckingAuth ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-purple" />
                </div>
              ) : !loggedInUser ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-white/80 mb-1">Join the conversation</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Login or Register to post</p>
                  </div>
                  <form onSubmit={handleAuth} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={e => setAuthUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple/50 transition-all"
                    />
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={e => setAuthPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple/50 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-gradient-to-r from-neon-purple to-neon-blue transition-all duration-500 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl text-[11px] flex items-center justify-center disabled:opacity-50 shadow-[0_5px_20px_rgba(182,36,255,0.3)] hover:shadow-[0_10px_25px_rgba(182,36,255,0.5)] border-b-4 border-purple-900 active:border-b-0 active:translate-y-1"
                    >
                      {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? 'Enter Radio' : 'Register Now')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                      className="w-full text-[10px] text-center font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors"
                    >
                      {authMode === 'login' ? 'New here? Register' : 'Member? Login'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-neon-blue/20 flex items-center justify-center text-neon-blue">
                         <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{loggedInUser}</span>
                    </div>
                    <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 transition-colors">
                      Logout
                    </button>
                  </div>

                  <form onSubmit={sendMessage} className="relative group">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Say something to the station..."
                      className="w-full bg-black/50 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/50 transition-all placeholder-white/20"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center rounded-xl bg-neon-purple text-white disabled:opacity-30 hover:bg-neon-blue transition-all"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                  
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => setInputText('🔥 BIG CHUNE!')}
                      className="text-[10px] font-black uppercase bg-white/5 border border-white/5 px-3 py-1 rounded-full hover:bg-white/10 transition-all"
                    >
                      🔥
                    </button>
                    <button 
                      onClick={() => setInputText('BIG UP! 🙌')}
                      className="text-[10px] font-black uppercase bg-white/5 border border-white/5 px-3 py-1 rounded-full hover:bg-white/10 transition-all"
                    >
                      🙌
                    </button>
                    <button 
                      onClick={() => setInputText('[REQUEST] ')}
                      className="text-[10px] font-black uppercase bg-white/5 border border-white/5 px-3 py-1 rounded-full hover:bg-white/10 transition-all"
                    >
                      Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
