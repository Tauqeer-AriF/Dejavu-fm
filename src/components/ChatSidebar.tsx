import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Send, User, LogOut, Loader2, X, MessageSquare, Users, Ban, ShieldAlert, Smile, Search, Paperclip, Music, Mic, Square, Trash2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useModal } from '../context/ModalContext';
import { useLogo } from '../hooks/useLogo';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  imageUrl?: string;
  imageName?: string;
  audioUrl?: string;
  audioName?: string;
  recipient?: string;
}

const EMOJI_CATEGORIES = [
  {
    name: "Music & Club Vibes",
    emojis: [
      { char: "🔥", name: "fire hot banger" },
      { char: "🎧", name: "headphones dj music" },
      { char: "📻", name: "radio station live" },
      { char: "🔊", name: "loud speaker sound volume" },
      { char: "🎵", name: "musical note" },
      { char: "🎶", name: "multiple notes melody" },
      { char: "🎹", name: "piano keyboard synth" },
      { char: "🎤", name: "microphone live MC" },
      { char: "🕺", name: "dancing man party" },
      { char: "💃", name: "dancing woman club" },
      { char: "🎛️", name: "mixer controls knobs" },
      { char: "🎚️", name: "fader slider sound" },
      { char: "⚡", name: "lightning energy electric" },
      { char: "🌟", name: "shining star prime" },
      { char: "🚨", name: "alert siren police warning" },
      { char: "💥", name: "explosion boom" },
    ]
  },
  {
    name: "Faces & Emotions",
    emojis: [
      { char: "😀", name: "happy smile grin" },
      { char: "😂", name: "laughing tear tears joy" },
      { char: "😎", name: "cool sunglasses shade" },
      { char: "😍", name: "love heart eyes" },
      { char: "🤯", name: "mind blown shock" },
      { char: "😮", name: "gasp surprise wow" },
      { char: "🥳", name: "party celebrate hat" },
      { char: "😜", name: "wink tongue cheeky" },
      { char: "🤩", name: "starstruck excited" },
      { char: "😏", name: "smirk devious" },
      { char: "👽", name: "alien extra-terrestrial" },
      { char: "👑", name: "king queen crown" },
    ]
  },
  {
    name: "Hands & Gestures",
    emojis: [
      { char: "🙌", name: "hands up praise party" },
      { char: "👏", name: "clapping applause" },
      { char: "👍", name: "thumbs up support yes" },
      { char: "👊", name: "fist bump respect" },
      { char: "✊", name: "fist raised power" },
      { char: "✌️", name: "peace sign victory" },
      { char: "🤘", name: "rock on metal horns" },
      { char: "👋", name: "wave hello goodbye" },
      { char: "🤝", name: "handshake agreement" },
      { char: "❤️", name: "red heart love" },
      { char: "💯", name: "one hundred percent real" },
    ]
  }
];

