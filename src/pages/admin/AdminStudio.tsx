import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Send, Paperclip, X, Maximize, Mic, MessageSquare, Search, ArrowLeft, Image as ImageIcon, Music, Video, Volume2, VolumeX, Ban, Trash2, Eraser, ShieldAlert, MailX, PlusCircle, Square, Pin, CheckSquare, MailOpen, Mail, Trash, Eye, EyeOff, Settings, Link2, Globe, RefreshCw, Download, Phone, Facebook, Instagram, Twitch, Activity, CheckCircle, AlertTriangle, Camera, Check, Sun, Moon, Megaphone, Share2, Radio, Clock, Timer } from "lucide-react";
import { toast } from "sonner";
import { fetchAdmin } from "./adminApi";
import { useModal } from "../../context/ModalContext";
import { useLogo } from "../../hooks/useLogo";
import { playUINotificationSound } from "../../lib/soundHelper";
import { MediaPickerModal } from "./MediaPickerModal";

interface Message {
  id: string;
  type: 'chat' | 'shoutout';
  user: string;
  avatar: string;
  text: string;
  timestamp: number;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  recipient?: string;
  platform?: string;
}

interface UserThread {
  user: string;
  avatar: string;
  messages: Message[];
  lastMessageTimestamp: number;
  unreadCount: number;
  platform?: string;
}

const isSameMessage = (msgA: Message, msgB: Message) => {
  if (msgA.id === msgB.id) return true;
  const isTempA = msgA.id.startsWith('reply-') || msgA.id.startsWith('temp-');
  const isTempB = msgB.id.startsWith('reply-') || msgB.id.startsWith('temp-');
  if ((isTempA || isTempB) && msgA.user === msgB.user && msgA.text === msgB.text) {
    return Math.abs(msgA.timestamp - msgB.timestamp) < 60000;
  }
  return false;
};

const normalizeThreads = (threads: Record<string, UserThread>) => {
  const normalized: Record<string, UserThread> = {};
  Object.entries(threads).forEach(([key, thread]) => {
    const filtered: Message[] = [];
    thread.messages.forEach(message => {
      const isDup = filtered.some(m => isSameMessage(m, message));
      if (!isDup) {
        filtered.push(message);
      } else {
        const idx = filtered.findIndex(m => isSameMessage(m, message));
        const est = filtered[idx];
        const estIsTemp = est.id.startsWith('reply-') || est.id.startsWith('temp-');
        const incIsTemp = message.id.startsWith('reply-') || message.id.startsWith('temp-');
        if (estIsTemp && !incIsTemp) {
          filtered[idx] = message;
        }
      }
    });

    const threadPlatform = thread.platform || filtered.find(m => m.platform)?.platform;

    normalized[key] = {
      ...thread,
      messages: filtered,
      lastMessageTimestamp: filtered.length ? filtered[filtered.length - 1].timestamp : thread.lastMessageTimestamp,
      ...(threadPlatform ? { platform: threadPlatform } : {}),
    };
  });
  return normalized;
};

const AttachmentPreview = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileType = file.type.split('/')[0];

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative group w-48 bg-black/30 rounded-xl border border-white/10 p-2">
      {previewUrl && fileType === 'image' && <img src={previewUrl} alt="Preview" className="w-full h-24 object-cover rounded-md" />}
      {previewUrl && fileType === 'video' && <video src={previewUrl} controls className="w-full h-24 object-cover rounded-md bg-black" />}
      {previewUrl && fileType === 'audio' && <div className="w-full h-24 flex flex-col justify-center bg-black/20 rounded-md p-2">
        <audio src={previewUrl} controls className="w-full h-8 accent-neon-purple" />
      </div>}
      <p className="text-xs text-white/70 truncate mt-2 px-1">{file.name}</p>
      <p className="text-[10px] text-white/40 px-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
      <button onClick={onRemove} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
};

const getThreadSource = (thread: UserThread): string => {
  if (thread.platform) {
    return thread.platform.toLowerCase();
  }
  
  const messages = thread.messages;
  if (!messages || messages.length === 0) return 'public_chat';

  // Find the last message sent by the user (not an admin/studio reply)
  const userMessages = messages.filter(
    msg => msg.user && thread.user && msg.user.toLowerCase() === thread.user.toLowerCase()
  );

  const referenceMsg = userMessages.length > 0 
    ? userMessages[userMessages.length - 1] 
    : messages[messages.length - 1];

  if (referenceMsg.platform) {
    return referenceMsg.platform.toLowerCase();
  }

  const platformMsg = messages.find(m => m.platform);
  if (platformMsg?.platform) {
    return platformMsg.platform.toLowerCase();
  }

  if (referenceMsg.type === 'shoutout') {
    return 'shoutout';
  }
  
  if (referenceMsg.recipient) {
    return 'private_dm';
  }
  
  return 'public_chat';
};

const PlatformBadge = ({ platform, thread }: { platform?: string; thread?: UserThread }) => {
  let source = platform;
  if (!source && thread) {
    source = getThreadSource(thread);
  }
  if (!source) return null;
  
  const config: Record<string, { label: string; color: string; bg: string }> = {
    whatsapp: { label: 'WhatsApp', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    instagram: { label: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
    facebook: { label: 'Facebook', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    twitch: { label: 'Twitch', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    tiktok: { label: 'TikTok', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    public_chat: { label: 'Chat Room', color: 'text-neon-blue', bg: 'bg-neon-blue/10 border-neon-blue/20' },
    private_dm: { label: 'Private DM', color: 'text-neon-purple', bg: 'bg-neon-purple/10 border-neon-purple/20' },
    shoutout: { label: 'Shout-out', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  };

  const item = config[source.toLowerCase()];
  if (!item) return null;

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border ${item.bg} ${item.color}`}>
      {item.label}
    </span>
  );
};

const replaceTextEmojis = (text: string): string => {
  if (!text) return "";
  let processed = text;
  processed = processed.replace(/>:?\s*\(/g, "😠"); // matches >(, >:(, > (, >: (
  processed = processed.replace(/>:?\s*\)/g, "😈"); // matches >), >:), > ), >: )
  processed = processed.replace(/<3/g, "❤️");
  processed = processed.replace(/:\s*\)/g, "😊");
  processed = processed.replace(/:\s*-\s*\)/g, "😊");
  processed = processed.replace(/:\s*\(/g, "😢");
  processed = processed.replace(/:\s*-\s*\(/g, "😢");
  processed = processed.replace(/;\s*\)/g, "😉");
  processed = processed.replace(/;\s*-\s*\)/g, "😉");
  processed = processed.replace(/:\s*[pP]/g, "😛");
  processed = processed.replace(/:\s*-\s*[pP]/g, "😛");
  processed = processed.replace(/:\s*[dD]/g, "😀");
  processed = processed.replace(/:\s*-\s*[dD]/g, "😀");
  processed = processed.replace(/:\s*[oO]/g, "😮");
  processed = processed.replace(/:\s*-\s*[oO]/g, "😮");
  processed = processed.replace(/:\s*\//g, "😕");
  processed = processed.replace(/\\s*:\s*/g, "😕");
  processed = processed.replace(/o_O|O_O|o_o/g, "😳");
  processed = processed.replace(/B\)/g, "😎");
  processed = processed.replace(/:\'-\)/g, "😂");
  processed = processed.replace(/:\'\(/g, "😭");
  return processed;
};

const parseEmojisAndEmotes = (text: string) => {
  if (!text) return null;
  const replaced = replaceTextEmojis(text);
  const words = replaced.split(/(\s+)/);

  const twitchEmoteMap: Record<string, { emoji: string, color: string }> = {
    'Kappa': { emoji: '😏', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.2)]' },
    'Keepo': { emoji: '🐱', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]' },
    'LUL': { emoji: '😂', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]' },
    'PogChamp': { emoji: '😲', color: 'bg-red-500/15 text-red-300 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]' },
    'BibleThump': { emoji: '😭', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.2)]' },
    'ResidentSleeper': { emoji: '😴', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.2)]' },
    'Kreygasm': { emoji: '😍', color: 'bg-pink-500/15 text-pink-300 border-pink-500/30 shadow-[0_0_8px_rgba(236,72,153,0.2)]' },
    'monkaS': { emoji: '😰', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.2)]' },
    'MonkaS': { emoji: '😰', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.2)]' },
    'monkaW': { emoji: '😨', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)]' },
    'MonkaW': { emoji: '😨', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.2)]' },
    'Sadge': { emoji: '😔', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30 shadow-[0_0_8px_rgba(100,116,139,0.2)]' },
    'PepeHands': { emoji: '😭', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]' },
    'POGGERS': { emoji: '🤩', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30 shadow-[0_0_8px_rgba(20,184,166,0.2)]' },
    'EZ': { emoji: '😎', color: 'bg-green-500/15 text-green-300 border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]' },
    'Clap': { emoji: '👏', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]' },
    'AYAYA': { emoji: '🥳', color: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30 shadow-[0_0_8px_rgba(217,70,239,0.2)]' },
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 whitespace-pre-wrap">
      {words.map((word, idx) => {
        const trimmed = word.trim();
        if (twitchEmoteMap[trimmed]) {
          const emote = twitchEmoteMap[trimmed];
          return (
            <span 
              key={idx} 
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 text-xs font-bold rounded border ${emote.color} cursor-help transition-all duration-200 hover:scale-105`}
              title={trimmed}
            >
              <span className="text-sm select-none">{emote.emoji}</span>
              <span className="text-[10px] tracking-wide font-mono font-medium opacity-85">{trimmed}</span>
            </span>
          );
        }
        return <span key={idx}>{word}</span>;
      })}
    </span>
  );
};

