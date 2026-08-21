import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, Flame, X, User, Sparkles, Mic2, Radio, MessageSquare, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { useLogo } from '../hooks/useLogo';

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[localStorage] Failed to getItem for key "${key}":`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[localStorage] Failed to setItem for key "${key}":`, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[localStorage] Failed to removeItem for key "${key}":`, e);
    }
  }
};

const authenticatedFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let token = null;
  try {
    token = safeLocalStorage.getItem('chat_user_token');
  } catch (e) {}
  
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include'
  });
};

export function ShoutoutWidget({ isChatOpen = false }: { isChatOpen?: boolean }) {
  const { isLightMode } = useLogo();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState(() => {
    return safeLocalStorage.getItem('dejavu_shoutout_email') || '';
  });
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'text' | 'reaction'>('text');
  const [isSending, setIsSending] = useState(false);
  const [recentShoutouts, setRecentShoutouts] = useState<any[]>([]);
  const [showBoothClear, setShowBoothClear] = useState(false);
  const prevCountRef = useRef(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isHovered, setIsHovered] = useState(false);
  const [isMediaPlaying, setIsMediaPlaying] = useState(false);
  const [isSplitActive, setIsSplitActive] = useState(() => {
    try {
      return document.body.classList.contains('split-view-active');
    } catch {
      return false;
    }
  });

  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'audio' | 'video' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let mediaType: 'image' | 'audio' | 'video' | null = null;
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
    else if (file.type.startsWith('video/')) mediaType = 'video';

    if (!mediaType) {
      toast.error("Unsupported file type. Use images, audio, or video.");
      return;
    }

    setAttachment(file);
    setAttachmentType(mediaType);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentType(null);
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Check auth status on mount and when modal opens
  const checkAuth = async () => {
    try {
      const res = await authenticatedFetch('/api/public/auth/check');
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
        setEmail(safeLocalStorage.getItem('dejavu_shoutout_email') || '');
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
    if (!isLoggedIn && email) {
      safeLocalStorage.setItem('dejavu_shoutout_email', email);
    }
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

  useEffect(() => {
    const handleSplitChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsSplitActive(!!customEvent.detail?.active);
    };
    window.addEventListener('split-view-change', handleSplitChange);
    return () => {
      window.removeEventListener('split-view-change', handleSplitChange);
    };
  }, []);


  // Consolidate socket listeners
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleReply = (data: { 
      shoutoutId: string; 
      repliedBy: string; 
      replyText: string;
      replyImageUrl?: string;
      replyAudioUrl?: string;
      replyVideoUrl?: string;
    }) => {
      // Robust deduplication: check if we already have a reply for this shoutout with this message
      setRecentShoutouts(prev => {
        // If we already have this exact reply (same shoutoutId and message), don't add it again
        const isDuplicate = prev.some(s => 
          s.isReply && 
          s.shoutoutId === data.shoutoutId && 
          s.message === data.replyText
        );
        if (isDuplicate) return prev;

        const replyShoutout = {
          // Use a combination of ID, timestamp, and random string to ensure absolute uniqueness for React keys
          id: `reply-${data.shoutoutId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          shoutoutId: data.shoutoutId, // Store original ID for deduplication
          isReply: true,
          listener_name: data.repliedBy,
          message: data.replyText,
          imageUrl: data.replyImageUrl,
          audioUrl: data.replyAudioUrl,
          videoUrl: data.replyVideoUrl,
        };

        return [replyShoutout, ...prev].slice(0, 3);
      });
    };

    const handleNewShoutout = (shoutout: any) => {
      setRecentShoutouts(prev => {
        if (prev.some(s => s.id === shoutout.id)) return prev;
        return [shoutout, ...prev].slice(0, 3);
      });
    };

    const onCleared = () => {
      setRecentShoutouts([]);
    };

    socket.on('shoutoutReply', handleReply);
    socket.on('new_shoutout', handleNewShoutout);
    socket.on('shoutouts_cleared', onCleared);

    return () => {
      socket.off('shoutoutReply', handleReply);
      socket.off('new_shoutout', handleNewShoutout);
      socket.off('shoutouts_cleared', onCleared);
    };
  }, []);

  // Auto-hide shoutouts with dynamic duration based on screen size
  useEffect(() => {
    if (recentShoutouts.length === 0) return;
    if (isHovered || isMediaPlaying) return; // Pause dismissal if hovered or playing media

    // Check for small screens (Tailwind's sm breakpoint is 640px)
    const duration = isMobile ? 4000 : 8000; 

    const timer = setTimeout(() => {
      setRecentShoutouts(prev => prev.slice(0, -1)); // Remove the oldest entry
    }, duration);

    return () => clearTimeout(timer);
  }, [recentShoutouts, isMobile, isHovered, isMediaPlaying]);

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
    if (!email.trim()) {
      toast.error('Please enter your email.');
      return;
    }
    if (!message.trim() && !attachment) {
      toast.warning('Please enter a message or select an attachment.');
      return;
    }

    setIsSending(true);
    setIsUploading(true);
    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'audio' | 'video' | null = attachmentType;

    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);

        const uploadRes = await authenticatedFetch('/api/public/shoutout/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
        mediaUrl = uploadData.url;
        mediaType = uploadData.type;
      }

      const res = await authenticatedFetch('/api/public/shoutout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          message,
          type,
          imageUrl: mediaType === 'image' ? mediaUrl : null,
          audioUrl: mediaType === 'audio' ? mediaUrl : null,
          videoUrl: mediaType === 'video' ? mediaUrl : null,
        })
      });
      if (res.ok) {
        toast.success('Shoutout sent to studio!');
        setMessage('');
        removeAttachment();
        setIsOpen(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Shoutout submission failed.');
      }
    } catch (err: any) {
      console.error("Shoutout send error:", err);
      toast.error(err.message || 'Failed to reach studio.');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const sendReaction = async (emoji: string) => {
    let resolvedEmail = email;
    if (!resolvedEmail.trim()) {
      try {
        const res = await authenticatedFetch('/api/public/auth/check');
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
    authenticatedFetch('/api/public/shoutout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resolvedEmail, message: emoji, type: 'reaction' })
    });
    toast.success(`${emoji} Sent!`);
  };

  if (isSplitActive) return null;

  return (
    <div className={`front-shoutouts-floating-container fixed bottom-28 sm:bottom-[180px] xl:bottom-32 z-[10020] flex flex-col items-end gap-5 pointer-events-none transition-all duration-500 ease-in-out ${
      isChatOpen ? 'right-6 sm:right-[472px] xl:right-[480px]' : 'right-6 xl:right-8'
    }`}>
      <AnimatePresence>
        {recentShoutouts.map((s, i) => (
          <motion.div
            key={s.id || `shoutout-${i}`}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.5 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`flex flex-col backdrop-blur-2xl border-y border-r rounded-2xl shadow-2xl pointer-events-auto max-w-[280px] sm:max-w-[320px] transition-all duration-300 overflow-hidden ${
              isLightMode 
                ? 'bg-white/95 border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)]' 
                : 'bg-black/60 border-white/10 shadow-[0_10px_45px_rgba(0,0,0,0.5)]'
            } ${s.isReply ? 'border-l-4 border-l-neon-blue ring-1 ring-neon-blue/20' : 'border-l-4 border-l-neon-purple'}`}
            style={s.isReply ? { zIndex: 10025 } : {}}
          >
             {/* Rich Media at the top */}
             {(s.imageUrl || s.videoUrl) && (
               <div className={`w-full relative overflow-hidden border-b group/media ${
                 isLightMode ? 'bg-slate-50 border-slate-200/60' : 'bg-black/40 border-white/5'
               }`}>
                 {s.imageUrl && (
                   <img 
                     src={s.imageUrl} 
                     alt="Attached Image" 
                     className="w-full h-auto max-h-48 object-cover transition-transform duration-700 group-hover/media:scale-110" 
                   />
                 )}
                 {s.videoUrl && (
                   <video 
                     src={s.videoUrl} 
                     className="w-full h-auto max-h-48 object-cover bg-black" 
                     autoPlay 
                     muted 
                     loop 
                     playsInline
                     onPlay={() => setIsMediaPlaying(true)}
                     onPause={() => setIsMediaPlaying(false)}
                     onEnded={() => setIsMediaPlaying(false)}
                   />
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
               </div>
             )}

             <div className="flex items-start space-x-4 px-5 py-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-1 ${
                   s.isReply 
                     ? (isLightMode ? 'bg-blue-50 border-blue-100' : 'bg-neon-blue/10 border-neon-blue/20') 
                     : (isLightMode ? 'bg-purple-50 border-purple-100' : 'bg-neon-purple/10 border-neon-purple/20')
                 }`}>
                   {s.isReply ? (
                     <MessageSquare className={`w-5 h-5 ${isLightMode ? 'text-blue-600' : 'text-neon-blue'}`} />
                   ) : (
                     <Radio className={`w-5 h-5 ${isLightMode ? 'text-purple-600' : 'text-neon-purple'}`} />
                   )}
                </div>
                <div className="min-w-0 flex-1">
                                       <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 ${
                      isLightMode ? 'text-slate-400' : 'text-white/40'
                    }`}>
                     {s.isReply ? 'Reply from DJ' : 'Broadcast Alert'}
                   </p>
                                       <p className={`text-[11px] font-bold truncate tracking-tight mb-1 ${
                      s.isReply 
                        ? (isLightMode ? 'text-blue-600' : 'text-neon-blue') 
                        : (isLightMode ? 'text-purple-600' : 'text-neon-purple')
                    }`}>
                     {s.listener_name}
                   </p>
                                       <p className={`text-xs line-clamp-3 font-semibold leading-relaxed italic mb-2 ${
                      isLightMode ? 'text-slate-700' : 'text-white/90'
                    }`}>"{s.message}"</p>
                   
                   {/* Audio Content remains below text as it's a control bar */}
                   {s.audioUrl && (
                                           <div className={`mt-2 w-full p-1.5 rounded-lg border ${
                        isLightMode ? 'bg-slate-50 border-slate-200/60' : 'bg-black/30 border-white/5'
                      }`}>
                       <audio 
                         src={s.audioUrl} 
                         controls 
                         className={`w-full h-6 ${s.isReply ? 'accent-neon-blue' : 'accent-neon-purple'}`} 
                         onPlay={() => setIsMediaPlaying(true)}
                         onPause={() => setIsMediaPlaying(false)}
                         onEnded={() => setIsMediaPlaying(false)}
                       />
                     </div>
                   )}
                </div>
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
          onClick={() => setIsOpen(!isOpen)}
          whileHover="hover"
          className="bg-white text-dark-bg px-6 py-4 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.4)] hover:shadow-neon-purple/20 transition-all flex items-center space-x-3 z-10 relative overflow-hidden group/btn"
        >
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-black/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
          />
          <div className="relative">
            {isOpen ? (
              <X className="w-5 h-5 group-hover/btn:rotate-90 transition-transform" />
            ) : (
              <>
                <Mic2 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
              </>
            )}
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.15em] hidden md:block">
            {isOpen ? 'Close Panel' : 'Live Shoutout'}
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

                {/* Attachment Preview */}
                {attachmentPreview && (
                  <div className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {attachmentType === 'image' && (
                        <img src={attachmentPreview} className="w-10 h-10 rounded-lg object-cover bg-black/40 border border-white/10" alt="Preview" />
                      )}
                      {attachmentType === 'audio' && (
                        <div className="w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center shrink-0">
                          <Mic2 className="w-4 h-4 text-neon-purple" />
                        </div>
                      )}
                      {attachmentType === 'video' && (
                        <div className="w-10 h-10 rounded-lg bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center shrink-0">
                          <Radio className="w-4 h-4 text-neon-blue" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-white truncate max-w-[180px]">{attachment?.name}</p>
                        <p className="text-[8px] font-bold uppercase tracking-wider text-white/30 font-mono">
                          {attachmentType} • {(attachment!.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={removeAttachment} 
                      className="p-1 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Attachment Actions */}
                <div className="flex items-center justify-between px-1">
                  <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-neon-purple animate-pulse" />
                    <span>Rich Media</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:text-white transition-all"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <motion.button 
                  disabled={isSending || isUploading}
                  whileHover="hover"
                  className="w-full bg-white text-dark-bg py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:shadow-neon-purple/20 transition-all flex items-center justify-center space-x-3 relative overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                >
                  <motion.div
                    className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-dark-bg/5 to-transparent -skew-x-12"
                    variants={{ hover: { x: ['-150%', '150%'] } }}
                    transition={{ duration: 0.75, ease: "easeInOut" }}
                  />
                  {isSending || isUploading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-t-[#0D0F1D] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                      <span>Transmitting...</span>
                    </span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Message Studio</span>
                    </>
                  )}
                </motion.button>
             </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ShoutoutWidget;