export function ChatSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { isLightMode } = useLogo();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [listeners, setListeners] = useState(0);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userJoinedAt, setUserJoinedAt] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dejavu_blocked_users') || '[]');
    } catch {
      return [];
    }
  });

  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [activeDmUser, setActiveDmUser] = useState<string | null>(null);
  const [chatTab, setChatTab] = useState<'public' | 'private'>('public');
  const [allUsers, setAllUsers] = useState<{ username: string; avatar_url: string | null }[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [unreadDms, setUnreadDms] = useState<Set<string>>(new Set<string>());

  const activeDmUserRef = useRef<string | null>(null);
  useEffect(() => {
    activeDmUserRef.current = activeDmUser;
  }, [activeDmUser]);

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/public/chat/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users for DM", err);
    }
  };

  useEffect(() => {
    if (isOpen && loggedInUser && chatTab === 'private') {
      fetchAllUsers();
    }
  }, [isOpen, loggedInUser, chatTab]);

  useEffect(() => {
    if (activeDmUser) {
      setUnreadDms(prev => {
        if (prev.has(activeDmUser)) {
          const next = new Set(prev);
          next.delete(activeDmUser);
          return next;
        }
        return prev;
      });
    }
  }, [activeDmUser, privateMessages]);

  const activeConversations = useMemo(() => {
    const usersMap = new Map<string, ChatMessage>();
    if (isAdmin) {
      privateMessages.forEach(m => {
        if (m.user && m.user !== loggedInUser) {
          usersMap.set(m.user, m);
        }
        if (m.recipient && m.recipient !== loggedInUser) {
          usersMap.set(m.recipient, m);
        }
      });
    } else {
      privateMessages.forEach(m => {
        const other = m.user === loggedInUser ? m.recipient : m.user;
        if (other && other !== loggedInUser) {
          usersMap.set(other, m);
        }
      });
    }
    return Array.from(usersMap.entries()).map(([username, latestMsg]) => ({
      username,
      latestMsg
    })).sort((a, b) => b.latestMsg.timestamp - a.latestMsg.timestamp);
  }, [privateMessages, loggedInUser, isAdmin]);

  const { showConfirm } = useModal();

  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: 'image' | 'audio';
    filename: string;
  } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const socketRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setInputText(prev => prev + emoji);
      return;
    }

    const start = input.selectionStart ?? inputText.length;
    const end = input.selectionEnd ?? inputText.length;
    const nextText = inputText.substring(0, start) + emoji + inputText.substring(end);
    setInputText(nextText);

    setTimeout(() => {
      input.focus();
      const newCursorPos = start + emoji.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const filteredEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return null;
    const searchLower = emojiSearch.toLowerCase();
    const result: { char: string; name: string }[] = [];
    EMOJI_CATEGORIES.forEach(category => {
      category.emojis.forEach(emoji => {
        if (emoji.name.toLowerCase().includes(searchLower)) {
          result.push(emoji);
        }
      });
    });
    return result;
  }, [emojiSearch]);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/public/auth/check')
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) {
          setLoggedInUser(data.username);
          setUserAvatar(data.avatar_url);
          setUserJoinedAt(data.created_at);
          if (data.isAdmin) {
            setIsAdmin(true);
          }
        }
        setIsCheckingAuth(false);
      })
      .catch(() => {
        setIsCheckingAuth(false);
      });

    // Check for station admin status
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      fetch('/api/admin/check', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }).then(r => { if (r.ok) setIsAdmin(true); })
        .catch(() => setIsAdmin(false));
    }

    const socket = (window as any).socket;
    if (!socket) return;
    socketRef.current = socket;

    if (loggedInUser) {
      socket.emit('registerUser', loggedInUser);
    }

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

    socket.on('privateHistory', (history: ChatMessage[]) => {
      setPrivateMessages(history);
    });

    socket.on('privateMessage', (msg: ChatMessage) => {
      setPrivateMessages(prev => {
        const newArr = [...prev, msg];
        return newArr;
      });

      if (msg.user !== loggedInUser) {
        setUnreadDms(prev => {
          if (activeDmUserRef.current !== msg.user) {
            const next = new Set(prev);
            next.add(msg.user);
            return next;
          }
          return prev;
        });

        if (activeDmUserRef.current !== msg.user) {
          toast.info(`New message from ${msg.user.split('@')[0]}: ${msg.text ? (msg.text.length > 25 ? msg.text.substring(0, 25) + '...' : msg.text) : '🎵 Voice note or audio'}`);
        }
      }
    });

    socket.on('onlineCount', (count: number) => {
      setListeners(count);
    });

    socket.on('user_banned', ({ email }: { email: string }) => {
      setMessages(prev => prev.filter(m => m.user !== email));
      if (loggedInUser === email) {
        handleLogout();
        toast.error("Your session has been terminated by an administrator.");
      }
    });

    return () => {
      socket.off('chatHistory');
      socket.off('chatMessage');
      socket.off('privateHistory');
      socket.off('privateMessage');
      socket.off('onlineCount');
      socket.off('user_banned');
    };
  }, [isOpen, loggedInUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    if (authMode === 'register' && !authUsername.trim()) {
      toast.error('Username is required');
      return;
    }
    setAuthLoading(true);
    
    try {
      const endpoint = authMode === 'login' ? '/api/public/auth/login' : '/api/public/auth/register';
      const body = authMode === 'login'
        ? { email: authEmail, password: authPassword }
        : { username: authUsername, email: authEmail, password: authPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (res.ok) {
        setLoggedInUser(data.username);
        setUserAvatar(data.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.username}`);
        setUserJoinedAt(data.created_at || new Date().toISOString());
        
        // Senior Dev: If this is a staff account, sync the token to admin_token storage 
        // to ensure they can enter the admin portal seamlessly.
        if (data.role && data.token) {
          localStorage.setItem('admin_token', data.token);
          setIsAdmin(true);
        } else if (data.isAdmin) {
          setIsAdmin(true);
        }
        
        toast.success(`Welcome, ${data.username}!`);
        setAuthEmail('');
        setAuthPassword('');
        setAuthUsername('');
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
    } catch(err) {}
    localStorage.removeItem('admin_token');
    setLoggedInUser(null);
    setUserAvatar(null);
    setUserJoinedAt(null);
    setAuthMode('login');
    setPrivateMessages([]);
    setActiveDmUser(null);
    setChatTab('public');
    toast.success('Logged out');
  };

  const handleSaveAvatarUrl = async (url: string) => {
    try {
      const res = await fetch('/api/public/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: url })
      });
      if (res.ok) {
        setUserAvatar(url);
        toast.success("Avatar updated successfully!");
      } else {
        toast.error("Failed to update avatar");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleAvatarFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('/api/public/user/upload-avatar', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.avatar_url) {
        setUserAvatar(data.avatar_url);
        toast.success("Avatar uploaded and updated!");
      } else {
        toast.error(data.error || "Failed to upload avatar");
      }
    } catch {
      toast.error("Network upload error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleFileSelection = async (file: File) => {
    if (!file) return;
    
    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    
    if (!isImage && !isAudio) {
      toast.error("Please select an image or audio file");
      return;
    }
    
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File is too large. Max size is 15MB");
      return;
    }
    
    setIsUploadingAttachment(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/public/chat/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingAttachment({
          url: data.url,
          type: data.type,
          filename: data.filename
        });
        toast.success(`${isImage ? 'Image' : 'Audio'} uploaded successfully!`);
      } else {
        toast.error(data.error || "Failed to upload file");
      }
    } catch {
      toast.error("Error uploading file");
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!loggedInUser) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!loggedInUser) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) return;

        const fileExtension = mediaRecorder.mimeType.includes('mp4') ? 'mp4' : 
                              mediaRecorder.mimeType.includes('ogg') ? 'ogg' : 'webm';
        
        const audioFile = new File(
          [audioBlob], 
          `VoiceNote_${Date.now()}.${fileExtension}`, 
          { type: audioBlob.type }
        );

        setIsUploadingAttachment(true);
        const formData = new FormData();
        formData.append('file', audioFile);

        try {
          const res = await fetch('/api/public/chat/upload', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setPendingAttachment({
              url: data.url,
              type: 'audio',
              filename: data.filename
            });
            toast.success("Voice note recorded successfully!");
          } else {
            toast.error(data.error || "Failed to upload voice note");
          }
        } catch {
          toast.error("Error uploading voice note");
        } finally {
          setIsUploadingAttachment(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Failed to access microphone", err);
      toast.error("Microphone access denied or not supported.");
    }
  };

  const stopRecording = (cancel: boolean = false) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (cancel) {
      audioChunksRef.current = [];
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = !!inputText.trim();
    const hasAttachment = !!pendingAttachment;
    if ((!hasText && !hasAttachment) || !socketRef.current || !loggedInUser) return;
    
    const messagePayload: any = {
      user: loggedInUser,
      text: inputText
    };

    if (chatTab === 'private' && activeDmUser) {
      messagePayload.recipient = activeDmUser;
    }

    if (pendingAttachment) {
      if (pendingAttachment.type === 'image') {
        messagePayload.imageUrl = pendingAttachment.url;
        messagePayload.imageName = pendingAttachment.filename;
      } else if (pendingAttachment.type === 'audio') {
        messagePayload.audioUrl = pendingAttachment.url;
        messagePayload.audioName = pendingAttachment.filename;
      }
    }

    socketRef.current.emit('chatMessage', messagePayload);
    setInputText('');
    setPendingAttachment(null);
  };

  const handleBlockUser = (username: string) => {
    if (username === loggedInUser || username === 'SYSTEM') return;
    const newBlocked = [...new Set([...blockedUsers, username])];
    setBlockedUsers(newBlocked);
    localStorage.setItem('dejavu_blocked_users', JSON.stringify(newBlocked));
    toast.success(`User blocked. You will no longer see messages from ${username}.`);
  };

  const handleBanUser = async (email: string) => {
    const confirmed = await showConfirm({
      title: "Global Ban",
      message: `Are you sure you want to PERMANENTLY suspend ${email} and remove all their messages?`,
      style: "danger",
      confirmText: "Ban User"
    });

    if (!confirmed) return;

    const adminToken = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/admin/chat_users/ban', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ email })
      });
      if (res.ok) toast.success(`User ${email} has been globally banned.`);
    } catch (err) {
      toast.error('Failed to ban user.');
    }
  };

  const handleUnblockAll = () => {
    setBlockedUsers([]);
    localStorage.removeItem('dejavu_blocked_users');
    toast.success('Block list cleared');
  };

  const visibleMessages = useMemo(() => 
    messages.filter(msg => !blockedUsers.includes(msg.user)),
  [messages, blockedUsers]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 1 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 80 || info.velocity.x > 400) onClose();
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`fixed top-0 right-0 h-full w-full max-w-md bg-dark-bg/95 backdrop-blur-2xl border-l z-[10101] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col touch-pan-y ${isLightMode ? 'border-black/10' : 'border-white/10'}`}
          >
            {/* Drag & Drop Media Overlay */}
            {isDragging && (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="absolute inset-0 bg-[#0c0a0f]/90 backdrop-blur-md z-[10200] flex flex-col items-center justify-center p-6 border-2 border-dashed border-neon-purple/50 rounded-l-3xl animate-in fade-in"
              >
                <div className="w-16 h-16 rounded-2xl bg-neon-purple/20 flex items-center justify-center text-neon-purple border border-neon-purple/30 mb-4 animate-bounce">
                  <Paperclip className="w-8 h-8" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Drop to Upload Media</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mt-1">Images or audio files up to 15MB</p>
              </div>
            )}

            {/* Mobile Drag Handle Indicator */}
            <div className={`absolute left-2 top-1/2 -translate-y-1/2 w-1 h-16 rounded-full md:hidden pointer-events-none ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`} />

            <div className={`p-6 border-b flex items-center justify-between ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight uppercase tracking-widest">Chat Room</h3>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center text-[10px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-blue mr-2 animate-pulse"></span>
                      {listeners} Online now
                    </div>
                    {blockedUsers.length > 0 && (
                      <button 
                        onClick={handleUnblockAll}
                        className="text-[9px] text-red-500/50 hover:text-red-500 uppercase font-black tracking-widest transition-colors flex items-center gap-1"
                      >
                        <Ban className="w-2.5 h-2.5" />
                        Unblock All ({blockedUsers.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loggedInUser && (
                  <button
                    onClick={() => setShowProfile(true)}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-neon-purple/20 border border-white/10 hover:border-neon-purple/50 flex items-center justify-center overflow-hidden transition-all group shrink-0 relative cursor-pointer"
                    title="User Profile & Avatar"
                  >
                    <img
                      src={userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${loggedInUser}`}
                      alt={loggedInUser}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${loggedInUser}`;
                      }}
                    />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Selector when logged in */}
            {loggedInUser && (
              <div className={`px-6 py-2 border-b flex gap-2 shrink-0 ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                <button
                  onClick={() => setChatTab('public')}
                  className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                    chatTab === 'public'
                      ? 'bg-neon-purple text-white border-neon-purple shadow-[0_0_10px_rgba(176,38,255,0.3)]'
                      : (isLightMode ? 'text-black/60 hover:text-black border-black/10 bg-black/5' : 'text-white/60 hover:text-white border-white/10 bg-white/5')
                  }`}
                >
                  📡 Station Chat
                </button>
                <button
                  onClick={() => setChatTab('private')}
                  className={`flex-1 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg border transition-all relative cursor-pointer ${
                    chatTab === 'private'
                      ? 'bg-neon-purple text-white border-neon-purple shadow-[0_0_10px_rgba(176,38,255,0.3)]'
                      : (isLightMode ? 'text-black/60 hover:text-black border-black/10 bg-black/5' : 'text-white/60 hover:text-white border-white/10 bg-white/5')
                  }`}
                >
                  💬 Direct Messages
                  {unreadDms.size > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce border border-white">
                      {unreadDms.size}
                    </span>
                  )}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin" ref={scrollRef}>
              {chatTab === 'public' ? (
                // Public layout
                visibleMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 text-center space-y-4">
                    <Users className="w-16 h-16" />
                    <p className={`text-sm font-bold uppercase tracking-widest ${isLightMode ? 'text-black' : 'text-white'}`}>{messages.length > 0 ? 'Messages are filtered' : 'The airwaves are quiet... say something!'}</p>
                  </div>
                ) : (
                  visibleMessages.map((msg) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id} 
                      className={`group ${msg.isSystem ? 'bg-neon-pink/10 border border-neon-pink/30 p-3 rounded-xl' : 'flex gap-3'}`}
                    >
                      {!msg.isSystem && (
                        <div className={`w-8 h-8 rounded-lg overflow-hidden border shrink-0 ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                          <img 
                            src={(msg as any).avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user}`}
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
                            <div className="flex items-center gap-2">
                              <span className="font-black text-neon-blue text-xs uppercase tracking-widest">
                                {msg.user.includes('@') ? msg.user.split('@')[0] : msg.user}
                              </span>
                              {loggedInUser && msg.user !== loggedInUser && (
                                <button 
                                  onClick={() => {
                                    setActiveDmUser(msg.user);
                                    setChatTab('private');
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] bg-neon-purple/20 text-neon-purple/80 hover:bg-neon-purple hover:text-white px-1.5 py-0.5 rounded border border-neon-purple/30 font-black uppercase tracking-tighter cursor-pointer"
                                  title="Send Private Message"
                                >
                                  Message
                                </button>
                              )}
                              {loggedInUser && msg.user !== loggedInUser && (
                                <button 
                                  onClick={() => handleBlockUser(msg.user)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] bg-red-500/10 text-red-500/60 hover:text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 font-black uppercase tracking-tighter cursor-pointer"
                                  title="Block User"
                                >
                                  Block
                                </button>
                              )}
                              {isAdmin && msg.user !== loggedInUser && (
                                <button 
                                  onClick={() => handleBanUser(msg.user)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] bg-red-600 text-white hover:bg-red-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1 cursor-pointer"
                                  title="Global Ban"
                                >
                                  <ShieldAlert className="w-2 h-2" />
                                  Ban
                                </button>
                              )}
                            </div>
                            <span className={`text-[9px] font-bold uppercase ${isLightMode ? 'text-black/30' : 'text-white/20'}`}>
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
                          <div className={`rounded-2xl rounded-tl-none p-3 border transition-all ${isLightMode ? 'bg-black/5 border-black/5 group-hover:border-black/10' : 'bg-white/5 border-white/5 group-hover:border-white/10'}`}>
                            {msg.text && (
                              <p className={`text-sm break-words leading-relaxed ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{msg.text}</p>
                            )}
                            {msg.imageUrl && (
                              <div className="relative mt-2 max-w-full rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                <img 
                                  src={msg.imageUrl} 
                                  alt={msg.imageName || "Attached Image"} 
                                  className="max-h-60 object-contain mx-auto" 
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            {msg.audioUrl && (
                              <div className="mt-2 w-full p-2 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1">
                                {msg.audioName && (
                                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider truncate mb-1">
                                    🎵 {msg.audioName}
                                  </p>
                                )}
                                <audio 
                                  src={msg.audioUrl} 
                                  controls 
                                  className="w-full h-8 accent-neon-purple rounded" 
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )
              ) : (
                // Private Direct Messages view
                activeDmUser ? (
                  // Chat conversation view
                  <div className="space-y-6">
                    <div className={`flex items-center justify-between pb-3 border-b ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                      <button
                        onClick={() => setActiveDmUser(null)}
                        className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded-xl border transition-all cursor-pointer ${
                          isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                        }`}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to DMs
                      </button>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10">
                          <img 
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${activeDmUser}`}
                            alt={activeDmUser}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-black text-neon-blue text-xs uppercase tracking-widest truncate max-w-[150px]">
                          {activeDmUser.includes('@') ? activeDmUser.split('@')[0] : activeDmUser}
                        </span>
                      </div>
                    </div>

                    {privateMessages.filter(m => {
                      if (isAdmin) {
                        return m.user === activeDmUser || m.recipient === activeDmUser;
                      }
                      return (m.user === loggedInUser && m.recipient === activeDmUser) ||
                             (m.user === activeDmUser && m.recipient === loggedInUser);
                    }).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center space-y-4">
                        <MessageSquare className="w-12 h-12 text-neon-purple animate-pulse" />
                        <p className={`text-xs font-bold uppercase tracking-widest ${isLightMode ? 'text-black' : 'text-white'}`}>
                          {isAdmin ? `No messages involving ${activeDmUser.split('@')[0]} found.` : `This is the start of your private chat history with ${activeDmUser.split('@')[0]}.`}
                        </p>
                      </div>
                    ) : (
                      privateMessages.filter(m => {
                        if (isAdmin) {
                          return m.user === activeDmUser || m.recipient === activeDmUser;
                        }
                        return (m.user === loggedInUser && m.recipient === activeDmUser) ||
                               (m.user === activeDmUser && m.recipient === loggedInUser);
                      }).map((msg) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={msg.id} 
                          className="flex gap-3"
                        >
                          <div className={`w-8 h-8 rounded-lg overflow-hidden border shrink-0 ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                            <img 
                              src={(msg as any).avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user}`}
                              alt={msg.user}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="font-black text-neon-blue text-xs uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                                {msg.user.includes('@') ? msg.user.split('@')[0] : msg.user}
                                {isAdmin && msg.recipient && (
                                  <span className="text-[9px] text-white/30 font-bold lowercase flex items-center gap-1">
                                    to
                                    <span className="text-neon-purple uppercase font-black tracking-widest">
                                      {msg.recipient.includes('@') ? msg.recipient.split('@')[0] : msg.recipient}
                                    </span>
                                  </span>
                                )}
                              </span>
                              <span className={`text-[9px] font-bold uppercase ${isLightMode ? 'text-black/30' : 'text-white/20'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className={`rounded-2xl rounded-tl-none p-3 border transition-all ${isLightMode ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5'}`}>
                              {msg.text && (
                                <p className={`text-sm break-words leading-relaxed ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{msg.text}</p>
                              )}
                              {msg.imageUrl && (
                                <div className="relative mt-2 max-w-full rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                  <img 
                                    src={msg.imageUrl} 
                                    alt={msg.imageName || "Attached Image"} 
                                    className="max-h-60 object-contain mx-auto" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                              {msg.audioUrl && (
                                <div className="mt-2 w-full p-2 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1">
                                  {msg.audioName && (
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider truncate mb-1">
                                      🎵 {msg.audioName}
                                    </p>
                                  )}
                                  <audio 
                                    src={msg.audioUrl} 
                                    controls 
                                    className="w-full h-8 accent-neon-purple rounded" 
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                ) : (
                  // DMs Directory
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-purple">Search Users</h4>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-white/40" />
                        </div>
                        <input
                          type="text"
                          value={searchUserQuery}
                          onChange={(e) => setSearchUserQuery(e.target.value)}
                          placeholder="Search users to DM..."
                          className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border focus:outline-none transition-all ${
                            isLightMode 
                              ? 'bg-[#ffffff]/80 border-black/10 text-black placeholder-black/40 focus:border-neon-purple' 
                              : 'bg-black/50 border-white/10 text-white placeholder-white/20 focus:border-neon-purple'
                          }`}
                        />
                      </div>

                      {searchUserQuery.trim() && (
                        <div className={`border rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 ${isLightMode ? 'bg-white border-black/10' : 'bg-black/60 border-white/10'}`}>
                          {allUsers.filter(u => u.username !== loggedInUser && u.username.toLowerCase().includes(searchUserQuery.toLowerCase())).length === 0 ? (
                            <p className="text-center text-[10px] uppercase font-black tracking-widest text-white/30 py-3">No matching users found</p>
                          ) : (
                            allUsers
                              .filter(u => u.username !== loggedInUser && u.username.toLowerCase().includes(searchUserQuery.toLowerCase()))
                              .map(user => (
                                <button
                                  key={user.username}
                                  onClick={() => {
                                    setActiveDmUser(user.username);
                                    setSearchUserQuery('');
                                  }}
                                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left cursor-pointer ${
                                    isLightMode ? 'hover:bg-black/5 text-black' : 'hover:bg-white/5 text-white'
                                  }`}
                                >
                                  <div className="w-6 h-6 rounded-md overflow-hidden border border-white/10 shrink-0">
                                    <img 
                                      src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                                      alt={user.username}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-wider">
                                    {user.username.includes('@') ? user.username.split('@')[0] : user.username}
                                  </span>
                                </button>
                              ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-purple">Recent Conversations</h4>
                      
                      {activeConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 opacity-30 text-center space-y-3 border border-dashed border-white/10 rounded-2xl">
                          <Users className="w-8 h-8 text-white/40" />
                          <p className="text-[10px] uppercase font-black tracking-widest text-white/50">No active conversations</p>
                          <p className="text-[9px] uppercase font-bold text-white/30">Search above or click 'Message' on a user's message in chat</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeConversations.map(({ username, latestMsg }) => {
                            const isUnread = unreadDms.has(username);
                            return (
                              <button
                                key={username}
                                onClick={() => setActiveDmUser(username)}
                                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                                  isUnread 
                                    ? 'bg-neon-purple/10 border-neon-purple/30 shadow-[0_0_15px_rgba(176,38,255,0.1)] text-white' 
                                    : (isLightMode ? 'bg-black/5 border-black/5 hover:bg-black/10 text-black' : 'bg-white/5 border-white/5 hover:bg-white/10 text-white')
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0 relative">
                                    <img 
                                      src={latestMsg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
                                      alt={username}
                                      className="w-full h-full object-cover"
                                    />
                                    {isUnread && (
                                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-dark-bg animate-pulse" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between mb-0.5">
                                      <span className="text-xs font-black uppercase tracking-widest text-neon-blue truncate">
                                        {username.includes('@') ? username.split('@')[0] : username}
                                      </span>
                                      <span className={`text-[8px] font-bold uppercase ${isLightMode ? 'text-black/30' : 'text-white/20'}`}>
                                        {new Date(latestMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className={`text-[11px] truncate ${isUnread ? 'text-white font-bold' : (isLightMode ? 'text-black/60' : 'text-white/40')}`}>
                                      {latestMsg.user === loggedInUser ? 'You: ' : ''}
                                      {latestMsg.text || '🎵 Voice note or image'}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className={`p-6 border-t ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
              {isCheckingAuth ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-purple" />
                </div>
              ) : !loggedInUser ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center">
                    <p className={`text-sm font-bold uppercase tracking-widest mb-1 ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>
                      {authMode === 'login' ? 'DJ & Member Sign In' : 'Join the conversation'}
                    </p>
                    <p className={`text-[10px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                      {authMode === 'login' ? 'Enter your credentials to post' : 'Create an account to join the chat room'}
                    </p>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-3">
                    {authMode === 'register' && (
                      <input
                        type="text"
                        required
                        value={authUsername}
                        onChange={e => setAuthUsername(e.target.value)}
                        placeholder="Choose a Username"
                        minLength={2}
                        maxLength={20}
                        className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple/50 transition-all ${isLightMode ? 'bg-[#ffffff] border-black/10 text-black placeholder-black/40' : 'bg-black/50 border-white/10 text-white placeholder-white/20'}`}
                      />
                    )}
                    <input
                      type={authMode === 'login' ? 'text' : 'email'}
                      required
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      placeholder={authMode === 'login' ? 'Email or Username' : 'Email Address'}
                      className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple/50 transition-all ${isLightMode ? 'bg-[#ffffff] border-black/10 text-black placeholder-black/40' : 'bg-black/50 border-white/10 text-white placeholder-white/20'}`}
                    />
                    <div className="relative">
                      <input
                        type={showAuthPassword ? "text" : "password"}
                        required
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder="Password"
                        minLength={6}
                        className={`w-full border rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-neon-purple/50 transition-all ${isLightMode ? 'bg-[#ffffff] border-black/10 text-black placeholder-black/40' : 'bg-black/50 border-white/10 text-white placeholder-white/20'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none transition-colors ${isLightMode ? 'text-black/40 hover:text-black/80' : 'text-white/30 hover:text-white/80'}`}
                      >
                        {showAuthPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-gradient-to-r from-neon-purple to-neon-blue transition-all duration-500 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl text-[11px] flex items-center justify-center disabled:opacity-50 shadow-[0_5px_20px_rgba(182,36,255,0.3)] hover:shadow-[0_10px_25px_rgba(182,36,255,0.5)] border-b-4 border-purple-900 active:border-b-0 active:translate-y-1"
                    >
                      {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? 'Enter Radio' : 'Register Now')}
                    </button>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode(authMode === 'login' ? 'register' : 'login');
                          setAuthEmail('');
                          setAuthPassword('');
                          setAuthUsername('');
                          setShowAuthPassword(false);
                        }}
                        className={`w-full text-[10px] text-center font-black uppercase tracking-[0.2em] transition-colors ${isLightMode ? 'text-black/40 hover:text-black' : 'text-white/30 hover:text-white'}`}
                      >
                        {authMode === 'login' ? 'New here? Register' : 'Have an account? Login'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,audio/*" 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelection(file);
                    }} 
                  />

                  <div className="flex items-center justify-between px-2">
                    <button 
                      onClick={() => setShowProfile(true)}
                      className="flex items-center space-x-2 text-left cursor-pointer group"
                    >
                      <div className={`w-7 h-7 rounded-lg overflow-hidden border group-hover:border-neon-purple/50 transition-colors ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                        <img
                          src={userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${loggedInUser}`}
                          alt={loggedInUser}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${loggedInUser}`;
                          }}
                        />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest group-hover:text-neon-purple transition-colors ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
                        {loggedInUser.includes('@') ? loggedInUser.split('@')[0] : loggedInUser}
                      </span>
                    </button>
                    <button onClick={handleLogout} className={`text-[10px] font-black uppercase tracking-widest hover:text-red-400 transition-colors ${isLightMode ? 'text-black/40' : 'text-white/20'}`}>
                      Logout
                    </button>
                  </div>

                  {/* Pending Attachment Preview / Upload Loading indicator */}
                  {(isUploadingAttachment || pendingAttachment) && (
                    <div className={`p-3 rounded-2xl border flex items-center justify-between backdrop-blur-xl animate-in slide-in-from-bottom-2 ${isLightMode ? 'bg-[#ffffff]/90 border-black/10' : 'bg-[#0c0a0f]/90 border-white/10'}`}>
                      {isUploadingAttachment ? (
                        <div className="flex items-center space-x-3 w-full">
                          <Loader2 className="w-4 h-4 text-neon-purple animate-spin" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase text-neon-purple tracking-widest">Uploading attachment...</p>
                            <p className="text-[9px] uppercase font-bold text-white/30 truncate">Processing file safely</p>
                          </div>
                        </div>
                      ) : pendingAttachment ? (
                        <div className="flex items-center space-x-3 w-full min-w-0">
                          {pendingAttachment.type === 'image' ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40 flex items-center justify-center">
                              <img src={pendingAttachment.url} alt="Uploaded" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-white/10 shrink-0 bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                              <Music className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">{pendingAttachment.type === 'image' ? 'Image Attachment' : 'Audio Attachment'}</p>
                            <p className="text-xs font-bold text-white truncate">{pendingAttachment.filename}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingAttachment(null)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isLightMode ? 'bg-black/5 hover:bg-black/10 text-black/60' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}
                            title="Remove attachment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="relative" ref={emojiPickerRef}>
                    {isRecording ? (
                      <div className={`relative flex items-center justify-between border rounded-2xl px-4 py-4 text-sm transition-all ${isLightMode ? 'bg-[#ffffff]/80 border-black/10 text-black' : 'bg-black/50 border-white/10 text-white'}`}>
                        {/* Recording status with a pulsing red icon */}
                        <div className="flex items-center space-x-3">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                          <span className="font-bold uppercase tracking-wider text-[11px] text-red-500 animate-pulse">
                            Recording Voice Note
                          </span>
                          <span className="font-mono text-xs font-bold text-white/60">
                            {formatDuration(recordingDuration)}
                          </span>
                        </div>

                        {/* Controls: Discard and Save */}
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => stopRecording(true)}
                            className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="Discard Recording"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => stopRecording(false)}
                            className="p-2 rounded-xl bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 hover:text-neon-blue transition-all"
                            title="Stop and Save Recording"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={sendMessage} className="relative group">
                        {/* Attachment trigger button inside the input */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`absolute left-2 top-2 bottom-2 w-10 flex items-center justify-center rounded-xl transition-all ${isLightMode ? 'text-black/40 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                          title="Attach image or audio"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>

                        {/* Mic recording trigger button inside the input */}
                        <button
                          type="button"
                          onClick={startRecording}
                          className={`absolute left-12 top-2 bottom-2 w-10 flex items-center justify-center rounded-xl transition-all ${isLightMode ? 'text-black/40 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                          title="Record voice note"
                        >
                          <Mic className="w-5 h-5" />
                        </button>

                        <input
                          ref={inputRef}
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Say something to the station..."
                          className={`w-full ${isLightMode ? 'bg-[#ffffff]/80 border-black/10 text-black placeholder-black/40' : 'bg-black/50 border-white/10 placeholder-white/20'} border rounded-2xl pl-[88px] pr-24 py-4 text-sm focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/50 transition-all`}
                        />
                        
                        {/* Emoji trigger button inside the input */}
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`absolute right-12 top-2 bottom-2 w-10 flex items-center justify-center rounded-xl transition-all ${
                            showEmojiPicker ? 'text-neon-purple bg-neon-purple/10' : (isLightMode ? 'text-black/40 hover:text-black bg-transparent' : 'text-white/40 hover:text-white bg-transparent')
                          }`}
                          title="Add emoji"
                        >
                          <Smile className="w-5 h-5" />
                        </button>

                        <button
                          type="submit"
                          disabled={!inputText.trim() && !pendingAttachment}
                          className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center rounded-xl bg-neon-purple text-white disabled:opacity-30 hover:bg-neon-blue transition-all"
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      </form>
                    )}

                    {/* Emoji Picker Popover */}
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute bottom-full right-0 mb-3 w-[290px] border rounded-2xl shadow-2xl p-3 z-50 flex flex-col backdrop-blur-xl ${isLightMode ? 'bg-[#ffffff]/95 border-black/10' : 'bg-[#0c0a0f]/95 border-white/10'}`}
                          style={{ maxHeight: '320px' }}
                        >
                          {/* Search box inside the picker */}
                          <div className="relative mb-3 flex items-center">
                            <Search className={`absolute left-2.5 w-3.5 h-3.5 ${isLightMode ? 'text-black/30' : 'text-white/30'}`} />
                            <input
                              type="text"
                              value={emojiSearch}
                              onChange={(e) => setEmojiSearch(e.target.value)}
                              placeholder="Search emojis..."
                              className={`w-full border rounded-lg pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:border-neon-purple/50 transition-all ${isLightMode ? 'bg-black/5 border-black/5 text-black placeholder-black/30' : 'bg-black/40 border-white/5 text-white placeholder-white/20'}`}
                            />
                            {emojiSearch && (
                              <button
                                type="button"
                                onClick={() => setEmojiSearch('')}
                                className={`absolute right-2 text-xs ${isLightMode ? 'text-black/30 hover:text-black' : 'text-white/30 hover:text-white'}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Emojis list scroll area */}
                          <div className="flex-1 overflow-y-auto scrollbar-thin max-h-[220px] space-y-3 pr-1 text-left">
                            {filteredEmojis ? (
                              <div>
                                <h4 className={`text-[9px] uppercase tracking-widest font-black mb-2 px-1 ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>Search Results</h4>
                                {filteredEmojis.length === 0 ? (
                                  <div className={`text-center py-4 text-xs ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>No emojis found</div>
                                ) : (
                                  <div className="grid grid-cols-6 gap-1">
                                    {filteredEmojis.map((emoji) => (
                                      <button
                                        key={emoji.char + emoji.name}
                                        type="button"
                                        onClick={() => insertEmoji(emoji.char)}
                                        className={`w-9 h-9 text-lg flex items-center justify-center rounded-lg transition-colors ${isLightMode ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}
                                        title={emoji.name}
                                      >
                                        {emoji.char}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              EMOJI_CATEGORIES.map((category) => (
                                <div key={category.name}>
                                  <h4 className={`text-[9px] uppercase tracking-widest font-black mb-2 px-1 ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>{category.name}</h4>
                                  <div className="grid grid-cols-6 gap-1">
                                    {category.emojis.map((emoji) => (
                                      <button
                                        key={emoji.char + emoji.name}
                                        type="button"
                                        onClick={() => insertEmoji(emoji.char)}
                                        className={`w-9 h-9 text-lg flex items-center justify-center rounded-lg transition-colors ${isLightMode ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}
                                        title={emoji.name}
                                      >
                                        {emoji.char}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => setInputText('🔥 BIG CHUNE!')}
                      className={`text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all border ${isLightMode ? 'bg-black/5 border-black/5 hover:bg-black/10' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                      🔥
                    </button>
                    <button 
                      onClick={() => setInputText('BIG UP! 🙌')}
                      className={`text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all border ${isLightMode ? 'bg-black/5 border-black/5 hover:bg-black/10' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                      🙌
                    </button>
                    <button 
                      onClick={() => setInputText('[REQUEST] ')}
                      className={`text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all border ${isLightMode ? 'bg-black/5 border-black/5 hover:bg-black/10 text-black/80' : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'}`}
                    >
                      Request
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Slide-over User Profile Editor */}
            <AnimatePresence>
              {showProfile && loggedInUser && (
                <motion.div
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className={`absolute inset-0 z-50 flex flex-col p-6 ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0c0a0f]'}`}
                >
                  <div className={`flex items-center justify-between border-b pb-4 mb-6 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg uppercase tracking-widest leading-tight ${isLightMode ? 'text-black' : 'text-white'}`}>My Profile</h4>
                        <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Customize your identity</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowProfile(false)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isLightMode ? 'bg-black/5 hover:bg-black/10 text-black/60 hover:text-black' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin text-left">
                    {/* User Info Card */}
                    <div className={`rounded-2xl p-4 border flex items-center space-x-4 ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                      <div className={`w-16 h-16 rounded-2xl overflow-hidden border shrink-0 relative group ${isLightMode ? 'border-black/10 bg-white' : 'border-neon-purple/30 bg-black/40'}`}>
                        <img
                          src={userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${loggedInUser}`}
                          alt={loggedInUser}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${loggedInUser}`;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-widest font-black text-neon-blue truncate">
                          {loggedInUser.includes('@') ? loggedInUser.split('@')[0] : loggedInUser}
                        </p>
                        {loggedInUser.includes('@') && (
                          <p className={`text-[9px] lowercase truncate mt-0.5 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>{loggedInUser}</p>
                        )}
                        <p className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                          Member since {userJoinedAt ? new Date(userJoinedAt).toLocaleDateString([], { month: 'long', year: 'numeric' }) : 'recently'}
                        </p>
                      </div>
                    </div>

                    {/* Drag and Drop File Upload for Avatar */}
                    <div className="space-y-2">
                      <label className={`text-xs font-black uppercase tracking-widest ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>Upload Custom Avatar</label>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-neon-purple', 'bg-neon-purple/5');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-neon-purple', 'bg-neon-purple/5');
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-neon-purple', 'bg-neon-purple/5');
                          const files = e.dataTransfer.files;
                          if (files && files.length > 0) {
                            await handleAvatarFileUpload(files[0]);
                          }
                        }}
                        onClick={() => {
                          const fileInput = document.createElement('input');
                          fileInput.type = 'file';
                          fileInput.accept = 'image/*';
                          fileInput.onchange = async (ev) => {
                            const files = (ev.target as HTMLInputElement).files;
                            if (files && files.length > 0) {
                              await handleAvatarFileUpload(files[0]);
                            }
                          };
                          fileInput.click();
                        }}
                        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group ${isLightMode ? 'border-black/10 bg-black/[0.02] hover:bg-black/[0.05] hover:border-neon-purple/50' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-neon-purple/50'}`}
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="w-8 h-8 animate-spin text-neon-purple mb-2" />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all mb-2 ${isLightMode ? 'bg-black/5 text-black/40 group-hover:text-neon-purple group-hover:bg-neon-purple/10' : 'bg-white/5 text-white/40 group-hover:text-neon-purple group-hover:bg-neon-purple/10'}`}>
                            <Send className="w-5 h-5 rotate-90" />
                          </div>
                        )}
                        <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${isLightMode ? 'text-black/60 group-hover:text-black' : 'text-white/70 group-hover:text-white'}`}>
                          {isUploadingAvatar ? 'Uploading avatar...' : 'Drag & drop image or click'}
                        </p>
                        <p className={`text-[9px] uppercase tracking-widest font-black mt-1 ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>PNG, JPG, GIF up to 5MB</p>
                      </div>
                    </div>

                    {/* Preset Avatars Selection */}
                    <div className="space-y-3">
                      <label className={`text-xs font-black uppercase tracking-widest ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>Choose a Retro Preset</label>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=200&auto=format&fit=crop', label: 'Jungle' },
                          { url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=200&auto=format&fit=crop', label: 'Sound' },
                          { url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=200&auto=format&fit=crop', label: 'Vintage' },
                          { url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=200&auto=format&fit=crop', label: 'Cassette' },
                          { url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop', label: 'EQ' },
                          { url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=200&auto=format&fit=crop', label: 'Vinyl' },
                          { url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop', label: 'Wave' },
                          { url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop', label: 'Mic' }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSaveAvatarUrl(preset.url)}
                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative group ${
                              userAvatar === preset.url ? 'border-neon-purple shadow-[0_0_15px_rgba(176,38,255,0.4)]' : (isLightMode ? 'border-black/10 hover:border-black/30' : 'border-white/10 hover:border-white/30')
                            }`}
                          >
                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-[8px] font-black uppercase text-white tracking-widest">{preset.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Robo Seeds Selection */}
                    <div className="space-y-3">
                      <label className={`text-xs font-black uppercase tracking-widest ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>Generate Robot Seed</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type any word..."
                          value={avatarSeed}
                          onChange={(e) => setAvatarSeed(e.target.value)}
                          className={`flex-1 border rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-neon-purple/50 transition-all ${isLightMode ? 'bg-black/5 border-black/10 text-black placeholder-black/30' : 'bg-black/50 border-white/10 text-white placeholder-white/20'}`}
                        />
                        <button
                          onClick={() => {
                            if (avatarSeed.trim()) {
                              handleSaveAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}`);
                            }
                          }}
                          className="bg-neon-purple hover:bg-neon-blue text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`pt-4 border-t mt-6 space-y-2 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                    <button
                      onClick={() => setShowProfile(false)}
                      className={`w-full font-black uppercase tracking-[0.2em] py-3.5 rounded-xl text-[10px] flex items-center justify-center transition-all border ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'}`}
                    >
                      Back to Conversation
                    </button>
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        handleLogout();
                      }}
                      className="w-full bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-500 hover:text-white font-black uppercase tracking-[0.2em] py-3.5 rounded-xl text-[10px] flex items-center justify-center transition-all"
                    >
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