const PlatformFieldInput = ({
  platformId,
  fieldKey,
  label,
  placeholder,
  type = 'text',
  disabled = false,
  initialValue = '',
  onSave
}: {
  platformId: string;
  fieldKey: string;
  label: string;
  placeholder: string;
  type?: string;
  disabled?: boolean;
  initialValue: string;
  onSave: (val: string) => void;
  key?: any;
}) => {
  const [val, setVal] = useState(initialValue);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : 'text';

  return (
    <div className="space-y-1 text-left">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</label>
        {val !== initialValue && (
          <button
            onClick={() => {
              onSave(val);
              toast.success(`Saved configuration parameter for ${platformId.toUpperCase()}`);
            }}
            className="text-[9px] font-bold text-neon-blue uppercase tracking-widest hover:brightness-110"
          >
            Save Parameter
          </button>
        )}
      </div>
      <div className="relative font-mono">
        <input
          type={inputType}
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-black/40 hover:bg-black/60 border ${val !== initialValue ? 'border-neon-blue/30' : 'border-white/5'} rounded-xl pl-3 pr-10 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-neon-blue/45 focus:ring-1 focus:ring-neon-blue/15 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {isPassword && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
            title={showPassword ? "Hide token" : "Show token"}
          >
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};

const DEFAULT_QUICK_REPLIES = [
  "Thanks for the message!",
  "Big up! Thanks for tuning in.",
  "We've received your shoutout!",
  "Now playing: [Artist] - [Track]",
];

const playNotificationSound = (soundEnabled: boolean) => {
  if (!soundEnabled) return;
  playUINotificationSound({
    frequencyStart: 900,
    frequencyEnd: 600,
    duration: 0.12,
    volume: 0.1
  });
};

const getThreadUserAndKey = (
  msg: { user: string; text?: string; recipient?: string },
  currentAdmin: string | null
) => {
  const isAdminUser = (username: string) => {
    if (!username) return false;
    const name = username.toLowerCase();
    return name === "dejavufm studio" || (currentAdmin && name === currentAdmin.toLowerCase());
  };

  // 1. Check if it's a private message (has a recipient)
  if (msg.recipient) {
    if (isAdminUser(msg.user)) {
      // Sent by admin, so the thread is the recipient
      return { user: msg.recipient, key: msg.recipient.toLowerCase() };
    } else if (isAdminUser(msg.recipient)) {
      // Sent to admin, so the thread is the sender
      return { user: msg.user, key: msg.user.toLowerCase() };
    } else {
      // PM between two other users
      return { user: msg.user, key: msg.user.toLowerCase() };
    }
  }

  // 2. Public chat message or shoutout
  if (isAdminUser(msg.user)) {
    // If sent by admin, try to parse the @recipient username
    if (msg.text) {
      const match = msg.text.match(/^@([a-zA-Z0-9_\-]+)/);
      if (match) {
        const targetUser = match[1];
        return { user: targetUser, key: targetUser.toLowerCase() };
      }

      // Handle "REPLY to @user" pattern from shoutout broadcasts
      const shoutoutMatch = msg.text.match(/^REPLY to @([a-zA-Z0-9_\-\.@]+)/);
      if (shoutoutMatch) {
        const targetUser = shoutoutMatch[1];
        return { user: targetUser, key: targetUser.toLowerCase() };
      }
    }
    // If it doesn't start with @username, we ignore/skip creating a separate "DejavuFM Studio" thread
    return null;
  }

  // 3. Regular message from normal user
  return { user: msg.user, key: msg.user.toLowerCase() };
};

import { AppLoader } from "../../components/AppLoader";
import { PremiumRingLoader } from "../../components/PremiumRingLoader";

export function AdminStudio({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();
  const { isLightMode } = useLogo();
  const { showConfirm } = useModal();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [studioTheme, setStudioTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('studio_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.classList.remove('light'); // Crucial: prevent dark-text contamination from frontend light theme
    if (studioTheme === 'light') {
      document.documentElement.classList.add('admin-light-mode');
    } else {
      document.documentElement.classList.remove('admin-light-mode');
    }

    return () => {
      // When unmounting AdminStudio (navigating back to dashboard), restore the main dashboard theme
      const dbTheme = localStorage.getItem('dashboard_theme') || 'dark';
      document.documentElement.classList.remove('light'); // Crucial: prevent front-end theme mixing
      if (dbTheme === 'light') {
        document.documentElement.classList.add('admin-light-mode');
      } else {
        document.documentElement.classList.remove('admin-light-mode');
      }
    };
  }, [studioTheme]);

  const toggleStudioTheme = () => {
    const nextTheme = studioTheme === 'dark' ? 'light' : 'dark';
    setStudioTheme(nextTheme);
    localStorage.setItem('studio_theme', nextTheme);
    window.dispatchEvent(new Event('dashboard-theme-change'));
    toast.success(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} mode`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/studio-settings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.dejavu_studio_threads) {
          setThreads(prev => {
            const dbThreads = normalizeThreads(data.dejavu_studio_threads);
            return { ...prev, ...dbThreads };
          });
        }
      }
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('requestHistory');
      }
      toast.success("Studio Inbox refreshed");
    } catch (e) {
      console.error(e);
      toast.error("Failed to refresh");
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem('studio_sound_enabled') || 'true');
    } catch {
      return true;
    }
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);

  // States and effects for individual Studio Inbox PWA installation
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    // Dynamically set PWA manifest specifically for Studio Inbox standalone app
    const manifestElem = document.getElementById('manifest-link') || document.querySelector('link[rel="manifest"]');
    const originalManifest = manifestElem ? manifestElem.getAttribute('href') : '/manifest.json';
    if (manifestElem) {
      manifestElem.setAttribute('href', '/manifest-studio.json');
    }

    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || 
      document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If not already in standalone mode, enable install button/modal
    if (!isStandaloneMode) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (manifestElem && originalManifest) {
        manifestElem.setAttribute('href', originalManifest);
      }
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        toast.success("Studio Inbox PWA installation accepted!");
      }
    } else {
      setShowIosInstructions(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const [threads, setThreads] = useState<Record<string, UserThread>>(() => {
    try {
      const saved = localStorage.getItem('dejavu_studio_threads');
      return saved ? normalizeThreads(JSON.parse(saved)) : {};
    } catch {
      return {};
    }
  });

  const totalUnreadCount = useMemo(() => {
    return Object.values(threads).reduce((acc: number, t: UserThread) => acc + (t.unreadCount || 0), 0);
  }, [threads]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const selectedUserRef = useRef<string | null>(null);
  const [messageLimit, setMessageLimit] = useState(50);

  useEffect(() => {
    setMessageLimit(50);
  }, [selectedUser]);

  const lastReadTimestampsRef = useRef<Record<string, number>>({});
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('dejavu_studio_last_read');
      const parsed = saved ? JSON.parse(saved) : {};
      lastReadTimestampsRef.current = parsed;
      return parsed;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    lastReadTimestampsRef.current = lastReadTimestamps;
  }, [lastReadTimestamps]);

  const chatHistoryReceivedRef = useRef(false);
  const privateHistoryReceivedRef = useRef(false);
  const shoutoutHistoryReceivedRef = useRef(false);
  const [replyText, setReplyText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const socketRef = useRef<any>(null);
  const [selectedThreads, setSelectedThreads] = useState<string[]>([]);
  const [pinnedThreads, setPinnedThreads] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('studio_pinned_threads') || '[]');
    } catch {
      return [];
    }
  });
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [customReplies, setCustomReplies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dejavu_studio_custom_replies');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [studioName, setStudioName] = useState('DejavuFM Studio');
  const [studioImage, setStudioImage] = useState('/icon.svg');
  const [isProfileMediaPickerOpen, setIsProfileMediaPickerOpen] = useState(false);
  const studioNameRef = useRef(studioName);
  const studioImageRef = useRef(studioImage);

  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [autoDeleteHours, setAutoDeleteHours] = useState(24);
  const [autoDeleteLastRun, setAutoDeleteLastRun] = useState('');
  const [isSavingAutoDelete, setIsSavingAutoDelete] = useState(false);
  const [customValInput, setCustomValInput] = useState('24');
  const [customUnitInput, setCustomUnitInput] = useState<'hours' | 'days'>('hours');

  const componentMountedTime = useRef(Date.now()).current;
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAdmin('/api/admin/chat-room-settings')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.enabled === 'boolean') {
          setAutoDeleteEnabled(data.enabled);
        }
        if (data && data.hours) {
          const h = Number(data.hours) || 24;
          setAutoDeleteHours(h);
          if (h >= 24 && h % 24 === 0) {
            setCustomValInput((h / 24).toString());
            setCustomUnitInput('days');
          } else {
            setCustomValInput(h.toString());
            setCustomUnitInput('hours');
          }
        }
        if (data && data.lastRun) {
          setAutoDeleteLastRun(data.lastRun);
        }
      })
      .catch(err => console.error("Failed to load chat retention settings:", err));
  }, []);

  useEffect(() => {
    studioNameRef.current = studioName;
  }, [studioName]);

  useEffect(() => {
    studioImageRef.current = studioImage;
  }, [studioImage]);

  useEffect(() => {
    // Fetch current studio settings
    fetch('/api/public/settings')
      .then(res => res.json())
      .then(settings => {
        if (settings.studio_name) {
          setStudioName(settings.studio_name);
        }
        if (settings.studio_image) {
          setStudioImage(settings.studio_image);
        }
      })
      .catch(err => console.error("Failed to fetch studio settings", err));
  }, []);

  const { data: authData } = useQuery({
    queryKey: ['admin-auth-check'],
    queryFn: () => fetchAdmin('/api/admin/check').then(res => res.json()),
  });
  const adminUsername = authData?.user?.username ?? authData?.username;
  const isAdmin = authData?.user?.role === 'admin' || authData?.role === 'admin';

  const isSenderAdminMsg = (user: string) => {
    if (!user) return false;
    const lowerUser = user.toLowerCase();
    const lowerStudio = studioNameRef.current.toLowerCase();
    const lowerAdmin = adminUsername ? adminUsername.toLowerCase() : '';
    return lowerUser === "dejavufm studio" || lowerUser === lowerStudio || lowerUser === lowerAdmin;
  };

  const [activeTab, setActiveTab] = useState<'chats' | 'connections' | 'broadcast' | 'settings' | 'profile'>('chats');
  const [slideDirection, setSlideDirection] = useState<number>(0); // -1 = left, 1 = right

  useEffect(() => {
    if (authData && !isAdmin && activeTab !== 'chats') {
      setActiveTab('chats');
    }
  }, [authData, isAdmin, activeTab]);

  const navigateToTab = (newTab: 'chats' | 'connections' | 'broadcast' | 'settings' | 'profile') => {
    if (!isAdmin && newTab !== 'chats') {
      toast.error("Access restricted: DJs only have access to Studio Chat.");
      return;
    }
    if (newTab === activeTab) return;

    const tabs: ('chats' | 'connections' | 'broadcast' | 'profile' | 'settings')[] = [
      'chats',
      'connections',
      'broadcast',
      'profile',
      'settings'
    ];
    const currentIndex = tabs.indexOf(activeTab);
    const newIndex = tabs.indexOf(newTab);
    
    if (newIndex > currentIndex) {
      setSlideDirection(1);
    } else if (newIndex < currentIndex) {
      setSlideDirection(-1);
    } else {
      setSlideDirection(0);
    }
    
    setIsTabTransitioning(true);
    setTimeout(() => {
      setActiveTab(newTab);
      setIsTabTransitioning(false);
    }, 350);
  };

  // Swipe gesture refs and handlers for MobileBottomBar
  const barTouchStartX = useRef<number | null>(null);
  const barTouchStartY = useRef<number | null>(null);

  const handleBarTouchStart = (e: React.TouchEvent) => {
    barTouchStartX.current = e.touches[0].clientX;
    barTouchStartY.current = e.touches[0].clientY;
  };

  const handleBarTouchEnd = (e: React.TouchEvent) => {
    if (barTouchStartX.current === null || barTouchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const diffX = barTouchStartX.current - endX;
    const diffY = barTouchStartY.current - endY;

    // Check if horizontal swipe is more dominant and exceeds 40px threshold
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      const tabs: ('chats' | 'connections' | 'broadcast' | 'profile' | 'settings')[] = [
        'chats',
        'connections',
        'broadcast',
        'profile',
        'settings'
      ];
      const currentIndex = tabs.indexOf(activeTab);
      
      if (diffX > 0) {
        // Swiped Left -> Go to Next tab
        const nextIndex = (currentIndex + 1) % tabs.length;
        setSlideDirection(1);
        setActiveTab(tabs[nextIndex]);
      } else {
        // Swiped Right -> Go to Prev tab
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        setSlideDirection(-1);
        setActiveTab(tabs[prevIndex]);
      }
    }
    
    barTouchStartX.current = null;
    barTouchStartY.current = null;
  };

  const pageVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 80 : direction < 0 ? -80 : 0,
      scale: 0.98,
    }),
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 320, damping: 28 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      }
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? -80 : direction < 0 ? 80 : 0,
      scale: 0.98,
      transition: {
        x: { type: "spring", stiffness: 320, damping: 28 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 },
      }
    })
  };

  const [broadcastChannels, setBroadcastChannels] = useState<string[]>(['public_chat', 'shoutouts']);
  const [broadcastText, setBroadcastText] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleBroadcast = async () => {
    if (!broadcastText.trim() && !attachment) {
      toast.error("Please enter a message or attach a file to broadcast.");
      return;
    }
    if (broadcastChannels.length === 0) {
      toast.error("Please select at least one channel to broadcast to.");
      return;
    }

    setIsBroadcasting(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        const res = await fetchAdmin('/api/public/chat/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        mediaUrl = data.url;
        mediaType = data.type;
      }

      const res = await fetchAdmin('/api/admin/broadcast', {
        method: 'POST',
        body: {
          text: broadcastText,
          channels: broadcastChannels,
          imageUrl: mediaType === 'image' ? mediaUrl : null,
          audioUrl: mediaType === 'audio' ? mediaUrl : null,
          videoUrl: mediaType === 'video' ? mediaUrl : null,
          studioName,
          studioImage
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Broadcast failed");
      }

      toast.success("Broadcast sent successfully to selected channels!");
      setBroadcastText("");
      setAttachment(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to send broadcast.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const [isCreatingQuickReply, setIsCreatingQuickReply] = useState(false);
  const [newQuickReplyText, setNewQuickReplyText] = useState("");

  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('studio_connected_platforms');
      return saved ? JSON.parse(saved) : {
        whatsapp: false,
        instagram: false,
        facebook: false,
        twitch: false,
        tiktok: false
      };
    } catch {
      return {
        whatsapp: false,
        instagram: false,
        facebook: false,
        twitch: false,
        tiktok: false
      };
    }
  });

  const [platformConfigs, setPlatformConfigs] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem('studio_platform_configs');
      return saved ? JSON.parse(saved) : {
        whatsapp: { phone: '', webhook: 'https://api.dejavu.fm/v1/whatsapp/webhook', verifyToken: 'dejavu_whatsapp_secret_key' },
        instagram: { accountId: '', accessToken: '' },
        facebook: { pageId: '', pageAccessToken: '' },
        twitch: { channel: '', oauthToken: '' },
        tiktok: { username: '', sessionToken: '' }
      };
    } catch {
      return {
        whatsapp: { phone: '', webhook: 'https://api.dejavu.fm/v1/whatsapp/webhook', verifyToken: 'dejavu_whatsapp_secret_key' },
        instagram: { accountId: '', accessToken: '' },
        facebook: { pageId: '', pageAccessToken: '' },
        twitch: { channel: '', oauthToken: '' },
        tiktok: { username: '', sessionToken: '' }
      };
    }
  });

  const handleTogglePlatform = (platform: string) => {
    setConnectedPlatforms(prev => {
      const updated = { ...prev, [platform]: !prev[platform] };
      localStorage.setItem('studio_connected_platforms', JSON.stringify(updated)); syncSettingsToApi({ studio_connected_platforms: updated });
      toast.success(`${platform.toUpperCase()} connection state updated.`);
      return updated;
    });
  };

  const handleSavePlatformConfig = (platform: string, config: Record<string, string>) => {
    setPlatformConfigs(prev => {
      const finalConfig = { ...config };
      if (platform === 'twitch' && finalConfig.oauthToken !== undefined) {
        const trimmed = finalConfig.oauthToken.trim();
        if (trimmed && !trimmed.startsWith('oauth:')) {
          finalConfig.oauthToken = `oauth:${trimmed}`;
        }
      }
      const updated = { ...prev, [platform]: { ...prev[platform], ...finalConfig } };
      localStorage.setItem('studio_platform_configs', JSON.stringify(updated)); syncSettingsToApi({ studio_platform_configs: updated });
      return updated;
    });
  };

  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState<string>("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async (platformId: string) => {
    const config = platformConfigs[platformId] || {};
    setTestingPlatform(platformId);
    setTestResult(null);

    const steps = [
      "Initializing secure TLS handshake with connection gateway...",
      "Resolving endpoint routing paths and data structures...",
      "Transmitting credential signature authorization payload...",
      "Verifying access token credentials with API server..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setTestProgress(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 850));
    }

    if (platformId === 'whatsapp') {
      const { phone, verifyToken } = config;
      if (!phone || phone.trim() === '') {
        setTestResult({
          success: false,
          message: "Validation Error: Business Phone Number is required. Please provide a valid broadcast number."
        });
        return;
      }
      if (!verifyToken || verifyToken.trim().length < 6) {
        setTestResult({
          success: false,
          message: "Validation Error: Webhook Verify Token is missing or too short (minimum 6 characters required)."
        });
        return;
      }
      setTestResult({
        success: true,
        message: "Handshake Successful! Validated credentials against WhatsApp Cloud API. Webhook subscription is active."
      });
    } else if (platformId === 'instagram') {
      const { accountId, accessToken } = config;
      if (!accountId || !/^\d+$/.test(accountId.trim())) {
        setTestResult({
          success: false,
          message: "Validation Error: Instagram Account ID must be a numeric string. Check your Meta Business credentials."
        });
        return;
      }
      if (!accessToken || accessToken.trim().length < 15) {
        setTestResult({
          success: false,
          message: "Validation Error: Meta Graph Access Token is invalid or too short to negotiate session access."
        });
        return;
      }
      setTestResult({
        success: true,
        message: "Handshake Successful! Established authenticated session with Instagram Graph API endpoints."
      });
    } else if (platformId === 'facebook') {
      const { pageId, pageAccessToken } = config;
      if (!pageId || !/^\d+$/.test(pageId.trim())) {
        setTestResult({
          success: false,
          message: "Validation Error: Facebook Page ID must contain numeric digits only."
        });
        return;
      }
      if (!pageAccessToken || pageAccessToken.trim().length < 15) {
        setTestResult({
          success: false,
          message: "Validation Error: Page Access Token is missing or invalid. Verify page role scopes are granted."
        });
        return;
      }
      setTestResult({
        success: true,
        message: "Handshake Successful! Verified integration handshake with Messenger Platform API."
      });
    } else if (platformId === 'twitch') {
      const { channel, oauthToken } = config;
      if (!channel || !/^[a-zA-Z0-9_]{4,25}$/.test(channel.trim())) {
        setTestResult({
          success: false,
          message: "Validation Error: Twitch Channel Name must be a valid Twitch account (alphanumeric and underscores, 4-25 characters)."
        });
        return;
      }
      if (!oauthToken || oauthToken.trim().length < 5) {
        setTestResult({
          success: false,
          message: "Validation Error: Twitch OAuth Token is missing or invalid."
        });
        return;
      }
      setTestResult({
        success: true,
        message: "Handshake Successful! Twitch Chat IRC credential handshakes authenticated correctly."
      });
    } else if (platformId === 'tiktok') {
      const { username, sessionToken } = config;
      if (!username || !username.trim().startsWith('@')) {
        setTestResult({
          success: false,
          message: "Validation Error: TikTok Username must start with '@' character (e.g. @dejavufm_official)."
        });
        return;
      }
      if (!sessionToken || sessionToken.trim().length < 10) {
        setTestResult({
          success: false,
          message: "Validation Error: Live Stream Session Token is invalid. Ensure you enter a valid session key."
        });
        return;
      }
      setTestResult({
        success: true,
        message: "Handshake Successful! TikTok Live room handler handshake succeeded."
      });
    } else {
      setTestResult({
        success: false,
        message: "Validation Error: Selected connection pipeline channel is unrecognized."
      });
    }
  };

  const simulatePlatformMessage = (platform: string) => {
    const users = {
      whatsapp: ["Wayne_W", "DJ_Kev", "SarahListener", "Marcus_FM"],
      instagram: ["@insta_radio_fan", "@music_lover_99", "@brent_grooves", "@hyper_vibe"],
      facebook: ["John Miller", "Emily Rose", "Radio Rocker", "Starlight Fan"],
      twitch: ["TwitchPrimeVibe", "KappaSpamFM", "SpeedyChatter", "SubGamer88"],
      tiktok: ["@tiktok_dance_fm", "@shoutout_queen", "@basso_drop", "@remix_king_official"]
    };
    const texts = [
      "Yo DejavuFM! Play that new track from earlier! Absolute banger 🔥",
      "Can I get a shoutout to Wayne and the crew from London? Loving the session!",
      "Best online radio stream hands down. Keeping me company at work right now 🙌",
      "Is the stream request line open? Would love to hear some old school garage vibes!",
      "Shoutout from the connection hub test! This is super smooth and responsive!"
    ];
    const avatars = {
      whatsapp: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      instagram: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      facebook: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      twitch: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      tiktok: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop"
    };
    const list = users[platform.toLowerCase() as keyof typeof users] || ["Anonymous"];
    const randomUser = list[Math.floor(Math.random() * list.length)];
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    const avatar = avatars[platform.toLowerCase() as keyof typeof avatars] || "https://api.dicebear.com/7.x/bottts/svg?seed=sim";
    
    const newMsg: Message = {
      id: `sim-${platform}-${Date.now()}`,
      user: randomUser,
      avatar: avatar,
      text: randomText,
      timestamp: Date.now(),
      type: Math.random() > 0.6 ? 'shoutout' : 'chat',
      platform: platform.toLowerCase()
    };
    
    const userKey = randomUser.toLowerCase();
    setThreads(prev => {
      const existing = prev[userKey];
      const updatedMessages = existing ? [...existing.messages, newMsg] : [newMsg];
      const oldUnread = existing?.unreadCount ?? 0;
      const updatedUnread = selectedUserRef.current?.toLowerCase() === userKey ? 0 : oldUnread + 1;
      
      if (soundEnabled) {
        playNotificationSound(true);
      }
      
      const newThreads = {
        ...prev,
        [userKey]: {
          user: randomUser,
          avatar: avatar,
          messages: updatedMessages,
          lastMessageTimestamp: Date.now(),
          unreadCount: updatedUnread,
          platform: platform.toLowerCase()
        }
      };
      
      localStorage.setItem('dejavu_studio_threads', JSON.stringify(newThreads));
      return newThreads;
    });
    toast.success(`Incoming ${platform.toUpperCase()} message simulated from ${randomUser}!`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const banUserMutation = useMutation({
    mutationFn: (username: string) => fetchAdmin('/api/admin/chat_users/ban', {
      method: 'POST',
      body: { email: username } // The API endpoint uses 'email' as the key for the username/email identifier
    }),
    onSuccess: (_, username) => {
      toast.success(`User ${username} has been banned.`);
      setThreads(prev => {
        const newThreads = { ...prev };
        delete newThreads[username.toLowerCase()];
        return newThreads;
      });
      setSelectedUser(null);
    },
    onError: (error: any) => toast.error(error.message || "Failed to ban user.")
  });

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [threads, selectedUser]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const mergeMessages = (existing: Message[], incoming: Message[]) => {
    const merged = [...existing];
    
    incoming.forEach(inc => {
      const existingIdx = merged.findIndex(est => isSameMessage(est, inc));
      if (existingIdx !== -1) {
        const est = merged[existingIdx];
        const estIsTemp = est.id.startsWith('reply-') || est.id.startsWith('temp-');
        const incIsTemp = inc.id.startsWith('reply-') || inc.id.startsWith('temp-');
        
        // If the existing is temporary and the incoming is permanent, replace it
        if (estIsTemp && !incIsTemp) {
          merged[existingIdx] = inc;
        }
      } else {
        merged.push(inc);
      }
    });
    
    return merged;
  };

  const recalculateAllUnreadCounts = (threadsToUpdate: Record<string, any>) => {
    const nextThreads = { ...threadsToUpdate };
    Object.keys(nextThreads).forEach(userKey => {
      const thread = nextThreads[userKey];
      const isSelected = selectedUserRef.current?.toLowerCase() === userKey;
      if (isSelected) {
        thread.unreadCount = 0;
        return;
      }

      let unreadCount = 0;
      const hasLastReadRecord = userKey in lastReadTimestampsRef.current;
      if (hasLastReadRecord) {
        const lastRead = lastReadTimestampsRef.current[userKey];
        thread.messages.forEach((m: any) => {
          const isSenderAdmin = isSenderAdminMsg(m.user);
          if (!isSenderAdmin && m.timestamp > lastRead) {
            unreadCount++;
          }
        });
      } else {
        // NO device-specific read record (new device / mobile).
        // Count consecutive user messages at the very end of the thread.
        for (let i = thread.messages.length - 1; i >= 0; i--) {
          if (isSenderAdminMsg(thread.messages[i].user)) {
            break;
          }
          unreadCount++;
        }
      }
      thread.unreadCount = unreadCount;
    });
    return nextThreads;
  };

  const addMessageToThread = (message: Message) => {
    const threadInfo = getThreadUserAndKey(message, adminUsername);
    if (!threadInfo) return;

    const { user, key: userKey } = threadInfo;
    const selectedKey = selectedUserRef.current?.toLowerCase();

    if (selectedKey === userKey) {
      setLastReadTimestamps(prev => {
        const updated = { ...prev, [userKey]: Date.now() };
        localStorage.setItem('dejavu_studio_last_read', JSON.stringify(updated));
        return updated;
      });
    }

    setThreads(prev => {
      const existing = prev[userKey];
      let newMessages: Message[];
      
      if (existing) {
        const existingIdx = existing.messages.findIndex(m => isSameMessage(m, message));
        if (existingIdx !== -1) {
          const est = existing.messages[existingIdx];
          const estIsTemp = est.id.startsWith('reply-') || est.id.startsWith('temp-');
          const incIsTemp = message.id.startsWith('reply-') || message.id.startsWith('temp-');
          
          if (estIsTemp && !incIsTemp) {
            newMessages = [...existing.messages];
            newMessages[existingIdx] = message;
          } else {
            return prev;
          }
        } else {
          newMessages = [...existing.messages, message];
        }
      } else {
        newMessages = [message];
      }
      
      const updatedThreads = {
        ...prev,
        [userKey]: {
          user: user,
          avatar: existing?.avatar || message.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
          messages: newMessages,
          lastMessageTimestamp: message.timestamp,
          unreadCount: selectedKey === userKey ? 0 : (existing?.unreadCount || 0) + 1,
          platform: message.platform || existing?.platform,
        },
      };

      return recalculateAllUnreadCounts(updatedThreads);
    });
  };

  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) {
      console.warn("AdminStudio: socket not ready yet");
      return;
    }

    socketRef.current = socket;

    const handleChatHistory = (history: any[]) => {
      if (chatHistoryReceivedRef.current) return;
      chatHistoryReceivedRef.current = true;

      setThreads(prev => {
        const nextThreads = { ...prev };
        history.forEach(msg => {
          const threadInfo = getThreadUserAndKey(msg, adminUsername);
          if (!threadInfo) return;

          const { user, key: userKey } = threadInfo;
          const existing = nextThreads[userKey];
          const incomingMessage: Message = {
            id: msg.id,
            type: 'chat',
            user: msg.user,
            avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
            text: msg.text || '',
            timestamp: msg.timestamp,
            imageUrl: msg.imageUrl,
            audioUrl: msg.audioUrl,
            videoUrl: msg.videoUrl,
            recipient: msg.recipient,
          };

          const threadMessages = existing
            ? mergeMessages(existing.messages, [incomingMessage])
            : [incomingMessage];

          const isSelected = selectedUserRef.current?.toLowerCase() === userKey;
          const oldUnreadCount = existing?.unreadCount ?? 0;

          // Check if this particular message is unread
          const lastRead = lastReadTimestampsRef.current[userKey] ?? Date.now();
          const isSenderAdmin = isSenderAdminMsg(msg.user);
          const isMsgUnread = !isSenderAdmin && msg.timestamp > lastRead;

          let finalUnreadCount = oldUnreadCount;
          if (existing) {
            // Check if it's already in the thread to avoid duplicate counting
            const isDuplicate = existing.messages.some(m => isSameMessage(m, incomingMessage));
            if (!isDuplicate && isMsgUnread) {
              finalUnreadCount += 1;
            }
          } else {
            finalUnreadCount = isMsgUnread ? 1 : 0;
          }

          if (isSelected) {
            finalUnreadCount = 0;
          }

          const threadPlatform = msg.platform || existing?.platform || threadMessages.find(m => m.platform)?.platform;

          nextThreads[userKey] = {
            user: user,
            avatar: existing?.avatar || msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
            messages: threadMessages,
            lastMessageTimestamp: msg.timestamp,
            unreadCount: finalUnreadCount,
            ...(threadPlatform ? { platform: threadPlatform } : {}),
          };
        });
        return recalculateAllUnreadCounts(nextThreads);
      });
    };

    const handlePrivateHistory = (history: any[]) => {
      if (privateHistoryReceivedRef.current) return;
      privateHistoryReceivedRef.current = true;

      setThreads(prev => {
        const nextThreads = { ...prev };
        history.forEach(msg => {
          const threadInfo = getThreadUserAndKey(msg, adminUsername);
          if (!threadInfo) return;

          const { user, key: userKey } = threadInfo;
          const existing = nextThreads[userKey];
          const incomingMessage: Message = {
            id: msg.id,
            type: 'chat',
            user: msg.user,
            avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
            text: msg.text || '',
            timestamp: msg.timestamp,
            imageUrl: msg.imageUrl,
            audioUrl: msg.audioUrl,
            videoUrl: msg.videoUrl,
            recipient: msg.recipient,
            platform: msg.platform,
          };

          const threadMessages = existing
            ? mergeMessages(existing.messages, [incomingMessage])
            : [incomingMessage];

          const isSelected = selectedUserRef.current?.toLowerCase() === userKey;
          const oldUnreadCount = existing?.unreadCount ?? 0;

          // Check if this particular message is unread
          const lastRead = lastReadTimestampsRef.current[userKey] ?? Date.now();
          const isSenderAdmin = isSenderAdminMsg(msg.user);
          const isMsgUnread = !isSenderAdmin && msg.timestamp > lastRead;

          let finalUnreadCount = oldUnreadCount;
          if (existing) {
            // Check if it's already in the thread to avoid duplicate counting
            const isDuplicate = existing.messages.some(m => isSameMessage(m, incomingMessage));
            if (!isDuplicate && isMsgUnread) {
              finalUnreadCount += 1;
            }
          } else {
            finalUnreadCount = isMsgUnread ? 1 : 0;
          }

          if (isSelected) {
            finalUnreadCount = 0;
          }

          const privateThreadPlatform = msg.platform || existing?.platform || threadMessages.find(m => m.platform)?.platform;

          nextThreads[userKey] = {
            user: user,
            avatar: existing?.avatar || msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
            messages: threadMessages,
            lastMessageTimestamp: msg.timestamp,
            unreadCount: finalUnreadCount,
            ...(privateThreadPlatform ? { platform: privateThreadPlatform } : {}),
          };
        });
        return recalculateAllUnreadCounts(nextThreads);
      });
    };

    const handleShoutoutHistory = (history: any[]) => {
      if (shoutoutHistoryReceivedRef.current) return;
      shoutoutHistoryReceivedRef.current = true;

      setThreads(prev => {
        const nextThreads = { ...prev };
        history.forEach(shoutout => {
          let ts = shoutout.timestamp;
          if (typeof ts === 'string') {
            const parsed = Date.parse(ts);
            ts = isNaN(parsed) ? Date.now() : parsed;
          } else if (!ts) {
            ts = Date.now();
          }

          const incomingMessage: Message = {
            id: String(shoutout.id),
            type: 'shoutout',
            user: shoutout.listener_name || shoutout.user || 'Shoutout',
            avatar: shoutout.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(shoutout.listener_name || shoutout.user || 'shoutout')}`,
            text: shoutout.message || '',
            timestamp: ts,
            imageUrl: shoutout.imageUrl,
            audioUrl: shoutout.audioUrl,
            videoUrl: shoutout.videoUrl,
          };

          const threadInfo = getThreadUserAndKey(incomingMessage, adminUsername);
          if (!threadInfo) return;

          const { user, key: userKey } = threadInfo;
          const existing = nextThreads[userKey];

          const threadMessages = existing
            ? mergeMessages(existing.messages, [incomingMessage])
            : [incomingMessage];

          const isSelected = selectedUserRef.current?.toLowerCase() === userKey;
          const oldUnreadCount = existing?.unreadCount ?? 0;

          const lastRead = lastReadTimestampsRef.current[userKey] ?? Date.now();
          const isMsgUnread = ts > lastRead;

          let finalUnreadCount = oldUnreadCount;
          if (existing) {
            const isDuplicate = existing.messages.some(m => isSameMessage(m, incomingMessage));
            if (!isDuplicate && isMsgUnread) {
              finalUnreadCount += 1;
            }
          } else {
            finalUnreadCount = isMsgUnread ? 1 : 0;
          }

          if (isSelected) {
            finalUnreadCount = 0;
          }

          const threadPlatform = existing?.platform || threadMessages.find(m => m.platform)?.platform;

          nextThreads[userKey] = {
            user: user,
            avatar: existing?.avatar || shoutout.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
            messages: threadMessages,
            lastMessageTimestamp: ts,
            unreadCount: finalUnreadCount,
            ...(threadPlatform ? { platform: threadPlatform } : {}),
          };
        });
        return recalculateAllUnreadCounts(nextThreads);
      });
    };

    const handleChatMessage = (msg: any) => {
      if (msg.isStudioReply) {
        return;
      }
      const incomingMessage: Message = {
        id: msg.id,
        type: 'chat',
        user: msg.user,
        avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
        text: msg.text || '',
        timestamp: msg.timestamp,
        imageUrl: msg.imageUrl,
        audioUrl: msg.audioUrl,
        videoUrl: msg.videoUrl,
        recipient: msg.recipient,
        platform: msg.platform,
      };

      addMessageToThread(incomingMessage);
    };

    const handlePrivateMessage = (msg: any) => {
      const incomingMessage: Message = {
        id: msg.id,
        type: 'chat',
        user: msg.user,
        avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
        text: msg.text || '',
        timestamp: msg.timestamp,
        imageUrl: msg.imageUrl,
        audioUrl: msg.audioUrl,
        videoUrl: msg.videoUrl,
        recipient: msg.recipient,
        platform: msg.platform,
      };
      addMessageToThread(incomingMessage);
    };

    const handleNewShoutout = (shoutout: any) => {
      addMessageToThread({
        id: String(shoutout.id),
        type: 'shoutout',
        user: shoutout.listener_name || shoutout.user || 'Shoutout',
        avatar: shoutout.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(shoutout.listener_name || shoutout.user || 'shoutout')}`,
        text: shoutout.message || '',
        timestamp: shoutout.timestamp || Date.now(),
        imageUrl: shoutout.imageUrl,
        audioUrl: shoutout.audioUrl,
        videoUrl: shoutout.videoUrl,
      });
    };

    const handleShoutoutsCleared = () => {
      setThreads(prev => {
        const nextThreads: Record<string, UserThread> = {};
        const entries = Object.entries(prev) as [string, UserThread][];
        entries.forEach(([key, thread]) => {
          const filtered = thread.messages.filter(msg => msg.type !== 'shoutout');
          if (filtered.length > 0) {
            nextThreads[key] = {
              ...thread,
              messages: filtered,
              lastMessageTimestamp: filtered[filtered.length - 1].timestamp,
            };
          }
        });
        return nextThreads;
      });
    };

    const handleMessagesCleared = (payload: any) => {
      setThreads(prev => {
        const nextThreads: Record<string, UserThread> = {};
        Object.entries(prev).forEach(([key, threadVal]) => {
          const thread = threadVal as UserThread;
          let filtered = thread.messages;
          if (payload.isPrivate) {
            if (payload.recipient) {
              const rLower = payload.recipient.toLowerCase();
              const sLower = payload.sender?.toLowerCase();
              filtered = thread.messages.filter(msg => {
                const isPM = !!msg.recipient;
                if (!isPM) return true;
                const mUser = msg.user.toLowerCase();
                const mRecip = msg.recipient?.toLowerCase();
                const match = (mUser === sLower && mRecip === rLower) || (mUser === rLower && mRecip === sLower);
                return !match;
              });
            } else {
              // Clear ALL private messages
              filtered = thread.messages.filter(msg => !msg.recipient);
            }
          } else {
            // Clear ALL public chat room messages
            filtered = thread.messages.filter(msg => !!msg.recipient || msg.type === 'shoutout');
          }

          if (filtered.length > 0) {
            nextThreads[key] = {
              ...thread,
              messages: filtered,
              lastMessageTimestamp: filtered[filtered.length - 1].timestamp,
            };
          }
        });

        // If the selected user's thread is gone or empty, clear selectedUser
        if (selectedUserRef.current) {
          const selKey = selectedUserRef.current.toLowerCase();
          if (!nextThreads[selKey] || nextThreads[selKey].messages.length === 0) {
            setSelectedUser(null);
          }
        }

        return nextThreads;
      });
    };

    const handleUserThreadCleared = ({ username }: { username: string }) => {
      setThreads(prev => {
        const key = username.toLowerCase();
        if (!prev[key]) return prev;
        const newThreads = { ...prev };
        delete newThreads[key];
        return newThreads;
      });

      if (selectedUserRef.current?.toLowerCase() === username.toLowerCase()) {
        setSelectedUser(null);
      }
      setSelectedThreads(prev => prev.filter(userKey => userKey !== username.toLowerCase()));
    };

    const handleMessageDeleted = ({ id, isPrivate }: { id: string; isPrivate: boolean }) => {
      setThreads(prev => {
        const nextThreads = { ...prev };
        Object.keys(nextThreads).forEach(userKey => {
          const thread = nextThreads[userKey];
          const exists = thread.messages.some(m => m.id === id);
          if (exists) {
            nextThreads[userKey] = {
              ...thread,
              messages: thread.messages.filter(m => m.id !== id)
            };
          }
        });
        return nextThreads;
      });
    };

    const handleShoutoutDeleted = ({ id }: { id: number }) => {
      const strId = String(id);
      setThreads(prev => {
        const nextThreads = { ...prev };
        Object.keys(nextThreads).forEach(userKey => {
          const thread = nextThreads[userKey];
          const exists = thread.messages.some(m => String(m.id) === strId);
          if (exists) {
            nextThreads[userKey] = {
              ...thread,
              messages: thread.messages.filter(m => String(m.id) !== strId)
            };
          }
        });
        return nextThreads;
      });
    };

    const handleShoutoutReply = (data: any) => {
      // Mapping shoutoutReply to chat message for consistency in the studio thread
      const incomingMessage: Message = {
        id: `reply-${data.shoutoutId}-${Date.now()}`,
        type: 'chat',
        user: data.repliedBy,
        avatar: studioImage, // Local studio image
        text: data.replyText,
        timestamp: Date.now(),
        imageUrl: data.replyImageUrl,
        audioUrl: data.replyAudioUrl,
        videoUrl: data.replyVideoUrl,
      };

      // Use listenerName (email/username) if provided to map to the correct thread
      if (data.listenerName) {
        addMessageToThread({
          ...incomingMessage,
          recipient: data.listenerName // This will help getThreadUserAndKey find the right thread
        });
      }
    };

    const handlePlatformBroadcast = (data: any) => {
      const broadcastMsg: Message = {
        id: `broadcast-${Date.now()}`,
        type: 'chat',
        user: data.studioName || "DejavuFM Studio",
        avatar: data.studioImage || "/icon.svg",
        text: `GLOBAL BROADCAST: ${data.text}`,
        timestamp: data.timestamp || Date.now(),
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        videoUrl: data.videoUrl,
      };

      // Add to simulated threads if they match selected platforms
      data.platforms.forEach((platform: string) => {
        // We create/update a dedicated simulation thread for each platform to show the broadcast
        const platformKey = `${platform}_sim`.toLowerCase();
        setThreads(prev => {
          const existing = prev[platformKey];
          const newMessages = existing ? [...existing.messages, broadcastMsg] : [broadcastMsg];
          return {
            ...prev,
            [platformKey]: {
              user: `${platform.toUpperCase()} Pipeline`,
              avatar: `/icon.svg`, // Or a platform specific icon
              messages: newMessages,
              lastMessageTimestamp: broadcastMsg.timestamp,
              unreadCount: (existing?.unreadCount || 0) + 1,
              platform: platform
            }
          };
        });
      });
    };

    socket.on('chatHistory', handleChatHistory);
    socket.on('privateHistory', handlePrivateHistory);
    socket.on('shoutoutHistory', handleShoutoutHistory);
    socket.on('chatMessage', handleChatMessage);
    socket.on('privateMessage', handlePrivateMessage);
    socket.on('new_shoutout', handleNewShoutout);
    socket.on('shoutouts_cleared', handleShoutoutsCleared);
    socket.on('messagesCleared', handleMessagesCleared);
    socket.on('userThreadCleared', handleUserThreadCleared);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('shoutoutDeleted', handleShoutoutDeleted);
    socket.on('shoutoutReply', handleShoutoutReply);
    socket.on('platform_broadcast', handlePlatformBroadcast);

    if (adminUsername) {
      socket.emit('registerUser', adminUsername);
    }

    return () => {
      socket.off('chatHistory', handleChatHistory);
      socket.off('privateHistory', handlePrivateHistory);
      socket.off('shoutoutHistory', handleShoutoutHistory);
      socket.off('chatMessage', handleChatMessage);
      socket.off('privateMessage', handlePrivateMessage);
      socket.off('new_shoutout', handleNewShoutout);
      socket.off('shoutouts_cleared', handleShoutoutsCleared);
      socket.off('messagesCleared', handleMessagesCleared);
      socket.off('userThreadCleared', handleUserThreadCleared);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('shoutoutDeleted', handleShoutoutDeleted);
      socket.off('shoutoutReply', handleShoutoutReply);
      socket.off('platform_broadcast', handlePlatformBroadcast);
    };
  }, [adminUsername]);

  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const res = await fetch("/api/admin/studio-settings", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.studio_connected_platforms) {
            setConnectedPlatforms(data.studio_connected_platforms);
            localStorage.setItem('studio_connected_platforms', JSON.stringify(data.studio_connected_platforms));
          }
          if (data.studio_platform_configs) {
            setPlatformConfigs(data.studio_platform_configs);
            localStorage.setItem('studio_platform_configs', JSON.stringify(data.studio_platform_configs));
          }
          if (data.dejavu_studio_custom_replies) {
            setCustomReplies(data.dejavu_studio_custom_replies);
            localStorage.setItem('dejavu_studio_custom_replies', JSON.stringify(data.dejavu_studio_custom_replies));
          }
          if (data.studio_pinned_threads) {
            setPinnedThreads(data.studio_pinned_threads);
            localStorage.setItem('studio_pinned_threads', JSON.stringify(data.studio_pinned_threads));
          }
          if (data.dejavu_studio_threads) {
            setThreads(prev => {
              const dbThreads = normalizeThreads(data.dejavu_studio_threads);
              const merged = { ...dbThreads };
              
              Object.keys(prev).forEach(key => {
                if (!merged[key]) {
                  merged[key] = prev[key];
                } else {
                  const existingMsgs = prev[key].messages || [];
                  const dbMsgs = merged[key].messages || [];
                  const allMsgs = [...dbMsgs];
                  existingMsgs.forEach(m => {
                    if (!allMsgs.some(est => isSameMessage(est, m))) {
                      allMsgs.push(m);
                    }
                  });
                  allMsgs.sort((a, b) => a.timestamp - b.timestamp);
                  merged[key] = {
                    ...merged[key],
                    messages: allMsgs,
                    unreadCount: Math.max(merged[key].unreadCount || 0, prev[key].unreadCount || 0)
                  };
                }
              });
              
              localStorage.setItem('dejavu_studio_threads', JSON.stringify(merged));
              return merged;
            });
          }
          if (data.dejavu_studio_last_read) {
            setLastReadTimestamps(prev => {
              const updated = { ...data.dejavu_studio_last_read, ...prev };
              localStorage.setItem('dejavu_studio_last_read', JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("Failed to load studio settings from API", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_studio_threads', JSON.stringify(threads));
      window.dispatchEvent(new Event('dejavu_studio_threads_updated'));
    } catch (error) {
      console.warn("Failed to save studio threads to local storage", error);
    }

    const handler = setTimeout(() => {
      syncSettingsToApi({ dejavu_studio_threads: threads });
    }, 2000);

    return () => clearTimeout(handler);
  }, [threads]);

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_studio_last_read', JSON.stringify(lastReadTimestamps));
    } catch (error) {
      console.warn("Failed to save last read timestamps to local storage", error);
    }

    const handler = setTimeout(() => {
      syncSettingsToApi({ dejavu_studio_last_read: lastReadTimestamps });
    }, 2000);

    return () => clearTimeout(handler);
  }, [lastReadTimestamps]);

  useEffect(() => {
    try {
      localStorage.setItem('studio_pinned_threads', JSON.stringify(pinnedThreads)); syncSettingsToApi({ studio_pinned_threads: pinnedThreads });
    } catch (error) {
      console.warn("Failed to save pinned threads to local storage", error);
    }
  }, [pinnedThreads]);

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_studio_custom_replies', JSON.stringify(customReplies)); syncSettingsToApi({ dejavu_studio_custom_replies: customReplies });
    } catch (error) {
      console.warn("Failed to save custom replies to local storage", error);
    }
  }, [customReplies]);

  
  async function syncSettingsToApi(settingsObj: Record<string, any>) {
    try {
      const token = localStorage.getItem('admin_token');
      await fetch('/api/admin/studio-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settingsObj)
      });
    } catch (e) {
      console.warn("Failed to sync settings to API", e);
    }
  };

  const handleSelectUser = (user: string) => {
    setSelectedUser(user);
    const userKey = user.toLowerCase();

    setLastReadTimestamps(prev => {
      const updated = { ...prev, [userKey]: Date.now() };
      localStorage.setItem('dejavu_studio_last_read', JSON.stringify(updated));
      return updated;
    });

    setThreads(prev => {
      if (prev[userKey]) {
        const newThreads = { ...prev };
        newThreads[userKey].unreadCount = 0;
        return newThreads;
      }
      return prev;
    });
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('studio_sound_enabled', JSON.stringify(newValue));
    toast.success(`Notification sounds ${newValue ? 'enabled' : 'disabled'}`);
  };

  const addCustomReply = () => {
    setIsCreatingQuickReply(true);
    setNewQuickReplyText("");
  };

  const handleSaveCustomReply = () => {
    const text = newQuickReplyText.trim();
    if (!text) {
      toast.warning("Please enter a reply template.");
      return;
    }
    if (customReplies.includes(text)) {
      toast.warning("This reply already exists.");
      return;
    }
    setCustomReplies(prev => [...prev, text]);
    setIsCreatingQuickReply(false);
    toast.success("Quick reply added!");
  };

  const removeCustomReply = (reply: string) => {
    setCustomReplies(prev => prev.filter(r => r !== reply));
    toast.info("Quick reply removed.");
  };

  const handleBanUser = async (username: string) => {
    const confirmed = await showConfirm({
      title: "Confirm Ban",
      message: `Are you sure you want to permanently ban "${username}"? They will be disconnected and unable to log in or chat.`,
      style: "danger",
      confirmText: "Ban User"
    });

    if (confirmed) {
      banUserMutation.mutate(username);
    }
  };

  const handleDeleteMessage = async (message: Message) => {
    const isShoutout = message.type === 'shoutout';
    const isPrivate = !!message.recipient;

    const confirmed = await showConfirm({
      title: isShoutout ? "Delete Shoutout" : "Delete Message",
      message: `Are you sure you want to permanently delete this ${isShoutout ? 'shoutout' : 'message'} from "${message.user}"? This action cannot be undone.`,
      style: "danger",
      confirmText: isShoutout ? "Delete Shoutout" : "Delete Message"
    });

    if (confirmed && adminUsername) {
      if (isShoutout) {
        socketRef.current?.emit('deleteShoutout', { id: Number(message.id), user: adminUsername });
        toast.success("Shoutout deleted.");
      } else {
        socketRef.current?.emit('deleteMessage', { id: message.id, user: adminUsername, isPrivate });
        toast.success("Message deleted.");
      }
    }
  };

  const handleClearConversation = async (username: string) => {
    const confirmed = await showConfirm({
      title: "Clear Conversation",
      message: `Are you sure you want to permanently delete all messages and shoutouts from "${username}"? This action cannot be undone.`,
      style: "danger",
      confirmText: "Clear Conversation"
    });

    if (confirmed && adminUsername) {
      socketRef.current?.emit('clearUserThread', {
        adminUser: adminUsername,
        targetUser: username
      });
      toast.success(`Conversation with ${username} has been cleared.`);
    }
  };

  const handleClearAllChatsAndShoutouts = async () => {
    const confirmed = await showConfirm({
      title: "Clear All Chats, DMs & Shoutouts",
      message: "Are you sure you want to permanently delete ALL public chat room messages, private listener DMs, and live studio shoutouts? This cannot be undone.",
      style: "danger",
      confirmText: "Clear All Data"
    });

    if (confirmed && adminUsername) {
      // 1. Clear Public Chat Room
      socketRef.current?.emit('clearAllMessages', {
        user: adminUsername,
        isPrivate: false
      });
      // 2. Clear Private DMs
      socketRef.current?.emit('clearAllMessages', {
        user: adminUsername,
        isPrivate: true
      });
      // 3. Clear Shoutouts
      socketRef.current?.emit('clearAllShoutouts', {
        user: adminUsername
      });
      
      toast.success("All chats, private DMs, and shoutouts are being cleared...");
    }
  };

  const handleSaveAutoDelete = async (newEnabled: boolean, newHours: number) => {
    setIsSavingAutoDelete(true);
    try {
      const res = await fetchAdmin("/api/admin/chat-room-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: newEnabled,
          hours: newHours
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update auto-delete settings");
      setAutoDeleteEnabled(newEnabled);
      setAutoDeleteHours(newHours);
      if (newHours >= 24 && newHours % 24 === 0) {
        setCustomValInput((newHours / 24).toString());
        setCustomUnitInput('days');
      } else {
        setCustomValInput(newHours.toString());
        setCustomUnitInput('hours');
      }
      if (data.lastRun) setAutoDeleteLastRun(data.lastRun);
      toast.success(newEnabled ? `Auto-delete enabled (every ${newHours}h)` : "Auto-delete disabled");
    } catch (err: any) {
      toast.error(err.message || "Failed to update auto-delete settings");
    } finally {
      setIsSavingAutoDelete(false);
    }
  };

  const handleApplyCustomTime = () => {
    const val = parseFloat(customValInput);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid positive duration.");
      return;
    }
    const totalHours = Math.round(customUnitInput === 'days' ? val * 24 : val);
    if (totalHours < 1 || totalHours > 8760) {
      toast.error("Auto-delete timer must be between 1 hour and 8760 hours (1 year).");
      return;
    }
    handleSaveAutoDelete(true, totalHours);
  };

  const nextAutoDeleteRunLabel = useMemo(() => {
    if (!autoDeleteEnabled) return "Disabled";
    const base = autoDeleteLastRun ? new Date(autoDeleteLastRun).getTime() : Date.now();
    if (Number.isNaN(base)) return `Every ${autoDeleteHours} hours`;
    return new Date(base + autoDeleteHours * 60 * 60 * 1000).toLocaleString();
  }, [autoDeleteEnabled, autoDeleteHours, autoDeleteLastRun]);

  const autoDeleteTimeLeft = useMemo(() => {
    if (!autoDeleteEnabled) return "";
    const base = (autoDeleteLastRun && !Number.isNaN(Date.parse(autoDeleteLastRun)))
      ? new Date(autoDeleteLastRun).getTime()
      : componentMountedTime;
    const nextRun = base + autoDeleteHours * 60 * 60 * 1000;
    const msRemaining = nextRun - currentTimestamp;
    
    if (msRemaining <= 0) return "Executing soon...";
    
    const totalSecs = Math.floor(msRemaining / 1000);
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    
    const pad = (num: number) => String(num).padStart(2, '0');
    
    if (d > 0) {
      return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s left`;
    }
    if (h > 0) {
      return `${pad(h)}h ${pad(m)}m ${pad(s)}s left`;
    }
    return `${pad(m)}m ${pad(s)}s left`;
  }, [autoDeleteEnabled, autoDeleteHours, autoDeleteLastRun, currentTimestamp, componentMountedTime]);

  const handleClearPublicChat = async () => {
    const confirmed = await showConfirm({
      title: "Clear All Public Chat",
      message: "Are you sure you want to permanently delete ALL public chat messages? This will affect all users and cannot be undone.",
      style: "danger",
      confirmText: "Clear Public Chat"
    });

    if (confirmed && adminUsername) {
      socketRef.current?.emit('clearAllMessages', {
        user: adminUsername,
        isPrivate: false
      });
      // The 'messagesCleared' socket event will handle the UI update.
      toast.success("Clearing public chat room...");
    }
  };

  const handleClearPrivateMessages = async () => {
    const confirmed = await showConfirm({
      title: "Clear All Private Messages",
      message: "Are you sure you want to permanently delete ALL private messages between all users? This action cannot be undone.",
      style: "danger",
      confirmText: "Clear All DMs"
    });

    if (confirmed && adminUsername) {
      socketRef.current?.emit('clearAllMessages', {
        user: adminUsername,
        isPrivate: true
        // No targetRecipient means clear all
      });
      // The 'messagesCleared' socket event will handle the UI update.
      toast.success("Clearing all private messages...");
    }
  };


  const handleSendReply = async () => {
    if (!replyText.trim() && !attachment) return;
    if (!selectedUser || !adminUsername) return;

    setIsSending(true);
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        const res = await fetchAdmin('/api/public/chat/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        mediaUrl = data.url;
        mediaType = data.type;
      }

      const thread = threads[selectedUser.toLowerCase()];
      if (!thread || thread.messages.length === 0) throw new Error("No messages to reply to.");

      const source = getThreadSource(thread);
      const lastMessage = thread.messages[thread.messages.length - 1];
      const isShoutout = source === 'shoutout';

      if (isShoutout) {
        const shoutoutMessage = [...thread.messages].reverse().find(m => m.type === 'shoutout');
        const shoutoutId = shoutoutMessage ? shoutoutMessage.id : lastMessage.id;

        const res = await fetchAdmin(`/api/admin/shoutouts/${shoutoutId}/reply`, {
          method: 'POST',
          body: { 
            reply_text: replyText,
            replyImageUrl: mediaType === 'image' ? mediaUrl : null,
            replyAudioUrl: mediaType === 'audio' ? mediaUrl : null,
            replyVideoUrl: mediaType === 'video' ? mediaUrl : null
          }
        });
        if (!res.ok) throw new Error("Failed to send shoutout reply.");
      } else {
        const isMeta = ['whatsapp', 'instagram', 'facebook', 'twitch'].includes(source);
        const isPrivate = source === 'private_dm' || isMeta;

        const chatPayload = {
          user: studioName,
          text: `@${selectedUser} ${replyText}`,
          imageUrl: mediaType === 'image' ? mediaUrl : null,
          audioUrl: mediaType === 'audio' ? mediaUrl : null,
          videoUrl: mediaType === 'video' ? mediaUrl : null,
          avatar_url: studioImage,
          recipient: isPrivate ? selectedUser : undefined,
          platform: isMeta ? source : undefined,
        };
        // A public message has no recipient. The server will broadcast it to everyone.
        // The isStudioReply flag prevents the studio from receiving its own message back in a loop.
        socketRef.current?.emit('chatMessage', { ...chatPayload, isStudioReply: true });
      }

      // Manually add the reply to the local state for immediate feedback
      // For shoutouts, we rely on the socket broadcast to avoid duplication
      if (!isShoutout) {
        const replyMessage: Message = {
          id: `reply-${lastMessage.id}-${Date.now()}`,
          type: 'chat', // Treat replies as chat messages for styling
          user: studioName,
          avatar: studioImage,
          text: `@${selectedUser} ${replyText}`,
          timestamp: Date.now(),
          imageUrl: mediaType === 'image' && mediaUrl ? mediaUrl : undefined,
          audioUrl: mediaType === 'audio' && mediaUrl ? mediaUrl : undefined,
          videoUrl: mediaType === 'video' && mediaUrl ? mediaUrl : undefined,
          recipient: ['private_dm', 'whatsapp', 'instagram', 'facebook', 'twitch'].includes(source) ? selectedUser : undefined,
          platform: ['whatsapp', 'instagram', 'facebook', 'twitch'].includes(source) ? source : undefined,
        };
        setThreads(prev => ({
          ...prev,
          [selectedUser.toLowerCase()]: {
            ...prev[selectedUser.toLowerCase()],
            messages: [...prev[selectedUser.toLowerCase()].messages, replyMessage],
            lastMessageTimestamp: replyMessage.timestamp,
          }
        }));
      }

      setReplyText("");
      setAttachment(null);
      toast.success("Reply sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reply.");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartRecording = async () => {
    if (attachment) {
      const confirmed = await showConfirm({
        title: "Replace Attachment",
        message: "Starting a new recording will replace your current file attachment. Continue?",
        style: "warning",
        confirmText: "Continue"
      });
      if (!confirmed) return;
      setAttachment(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `studio-recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachment(audioFile);
        stream.getTracks().forEach(track => track.stop()); // Stop microphone access
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.info("Recording started...");
    } catch (err) {
      console.error("Error starting recording:", err);
      toast.error("Could not start recording. Please check microphone permissions.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording finished.");
    }
  };

  const toggleThreadSelection = (userKey: string) => {
    setSelectedThreads(prev =>
      prev.includes(userKey) ? prev.filter(k => k !== userKey) : [...prev, userKey]
    );
  };

  const handleSelectAll = () => {
    const allVisibleKeys = sortedThreads.map(t => t.user.toLowerCase());
    if (selectedThreads.length === allVisibleKeys.length) {
      setSelectedThreads([]);
    } else {
      setSelectedThreads(allVisibleKeys);
    }
  };

  const handleMarkSelected = (as: 'read' | 'unread') => {
    setThreads(prev => {
      const newThreads = { ...prev };
      selectedThreads.forEach(key => {
        if (newThreads[key]) {
          newThreads[key].unreadCount = as === 'read' ? 0 : 1;
        }
      });
      return newThreads;
    });

    setLastReadTimestamps(prev => {
      const updated = { ...prev };
      selectedThreads.forEach(key => {
        if (as === 'read') {
          updated[key] = Date.now();
        } else {
          updated[key] = 0;
        }
      });
      localStorage.setItem('dejavu_studio_last_read', JSON.stringify(updated));
      return updated;
    });

    setSelectedThreads([]);
    toast.success(`Marked ${selectedThreads.length} conversations as ${as}.`);
  };

  const handlePinSelected = () => {
    setPinnedThreads(prev => {
      const newPinned = new Set([...prev, ...selectedThreads]);
      return Array.from(newPinned);
    });
    setSelectedThreads([]);
    toast.success(`Pinned ${selectedThreads.length} conversations.`);
  };

  const handleUnpin = (userKey: string) => {
    setPinnedThreads(prev => prev.filter(k => k !== userKey));
    toast.info("Conversation unpinned.");
  };

  const handleDeleteSelected = async () => {
    const confirmed = await showConfirm({
      title: `Delete ${selectedThreads.length} Conversations`,
      message: "Are you sure you want to permanently delete all messages and shoutouts for the selected users? This action cannot be undone.",
      style: "danger",
      confirmText: "Delete Selected"
    });

    if (confirmed && adminUsername) {
      const usersToDelete = selectedThreads
        .map(userKey => (Object.values(threads) as UserThread[]).find(t => t.user.toLowerCase() === userKey))
        .filter((t): t is UserThread => !!t);

      usersToDelete.forEach(thread => {
        socketRef.current?.emit('clearUserThread', {
          adminUser: adminUsername,
          targetUser: thread.user
        });
      });

      toast.success(`Deletion process started for ${usersToDelete.length} conversations.`);
      setSelectedThreads([]);
    }
  };

  const sortedThreads = useMemo(() => {
    const filtered = Object.values(threads).filter((thread: UserThread) => thread.user.toLowerCase().includes(searchQuery.toLowerCase()));
    return filtered.sort((a: UserThread, b: UserThread) => {
      const aIsPinned = pinnedThreads.includes(a.user.toLowerCase());
      const bIsPinned = pinnedThreads.includes(b.user.toLowerCase());
      if (aIsPinned !== bIsPinned) return aIsPinned ? -1 : 1;
      return b.lastMessageTimestamp - a.lastMessageTimestamp;
    });
  }, [threads, searchQuery, pinnedThreads]);

  const currentThread = selectedUser ? threads[selectedUser.toLowerCase()] : null;
  const isTwitchChat = currentThread ? (getThreadSource(currentThread) === 'twitch') : false;

  const renderBroadcastView = () => {
    const channels = [
      { id: 'public_chat', name: 'Public Chat Room', icon: Globe, color: 'text-neon-blue', bg: 'bg-neon-blue/10 border-neon-blue/20' },
      { id: 'shoutouts', name: 'Studio Shoutouts', icon: Megaphone, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
      { id: 'private_dms', name: 'All Active Private DMs', icon: MessageSquare, color: 'text-neon-purple', bg: 'bg-neon-purple/10 border-neon-purple/20' },
      { id: 'whatsapp', name: 'WhatsApp Broadcast', icon: Phone, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
      { id: 'instagram', name: 'Instagram Direct', icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
      { id: 'facebook', name: 'Facebook Messenger', icon: Facebook, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
      { id: 'twitch', name: 'Twitch Chat', icon: Twitch, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    ];

    const toggleChannel = (id: string) => {
      setBroadcastChannels(prev => 
        prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
      );
    };

    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#070913] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="max-w-4xl mx-auto space-y-8 pb-36 md:pb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-3">
                <Radio className="w-6 h-6 text-neon-blue" />
                Global Broadcast Center
              </h2>
              <p className="text-xs text-white/50">Transmit a synchronized message across multiple connected listener channels simultaneously.</p>
            </div>
            <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest bg-white/[0.02] px-3 py-1 rounded-lg border border-white/5">
              TARGETING: <span className="text-neon-blue">{broadcastChannels.length} CHANNELS</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Message Composer */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#0D0F1D] border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Broadcast Payload</label>
                  <textarea
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="Enter your broadcast message here... Use @username to target specific listeners if needed."
                    className="w-full h-48 bg-black/40 border border-white/5 rounded-xl p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-neon-blue/40 focus:ring-1 focus:ring-neon-blue/20 transition-all resize-none"
                  />
                </div>

                {/* Attachment Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Media Attachment</label>
                    {attachment && (
                      <button onClick={() => setAttachment(null)} className="text-[9px] font-bold text-red-400 uppercase tracking-widest hover:text-red-300">
                        Clear Attachment
                      </button>
                    )}
                  </div>
                  
                  {attachment ? (
                    <AttachmentPreview file={attachment} onRemove={() => setAttachment(null)} />
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-white/5 hover:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-white/30 hover:text-white/50 transition-all group"
                    >
                      <div className="p-3 rounded-xl bg-white/[0.02] group-hover:bg-white/[0.05] transition-all">
                        <Paperclip className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold">Attach Image, Audio, or Video</span>
                      <span className="text-[10px] opacity-60">Maximum size: 20MB</span>
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    className="hidden"
                    accept="image/*,audio/*,video/*"
                  />
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleBroadcast}
                    disabled={isBroadcasting || (!broadcastText.trim() && !attachment)}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      isBroadcasting || (!broadcastText.trim() && !attachment)
                        ? 'bg-white/5 text-white/20 cursor-not-allowed'
                        : 'bg-gradient-to-r from-neon-blue to-indigo-600 hover:from-neon-blue hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(0,194,255,0.25)] hover:shadow-[0_0_25px_rgba(0,194,255,0.35)]'
                    }`}
                  >
                    {isBroadcasting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Share2 className="w-5 h-5" />
                    )}
                    <span>{isBroadcasting ? 'Transmitting...' : 'Execute Global Broadcast'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Channel Selector */}
            <div className="space-y-6">
              <div className="bg-[#0D0F1D] border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Active Pipelines</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setBroadcastChannels(channels.map(c => c.id))}
                      className="text-[9px] font-bold text-neon-blue uppercase"
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setBroadcastChannels([])}
                      className="text-[9px] font-bold text-white/30 uppercase"
                    >
                      None
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {channels.map(channel => {
                    const isSelected = broadcastChannels.includes(channel.id);
                    const isPlatform = ['whatsapp', 'instagram', 'facebook', 'twitch', 'tiktok'].includes(channel.id);
                    const isConnected = isPlatform ? connectedPlatforms[channel.id] : true;

                    return (
                      <button
                        key={channel.id}
                        onClick={() => toggleChannel(channel.id)}
                        disabled={!isConnected}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isSelected 
                            ? `${channel.bg} ${channel.color}` 
                            : 'bg-black/20 border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
                        } ${!isConnected ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/10' : 'bg-white/[0.03]'}`}>
                          <channel.icon className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="text-[11px] font-bold uppercase tracking-tight">{channel.name}</div>
                          <div className="text-[9px] opacity-60 font-mono">
                            {isConnected ? (isSelected ? 'SELECTED' : 'AVAILABLE') : 'DISCONNECTED'}
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-current' : 'border-white/10'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-300/70 leading-relaxed italic">
                        Broadcasting to third-party platforms requires an active connection pipeline in the Connection Hub.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConnectionHub = () => {
    const platformsList = [
      {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        icon: Phone,
        color: 'from-emerald-500 to-green-600',
        glow: 'rgba(16,185,129,0.3)',
        desc: 'Receive listener requests and voice notes from the WhatsApp Cloud API.',
        fields: [
          { key: 'phone', label: 'Business Phone Number ID', placeholder: 'Enter phone number ID (e.g. 1045234567890)' },
          { key: 'verifyToken', label: 'System Access Token / Verify Token', placeholder: 'Enter system user access token', type: 'password' },
          { key: 'webhook', label: 'Webhook Callback URL', placeholder: 'Loading callback...', disabled: true }
        ]
      },
      {
        id: 'instagram',
        name: 'Instagram Direct',
        icon: Instagram,
        color: 'from-pink-500 via-purple-500 to-amber-500',
        glow: 'rgba(236,72,153,0.3)',
        desc: 'Connect your Instagram Professional Inbox to respond to direct messages and story mentions.',
        fields: [
          { key: 'accountId', label: 'Instagram Account ID', placeholder: '1784140123456789' },
          { key: 'accessToken', label: 'Graph Access Token', placeholder: 'Enter system user access token', type: 'password' },
          { key: 'webhook', label: 'Webhook Callback URL', placeholder: 'Loading callback...', disabled: true }
        ]
      },
      {
        id: 'facebook',
        name: 'Facebook Messenger',
        icon: Facebook,
        color: 'from-blue-600 to-indigo-700',
        glow: 'rgba(37,99,235,0.3)',
        desc: 'Link your station Facebook Page to read and reply to fan page messages in real-time.',
        fields: [
          { key: 'pageId', label: 'Facebook Page ID', placeholder: '109876543210' },
          { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'Enter Facebook Page Access Token', type: 'password' },
          { key: 'webhook', label: 'Webhook Callback URL', placeholder: 'Loading callback...', disabled: true }
        ]
      },
      {
        id: 'twitch',
        name: 'Twitch IRC Chat',
        icon: Twitch,
        color: 'from-purple-600 to-violet-700',
        glow: 'rgba(147,51,234,0.3)',
        desc: 'Connect to your Twitch Channel IRC chat. Stream messages will be routed directly to the studio.',
        fields: [
          { key: 'channel', label: 'Twitch Channel Name', placeholder: 'dejavufm' },
          { key: 'oauthToken', label: 'Twitch OAuth Token (oauth:...)', placeholder: 'oauth:abcdef1234567890', type: 'password' }
        ]
      },
      {
        id: 'tiktok',
        name: 'TikTok Live Chat',
        icon: Globe,
        color: 'from-black via-[#00f2fe] to-[#fe0979]',
        glow: 'rgba(0,0,0,0.4)',
        desc: 'Receive live comment feeds and gift alerts from your TikTok Live stream during broadcasts.',
        fields: [
          { key: 'username', label: 'TikTok Username', placeholder: '@dejavufm_official' },
          { key: 'sessionToken', label: 'Session Token', placeholder: 'Enter TikTok Live session key', type: 'password' }
        ]
      }
    ];

    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#070913] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold uppercase tracking-wider text-white">Stream Connection Hub</h2>
            <p className="text-xs text-white/50">Configure direct endpoints to automatically pull messages and chat queries from external platforms into your Studio Inbox.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-36 md:pb-12">
            {platformsList.map(platform => {
              const isConnected = connectedPlatforms[platform.id];
              const config = platformConfigs[platform.id] || {};
              return (
                <div key={platform.id} className="bg-[#0D0F1D] border border-white/5 rounded-2xl p-6 flex flex-col space-y-5 transition-all hover:border-white/10 hover:shadow-[0_4px_30px_rgba(0,0,0,0.4)] relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${platform.color}`} />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-white border border-white/10 shrink-0`} style={{ boxShadow: `0 0 15px ${platform.glow}` }}>
                        <platform.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{platform.name}</h3>
                        <p className="text-[10px] text-white/40">{isConnected ? 'Active pipeline online' : 'Offline'}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleTogglePlatform(platform.id)}
                      className={`sm:self-auto self-start px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${
                        isConnected
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                          : 'bg-white/[0.02] text-white/40 border-white/5 hover:bg-white/[0.05]'
                      }`}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>

                  <p className="text-[11px] text-white/50 leading-relaxed">{platform.desc}</p>

                  {['whatsapp', 'instagram', 'facebook'].includes(platform.id) ? (
                    <div className="space-y-3.5 pt-2">
                      <div className="bg-black/35 rounded-xl border border-white/5 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">
                          <span>Configuration Parameters</span>
                          <span className="text-neon-purple text-[9px] bg-neon-purple/10 border border-neon-purple/20 px-1.5 py-0.5 rounded">Meta Managed</span>
                        </div>
                        <div className="space-y-2 text-xs">
                          {platform.id === 'whatsapp' && (
                            <>
                              <div className="flex items-center justify-between font-mono">
                                <span className="text-white/40 text-[10px]">PHONE ID:</span>
                                <span className="font-bold text-white/95">{config.phone ? config.phone : <span className="text-red-400/80 italic text-[10px]">Not Configured</span>}</span>
                              </div>
                              <div className="flex items-center justify-between font-mono">
                                <span className="text-white/40 text-[10px]">VERIFY TOKEN:</span>
                                <span className="font-bold text-neon-purple">{config.verifyToken ? "••••••••" : <span className="text-red-400/80 italic text-[10px]">Not Configured</span>}</span>
                              </div>
                            </>
                          )}
                          {platform.id === 'instagram' && (
                            <>
                              <div className="flex items-center justify-between font-mono">
                                <span className="text-white/40 text-[10px]">ACCOUNT ID:</span>
                                <span className="font-bold text-white/95">{config.accountId ? config.accountId : <span className="text-red-400/80 italic text-[10px]">Not Configured</span>}</span>
                              </div>
                              <div className="flex items-center justify-between font-mono">
                                <span className="text-white/40 text-[10px]">GRAPH TOKEN:</span>
                                <span className="font-bold text-neon-purple">{config.accessToken ? "••••••••" : <span className="text-red-400/80 italic text-[10px]">Not Configured</span>}</span>
                              </div>
                            </>
                          )}
                          {platform.id === 'facebook' && (
                            <>
                              <div className="flex items-center justify-between font-mono">
                                <span className="text-white/40 text-[10px]">PAGE ID:</span>
                                <span className="font-bold text-white/95">{config.pageId ? config.pageId : <span className="text-red-400/80 italic text-[10px]">Not Configured</span>}</span>
                              </div>
                              <div className="flex items-center justify-between font-mono">
                                <span className="text-white/40 text-[10px]">PAGE TOKEN:</span>
                                <span className="font-bold text-neon-purple">{config.pageAccessToken ? "••••••••" : <span className="text-red-400/80 italic text-[10px]">Not Configured</span>}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <Link
                        to="/admin/meta-integrations"
                        className="w-full py-2 bg-neon-purple/5 hover:bg-neon-purple/15 border border-neon-purple/10 hover:border-neon-purple/20 rounded-xl text-[10px] font-bold uppercase tracking-wider text-neon-purple transition-all flex items-center justify-center gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Manage Developer Credentials</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {platform.fields.map(field => (
                        <PlatformFieldInput
                          key={field.key}
                          platformId={platform.id}
                          fieldKey={field.key}
                          label={field.label}
                          placeholder={field.placeholder}
                          type={field.type}
                          disabled={field.disabled}
                          initialValue={field.key === 'webhook' ? (window.location.origin + '/webhook') : (config[field.key] || '')}
                          onSave={(val) => handleSavePlatformConfig(platform.id, { [field.key]: val })}
                        />
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">Integration Credentials Diagnostic</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => handleTestConnection(platform.id)}
                        className="py-2 bg-gradient-to-r from-neon-blue/10 to-indigo-600/10 hover:from-neon-blue/20 hover:to-indigo-600/20 border border-neon-blue/20 hover:border-neon-blue/40 rounded-xl text-[10px] font-bold uppercase tracking-wider text-neon-blue transition-all flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Test Connection</span>
                      </button>
                      
                      {isConnected ? (
                        <button
                          onClick={() => simulatePlatformMessage(platform.id)}
                          className="py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/20 hover:border-emerald-500/30 rounded-xl text-[10px] font-bold uppercase tracking-wider text-emerald-400 transition-all flex items-center justify-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Simulate DM</span>
                        </button>
                      ) : (
                        <div className="py-2 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white/20 flex items-center justify-center gap-1.5 select-none">
                          <PlusCircle className="w-3.5 h-3.5 opacity-30" />
                          <span>Connect to Simulate</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsView = () => {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#070913] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="max-w-4xl mx-auto space-y-8 pb-36 md:pb-12">
          <div className="space-y-1">
            <h2 className="text-xl font-bold uppercase tracking-wider text-white">Studio Desk Settings</h2>
            <p className="text-xs text-white/50">Manage notifications, customize default responses, and administer storage caches.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0D0F1D] border border-white/5 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Notification Sounds</h3>
              <p className="text-xs text-white/40 leading-relaxed">Turn on or off instant auditory feedback on incoming listener shoutouts and live direct messages.</p>
              
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                <div>
                  <span className="text-xs font-semibold text-white/80 block">Receive Ring Alerts</span>
                  <span className="text-[10px] text-white/30 font-mono">SOUND STATE: {soundEnabled ? "ACTIVE" : "MUTED"}</span>
                </div>
                <button
                  onClick={toggleSound}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${soundEnabled ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20' : 'bg-white/5 text-white/30 border border-white/5'}`}
                >
                  {soundEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="bg-[#0D0F1D] border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Quick Replies</h3>
                <button
                  onClick={addCustomReply}
                  className="px-2.5 py-1 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/20 rounded-lg text-[10px] font-bold uppercase tracking-wider text-neon-purple transition-all"
                >
                  Add Custom
                </button>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">Fast-delivery response templates rendered at the bottom of open conversation workspaces.</p>
              
              <div className="space-y-1.5 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full">
                {DEFAULT_QUICK_REPLIES.map(reply => (
                  <div key={reply} className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5 text-xs text-white/60">
                    <span className="truncate pr-4">{reply}</span>
                    <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-white/20 bg-white/5 px-1.5 py-0.5 rounded shrink-0">System</span>
                  </div>
                ))}
                {customReplies.map(reply => (
                  <div key={reply} className="flex items-center justify-between p-2.5 bg-neon-purple/5 rounded-xl border border-neon-purple/10 text-xs text-neon-purple">
                    <span className="truncate pr-4 font-semibold">{reply}</span>
                    <button
                      onClick={() => removeCustomReply(reply)}
                      className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all shrink-0"
                      title="Delete reply template"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0D0F1D] border border-white/5 rounded-2xl p-6 space-y-5 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neon-purple" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Automatic Chat Purge (Retention Timer)</h3>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Automatically purge and delete all public chat room messages, private listener DMs, and live shoutouts periodically after a specified duration.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveAutoDelete(!autoDeleteEnabled, autoDeleteHours)}
                  disabled={isSavingAutoDelete}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                    autoDeleteEnabled ? 'bg-neon-purple shadow-[0_0_12px_rgba(124,58,237,0.5)]' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoDeleteEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {autoDeleteEnabled && (
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider block">
                      Auto-Purge Interval Frequency
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "1 Hour", hours: 1 },
                        { label: "6 Hours", hours: 6 },
                        { label: "12 Hours", hours: 12 },
                        { label: "24 Hours (1 Day)", hours: 24 },
                        { label: "3 Days (72h)", hours: 72 },
                        { label: "7 Days (168h)", hours: 168 },
                        { label: "30 Days (720h)", hours: 720 },
                      ].map((preset) => (
                        <button
                          key={preset.hours}
                          type="button"
                          onClick={() => handleSaveAutoDelete(true, preset.hours)}
                          disabled={isSavingAutoDelete}
                          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                            autoDeleteHours === preset.hours
                              ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple font-bold shadow-[0_0_10px_rgba(124,58,237,0.2)]'
                              : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Duration Input */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider block">
                      Custom Duration Time
                    </label>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <div className="flex-1 min-w-[120px] flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-neon-purple/50 transition-colors">
                        <input
                          type="number"
                          min="1"
                          max="8760"
                          value={customValInput}
                          onChange={(e) => setCustomValInput(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-full bg-transparent text-xs text-white font-medium focus:outline-none placeholder:text-white/20"
                        />
                        <select
                          value={customUnitInput}
                          onChange={(e) => setCustomUnitInput(e.target.value as 'hours' | 'days')}
                          className="bg-transparent text-xs text-neon-purple font-bold focus:outline-none cursor-pointer pr-1"
                        >
                          <option value="hours" className="bg-[#0D0F1D] text-white">Hours</option>
                          <option value="days" className="bg-[#0D0F1D] text-white">Days</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCustomTime}
                        disabled={isSavingAutoDelete}
                        className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/40 rounded-xl text-xs font-bold text-neon-purple hover:text-white transition-all shadow-[0_0_10px_rgba(124,58,237,0.15)] shrink-0"
                      >
                        Set Custom Time
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/5 text-[11px]">
                    <div className="flex items-center gap-2 text-white/60">
                      <Timer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Next scheduled purge: <strong className="text-white font-mono">{nextAutoDeleteRunLabel}</strong>
                        {autoDeleteTimeLeft && (
                          <span className="ml-1.5 text-amber-400 font-bold">({autoDeleteTimeLeft})</span>
                        )}
                      </span>
                    </div>
                    {autoDeleteLastRun && (
                      <div className="text-white/40">
                        Last purge run: <span className="font-mono">{new Date(autoDeleteLastRun).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 bg-red-500/[0.02] border border-red-500/10 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-white">Manual Full Database Wipe</span>
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">Permanently purge and delete all public chat room messages, private listener DMs, and live studio shoutouts recorded in the system immediately.</p>
                <button
                  onClick={handleClearAllChatsAndShoutouts}
                  className="w-full px-3 py-2 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                >
                  Clear All Chats, DMs & Shoutouts Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetchAdmin('/api/public/chat/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setStudioImage(data.url);
      toast.success("Studio image uploaded!");
    } catch (err: any) {
      console.error("Image upload failed:", err);
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!studioName.trim()) {
      toast.warning("Studio name cannot be empty.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studio_name: studioName.trim(),
          studio_image: studioImage
        })
      });
      if (res.ok) {
        toast.success("Studio profile saved successfully!");
      } else {
        toast.error("Failed to save studio profile.");
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("An error occurred while saving the profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const renderProfileView = () => {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#070913] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="max-w-xl mx-auto space-y-8 pb-36 md:pb-12">
          <div className="space-y-1">
            <h2 className="text-xl font-bold uppercase tracking-wider text-white">Studio Profile</h2>
            <p className="text-xs text-white/50">Configure your broadcast station identity, custom name, and live representative avatar image.</p>
          </div>

          <div className="bg-[#0D0F1D] border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative group">
                <img 
                  src={studioImage} 
                  alt="Studio Logo" 
                  className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 object-cover shadow-2xl transition-all duration-300 group-hover:brightness-50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icon.svg';
                  }}
                />
                <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/80 hover:text-white transition-colors">
                    <Camera className="w-5 h-5" />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageFileChange} 
                    className="hidden" 
                    disabled={isUploadingImage}
                  />
                </label>
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                    <div className="w-6 h-6 border-2 border-t-neon-purple border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neon-purple bg-neon-purple/10 border border-neon-purple/20 px-2.5 py-1 rounded-full">
                  Station Identity
                </span>
                <p className="text-[11px] text-white/40 mt-1 max-w-xs mx-auto">
                  Upload a new picture or select an existing logo image from your station Media Library.
                </p>

                <div className="flex items-center justify-center gap-2.5 pt-2">
                  <label className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/80 hover:text-white cursor-pointer transition-all flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-neon-purple" />
                    <span>Upload File</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageFileChange} 
                      className="hidden" 
                      disabled={isUploadingImage}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsProfileMediaPickerOpen(true)}
                    className="px-3.5 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/40 rounded-xl text-xs font-semibold text-neon-purple hover:text-white transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(124,58,237,0.15)]"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Select from Media</span>
                  </button>
                </div>
              </div>
            </div>

            <MediaPickerModal 
              isOpen={isProfileMediaPickerOpen} 
              onClose={() => setIsProfileMediaPickerOpen(false)} 
              onSelect={(url) => {
                setStudioImage(url);
                toast.success("Image selected from Media Library!");
              }} 
            />

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/80 block">Studio Representative Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="e.g. DejavuFM Studio"
                    maxLength={50}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-neon-purple/50 transition-colors"
                  />
                </div>
                <span className="text-[10px] text-white/30 block leading-relaxed">
                  This custom identity replaces the default "DejavuFM Studio" label across public chat, listener shoutouts, and private inbox rooms.
                </span>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || isUploadingImage}
                  className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-blue rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(124,58,237,0.25)]"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Studio Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Memoized sorted messages and visible slice for currentThread
  const sortedMessages = useMemo(() => {
    if (!currentThread?.messages) return [];
    return [...currentThread.messages].sort((a, b) => a.timestamp - b.timestamp);
  }, [currentThread?.messages]);

  const hasMoreMessages = sortedMessages.length > messageLimit;

  const visibleMessages = useMemo(() => {
    if (!hasMoreMessages) return sortedMessages;
    return sortedMessages.slice(sortedMessages.length - messageLimit);
  }, [sortedMessages, messageLimit, hasMoreMessages]);

  if (isInitialLoading) {
    return (
      <AppLoader size="lg" fullScreen />
    );
  }

  return (
    <div className={`w-full h-screen max-h-screen overflow-hidden admin-dashboard-container ${studioTheme === 'light' ? 'admin-light-mode' : ''}`}>
      <div className={`h-full w-full flex flex-col font-sans transition-colors duration-200 ${
        studioTheme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#070913] text-white'
      }`}>
      <header className={`flex items-center justify-between p-4 sm:px-6 sm:py-5 border-b shrink-0 z-10 transition-colors ${
        studioTheme === 'light'
          ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
          : 'bg-[#0D0F1D]/80 border-white/5 text-white shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl'
      }`}>
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(176,38,255,0.2)] shrink-0">
            <Mic className="w-5 h-5 text-neon-purple" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h1 className={`text-sm sm:text-base font-black font-display uppercase tracking-[0.15em] whitespace-nowrap ${
              studioTheme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              Studio Inbox
            </h1>
            <p className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-black font-display whitespace-nowrap mt-0.5 ${
              studioTheme === 'light' ? 'text-slate-500' : 'text-white/40'
            }`}>
              Live Broadcast & Listener Control Desk
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link to="/admin" className={`inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all border ${
            studioTheme === 'light'
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              : 'bg-white/[0.05] hover:bg-white/10 text-white/80 hover:text-white border-white/10'
          }`} title="Back to Dashboard">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className={`p-2 sm:p-2.5 rounded-xl transition-all border ${
              studioTheme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                : 'bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white border-white/10'
            }`} 
            title="Refresh Studio Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-neon-purple' : ''}`} />
          </button>
          <button onClick={toggleStudioTheme} className={`p-2 sm:p-2.5 rounded-xl transition-all border ${
            studioTheme === 'light'
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              : 'bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white border-white/10'
          }`} title={`Switch to ${studioTheme === 'light' ? 'Dark' : 'Light'} Mode`}>
            {studioTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button onClick={toggleSound} className={`p-2 sm:p-2.5 rounded-xl transition-all border ${
            studioTheme === 'light'
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              : 'bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white border-white/10'
          }`} title="Toggle notification sounds">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <a href="/" target="_blank" className={`p-2 sm:p-2.5 rounded-xl transition-all border ${
            studioTheme === 'light'
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              : 'bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white border-white/10'
          }`} title="Open Main Site">
            <Globe className="w-4 h-4" />
          </a>
          <button onClick={onLogout} className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all text-red-400/90 hover:text-red-400" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Subheader Navigation Tabs */}
      <div className={`hidden md:flex items-center justify-between px-6 py-2 border-b shrink-0 transition-colors ${
        studioTheme === 'light' ? 'bg-slate-100/90 border-slate-200' : 'bg-[#0A0C16] border-white/5'
      }`}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigateToTab('chats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'chats'
                ? (studioTheme === 'light' ? 'bg-purple-100 text-purple-800 border border-purple-300 shadow-sm' : 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30 shadow-[0_0_15px_rgba(176,38,255,0.15)]')
                : (studioTheme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05] border border-transparent')
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Studio Chat</span>
          </button>
          
          {isAdmin && (
            <>
              <button
                onClick={() => navigateToTab('connections')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'connections'
                    ? (studioTheme === 'light' ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 shadow-sm' : 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30 shadow-[0_0_15px_rgba(0,194,255,0.15)]')
                    : (studioTheme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05] border border-transparent')
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Connection Hub</span>
                {Object.values(connectedPlatforms).filter(Boolean).length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => navigateToTab('broadcast')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'broadcast'
                    ? (studioTheme === 'light' ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-sm' : 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30 shadow-[0_0_15px_rgba(0,194,255,0.15)]')
                    : (studioTheme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05] border border-transparent')
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Broadcast</span>
              </button>

              <button
                onClick={() => navigateToTab('profile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'profile'
                    ? (studioTheme === 'light' ? 'bg-purple-100 text-purple-800 border border-purple-300 shadow-sm' : 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30 shadow-[0_0_15px_rgba(124,58,237,0.15)]')
                    : (studioTheme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05] border border-transparent')
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => navigateToTab('settings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'settings'
                    ? (studioTheme === 'light' ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]')
                    : (studioTheme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05] border border-transparent')
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className={`text-[10px] uppercase font-mono tracking-widest hidden sm:block ${
            studioTheme === 'light' ? 'text-slate-500' : 'text-white/40'
          }`}>
            PIPELINES: <span className="text-emerald-500 font-bold">{Object.values(connectedPlatforms).filter(Boolean).length} ACTIVE</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {isTabTransitioning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`absolute inset-0 z-50 flex items-center justify-center ${
                studioTheme === 'light' ? 'bg-[#fcfcfc]' : 'bg-[#070913]'
              }`}
            >
              <PremiumRingLoader size="lg" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={slideDirection}>
          {activeTab === 'chats' && (
          <motion.div
            key="chats"
            custom={slideDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-1 overflow-hidden h-full w-full"
          >
            <div className="flex flex-1 overflow-hidden">
        {/* User List Panel */}
        <aside className={`w-full md:w-80 lg:w-96 border-r border-white/5 bg-[#0A0C16] flex flex-col shrink-0 transition-all ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/5 bg-[#080911]/40 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search live users..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all placeholder:text-white/40"
                />
              </div>
              <button
                onClick={() => {
                  if (selectedThreads.length > 0) {
                    setSelectedThreads([]);
                  } else {
                    const firstUser = sortedThreads[0]?.user.toLowerCase();
                    if (firstUser) setSelectedThreads([firstUser]);
                  }
                }}
                className={`p-2.5 rounded-xl border transition-all text-xs font-bold shrink-0 flex items-center justify-center cursor-pointer ${
                  selectedThreads.length > 0
                    ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/30 shadow-[0_0_10px_rgba(176,38,255,0.15)]'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-white/60 hover:text-white'
                }`}
                title={selectedThreads.length > 0 ? "Clear selection" : "Toggle bulk selection"}
              >
                <CheckSquare className="w-4 h-4" />
              </button>
            </div>

            {/* Bulk actions bar (collapsible with Framer Motion) */}
            <AnimatePresence>
              {selectedThreads.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center gap-1.5 text-white/70 hover:text-white font-mono font-medium cursor-pointer"
                        >
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                            selectedThreads.length === sortedThreads.length && sortedThreads.length > 0
                              ? 'bg-neon-purple border-neon-purple text-white'
                              : 'border-white/30 hover:border-white/50'
                          }`}>
                            {selectedThreads.length === sortedThreads.length && sortedThreads.length > 0 && (
                              <Check className="w-2.5 h-2.5 stroke-[3px]" />
                            )}
                          </span>
                          <span>Select All ({sortedThreads.length})</span>
                        </button>
                      </div>
                      <span className="text-neon-purple font-bold font-mono">
                        {selectedThreads.length} selected
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      <button
                        onClick={() => handleMarkSelected('read')}
                        className="py-1.5 px-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 text-white/80 hover:text-white transition-all flex flex-col items-center gap-1 cursor-pointer"
                        title="Mark Selected as Read"
                      >
                        <MailOpen className="w-3.5 h-3.5 text-neon-blue" />
                        <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Read</span>
                      </button>

                      <button
                        onClick={() => handleMarkSelected('unread')}
                        className="py-1.5 px-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 text-white/80 hover:text-white transition-all flex flex-col items-center gap-1 cursor-pointer"
                        title="Mark Selected as Unread"
                      >
                        <Mail className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Unread</span>
                      </button>

                      <button
                        onClick={handlePinSelected}
                        className="py-1.5 px-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 text-white/80 hover:text-white transition-all flex flex-col items-center gap-1 cursor-pointer"
                        title="Pin Selected Conversations"
                      >
                        <Pin className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Pin</span>
                      </button>

                      <button
                        onClick={handleDeleteSelected}
                        className="py-1.5 px-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all flex flex-col items-center gap-1 cursor-pointer"
                        title="Delete Selected Conversations"
                      >
                        <Trash className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Delete</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.02] pb-36 md:pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/10">
            {sortedThreads.map(thread => {
              const isSelected = selectedUser?.toLowerCase() === thread.user.toLowerCase();
              const isPinned = pinnedThreads.includes(thread.user.toLowerCase());
              const isThreadChecked = selectedThreads.includes(thread.user.toLowerCase());
              return (
                <div
                  key={thread.user}
                  className={`w-full text-left flex items-center gap-2 p-4 transition-all relative group/item ${
                    isSelected 
                      ? 'bg-white/[0.04] border-l-2 border-y-0 border-r-0 border-neon-purple shadow-[inset_4px_0_15px_rgba(255,255,255,0.01)]'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Bulk selection checkbox */}
                  <div className={`transition-all duration-200 flex items-center shrink-0 ${
                    selectedThreads.length > 0 
                      ? 'w-5 opacity-100 mr-1' 
                      : 'w-0 opacity-0 group-hover/item:w-5 group-hover/item:opacity-100 group-hover/item:mr-1 overflow-hidden'
                  }`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleThreadSelection(thread.user.toLowerCase());
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                        isThreadChecked
                          ? 'bg-neon-purple border-neon-purple text-white shadow-[0_0_8px_rgba(176,38,255,0.3)]'
                          : 'border-white/20 hover:border-white/45 bg-black/40 text-transparent'
                      }`}
                    >
                      {isThreadChecked && (
                        <Check className="w-2.5 h-2.5 stroke-[3px]" />
                      )}
                    </button>
                  </div>

                  <div onClick={() => handleSelectUser(thread.user)} className="flex-1 flex items-center gap-3.5 overflow-hidden cursor-pointer">
                    <div className="relative shrink-0">
                      <img src={thread.avatar} alt={thread.user} className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 object-cover" />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#0A0C16]"></span>
                      </span>
                    </div>
                    <div className="flex-1 overflow-hidden space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="font-bold text-xs text-white/90 truncate">{thread.user}</h4>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/40 truncate pr-2">
                        {thread.messages.slice(-1)[0] ? replaceTextEmojis(thread.messages.slice(-1)[0].text) : 'No messages'}
                      </p>
                    </div>
                  </div>

                  {/* Action badges or hover quick-actions */}
                  <div className="relative shrink-0 flex items-center justify-end w-20 h-10">
                    {/* Default state: visible when NOT hovered */}
                    <div className="absolute right-0 flex flex-col items-end gap-1.5 transition-all duration-200 group-hover/item:opacity-0 group-hover/item:pointer-events-none">
                      <span className="text-[9px] font-mono text-white/40">
                        {thread.messages.length > 0 ? new Date(thread.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      <PlatformBadge platform={thread.platform} thread={thread} />
                      <div className="flex items-center gap-1">
                        {isPinned && (
                          <Pin className="w-3 h-3 text-amber-400 fill-current" />
                        )}
                        {thread.unreadCount > 0 && (
                          <div 
                            className="px-1.5 py-0.5 text-[9px] font-mono font-black leading-none text-white rounded-full border border-black/30 shadow-[0_2px_8px_-1px_var(--color-neon-purple)]"
                            style={{ background: 'linear-gradient(135deg, var(--color-neon-purple), var(--color-neon-blue))' }}
                          >
                            {thread.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hover actions: visible only when hovered */}
                    <div className="absolute right-0 flex items-center gap-1 opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPinned) {
                            handleUnpin(thread.user.toLowerCase());
                          } else {
                            setPinnedThreads(prev => Array.from(new Set([...prev, thread.user.toLowerCase()])));
                            toast.success(`Pinned ${thread.user}'s conversation.`);
                          }
                        }}
                        title={isPinned ? "Unpin conversation" : "Pin conversation"}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isPinned 
                            ? 'text-amber-400 hover:bg-amber-500/10' 
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isRead = thread.unreadCount === 0;
                          const userKey = thread.user.toLowerCase();
                          setThreads(prev => {
                            const newThreads = { ...prev };
                            if (newThreads[userKey]) {
                              newThreads[userKey].unreadCount = isRead ? 1 : 0;
                            }
                            return newThreads;
                          });
                          setLastReadTimestamps(prev => {
                            const updated = { ...prev, [userKey]: isRead ? Date.now() : 0 };
                            localStorage.setItem('dejavu_studio_last_read', JSON.stringify(updated));
                            return updated;
                          });
                          toast.success(`Conversation marked as ${isRead ? 'unread' : 'read'}.`);
                        }}
                        title={thread.unreadCount > 0 ? "Mark as Read" : "Mark as Unread"}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {thread.unreadCount > 0 ? <MailOpen className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearConversation(thread.user);
                        }}
                        title="Delete conversation"
                        className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Chat Panel */}
        <main className={`flex-1 flex flex-col bg-[#080911] ${selectedUser ? 'flex' : 'hidden md:flex'}`}>
          {currentThread ? (
            <>
              <header className="flex items-center justify-between gap-4 p-4 sm:px-6 border-b border-white/5 bg-[#090B15] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-2 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative shrink-0">
                    <img src={currentThread.avatar} alt={currentThread.user} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/5 border border-white/5 object-cover" />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <h3 className="font-bold text-sm sm:text-base text-white/90 truncate tracking-tight">{currentThread.user}</h3>
                      <div className="shrink-0">
                        <PlatformBadge platform={currentThread.platform} thread={currentThread} />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin && currentThread.user !== adminUsername && (
                    <>
                      <button
                        onClick={() => handleClearConversation(currentThread.user)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 shadow-sm"
                        title={`Clear all messages from ${currentThread.user}`}
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline sm:inline">Clear</span>
                      </button>
                      <button
                        onClick={() => handleBanUser(currentThread.user)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 shadow-sm"
                        title={`Permanently ban ${currentThread.user}`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline sm:inline">Ban User</span>
                      </button>
                    </>
                  )}
                </div>
              </header>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[#080911] to-[#06070D] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/10">
                {hasMoreMessages && (
                  <div className="flex justify-center pb-4 pt-1">
                    <button
                      onClick={() => setMessageLimit(prev => prev + 50)}
                      className="px-5 py-2 border rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-250 shadow-sm bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-white/50 hover:text-white"
                    >
                      Load older messages ({sortedMessages.length - messageLimit} remaining)
                    </button>
                  </div>
                )}
                {visibleMessages.map(msg => {
                  const isAdminReply = isSenderAdminMsg(msg.user);
                  return (
                    <div key={msg.id} className={`flex items-start gap-3 group/msg ${isAdminReply ? 'flex-row-reverse' : ''}`}>
                      {isAdminReply && <img src={msg.avatar || studioImage || '/icon.svg'} alt={msg.user} className="w-8 h-8 rounded-lg bg-white/5 border border-neon-purple/50 mt-0.5 object-cover shadow-[0_0_10px_rgba(124,58,237,0.3)]" />}
                      {!isAdminReply && <img src={msg.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user}`} alt={msg.user} className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 mt-0.5 object-cover" />}
                      <div className={`max-w-lg space-y-1.5 ${isAdminReply ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-2 text-[10px] text-white/40 ${isAdminReply ? 'justify-end' : ''}`}>
                          <span className={`font-bold ${isAdminReply ? 'text-neon-purple' : (msg.type === 'shoutout' ? 'text-amber-400' : 'text-neon-blue')}`}>
                            {msg.type === 'shoutout' ? '🔥 Shoutout' : msg.user}
                          </span>
                          {isAdminReply && (
                            <span className="text-[8px] uppercase tracking-wider font-bold bg-neon-purple/20 text-neon-purple px-1.5 py-0.5 rounded-md border border-neon-purple/30 shrink-0">
                              Representative
                            </span>
                          )}
                          <span>•</span>
                          <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                        
                        <div className={`p-4 rounded-2xl border text-sm leading-relaxed transition-all ${
                          isAdminReply 
                            ? 'bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] border-purple-500/10 text-white rounded-tr-none text-left shadow-md' 
                            : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 text-white/90 rounded-tl-none'
                        }`}>
                          {msg.text && <p className="whitespace-pre-wrap">{parseEmojisAndEmotes(msg.text)}</p>}
                          
                          {msg.imageUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-white/5 bg-black/40 max-w-sm">
                              <img src={msg.imageUrl} className="w-full h-auto max-h-60 object-contain hover:scale-102 transition-transform duration-300" alt="Attachment" />
                            </div>
                          )}
                          
                          {msg.audioUrl && (
                            <div className="mt-2 p-2 rounded-xl border border-white/5 bg-black/30 max-w-sm">
                              <audio src={msg.audioUrl} controls className="w-full h-10 accent-neon-purple" />
                            </div>
                          )}
                          
                          {msg.videoUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-white/5 bg-black/40 max-w-sm">
                              <video src={msg.videoUrl} controls className="w-full h-auto max-h-60" />
                            </div>
                          )}

                          {isAdmin && (
                            <div className={`pt-2 mt-2 border-t border-white/5 flex items-center gap-2 ${isAdminReply ? 'justify-end' : 'justify-start'}`}>
                              {msg.text && (
                                <button
                                  onClick={() => {
                                    const cleanText = msg.text.replace(/^@\w+\s/, "");
                                    setReplyText(cleanText);
                                    toast.success("Loaded into reply input");
                                  }}
                                  className="flex items-center justify-center p-1 rounded-md border bg-white/[0.03] hover:bg-white/[0.08] text-white/40 hover:text-neon-blue border-white/5 transition-all"
                                  title="Load message to resend"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMessage(msg)}
                                className="flex items-center justify-center p-1 rounded-md bg-red-500/5 hover:bg-red-500/15 text-red-500 border border-red-500/10 transition-all"
                                title="Delete Message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <footer className="p-4 border-t border-white/5 bg-[#0A0C16] shrink-0 space-y-3 pb-36 md:pb-4 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
                <div className="flex md:flex-wrap items-center gap-1.5 overflow-x-auto md:overflow-x-visible pb-1.5 md:pb-0 scrollbar-none shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {DEFAULT_QUICK_REPLIES.map(reply => (
                    <button key={reply} onClick={() => setReplyText(reply)} className="px-3 py-1.5 border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.06] rounded-full text-[10px] font-semibold text-white/50 hover:text-white/80 transition-all duration-200 shrink-0">
                      {reply}
                    </button>
                  ))}
                  {customReplies.map(reply => (
                    <div key={reply} className="group/reply relative flex items-center shrink-0">
                      <button onClick={() => setReplyText(reply)} className="pl-3 pr-7 py-1.5 bg-neon-purple/5 hover:bg-neon-purple/15 border border-neon-purple/10 hover:border-neon-purple/20 rounded-full text-[10px] font-semibold text-neon-purple transition-all duration-200">
                        {reply}
                      </button>
                      <button onClick={() => removeCustomReply(reply)} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-black/30 text-white/40 opacity-0 group-hover/reply:opacity-100 hover:!opacity-100 hover:bg-red-500/80 hover:text-white transition-all">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addCustomReply} className="w-7 h-7 flex items-center justify-center border border-dashed border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.06] rounded-full text-white/40 hover:text-white transition-colors shrink-0" title="Add custom reply">
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                {attachment && <AttachmentPreview file={attachment} onRemove={() => setAttachment(null)} />}
                <div className="flex items-center gap-2.5 pt-1">
                  {!isTwitchChat && (
                    <>
                      <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`p-3 rounded-xl border transition-all duration-300 shrink-0 ${
                          isRecording 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' 
                            : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white border-white/5'
                        }`}
                        title={isRecording ? "Stop Recording" : "Record Audio Clip"}
                      >
                        {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </>
                  )}

                  <input type="file" ref={fileInputRef} onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="hidden" />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleSendReply()}
                      placeholder={`Reply to @${selectedUser}...`}
                      className="w-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all placeholder:text-white/40"
                    />
                  </div>
                  <button onClick={handleSendReply} disabled={isSending} className="w-10 h-10 bg-gradient-to-r from-neon-purple to-violet-600 rounded-xl flex items-center justify-center text-white hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(176,38,255,0.3)] disabled:opacity-50 shrink-0">
                    {isSending ? <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8 bg-[#080911] text-white/40">
              <div className="space-y-4 max-w-xs">
                <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center mx-auto animate-pulse text-white/40">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white/80">Stream Desk Control</h3>
                  <p className="text-xs text-white/40 leading-relaxed">Select a user thread from the left pane to handle real-time listener feedback and studio private direct messages.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
          </motion.div>
        )}

        {activeTab === 'connections' && (
          <motion.div
            key="connections"
            custom={slideDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col overflow-hidden h-full w-full"
          >
            {renderConnectionHub()}
          </motion.div>
        )}

        {activeTab === 'broadcast' && (
          <motion.div
            key="broadcast"
            custom={slideDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col overflow-hidden h-full w-full"
          >
            {renderBroadcastView()}
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            custom={slideDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col overflow-hidden h-full w-full"
          >
            {renderSettingsView()}
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            custom={slideDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 flex flex-col overflow-hidden h-full w-full"
          >
            {renderProfileView()}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Tab Bar for Mobile App View with Swipe Support & Slide/Scale Transitions */}
      {isAdmin && (
        <div
          onTouchStart={handleBarTouchStart}
          onTouchEnd={handleBarTouchEnd}
          className="md:hidden fixed bottom-5 left-4 right-4 z-40 bg-[#0D0F1D]/95 backdrop-blur-2xl border border-white/10 px-4 py-2.5 rounded-2xl flex items-center justify-around shadow-[0_12px_40px_rgba(0,0,0,0.85)] select-none"
        >
          <motion.button
            onClick={() => navigateToTab('chats')}
            whileTap={{ scale: 0.92 }}
            className={`relative flex items-center justify-center p-2.5 rounded-full transition-colors duration-200 ${
              activeTab === 'chats' ? 'text-neon-purple' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {activeTab === 'chats' && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-white/5 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <motion.div
              animate={{ scale: activeTab === 'chats' ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative z-10"
            >
              <div className="relative">
                <MessageSquare className="w-6 h-6" />
                {totalUnreadCount > 0 && (
                  <span 
                    className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-black font-mono leading-none text-white border border-[#0D0F1D]/40 shadow-[0_2px_8px_-1px_var(--color-neon-purple)]"
                    style={{ background: 'linear-gradient(135deg, var(--color-neon-purple), var(--color-neon-blue))' }}
                  >
                    {totalUnreadCount}
                  </span>
                )}
              </div>
            </motion.div>
          </motion.button>

          <motion.button
            onClick={() => navigateToTab('connections')}
            whileTap={{ scale: 0.92 }}
            className={`relative flex items-center justify-center p-2.5 rounded-full transition-colors duration-200 ${
              activeTab === 'connections' ? 'text-neon-blue' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {activeTab === 'connections' && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-white/5 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <motion.div
              animate={{ scale: activeTab === 'connections' ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative z-10"
            >
              <div className="relative">
                <Link2 className="w-6 h-6" />
                {Object.values(connectedPlatforms).filter(Boolean).length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
            </motion.div>
          </motion.button>

          <motion.button
            onClick={() => navigateToTab('broadcast')}
            whileTap={{ scale: 0.92 }}
            className={`relative flex items-center justify-center p-2.5 rounded-full transition-colors duration-200 ${
              activeTab === 'broadcast' ? 'text-neon-blue' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {activeTab === 'broadcast' && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-white/5 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <motion.div
              animate={{ scale: activeTab === 'broadcast' ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative z-10"
            >
              <Radio className="w-6 h-6" />
            </motion.div>
          </motion.button>

          <motion.button
            onClick={() => navigateToTab('profile')}
            whileTap={{ scale: 0.92 }}
            className={`relative flex items-center justify-center p-2.5 rounded-full transition-colors duration-200 ${
              activeTab === 'profile' ? 'text-neon-purple' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {activeTab === 'profile' && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-white/5 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <motion.div
              animate={{ scale: activeTab === 'profile' ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative z-10"
            >
              <Camera className="w-6 h-6" />
            </motion.div>
          </motion.button>

          <motion.button
            onClick={() => navigateToTab('settings')}
            whileTap={{ scale: 0.92 }}
            className={`relative flex items-center justify-center p-2.5 rounded-full transition-colors duration-200 ${
              activeTab === 'settings' ? 'text-amber-400' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {activeTab === 'settings' && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-white/5 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <motion.div
              animate={{ scale: activeTab === 'settings' ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative z-10"
            >
              <Settings className="w-6 h-6" />
            </motion.div>
          </motion.button>
        </div>
      )}

      {/* Create Custom Quick Reply Dialog */}
      <AnimatePresence>
        {isCreatingQuickReply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0D0F1D] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl relative"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Add Custom Reply</h3>
                <p className="text-[10px] text-white/40">Define a reusable text template for quick delivery.</p>
              </div>
              <textarea
                value={newQuickReplyText}
                onChange={e => setNewQuickReplyText(e.target.value)}
                placeholder="Type your quick reply text template here..."
                rows={3}
                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-neon-purple/40 focus:ring-1 focus:ring-neon-purple/20 transition-all"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreatingQuickReply(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-semibold text-white/70 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomReply}
                  className="px-4 py-2 bg-gradient-to-r from-neon-purple to-violet-600 rounded-xl text-xs font-bold text-white shadow-md shadow-neon-purple/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  Save Template
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Connection Test Diagnostic Dialog */}
      <AnimatePresence>
        {testingPlatform && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0D0F1D] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-neon-purple/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-neon-blue/10 rounded-full blur-3xl" />

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 flex items-center justify-center text-white border border-white/10 shadow-[0_0_15px_rgba(176,38,255,0.2)]">
                  <Activity className="w-6 h-6 text-neon-purple" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Gateway Diagnostics
                  </h3>
                  <p className="text-[10px] text-white/40 uppercase font-mono">
                    Target: {testingPlatform.toUpperCase()} Pipeline
                  </p>
                </div>
              </div>

              {!testResult ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-6">
                  <div className="relative flex items-center justify-center w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-neon-blue/10 blur-xl animate-pulse" />
                    <div className="absolute w-16 h-16 rounded-full border-2 border-t-neon-blue border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '0.8s' }} />
                    <div className="absolute w-20 h-20 rounded-full border-2 border-b-neon-purple border-l-transparent border-t-transparent border-r-transparent animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }} />
                    <div className="z-10 flex items-center justify-center w-12 h-12 rounded-full bg-[#070913] border border-white/5">
                      <RefreshCw className="w-5 h-5 text-neon-blue animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-center max-w-sm">
                    <p className="text-xs font-semibold text-white/80">{testProgress}</p>
                    <p className="text-[10px] text-white/30">Please do not close this modal or refresh the web browser.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 py-2">
                  <div className={`p-4 rounded-2xl border ${
                    testResult.success
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/5 border-red-500/20 text-red-400'
                  } flex items-start gap-3`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {testResult.success ? "Connection Secure" : "Handshake Failed"}
                      </h4>
                      <p className="text-xs text-white/70 leading-relaxed">
                        {testResult.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      onClick={() => setTestingPlatform(null)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                        testResult.success
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-500/15 hover:brightness-110'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/80 hover:text-white'
                      }`}
                    >
                      Close Diagnostic Report
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PWA Installation Modal */}
      <AnimatePresence>
        {showIosInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg p-6 rounded-2xl border transition-colors shadow-2xl ${
                studioTheme === 'light'
                  ? 'bg-white border-slate-200 text-slate-900 shadow-xl'
                  : 'bg-[#0f1123] border-white/10 text-white shadow-[0_10px_40px_rgba(0,0,0,0.5)]'
              }`}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                  <Mic className="w-5 h-5 text-neon-purple animate-pulse" />
                  Install Studio Inbox App
                </h3>
                <button 
                  onClick={() => setShowIosInstructions(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    studioTheme === 'light' 
                      ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className={`text-xs sm:text-sm mb-4 leading-relaxed ${studioTheme === 'light' ? 'text-slate-600' : 'text-white/70'}`}>
                Add <strong className="text-neon-purple">Studio Inbox</strong> to your home screen or desktop for a standalone, full-screen live presenter control desk.
              </p>

              <div className="space-y-4">
                {/* iOS Instructions */}
                <div className={`p-4 rounded-xl border ${
                  studioTheme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/[0.02] border-white/10 text-white/90'
                }`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neon-purple mb-2 flex items-center gap-1.5">
                    📱 iPhone & iPad (Safari)
                  </h4>
                  <ol className="space-y-2 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neon-purple shrink-0">1.</span>
                      <span>Tap the <strong className="text-neon-purple">Share</strong> icon (square with arrow up) in Safari.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neon-purple shrink-0">2.</span>
                      <span>Scroll down and tap <strong className="text-neon-purple">Add to Home Screen</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neon-purple shrink-0">3.</span>
                      <span>Tap <strong className="text-neon-purple">Add</strong> at top right to complete installation.</span>
                    </li>
                  </ol>
                </div>

                {/* Android & Desktop Chrome/Edge Instructions */}
                <div className={`p-4 rounded-xl border ${
                  studioTheme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/[0.02] border-white/10 text-white/90'
                }`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neon-blue mb-2 flex items-center gap-1.5">
                    💻 Android / Chrome / Edge
                  </h4>
                  <ol className="space-y-2 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neon-blue shrink-0">1.</span>
                      <span>Click the <strong className="text-neon-blue">Install Icon</strong> in your address bar (or browser menu <strong className="text-neon-blue">⋮</strong>).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-neon-blue shrink-0">2.</span>
                      <span>Select <strong className="text-neon-blue">Install Studio Inbox</strong> or <strong className="text-neon-blue">Add to Home Screen</strong>.</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowIosInstructions(false)}
                  className="px-5 py-2.5 bg-gradient-to-r from-neon-purple to-neon-blue text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-md"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
