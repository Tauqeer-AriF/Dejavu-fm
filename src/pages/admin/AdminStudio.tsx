import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Send, Paperclip, X, Maximize, Mic, MessageSquare, Search, ArrowLeft, Image as ImageIcon, Music, Video, Volume2, VolumeX, Ban, Trash2, Eraser, ShieldAlert, MailX, PlusCircle, Square, Pin, CheckSquare, MailOpen, Mail, Trash } from "lucide-react";
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
}

interface UserThread {
  user: string;
  avatar: string;
  messages: Message[];
  lastMessageTimestamp: number;
  unreadCount: number;
}

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

export function AdminStudio({ onLogout }: { onLogout: () => void }) {
  const { isLightMode } = useLogo();
  const [threads, setThreads] = useState<Record<string, UserThread>>(() => {
    try {
      const saved = sessionStorage.getItem('dejavu_studio_threads');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const selectedUserRef = useRef<string | null>(null);
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
  const { showConfirm } = useModal();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem('studio_sound_enabled') || 'true');
    } catch {
      return true;
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, selectedUser]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const addMessageToThread = (message: Message) => {
    const userKey = message.user.toLowerCase();
    const selectedKey = selectedUserRef.current?.toLowerCase();
    setThreads(prev => {
      const existing = prev[userKey];
      const newMessages = existing ? [...existing.messages, message] : [message];
      return {
        ...prev,
        [userKey]: {
          user: message.user,
          avatar: message.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(message.user)}`,
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
      setThreads(prev => {
        const nextThreads = { ...prev };
        history.forEach(msg => {
          const userKey = msg.user.toLowerCase();
          const existing = nextThreads[userKey];
          const threadMessages = existing ? [...existing.messages, {
            id: msg.id,
            type: 'chat',
            user: msg.user,
            avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
            text: msg.text || '',
            timestamp: msg.timestamp,
            imageUrl: msg.imageUrl,
            audioUrl: msg.audioUrl,
            videoUrl: msg.videoUrl,
          }] : [{
            id: msg.id,
            type: 'chat',
            user: msg.user,
            avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
            text: msg.text || '',
            timestamp: msg.timestamp,
            imageUrl: msg.imageUrl,
            audioUrl: msg.audioUrl,
            videoUrl: msg.videoUrl,
          }];

          nextThreads[userKey] = {
            user: msg.user,
            avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
            messages: threadMessages,
            lastMessageTimestamp: msg.timestamp,
            unreadCount: selectedUserRef.current?.toLowerCase() === userKey ? 0 : threadMessages.length,
          };
        });
        return nextThreads;
      });
    };

    const handlePrivateHistory = (history: any[]) => {
      setThreads(prev => {
        const nextThreads = { ...prev };
        history.forEach(msg => {
          const userKey = msg.user.toLowerCase();
          const existing = nextThreads[userKey];
          const threadMessages = existing ? [...existing.messages, {
            id: msg.id,
            type: 'chat',
            user: msg.user,
            avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
            text: msg.text || '',
            timestamp: msg.timestamp,
            imageUrl: msg.imageUrl,
            audioUrl: msg.audioUrl,
            videoUrl: msg.videoUrl,
          }] : [{
            id: msg.id,
            type: 'chat',
            user: msg.user,
            avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
            text: msg.text || '',
            timestamp: msg.timestamp,
            imageUrl: msg.imageUrl,
            audioUrl: msg.audioUrl,
            videoUrl: msg.videoUrl,
          }];

          nextThreads[userKey] = {
            user: msg.user,
            avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
            messages: threadMessages,
            lastMessageTimestamp: msg.timestamp,
            unreadCount: selectedUserRef.current?.toLowerCase() === userKey ? 0 : threadMessages.length,
          };
        });
        return nextThreads;
      });
    };

    const handleChatMessage = (msg: any) => {
      if (msg.isStudioReply) {
        return;
      }
      addMessageToThread({
        id: msg.id,
        type: 'chat',
        user: msg.user,
        avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
        text: msg.text || '',
        timestamp: msg.timestamp,
        imageUrl: msg.imageUrl,
        audioUrl: msg.audioUrl,
        videoUrl: msg.videoUrl,
      });
    };

    const handlePrivateMessage = (msg: any) => {
      addMessageToThread({
        id: msg.id,
        type: 'chat',
        user: msg.user,
        avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.user)}`,
        text: msg.text || '',
        timestamp: msg.timestamp,
        imageUrl: msg.imageUrl,
        audioUrl: msg.audioUrl,
        videoUrl: msg.videoUrl,
      });
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
        Object.entries(prev).forEach(([key, thread]) => {
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

    socket.on('chatHistory', handleChatHistory);
    socket.on('privateHistory', handlePrivateHistory);
    socket.on('chatMessage', handleChatMessage);
    socket.on('privateMessage', handlePrivateMessage);
    socket.on('new_shoutout', handleNewShoutout);
    socket.on('shoutouts_cleared', handleShoutoutsCleared);
    socket.on('userThreadCleared', handleUserThreadCleared);

    if (adminUsername) {
      socket.emit('registerUser', adminUsername);
    }

    return () => {
      socket.off('chatHistory', handleChatHistory);
      socket.off('privateHistory', handlePrivateHistory);
      socket.off('chatMessage', handleChatMessage);
      socket.off('privateMessage', handlePrivateMessage);
      socket.off('new_shoutout', handleNewShoutout);
      socket.off('shoutouts_cleared', handleShoutoutsCleared);
      socket.off('userThreadCleared', handleUserThreadCleared);
    };
  }, [adminUsername]);

  useEffect(() => {
    try {
      sessionStorage.setItem('dejavu_studio_threads', JSON.stringify(threads));
    } catch (error) {
      console.warn("Failed to save studio threads to session storage", error);
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
    setThreads(prev => {
      const userKey = user.toLowerCase();
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
    const newReply = prompt("Enter your new quick reply:");
    if (newReply && newReply.trim()) {
      if (customReplies.includes(newReply.trim())) {
        toast.warning("This reply already exists.");
        return;
      }
      setCustomReplies(prev => [...prev, newReply.trim()]);
      toast.success("Quick reply added!");
    }
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
    const confirmed = await showConfirm({
      title: "Delete Message",
      message: `Are you sure you want to permanently delete this message from "${message.user}"? This action cannot be undone.`,
      style: "danger",
      confirmText: "Delete Message"
    });

    if (confirmed && adminUsername) {
      // The server-side socket handler for 'deleteMessage' can handle both public and private messages.
      // It also correctly authorizes admins to delete messages they didn't send.
      // Shoutouts are in a different table, so we call its specific delete endpoint.
      socketRef.current?.emit('deleteMessage', { id: message.id, user: adminUsername, isPrivate: false });
      toast.success("Message deleted.");
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

      const lastMessage = threads[selectedUser.toLowerCase()]?.messages.slice(-1)[0];
      if (!lastMessage) throw new Error("No message to reply to.");

      if (lastMessage.type === 'chat') {
        const chatPayload = {
          user: "DejavuFM Studio",
          text: `@${selectedUser} ${replyText}`,
          imageUrl: mediaType === 'image' ? mediaUrl : null,
          audioUrl: mediaType === 'audio' ? mediaUrl : null,
          videoUrl: mediaType === 'video' ? mediaUrl : null,
        };
        // A public message has no recipient. The server will broadcast it to everyone.
        // The isStudioReply flag prevents the studio from receiving its own message back in a loop.
        socketRef.current?.emit('chatMessage', { ...chatPayload, isStudioReply: true });
      } else if (lastMessage.type === 'shoutout') {
        const res = await fetchAdmin(`/api/admin/shoutouts/${lastMessage.id}/reply`, {
          method: 'POST',
          body: { reply_text: replyText }
        });
        if (!res.ok) throw new Error("Failed to send shoutout reply.");
      }

      // Manually add the reply to the local state for immediate feedback
      const replyMessage: Message = {
        id: `reply-${lastMessage.id}-${Date.now()}`,
        type: 'chat', // Treat replies as chat messages for styling
        user: "DejavuFM Studio",
        avatar: '/icon.svg',
        text: lastMessage.type === 'chat' ? `@${selectedUser} ${replyText}` : replyText,
        timestamp: Date.now(),
      };
      setThreads(prev => ({
        ...prev,
        [selectedUser.toLowerCase()]: {
          ...prev[selectedUser.toLowerCase()],
          messages: [...prev[selectedUser.toLowerCase()].messages, replyMessage],
          lastMessageTimestamp: replyMessage.timestamp,
        }
      }));

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

  return (
    <div className={`min-h-screen w-full flex flex-col bg-dark-bg text-white font-sans ${isLightMode ? 'admin-light-mode' : ''}`}>
      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-dark-bg/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neon-purple/20 rounded-full flex items-center justify-center text-neon-purple">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wider">Studio Inbox</h1>
            <p className="text-xs text-white/40">Live Chat & Shoutout Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleSound} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white" title="Toggle notification sounds">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <a href="/" target="_blank" className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white" title="Open Main Site">
            <Maximize className="w-4 h-4" />
          </a>
          <button onClick={onLogout} className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 transition-colors text-white/60 hover:text-red-400" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* User List Panel */}
        <aside className={`w-full md:w-80 lg:w-96 border-r border-white/10 flex flex-col shrink-0 transition-transform duration-300 ${selectedUser ? 'hidden md:flex' : 'flex'}`}
        >
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center p-2.5 rounded-lg bg-black/40 border border-white/10 cursor-pointer">
                <input type="checkbox" checked={sortedThreads.length > 0 && selectedThreads.length === sortedThreads.length} onChange={handleSelectAll} className="w-4 h-4 rounded-sm bg-white/10 border-white/20 text-neon-purple focus:ring-neon-purple/50" />
              </label>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-neon-purple"
                />
              </div>
            </div>
            <AnimatePresence>
              {selectedThreads.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between bg-neon-purple/10 border border-neon-purple/20 p-2 rounded-lg"
                >
                  <span className="text-xs font-bold text-white/70 px-2">{selectedThreads.length} selected</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleMarkSelected('read')} title="Mark as Read" className="p-2 rounded-md hover:bg-white/10 text-white/60"><MailOpen className="w-4 h-4" /></button>
                    <button onClick={() => handleMarkSelected('unread')} title="Mark as Unread" className="p-2 rounded-md hover:bg-white/10 text-white/60"><Mail className="w-4 h-4" /></button>
                    <button onClick={handlePinSelected} title="Pin Conversation" className="p-2 rounded-md hover:bg-white/10 text-white/60"><Pin className="w-4 h-4" /></button>
                    <button onClick={handleDeleteSelected} title="Delete" className="p-2 rounded-md hover:bg-red-500/20 text-red-400"><Trash className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sortedThreads.map(thread => (
              <div
                key={thread.user}
                className={`w-full text-left flex items-center gap-4 p-4 border-b border-white/5 transition-colors relative ${selectedUser?.toLowerCase() === thread.user.toLowerCase() ? 'bg-neon-purple/10' : 'hover:bg-white/5'}`}
              >
                <input
                  type="checkbox"
                  checked={selectedThreads.includes(thread.user.toLowerCase())}
                  onChange={() => toggleThreadSelection(thread.user.toLowerCase())}
                  className="w-4 h-4 rounded-sm bg-white/10 border-white/20 text-neon-purple focus:ring-neon-purple/50 shrink-0"
                />
                <div onClick={() => handleSelectUser(thread.user)} className="flex-1 flex items-center gap-4 overflow-hidden cursor-pointer">
                  <img src={thread.avatar} alt={thread.user} className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 overflow-hidden">
                  <h4 className="font-bold text-sm truncate">{thread.user}</h4>
                  <p className="text-xs text-white/50 truncate">{thread.messages.slice(-1)[0]?.text || '...'}</p>
                </div>
                </div>
                {pinnedThreads.includes(thread.user.toLowerCase()) ? (
                  <button onClick={() => handleUnpin(thread.user.toLowerCase())} title="Unpin" className="p-1 text-amber-400 hover:text-amber-300">
                    <Pin className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : null}
                {thread.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-neon-purple rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {thread.unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Chat Panel */}
        <main className={`flex-1 flex-col ${selectedUser ? 'flex' : 'hidden md:flex'}`}>
          {currentThread ? (
            <>
              <header className="flex items-center gap-4 p-4 border-b border-white/10 shrink-0">
                <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 text-white/50"><ArrowLeft /></button>
                <img src={currentThread.avatar} alt={currentThread.user} className="w-10 h-10 rounded-full bg-white/10" />
                <div>
                  <h3 className="font-bold">{currentThread.user}</h3>
                  <p className="text-xs text-green-400">Online</p>
                </div>
                <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                  {isAdmin && currentThread.user !== adminUsername && (
                    <>
                      <button
                        onClick={() => handleClearConversation(currentThread.user)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider transition-colors"
                        title={`Clear all messages from ${currentThread.user}`}
                      ><Eraser className="w-4 h-4" /> Clear</button>
                      <button
                        onClick={() => handleBanUser(currentThread.user)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider transition-colors"
                        title={`Permanently ban ${currentThread.user}`}
                      ><Ban className="w-4 h-4" /> Ban</button>
                    </>
                  )}
                </div>
              </header>

              <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                {currentThread.messages.sort((a, b) => a.timestamp - b.timestamp).map(msg => (
                  <div key={msg.id} className={`flex items-start gap-3 group ${msg.user === 'DejavuFM Studio' ? 'flex-row-reverse' : ''}`}>
                    {msg.user !== 'DejavuFM Studio' && <img src={msg.avatar} alt={msg.user} className="w-8 h-8 rounded-full bg-white/10 mt-1" />}
                    <div className={`max-w-lg p-3 rounded-2xl space-y-2 ${msg.user === 'DejavuFM Studio' ? 'bg-neon-purple/80' : 'bg-white/10'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <span className={`text-xs font-bold ${msg.type === 'shoutout' ? 'text-neon-purple' : 'text-neon-blue'}`}>
                          {msg.type === 'shoutout' ? 'Shoutout' : (msg.user === 'DejavuFM Studio' ? 'Studio Reply' : msg.user)}
                        </span>
                        <span className="text-[10px] text-white/40">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {msg.text && <p className="text-sm text-white/90 whitespace-pre-wrap">{msg.text}</p>}
                      {msg.imageUrl && <img src={msg.imageUrl} className="rounded-lg max-w-xs" />}
                      {msg.audioUrl && <audio src={msg.audioUrl} controls className="w-full h-10" />}
                      {msg.videoUrl && <video src={msg.videoUrl} controls className="rounded-lg max-w-xs" />}

                      {isAdmin && msg.user !== adminUsername && (
                        <div className="pt-2 mt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDeleteMessage(msg)}
                            className="flex items-center gap-1.5 text-red-400/60 hover:text-red-400 text-[10px] font-bold uppercase tracking-wider transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <footer className="p-4 border-t border-white/10 shrink-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {DEFAULT_QUICK_REPLIES.map(reply => (
                    <button key={reply} onClick={() => setReplyText(reply)} className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-semibold text-white/60 transition-colors">
                      {reply}
                    </button>
                  ))}
                  {customReplies.map(reply => (
                    <div key={reply} className="group/reply relative flex items-center">
                      <button onClick={() => setReplyText(reply)} className="pl-2.5 pr-6 py-1.5 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/20 rounded-lg text-[10px] font-semibold text-neon-purple transition-colors">
                        {reply}
                      </button>
                      <button onClick={() => removeCustomReply(reply)} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-black/20 text-white/40 opacity-0 group-hover/reply:opacity-100 hover:!opacity-100 hover:bg-red-500/50 hover:text-white transition-all">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addCustomReply} className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg text-white/40 hover:text-white transition-colors" title="Add custom reply">
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                {attachment && <AttachmentPreview file={attachment} onRemove={() => setAttachment(null)} />}
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`p-3 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500/80 text-white animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}
                    title={isRecording ? "Stop Recording" : "Record Audio Clip"}
                  >
                    {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <input type="file" ref={fileInputRef} onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="hidden" />
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendReply()}
                    placeholder={`Reply to ${selectedUser}...`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-neon-purple"
                  />
                  <button onClick={handleSendReply} disabled={isSending} className="w-12 h-12 bg-neon-purple rounded-full flex items-center justify-center text-white hover:bg-neon-blue transition-colors disabled:opacity-50">
                    {isSending ? <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-white/30">
              <div className="space-y-3">
                <MessageSquare className="w-16 h-16 mx-auto" />
                <h3 className="text-lg font-bold">Select a user to begin</h3>
                <p className="text-sm max-w-xs">Messages and shoutouts from users will appear in the list on the left.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}