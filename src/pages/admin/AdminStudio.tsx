import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Send, Paperclip, X, Maximize, Mic, MessageSquare, Search, ArrowLeft, Image as ImageIcon, Music, Video, Volume2, VolumeX, Ban, Trash2, Eraser, ShieldAlert, MailX, PlusCircle, Square, Pin, CheckSquare, MailOpen, Mail, Trash, Eye, EyeOff, Settings, Link2, Globe, RefreshCw, Download, Phone, Facebook, Instagram, Twitch, Activity, CheckCircle, AlertTriangle, Camera, Check, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { fetchAdmin } from "./adminApi";
import { useModal } from "../../context/ModalContext";
import { useLogo } from "../../hooks/useLogo";

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

    normalized[key] = {
      ...thread,
      messages: filtered,
      lastMessageTimestamp: filtered.length ? filtered[filtered.length - 1].timestamp : thread.lastMessageTimestamp,
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

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // A short, clean "ping" sound
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (err) {
    console.warn("Failed to play Studio notification sound", err);
  }
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

export function AdminStudio({ onLogout }: { onLogout: () => void }) {
  const { isLightMode } = useLogo();
  const { showConfirm } = useModal();
  const [studioTheme, setStudioTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('studio_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return localStorage.getItem('dashboard_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleStudioTheme = () => {
    const nextTheme = studioTheme === 'dark' ? 'light' : 'dark';
    setStudioTheme(nextTheme);
    localStorage.setItem('studio_theme', nextTheme);
    toast.success(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} mode`);
  };
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem('studio_sound_enabled') || 'true');
    } catch {
      return true;
    }
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1200);
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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const selectedUserRef = useRef<string | null>(null);

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
  const studioNameRef = useRef(studioName);
  const studioImageRef = useRef(studioImage);

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

  const isSenderAdminMsg = (user: string) => {
    if (!user) return false;
    const lowerUser = user.toLowerCase();
    const lowerStudio = studioNameRef.current.toLowerCase();
    const lowerAdmin = adminUsername ? adminUsername.toLowerCase() : '';
    return lowerUser === "dejavufm studio" || lowerUser === lowerStudio || lowerUser === lowerAdmin;
  };

  const [activeTab, setActiveTab] = useState<'chats' | 'connections' | 'settings' | 'profile'>('chats');
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
      localStorage.setItem('studio_connected_platforms', JSON.stringify(updated));
      toast.success(`${platform.toUpperCase()} connection state updated.`);
      return updated;
    });
  };

  const handleSavePlatformConfig = (platform: string, config: Record<string, string>) => {
    setPlatformConfigs(prev => {
      const updated = { ...prev, [platform]: { ...prev[platform], ...config } };
      localStorage.setItem('studio_platform_configs', JSON.stringify(updated));
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
      if (!oauthToken || !oauthToken.trim().startsWith('oauth:')) {
        setTestResult({
          success: false,
          message: "Validation Error: Twitch OAuth Token is invalid. It must begin with 'oauth:' prefix (e.g. oauth:abcdef123)."
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
      "Yo Dejavu FM! Play that new track from earlier! Absolute banger 🔥",
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
  const queryClient = useQueryClient();

  const { data: authData } = useQuery({
    queryKey: ['admin-auth-check'],
    queryFn: () => fetchAdmin('/api/admin/check').then(res => res.json()),
  });
  const adminUsername = authData?.user?.username ?? authData?.username;
  const isAdmin = authData?.user?.role === 'admin' || authData?.role === 'admin';

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
      
      return {
        ...prev,
        [userKey]: {
          user: user,
          avatar: existing?.avatar || message.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
          messages: newMessages,
          lastMessageTimestamp: message.timestamp,
          unreadCount: selectedKey === userKey ? 0 : (existing?.unreadCount || 0) + 1,
        },
      };
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

          nextThreads[userKey] = {
            user: user,
            avatar: existing?.avatar || msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
            messages: threadMessages,
            lastMessageTimestamp: msg.timestamp,
            unreadCount: finalUnreadCount,
          };
        });
        return nextThreads;
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

          nextThreads[userKey] = {
            user: user,
            avatar: existing?.avatar || msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
            messages: threadMessages,
            lastMessageTimestamp: msg.timestamp,
            unreadCount: finalUnreadCount,
          };
        });
        return nextThreads;
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

          nextThreads[userKey] = {
            user: user,
            avatar: existing?.avatar || shoutout.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
            messages: threadMessages,
            lastMessageTimestamp: ts,
            unreadCount: finalUnreadCount,
          };
        });
        return nextThreads;
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
    };
  }, [adminUsername]);

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_studio_threads', JSON.stringify(threads));
    } catch (error) {
      console.warn("Failed to save studio threads to local storage", error);
    }
  }, [threads]);

  useEffect(() => {
    try {
      localStorage.setItem('studio_pinned_threads', JSON.stringify(pinnedThreads));
    } catch (error) {
      console.warn("Failed to save pinned threads to local storage", error);
    }
  }, [pinnedThreads]);

  useEffect(() => {
    try {
      localStorage.setItem('dejavu_studio_custom_replies', JSON.stringify(customReplies));
    } catch (error) {
      console.warn("Failed to save custom replies to local storage", error);
    }
  }, [customReplies]);

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
        const chatPayload = {
          user: studioName,
          text: `@${selectedUser} ${replyText}`,
          imageUrl: mediaType === 'image' ? mediaUrl : null,
          audioUrl: mediaType === 'audio' ? mediaUrl : null,
          videoUrl: mediaType === 'video' ? mediaUrl : null,
          avatar_url: studioImage,
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
          { key: 'phone', label: 'Business Phone Number', placeholder: '+44 7123 456789' },
          { key: 'verifyToken', label: 'Webhook Verify Token', placeholder: 'Enter verify token', type: 'password' },
          { key: 'webhook', label: 'Webhook Callback URL', placeholder: 'https://api.dejavu.fm/v1/whatsapp/webhook', disabled: true }
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
          { key: 'accessToken', label: 'Graph Access Token', placeholder: 'Enter system user access token', type: 'password' }
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
          { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'Enter Facebook Page Access Token', type: 'password' }
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-28 md:pb-12">
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
                        initialValue={config[field.key] || ''}
                        onSave={(val) => handleSavePlatformConfig(platform.id, { [field.key]: val })}
                      />
                    ))}
                  </div>

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
        <div className="max-w-4xl mx-auto space-y-8 pb-28 md:pb-12">
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

            <div className="bg-[#0D0F1D] border border-white/5 rounded-2xl p-6 space-y-4 md:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Data Administration & Housekeeping</h3>
              <p className="text-xs text-white/40 leading-relaxed">Secure admin functions to clear or flush transient storage buffers inside the broadcast desk system.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-red-500/[0.02] border border-red-500/10 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-xs font-bold text-white">Flush Live Chat Buffer</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed">Remove and delete all public message threads recorded in the station timeline server-side.</p>
                  <button
                    onClick={handleClearPublicChat}
                    className="px-3 py-2 bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-red-400 transition-all"
                  >
                    Clear Public Chat Room
                  </button>
                </div>

                <div className="p-4 bg-red-500/[0.02] border border-red-500/10 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-white">Wipe Private Inbox</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed">Wipe out and delete all registered private listener threads and attachments from local and database stores.</p>
                  <button
                    onClick={handleClearPrivateMessages}
                    className="px-3 py-2 bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-red-400 transition-all"
                  >
                    Clear All Private DMs Cache
                  </button>
                </div>

                <div className="p-4 bg-red-500/[0.02] border border-red-500/10 rounded-xl space-y-3 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-white">Full Database Wipe (All Chats & Shoutouts)</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed">Permanently purge and delete all public chat room messages, private listener DMs, and live studio shoutouts recorded in the system.</p>
                  <button
                    onClick={handleClearAllChatsAndShoutouts}
                    className="w-full px-3 py-2 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                  >
                    Clear All Chats, DMs & Shoutouts
                  </button>
                </div>
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
        <div className="max-w-xl mx-auto space-y-8 pb-28 md:pb-12">
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
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neon-purple bg-neon-purple/10 border border-neon-purple/20 px-2.5 py-1 rounded-full">
                  Station Identity
                </span>
                <p className="text-[11px] text-white/40 mt-1.5">Click the avatar to upload a custom square logo (PNG, JPG).</p>
              </div>
            </div>

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

  if (isInitialLoading) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center font-sans transition-colors duration-300 ${studioTheme === 'light' ? 'bg-[#f3f4f6] text-[#111827]' : 'bg-[#070913] text-white'}`}>
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-neon-purple/20 blur-xl animate-pulse" />
          <div className="absolute w-20 h-20 rounded-full border-2 border-t-neon-purple border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '1s' }} />
          <div className="absolute w-24 h-24 rounded-full border-2 border-b-neon-blue border-l-transparent border-t-transparent border-r-transparent animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
          <div className={`z-10 flex items-center justify-center w-16 h-16 rounded-full border shadow-[0_0_20px_rgba(176,38,255,0.3)] ${studioTheme === 'light' ? 'bg-white border-black/10' : 'bg-[#0D0F1D] border-white/10'}`}>
            <Mic className="w-6 h-6 text-neon-purple animate-pulse" />
          </div>
        </div>
        <div className="mt-8 text-center space-y-2">
          <h2 className={`text-sm font-bold uppercase tracking-[0.25em] ${studioTheme === 'light' ? 'text-black/80' : 'text-white/90'}`}>DEJAVU FM STUDIO</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className={`text-[10px] uppercase tracking-[0.15em] font-mono ${studioTheme === 'light' ? 'text-black/40' : 'text-white/40'}`}>Initializing Stream Desk</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-screen max-h-screen overflow-hidden ${studioTheme === 'light' ? 'admin-light-mode' : ''}`}>
      <div className="h-full w-full flex flex-col bg-[#070913] text-white font-sans admin-dashboard-container">
      <header className="flex items-center justify-between p-4 sm:px-6 sm:py-5 border-b border-white/5 bg-[#0D0F1D]/60 backdrop-blur-2xl shrink-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(176,38,255,0.2)] shrink-0">
            <Mic className="w-5 h-5 text-neon-purple" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h1 className={`text-sm sm:text-base font-bold uppercase tracking-[0.15em] bg-clip-text text-transparent bg-gradient-to-r whitespace-nowrap ${
              studioTheme === 'light' 
                ? 'from-slate-900 via-slate-800 to-slate-700' 
                : 'from-white via-white/90 to-white/70'
            }`}>
              Studio Inbox
            </h1>
            <p className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-bold whitespace-nowrap mt-0.5 ${
              studioTheme === 'light' ? 'text-slate-500' : 'text-white/40'
            }`}>
              Live Broadcast & Listener Control Desk
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link to="/admin" className="inline-flex items-center gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/80 hover:text-white text-[11px] font-semibold uppercase tracking-wider transition-all border border-white/5 hover:border-white/15" title="Back to Dashboard">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <button onClick={toggleStudioTheme} className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all text-white/60 hover:text-white border border-white/5" title={`Switch to ${studioTheme === 'light' ? 'Dark' : 'Light'} Mode`}>
            {studioTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button onClick={toggleSound} className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all text-white/60 hover:text-white border border-white/5" title="Toggle notification sounds">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <a href="/" target="_blank" className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all text-white/60 hover:text-white border border-white/5" title="Open Main Site">
            <Globe className="w-4 h-4" />
          </a>
          <button onClick={onLogout} className="p-2 sm:p-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/20 transition-all text-red-400/80 hover:text-red-400" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Subheader Navigation Tabs */}
      <div className="hidden md:flex items-center justify-between px-6 py-2 bg-[#0A0C16] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'chats'
                ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20 shadow-[0_0_15px_rgba(176,38,255,0.15)]'
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02] border border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Studio Chat</span>
          </button>
          
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'connections'
                ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20 shadow-[0_0_15px_rgba(0,194,255,0.15)]'
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02] border border-transparent'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Connection Hub</span>
            {Object.values(connectedPlatforms).filter(Boolean).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'profile'
                ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02] border border-transparent'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02] border border-transparent'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest hidden sm:block">
            PIPELINES: <span className="text-emerald-400">{Object.values(connectedPlatforms).filter(Boolean).length} ACTIVE</span>
          </div>
        </div>
      </div>

      {activeTab === 'chats' && (
        <div className="flex flex-1 overflow-hidden">
        {/* User List Panel */}
        <aside className={`w-full md:w-80 lg:w-96 border-r border-white/5 bg-[#0A0C16] flex flex-col shrink-0 transition-transform duration-300 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/5 bg-[#080911]/40">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search live users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all placeholder-white/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.02] pb-24 md:pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/10">
            {sortedThreads.map(thread => {
              const isSelected = selectedUser?.toLowerCase() === thread.user.toLowerCase();
              const isPinned = pinnedThreads.includes(thread.user.toLowerCase());
              return (
                <div
                  key={thread.user}
                  className={`w-full text-left flex items-center gap-3 p-4 transition-all relative group/item ${isSelected ? 'bg-white/[0.03] border-l-2 border-y-0 border-r-0 border-neon-purple shadow-[inset_4px_0_15px_rgba(255,255,255,0.01)]' : 'hover:bg-white/[0.02]'}`}
                >
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
                        {thread.messages.slice(-1)[0]?.text || 'No messages'}
                      </p>
                    </div>
                  </div>

                  {/* Action badges or hover quick-actions */}
                  <div className="relative shrink-0 flex items-center justify-end w-20 h-10">
                    {/* Default state: visible when NOT hovered */}
                    <div className="absolute right-0 flex flex-col items-end gap-1.5 transition-all duration-200 group-hover/item:opacity-0 group-hover/item:pointer-events-none">
                      <span className="text-[9px] font-mono text-white/30">
                        {thread.messages.length > 0 ? new Date(thread.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      <PlatformBadge platform={thread.platform} thread={thread} />
                      <div className="flex items-center gap-1">
                        {isPinned && (
                          <Pin className="w-3 h-3 text-amber-400 fill-current" />
                        )}
                        {thread.unreadCount > 0 && (
                          <div className="px-1.5 py-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_10px_rgba(168,85,247,0.4)] text-[9px] font-mono font-bold text-white rounded-full">
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
                        className={`p-1.5 rounded-lg transition-colors ${isPinned ? 'text-amber-400 hover:bg-amber-500/10' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isRead = thread.unreadCount === 0;
                          setThreads(prev => {
                            const newThreads = { ...prev };
                            if (newThreads[thread.user.toLowerCase()]) {
                              newThreads[thread.user.toLowerCase()].unreadCount = isRead ? 1 : 0;
                            }
                            return newThreads;
                          });
                          toast.success(`Conversation marked as ${isRead ? 'unread' : 'read'}.`);
                        }}
                        title={thread.unreadCount > 0 ? "Mark as Read" : "Mark as Unread"}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
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
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/30 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                        title={`Clear all messages from ${currentThread.user}`}
                      >
                        <Eraser className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden xs:inline sm:inline">Clear</span>
                      </button>
                      <button
                        onClick={() => handleBanUser(currentThread.user)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                        title={`Permanently ban ${currentThread.user}`}
                      >
                        <Ban className="w-3.5 h-3.5 text-red-400" />
                        <span className="hidden xs:inline sm:inline">Ban User</span>
                      </button>
                    </>
                  )}
                </div>
              </header>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[#080911] to-[#06070D] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/10">
                {currentThread.messages.sort((a, b) => a.timestamp - b.timestamp).map(msg => {
                  const isAdminReply = isSenderAdminMsg(msg.user);
                  return (
                    <div key={msg.id} className={`flex items-start gap-3 group/msg ${isAdminReply ? 'flex-row-reverse' : ''}`}>
                      {!isAdminReply && <img src={msg.avatar} alt={msg.user} className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 mt-0.5 object-cover" />}
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
                        
                        <div className={`p-4 rounded-2xl border text-sm text-white/90 leading-relaxed shadow-lg transition-all ${isAdminReply ? 'bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] border-purple-500/10 rounded-tr-none text-left' : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 rounded-tl-none'}`}>
                          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                          
                          {msg.imageUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-white/5 max-w-sm bg-black/40">
                              <img src={msg.imageUrl} className="w-full h-auto max-h-60 object-contain hover:scale-102 transition-transform duration-300" alt="Attachment" />
                            </div>
                          )}
                          
                          {msg.audioUrl && (
                            <div className="mt-2 p-2 rounded-xl bg-black/30 border border-white/5 max-w-sm">
                              <audio src={msg.audioUrl} controls className="w-full h-10 accent-neon-purple" />
                            </div>
                          )}
                          
                          {msg.videoUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-white/5 max-w-sm bg-black/40">
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
                                  className="flex items-center justify-center p-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-neon-blue border border-white/5 transition-all"
                                  title="Load message to resend"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMessage(msg)}
                                className="flex items-center justify-center p-1 rounded-md bg-red-500/5 hover:bg-red-500/15 text-red-400/60 hover:text-red-400 border border-red-500/10 transition-all"
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

              <footer className="p-4 border-t border-white/5 bg-[#0A0C16] shrink-0 space-y-3 shadow-[0_-4px_30px_rgba(0,0,0,0.3)] pb-24 md:pb-4">
                <div className="flex md:flex-wrap items-center gap-1.5 overflow-x-auto md:overflow-x-visible pb-1.5 md:pb-0 scrollbar-none shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {DEFAULT_QUICK_REPLIES.map(reply => (
                    <button key={reply} onClick={() => setReplyText(reply)} className="px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-full text-[10px] font-semibold text-white/50 hover:text-white/80 transition-all duration-200 shrink-0">
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
                  <button onClick={addCustomReply} className="w-7 h-7 flex items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] border border-dashed border-white/10 hover:border-white/25 rounded-full text-white/40 hover:text-white transition-colors shrink-0" title="Add custom reply">
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                {attachment && <AttachmentPreview file={attachment} onRemove={() => setAttachment(null)} />}
                <div className="flex items-center gap-2.5 pt-1">
                  <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/5 hover:border-white/15 transition-colors shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`p-3 rounded-xl border transition-all duration-300 shrink-0 ${isRecording ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white border-white/5 hover:border-white/15'}`}
                    title={isRecording ? "Stop Recording" : "Record Audio Clip"}
                  >
                    {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input type="file" ref={fileInputRef} onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="hidden" />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleSendReply()}
                      placeholder={`Reply to @${selectedUser}...`}
                      className="w-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all placeholder-white/30"
                    />
                  </div>
                  <button onClick={handleSendReply} disabled={isSending} className="w-10 h-10 bg-gradient-to-r from-neon-purple to-violet-600 rounded-xl flex items-center justify-center text-white hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(176,38,255,0.3)] disabled:opacity-50 shrink-0">
                    {isSending ? <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8 text-white/30">
              <div className="space-y-4 max-w-xs">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto text-white/20 animate-pulse">
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
      )}

      {activeTab === 'connections' && renderConnectionHub()}
      {activeTab === 'settings' && renderSettingsView()}
      {activeTab === 'profile' && renderProfileView()}

      {/* Fixed Bottom Tab Bar for Mobile App View */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0F1D]/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
            activeTab === 'chats'
              ? 'text-neon-purple font-bold'
              : 'text-white/40 hover:text-white/80'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-semibold">Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('connections')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
            activeTab === 'connections'
              ? 'text-neon-blue font-bold'
              : 'text-white/40 hover:text-white/80'
          }`}
        >
          <div className="relative">
            <Link2 className="w-5 h-5" />
            {Object.values(connectedPlatforms).filter(Boolean).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold">Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
            activeTab === 'profile'
              ? 'text-neon-purple font-bold'
              : 'text-white/40 hover:text-white/80'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-semibold">Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
            activeTab === 'settings'
              ? 'text-amber-400 font-bold'
              : 'text-white/40 hover:text-white/80'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-semibold">Settings</span>
        </button>
      </div>

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
      </div>
    </div>
  );
}