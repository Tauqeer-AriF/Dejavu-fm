import React, { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, Routes, Route, useLocation, Navigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon, Radio, LogOut, Home as HomeIcon, Sparkles, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useModal } from "../context/ModalContext";
import { fetchAdmin } from "./admin/adminApi";
import { LoadingFallback } from "./admin/LoadingFallback";
import { AdminSecretGate } from "./admin/AdminAuth";
import { AdminSidebar } from "./admin/AdminSidebar";

import { ErrorBoundary } from "../components/ErrorBoundary";

// Resilient Lazy Import Helper with automatic chunk retry and cache invalidation
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>
) {
  return lazy(async () => {
    try {
      const module = await componentImport();
      sessionStorage.removeItem('admin_chunk_retry');
      return module.default ? module : { default: module };
    } catch (error) {
      console.warn('[Admin LazyRetry] Module import failed, retrying...', error);
      try {
        await new Promise(r => setTimeout(r, 100));
        const module = await componentImport();
        sessionStorage.removeItem('admin_chunk_retry');
        return module.default ? module : { default: module };
      } catch (retryError) {
        const pageHasBeenRefreshed = sessionStorage.getItem('admin_chunk_retry');
        if (!pageHasBeenRefreshed) {
          sessionStorage.setItem('admin_chunk_retry', 'true');
          window.location.reload();
        }
        throw retryError;
      }
    }
  });
}

const formatMediaUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return url;
  }
  return '/' + url;
};

const extractAudioUrl = (item: any): string | undefined => {
  if (!item) return undefined;
  const raw = item.audioUrl || item.audio_url || item.audio || item.audioName || item.replyAudioUrl || item.reply_audio_url || (item.mediaType === 'audio' ? item.mediaUrl : undefined);
  return formatMediaUrl(raw);
};

const extractImageUrl = (item: any): string | undefined => {
  if (!item) return undefined;
  const raw = item.imageUrl || item.image_url || item.image || item.imageName || item.replyImageUrl || item.reply_image_url || (item.mediaType === 'image' ? item.mediaUrl : undefined);
  return formatMediaUrl(raw);
};

const extractVideoUrl = (item: any): string | undefined => {
  if (!item) return undefined;
  const raw = item.videoUrl || item.video_url || item.video || item.videoName || item.replyVideoUrl || item.reply_video_url || (item.mediaType === 'video' ? item.mediaUrl : undefined);
  return formatMediaUrl(raw);
};

// Lazy-loaded administrative sub-pages for optimal bundle size and minimal mount overhead
const AdminAnalytics = lazyWithRetry(() => import("./admin/AdminAnalytics").then(m => ({ default: m.AdminAnalytics })));
const AdminLiveTools = lazyWithRetry(() => import("./admin/AdminLiveTools").then(m => ({ default: m.AdminLiveTools })));
const AdminDJs = lazyWithRetry(() => import("./admin/AdminDJs").then(m => ({ default: m.AdminDJs })));
const AdminPopup = lazyWithRetry(() => import("./admin/AdminPopup").then(m => ({ default: m.AdminPopup })));
const AdminShoutouts = lazyWithRetry(() => import("./admin/AdminShoutouts").then(m => ({ default: m.AdminShoutouts })));
const AdminBookings = lazyWithRetry(() => import("./admin/AdminBookings").then(m => ({ default: m.AdminBookings })));
const AdminSchedule = lazyWithRetry(() => import("./admin/AdminSchedule").then(m => ({ default: m.AdminSchedule })));
const AdminProfile = lazyWithRetry(() => import("./admin/AdminProfile").then(m => ({ default: m.AdminProfile })));
const AdminBranding = lazyWithRetry(() => import("./admin/AdminSystem").then(m => ({ default: m.AdminBranding })));
const AdminSettings = lazyWithRetry(() => import("./admin/AdminSystem").then(m => ({ default: m.AdminSettings })));
const AdminAdvanced = lazyWithRetry(() => import("./admin/AdminSystem").then(m => ({ default: m.AdminAdvanced })));
const AdminUsers = lazyWithRetry(() => import("./admin/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminChatUsers = lazyWithRetry(() => import("./admin/AdminChatUsers").then(m => ({ default: m.AdminChatUsers })));
const AdminChatRoomSettings = lazyWithRetry(() => import("./admin/AdminChatRoomSettings").then(m => ({ default: m.AdminChatRoomSettings })));
const AdminAuditLogs = lazyWithRetry(() => import("./admin/AdminAuditLogs").then(m => ({ default: m.AdminAuditLogs })));
const AdminBackup = lazyWithRetry(() => import("./admin/AdminBackup").then(m => ({ default: m.AdminBackup })));
const AdminAds = lazyWithRetry(() => import("./admin/AdminAds").then(m => ({ default: m.AdminAds })));
const AdminEvents = lazyWithRetry(() => import("./admin/AdminEvents").then(m => ({ default: m.AdminEvents })));
const AdminMedia = lazyWithRetry(() => import("./admin/AdminMedia").then(m => ({ default: m.AdminMedia })));
const AdminMenu = lazyWithRetry(() => import("./admin/AdminMenu").then(m => ({ default: m.AdminMenu })));
const AdminPages = lazyWithRetry(() => import("./admin/AdminPages").then(m => ({ default: m.AdminPages })));
const AdminStudio = lazyWithRetry(() => import("./admin/AdminStudio").then(m => ({ default: m.AdminStudio })));
const AdminMetaIntegrations = lazyWithRetry(() => import("./admin/AdminMetaIntegrations").then(m => ({ default: m.AdminMetaIntegrations })));
const AdminSEO = lazyWithRetry(() => import("./admin/AdminSEO").then(m => ({ default: m.AdminSEO })));
const AdminFeatures = lazyWithRetry(() => import("./admin/AdminFeatures").then(m => ({ default: m.AdminFeatures })));
const AdminSongRequests = lazyWithRetry(() => import("./admin/AdminSongRequests").then(m => ({ default: m.AdminSongRequests })));
const AdminOwnerControl = lazyWithRetry(() => import("./admin/AdminOwnerControl"));
const AdminAIContentStudio = lazyWithRetry(() => import("./admin/AdminAIContentStudio").then(m => ({ default: m.AdminAIContentStudio })));
const AdminEmail = lazyWithRetry(() => import("./admin/AdminEmail").then(m => ({ default: m.AdminEmail })));
import { useLogo } from "../hooks/useLogo";
import { PremiumRingLoader } from "../components/PremiumRingLoader";
import { AppLoader } from "../components/AppLoader";
import { suppressAccessibilityForAdmin, applyFrontAccessibilityOptions } from "../utils/accessibility";

export default function Admin() {
  const [isLogged, setIsLogged] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const { settings } = useLogo();
  const adminBasePath = (settings?.admin_custom_path || '/admin').trim().replace(/\/+$/, '') || '/admin';

  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin' || isOwner;

  const isLiveToolsEnabled = settings?.feat_live_tools !== '0' && (isOwner || settings?.owner_hide_feat_live_tools !== '1');
  const isShoutoutsEnabled = settings?.feat_shoutouts !== '0' && (isOwner || settings?.owner_hide_feat_shoutouts !== '1');
  const isBookingsEnabled = settings?.feat_bookings !== '0' && (isOwner || settings?.owner_hide_feat_bookings !== '1');
  const isBoothEnabled = settings?.feat_booth !== '0' && (isOwner || settings?.owner_hide_feat_booth !== '1');
  const isSpecialEventsEnabled = settings?.feat_special_events !== '0' && (isOwner || settings?.owner_hide_feat_special_events !== '1');
  const isChatEnabled = settings?.feat_chat !== '0' && (isOwner || settings?.owner_hide_feat_chat !== '1');
  const isStudioEnabled = settings?.feat_studio !== '0' && (isOwner || settings?.owner_hide_feat_studio !== '1');
  const isMetaEnabled = settings?.feat_meta !== '0' && (isOwner || settings?.owner_hide_feat_meta !== '1');
  const isBackupEnabled = settings?.feat_backup !== '0' && (isOwner || settings?.owner_hide_feat_backup !== '1');

  const defaultDjPath = isLiveToolsEnabled
    ? `${adminBasePath}/live-tools`
    : isShoutoutsEnabled
    ? `${adminBasePath}/shoutouts`
    : isBoothEnabled
    ? `${adminBasePath}/song-requests`
    : `${adminBasePath}/profile`;

  const isStudioRoute = location.pathname.includes('/studio');

  // Helpers for background message unread calculation
  const isSenderAdminMsg = (user: string, adminName: string | null) => {
    if (!user) return false;
    const lowerUser = user.toLowerCase();
    const lowerAdmin = adminName ? adminName.toLowerCase() : '';
    return lowerUser === "dejavufm studio" || lowerUser === lowerAdmin;
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

    if (msg.recipient) {
      if (isAdminUser(msg.user)) {
        return { user: msg.recipient, key: msg.recipient.toLowerCase() };
      } else if (isAdminUser(msg.recipient)) {
        return { user: msg.user, key: msg.user.toLowerCase() };
      } else {
        return { user: msg.user, key: msg.user.toLowerCase() };
      }
    }

    if (isAdminUser(msg.user)) {
      if (msg.text) {
        const match = msg.text.match(/^@([a-zA-Z0-9_\-]+)/);
        if (match) {
          const targetUser = match[1];
          return { user: targetUser, key: targetUser.toLowerCase() };
        }
        const shoutoutMatch = msg.text.match(/^REPLY to @([a-zA-Z0-9_\-\.@]+)/);
        if (shoutoutMatch) {
          const targetUser = shoutoutMatch[1];
          return { user: targetUser, key: targetUser.toLowerCase() };
        }
      }
      return null;
    }

    return { user: msg.user, key: msg.user.toLowerCase() };
  };

  const getAdminPageLabel = (pathname: string) => {
    // Check specific dashboard route suffixes to map accurate tab names
    if (pathname.includes('/features')) return 'In Features Manager';
    if (pathname.includes('/studio')) return 'In Studio & Live Chat';
    if (pathname.includes('/live-tools')) return 'In Live Tools';
    if (pathname.includes('/menu')) return 'In Navigation Menu';
    if (pathname.includes('/pages')) return 'In Custom Pages';
    if (pathname.includes('/seo')) return 'In SEO Engine';
    if (pathname.includes('/settings')) return 'In System Settings';
    if (pathname.includes('/advanced')) return 'In Advanced Features';
    if (pathname.includes('/media')) return 'In Media Library';
    if (pathname.includes('/profile')) return 'In Profile Settings';
    if (pathname.includes('/shoutouts')) return 'In Interactions';
    if (pathname.includes('/bookings')) return 'In Agency Bookings';
    if (pathname.includes('/branding')) return 'In Platform Branding';
    if (pathname.includes('/djs')) return 'In DJ Roster';
    if (pathname.includes('/popup')) return 'In Promo Popups';
    if (pathname.includes('/ads')) return 'In Campaign Sliders';
    if (pathname.includes('/schedule')) return 'In Schedule Management';
    if (pathname.includes('/users')) return 'In Staff Users';
    if (pathname.includes('/chat-users')) return 'In Chat Users';
    if (pathname.includes('/chat-room-setting')) return 'In Data Operations';
    if (pathname.includes('/backup')) return 'In System Backups';
    if (pathname.includes('/audit-logs')) return 'In Audit Logs';
    if (pathname.includes('/meta-integrations')) return 'In Meta Integrations';
    if (pathname.includes('/analytics')) return 'In Analytics';
    
    // Default fallback when matching the root path (e.g. /admin or /admin/)
    return 'In Analytics';
  };

  useEffect(() => {
    if (!isLogged || !adminUsername) return;
    const socket = (window as any).socket;
    if (!socket) return;

    const pageLabel = getAdminPageLabel(location.pathname);
    socket.emit('updatePresence', { username: adminUsername, location: pageLabel });
    socket.emit('registerUser', adminUsername, pageLabel);
  }, [isLogged, adminUsername, location.pathname]);

  // Listen to background messages when user is not on the Studio page
  useEffect(() => {
    if (!isLogged || (userRole !== 'admin' && userRole !== 'dj' && userRole !== 'owner') || isStudioRoute) {
      return;
    }

    const socket = (window as any).socket;
    if (!socket) return;

    if (adminUsername) {
      socket.emit('registerUser', adminUsername);
    }

    const handleHistoryData = (privateHistory: any[], shoutoutHistory: any[]) => {
      let lastReadTimestamps: Record<string, number> = {};
      try {
        const savedRead = localStorage.getItem('dejavu_studio_last_read');
        if (savedRead) lastReadTimestamps = JSON.parse(savedRead);
      } catch {}

      // Start with a clean set of threads from the database history to avoid restoring deleted chats
      let currentThreads: Record<string, any> = {};

      // Process privateHistory
      privateHistory.forEach((msg: any) => {
        const threadInfo = getThreadUserAndKey({
          user: msg.sender || msg.user,
          text: msg.text,
          recipient: msg.recipient
        }, adminUsername);
        if (!threadInfo) return;

        const { user, key: userKey } = threadInfo;
        const existing = currentThreads[userKey] || {
          user,
          avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
          messages: [],
          lastMessageTimestamp: 0,
          unreadCount: 0,
        };

        const incomingMessage = {
          id: String(msg.id),
          type: 'chat',
          user: msg.sender || msg.user,
          avatar: msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.sender || msg.user)}`,
          text: msg.text || '',
          timestamp: msg.timestamp,
          imageUrl: extractImageUrl(msg),
          audioUrl: extractAudioUrl(msg),
          videoUrl: extractVideoUrl(msg),
          recipient: msg.recipient,
          platform: msg.platform,
        };

        const isDuplicate = existing.messages.some((m: any) => m.id === incomingMessage.id);
        if (!isDuplicate) {
          existing.messages.push(incomingMessage);
        }
        
        if (incomingMessage.timestamp > existing.lastMessageTimestamp) {
          existing.lastMessageTimestamp = incomingMessage.timestamp;
        }

        currentThreads[userKey] = existing;
      });

      // Process shoutoutHistory
      shoutoutHistory.forEach((shoutout: any) => {
        let ts = shoutout.timestamp;
        if (typeof ts === 'string') {
          const parsed = Date.parse(ts);
          ts = isNaN(parsed) ? Date.now() : parsed;
        } else if (!ts) {
          ts = Date.now();
        }

        const threadInfo = getThreadUserAndKey({
          user: shoutout.listener_name || shoutout.user || 'Shoutout',
          text: shoutout.message || '',
        }, adminUsername);
        if (!threadInfo) return;

        const { user, key: userKey } = threadInfo;
        const existing = currentThreads[userKey] || {
          user,
          avatar: shoutout.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
          messages: [],
          lastMessageTimestamp: 0,
          unreadCount: 0,
        };

        const incomingMessage = {
          id: String(shoutout.id),
          type: 'shoutout',
          user: shoutout.listener_name || shoutout.user || 'Shoutout',
          avatar: shoutout.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(shoutout.listener_name || shoutout.user || 'shoutout')}`,
          text: shoutout.message || '',
          timestamp: ts,
          imageUrl: extractImageUrl(shoutout),
          audioUrl: extractAudioUrl(shoutout),
          videoUrl: extractVideoUrl(shoutout),
        };

        const isDuplicate = existing.messages.some((m: any) => m.id === incomingMessage.id);
        if (!isDuplicate) {
          existing.messages.push(incomingMessage);
        }

        if (incomingMessage.timestamp > existing.lastMessageTimestamp) {
          existing.lastMessageTimestamp = incomingMessage.timestamp;
        }

        currentThreads[userKey] = existing;
      });

      // Recalculate unreadCount
      Object.keys(currentThreads).forEach((userKey) => {
        const thread = currentThreads[userKey];
        thread.messages.sort((a: any, b: any) => a.timestamp - b.timestamp);

        let unreadCount = 0;
        const hasLastReadRecord = userKey in lastReadTimestamps;

        if (hasLastReadRecord) {
          const lastRead = lastReadTimestamps[userKey];
          thread.messages.forEach((m: any) => {
            const isSenderAdmin = isSenderAdminMsg(m.user, adminUsername);
            if (!isSenderAdmin && m.timestamp > lastRead) {
              unreadCount++;
            }
          });
        } else {
          for (let i = thread.messages.length - 1; i >= 0; i--) {
            if (isSenderAdminMsg(thread.messages[i].user, adminUsername)) {
              break;
            }
            unreadCount++;
          }
        }

        thread.unreadCount = unreadCount;
      });

      localStorage.setItem('dejavu_studio_threads', JSON.stringify(currentThreads));
      window.dispatchEvent(new Event('dejavu_studio_threads_updated'));
    };

    let privateHistoryData: any[] | null = null;
    let shoutoutHistoryData: any[] | null = null;

    const onPrivateHistory = (history: any[]) => {
      privateHistoryData = history;
      if (shoutoutHistoryData) {
        handleHistoryData(privateHistoryData, shoutoutHistoryData);
      }
    };

    const onShoutoutHistory = (history: any[]) => {
      shoutoutHistoryData = history;
      if (privateHistoryData) {
        handleHistoryData(privateHistoryData, shoutoutHistoryData);
      }
    };

    const handleIncomingMessage = (message: any, type: 'chat' | 'shoutout') => {
      if (type === 'chat' && message.isStudioReply) {
        return;
      }

      const formattedMessage = {
        id: message.id ? String(message.id) : `bg-${Date.now()}`,
        type,
        user: message.user || message.listener_name || 'Shoutout',
        avatar: message.avatar_url || message.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(message.user || message.listener_name || 'Shoutout')}`,
        text: message.text || message.message || '',
        timestamp: message.timestamp || Date.now(),
        imageUrl: extractImageUrl(message),
        audioUrl: extractAudioUrl(message),
        videoUrl: extractVideoUrl(message),
        recipient: message.recipient,
        platform: message.platform,
      };

      const threadInfo = getThreadUserAndKey(formattedMessage, adminUsername);
      if (!threadInfo) return;

      const { user, key: userKey } = threadInfo;

      let savedThreads: any = {};
      try {
        const saved = localStorage.getItem('dejavu_studio_threads');
        savedThreads = saved ? JSON.parse(saved) : {};
      } catch (err) {
        savedThreads = {};
      }

      const existing = savedThreads[userKey];
      let newMessages = [];
      let shouldUpdate = false;

      const isSameMessage = (msgA: any, msgB: any) => {
        if (msgA.id === msgB.id) return true;
        const isTempA = msgA.id.startsWith('reply-') || msgA.id.startsWith('temp-');
        const isTempB = msgB.id.startsWith('reply-') || msgB.id.startsWith('temp-');
        if ((isTempA || isTempB) && msgA.user === msgB.user && msgA.text === msgB.text) {
          return Math.abs(msgA.timestamp - msgB.timestamp) < 60000;
        }
        return false;
      };

      if (existing) {
        const isDuplicate = existing.messages.some((m: any) => isSameMessage(m, formattedMessage));

        if (!isDuplicate) {
          newMessages = [...existing.messages, formattedMessage];
          shouldUpdate = true;
        } else {
          const idx = existing.messages.findIndex((m: any) => isSameMessage(m, formattedMessage));
          if (idx !== -1) {
            const est = existing.messages[idx];
            if ((est.id.startsWith('reply-') || est.id.startsWith('temp-')) && !(formattedMessage.id.startsWith('reply-') || formattedMessage.id.startsWith('temp-'))) {
              newMessages = [...existing.messages];
              newMessages[idx] = formattedMessage;
              shouldUpdate = true;
            }
          }
        }
      } else {
        newMessages = [formattedMessage];
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const isSenderAdmin = isSenderAdminMsg(formattedMessage.user, adminUsername);
        
        let finalUnreadCount = 0;
        if (isSenderAdmin) {
          finalUnreadCount = 0;
        } else {
          let lastReadTimestamps: Record<string, number> = {};
          try {
            const savedRead = localStorage.getItem('dejavu_studio_last_read');
            if (savedRead) lastReadTimestamps = JSON.parse(savedRead);
          } catch {}

          if (userKey in lastReadTimestamps) {
            const lastRead = lastReadTimestamps[userKey];
            finalUnreadCount = formattedMessage.timestamp > lastRead ? (existing?.unreadCount || 0) + 1 : (existing?.unreadCount || 0);
          } else {
            // Count user messages at the end of the thread
            let combinedMsgs = [...newMessages];
            combinedMsgs.sort((a, b) => a.timestamp - b.timestamp);
            let consecutiveUserMsgs = 0;
            for (let i = combinedMsgs.length - 1; i >= 0; i--) {
              if (isSenderAdminMsg(combinedMsgs[i].user, adminUsername)) {
                break;
              }
              consecutiveUserMsgs++;
            }
            finalUnreadCount = consecutiveUserMsgs;
          }
        }

        savedThreads[userKey] = {
          user,
          avatar: existing?.avatar || formattedMessage.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user)}`,
          messages: newMessages,
          lastMessageTimestamp: formattedMessage.timestamp,
          unreadCount: finalUnreadCount,
          platform: formattedMessage.platform || existing?.platform,
        };

        localStorage.setItem('dejavu_studio_threads', JSON.stringify(savedThreads));
        window.dispatchEvent(new Event('dejavu_studio_threads_updated'));
      }
    };

    const onChatMessage = (msg: any) => handleIncomingMessage(msg, 'chat');
    const onPrivateMessage = (msg: any) => handleIncomingMessage(msg, 'chat');
    const onNewShoutout = (shoutout: any) => handleIncomingMessage(shoutout, 'shoutout');

    const onUserThreadCleared = ({ username }: { username: string }) => {
      try {
        const saved = localStorage.getItem('dejavu_studio_threads');
        if (!saved) return;
        const currentThreads = JSON.parse(saved);
        const userKey = username.toLowerCase();
        if (currentThreads[userKey]) {
          delete currentThreads[userKey];
          localStorage.setItem('dejavu_studio_threads', JSON.stringify(currentThreads));
          window.dispatchEvent(new Event('dejavu_studio_threads_updated'));
        }
      } catch {}
    };

    const onMessageDeleted = ({ id }: { id: string }) => {
      try {
        const saved = localStorage.getItem('dejavu_studio_threads');
        if (!saved) return;
        const currentThreads = JSON.parse(saved);
        let updated = false;
        Object.keys(currentThreads).forEach(userKey => {
          const thread = currentThreads[userKey];
          const exists = thread.messages.some((m: any) => String(m.id) === String(id));
          if (exists) {
            thread.messages = thread.messages.filter((m: any) => String(m.id) !== String(id));
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem('dejavu_studio_threads', JSON.stringify(currentThreads));
          window.dispatchEvent(new Event('dejavu_studio_threads_updated'));
        }
      } catch {}
    };

    const onShoutoutDeleted = ({ id }: { id: number }) => {
      onMessageDeleted({ id: String(id) });
    };

    const onMessagesCleared = (payload: any) => {
      try {
        const saved = localStorage.getItem('dejavu_studio_threads');
        if (!saved) return;
        const currentThreads = JSON.parse(saved);
        let updated = false;
        Object.keys(currentThreads).forEach(userKey => {
          const thread = currentThreads[userKey];
          let filtered = thread.messages;
          if (payload.isPrivate) {
            if (payload.recipient) {
              const rLower = payload.recipient.toLowerCase();
              const sLower = payload.sender?.toLowerCase();
              filtered = thread.messages.filter((msg: any) => {
                const isPM = !!msg.recipient;
                if (!isPM) return true;
                const mUser = msg.user.toLowerCase();
                const mRecip = msg.recipient?.toLowerCase();
                const match = (mUser === sLower && mRecip === rLower) || (mUser === rLower && mRecip === sLower);
                return !match;
              });
            } else {
              filtered = thread.messages.filter((msg: any) => !msg.recipient);
            }
          } else {
            filtered = thread.messages.filter((msg: any) => !!msg.recipient || msg.type === 'shoutout');
          }
          if (filtered.length !== thread.messages.length) {
            thread.messages = filtered;
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem('dejavu_studio_threads', JSON.stringify(currentThreads));
          window.dispatchEvent(new Event('dejavu_studio_threads_updated'));
        }
      } catch {}
    };

    const onShoutoutsCleared = () => {
      try {
        const saved = localStorage.getItem('dejavu_studio_threads');
        if (!saved) return;
        const currentThreads = JSON.parse(saved);
        let updated = false;
        Object.keys(currentThreads).forEach(userKey => {
          const thread = currentThreads[userKey];
          const filtered = thread.messages.filter((m: any) => m.type !== 'shoutout');
          if (filtered.length !== thread.messages.length) {
            thread.messages = filtered;
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem('dejavu_studio_threads', JSON.stringify(currentThreads));
          window.dispatchEvent(new Event('dejavu_studio_threads_updated'));
        }
      } catch {}
    };

    socket.on('chatMessage', onChatMessage);
    socket.on('privateMessage', onPrivateMessage);
    socket.on('new_shoutout', onNewShoutout);
    socket.on('privateHistory', onPrivateHistory);
    socket.on('shoutoutHistory', onShoutoutHistory);
    socket.on('userThreadCleared', onUserThreadCleared);
    socket.on('messageDeleted', onMessageDeleted);
    socket.on('shoutoutDeleted', onShoutoutDeleted);
    socket.on('messagesCleared', onMessagesCleared);
    socket.on('shoutouts_cleared', onShoutoutsCleared);

    return () => {
      socket.off('chatMessage', onChatMessage);
      socket.off('privateMessage', onPrivateMessage);
      socket.off('new_shoutout', onNewShoutout);
      socket.off('privateHistory', onPrivateHistory);
      socket.off('shoutoutHistory', onShoutoutHistory);
      socket.off('userThreadCleared', onUserThreadCleared);
      socket.off('messageDeleted', onMessageDeleted);
      socket.off('shoutoutDeleted', onShoutoutDeleted);
      socket.off('messagesCleared', onMessagesCleared);
      socket.off('shoutouts_cleared', onShoutoutsCleared);
    };
  }, [isLogged, userRole, isStudioRoute, adminUsername]);

  const calculateTotalUnread = () => {
    try {
      const saved = localStorage.getItem('dejavu_studio_threads');
      if (!saved) return 0;
      const parsed = JSON.parse(saved);
      let count = 0;
      Object.values(parsed).forEach((thread: any) => {
        count += (thread.unreadCount || 0);
      });
      return count;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    setTotalUnread(calculateTotalUnread());

    const handleUpdate = () => {
      setTotalUnread(calculateTotalUnread());
    };

    window.addEventListener('dejavu_studio_threads_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('dejavu_studio_threads_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  useEffect(() => {
    // Avoid triggering tab loader if not logged in, or if navigating to studio or during initial load
    if (!isLogged || location.pathname.startsWith('/admin/studio') || sessionChecking) {
      setTabLoading(false);
      return;
    }

    setTabLoading(false);
  }, [location.pathname, isLogged, sessionChecking]);

  useEffect(() => {
    const verifySession = async () => {
      const sessionPromise = fetchAdmin("/api/admin/check");
      const timeoutPromise = new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error("Session check timed out")), 3500)
      );

      try {
        const res = await Promise.race([sessionPromise, timeoutPromise]);
        if (res.ok) {
          const data = await res.json();
          setIsLogged(true);
          setUserRole(data.user?.role || null);
          setAdminUsername(data.user?.username || data.username || null);
        }
      } catch (err) {
        console.warn("[Admin Auth] Session check failed or timed out:", err);
      } finally {
        setSessionChecking(false);
      }
    };

    verifySession();
  }, []);

  const [isPurgingCache, setIsPurgingCache] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { showAlert, showConfirm } = useModal();
  const queryClient = useQueryClient();

  // Cooldown timer interval
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handlePurgeCache = async () => {
    if (cooldownSeconds > 0) {
      showAlert({
        title: "Cooldown Active",
        message: `Please wait ${cooldownSeconds} second${cooldownSeconds > 1 ? 's' : ''} before initiating another cache purge.`,
        style: "info"
      });
      return;
    }

    const confirmed = await showConfirm({
      title: "Purge System & Browser Cache",
      message: "This will flush server memory caches, refresh podcast RSS feeds, and broadcast an immediate cache-invalidation version to all active and returning visitors' browsers. Proceed?",
      style: "warning",
      confirmText: "Purge All Caches",
    });
    if (!confirmed) return;

    setIsPurgingCache(true);
    try {
      const res = await fetchAdmin("/api/admin/system/purge-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: 'all' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to purge cache");

      if ('caches' in window) {
        try {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        } catch (e) {}
      }

      // Check service worker
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) reg.update().catch(() => {});
        } catch (e) {}
      }

      showAlert({
        title: "Cache Purged Successfully",
        message: `System cache flushed. Version: ${data.version || "updated"}.${data.clientsNotified ? ` Reached ${data.clientsNotified} connected visitor${data.clientsNotified > 1 ? 's' : ''}.` : ''}`,
        style: "success",
      });
      
      setCooldownSeconds(15);
      queryClient.invalidateQueries();
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message || "Failed to purge cache.", style: "danger" });
    } finally {
      setIsPurgingCache(false);
    }
  };

  const handleLogout = () => {
    fetchAdmin("/api/admin/logout", { method: "POST" }).then(() => {
      localStorage.removeItem("admin_token");
      setIsLogged(false);
      setUserRole(null);
      navigate("/admin");
    });
  };

  const [dashboardTheme, setDashboardTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('dashboard_theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    // Ensure Accessibility Hub options do not affect Creator Dashboard or Studio Inbox
    suppressAccessibilityForAdmin();

    // If currently in studio inbox, sync documentElement class with studio_theme
    if (location.pathname.startsWith('/admin/studio')) {
      const savedStudioTheme = localStorage.getItem('studio_theme') || 'dark';
      if (savedStudioTheme === 'light') {
        document.documentElement.classList.add('admin-light-mode');
      } else {
        document.documentElement.classList.remove('admin-light-mode');
      }
      return () => {
        document.documentElement.classList.remove('admin-light-mode');
        applyFrontAccessibilityOptions();
      };
    }

    // Apply dashboard theme
    if (dashboardTheme === 'light') {
      document.documentElement.classList.add('admin-light-mode');
    } else {
      document.documentElement.classList.remove('admin-light-mode');
    }

    // Cleanup: restore front-facing theme & accessibility options when leaving dashboard/studio
    return () => {
      document.documentElement.classList.remove('admin-light-mode');
      applyFrontAccessibilityOptions();
    };
  }, [dashboardTheme, location.pathname]);

  const toggleTheme = () => {
    const next = dashboardTheme === 'light' ? 'dark' : 'light';
    setDashboardTheme(next);
    localStorage.setItem('dashboard_theme', next);
    window.dispatchEvent(new Event('dashboard-theme-change'));
  };

  if (sessionChecking) {
    return (
      <AppLoader size="lg" fullScreen />
    );
  }

  if (!isLogged) {
    return (
      <div className={dashboardTheme === 'light' ? 'light' : 'dark'}>
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <AdminSecretGate
            onPass={() => setIsLogged(false)}
            onLogin={(user) => {
              setIsLogged(true);
              setUserRole(user?.role || null);
              setAdminUsername(user?.username || null);
            }}
          />
        </div>
      </div>
    );
  }

  // Render the AI Social Content Studio as a dedicated, full-screen standalone workspace for Admins only
  if (location.pathname.includes('/social-studio') || location.pathname.includes('/ai-studio')) {
    if (userRole !== 'admin' && userRole !== 'owner') {
      return <Navigate to={`${adminBasePath}/live-tools`} replace />;
    }
    if (settings?.feat_ai_studio === '0' || settings?.ai_studio_enabled === '0') {
      return <Navigate to={adminBasePath} replace />;
    }
    return (
      <Suspense fallback={
        <AppLoader size="lg" fullScreen />
      }>
        <AdminAIContentStudio onLogout={handleLogout} />
      </Suspense>
    );
  }

  // Render the Studio page as a full-screen, standalone component if the path matches
  if (location.pathname.includes('/studio')) {
    if ((userRole && userRole !== 'admin' && userRole !== 'dj' && userRole !== 'owner') || !isStudioEnabled) {
      return <Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />;
    }
    return (
      <Suspense fallback={
        <AppLoader size="lg" fullScreen />
      }>
        <AdminStudio onLogout={handleLogout} />
      </Suspense>
    );
  }
  return (
    <div className={dashboardTheme === 'light' ? 'light' : 'dark'}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto px-4 py-8 md:py-16 admin-page-wrapper"
      >
        <div className="mb-8 md:mb-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-neon-blue/15 text-[var(--color-neon-blue)] border border-neon-blue/30 shadow-sm shadow-neon-blue/10">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" />
                Live Broadcast Hub
              </span>
            </div>
            <h1 className={`text-4xl md:text-5xl lg:text-5xl font-display font-black uppercase tracking-tighter leading-none ${userRole === 'admin' ? 'text-[var(--theme-text)]' : 'text-white'}`}>
              Creator <span className="text-neon-purple">Dashboard</span>
            </h1>
            <div className="flex items-center space-x-4 mt-3">
              <div className="h-px w-10 bg-neon-purple" />
              <p className={`text-xs md:text-sm font-mono uppercase tracking-[0.25em] ${location.pathname.includes('admin') ? 'text-[var(--theme-text)] opacity-50' : 'text-white/40'}`}>
                Control centre for station broadcasts & creators
              </p>
            </div>
          </motion.div>
 
          {/* Unified Premium Command Dock */}
          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap sm:flex-nowrap">
            <div className={`p-1.5 rounded-2xl border flex items-center gap-1 sm:gap-1.5 backdrop-blur-xl shadow-lg transition-all ${
              dashboardTheme === 'light'
                ? 'bg-white/90 border-black/10 shadow-black/5'
                : 'bg-[#0E101E]/80 border-white/10 shadow-black/40'
            }`}>
              {/* Studio Inbox */}
              {(userRole === 'admin' || userRole === 'dj' || userRole === 'owner') && isStudioEnabled && (
                <Link
                  to={`${adminBasePath}/studio`}
                  className="group relative inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border border-transparent hover:border-neon-purple/40 hover:bg-neon-purple/15 text-[var(--color-neon-purple)] hover:text-white"
                  title="Go to Live Studio Inbox"
                  aria-label="Studio Inbox"
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-purple opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-purple" />
                  </span>
                  <Radio className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline font-display tracking-widest text-[11px]">Studio Inbox</span>
                  {totalUnread > 0 && (
                    <span 
                      className="flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-black font-mono leading-none text-white border border-[#0A0C16]/40 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, var(--color-neon-purple), var(--color-neon-blue))' }}
                    >
                      {totalUnread}
                    </span>
                  )}
                </Link>
              )}

              {/* AI Content Studio */}
              {(userRole === 'admin' || userRole === 'owner') && settings?.feat_ai_studio !== '0' && settings?.ai_studio_enabled !== '0' && (
                <Link
                  to={`${adminBasePath}/social-studio`}
                  className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border border-transparent hover:border-neon-blue/40 hover:bg-neon-blue/15 text-[var(--color-neon-blue)] hover:text-white"
                  title="Open AI Automatic Social Content Studio"
                  aria-label="AI Content Studio"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-neon-blue)] shrink-0" />
                  <span className="hidden sm:inline font-display tracking-widest text-[11px]">AI Studio</span>
                </Link>
              )}

              {/* Purge Cache Quick Trigger */}
              {(userRole === 'admin' || userRole === 'owner') && (
                <button
                  type="button"
                  onClick={handlePurgeCache}
                  disabled={isPurgingCache || cooldownSeconds > 0}
                  className={`inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border border-transparent ${
                    cooldownSeconds > 0
                      ? 'opacity-60 cursor-not-allowed text-emerald-400'
                      : 'hover:border-emerald-500/40 hover:bg-emerald-500/15 text-emerald-400 hover:text-white'
                  }`}
                  title={cooldownSeconds > 0 ? `Purge Cooldown: ${cooldownSeconds}s` : "Purge All Server & Browser Caches"}
                  aria-label="Purge Cache"
                >
                  <Zap className={`w-3.5 h-3.5 shrink-0 ${isPurgingCache ? 'animate-pulse text-emerald-300' : 'text-emerald-400'}`} />
                  <span className="hidden sm:inline font-display tracking-widest text-[11px]">
                    {isPurgingCache 
                      ? "Purging..." 
                      : cooldownSeconds > 0 
                        ? `Purged (${cooldownSeconds}s)` 
                        : "Purge Cache"}
                  </span>
                </button>
              )}

              {/* Subtle Divider */}
              <div className={`h-5 w-px mx-0.5 sm:mx-1 ${dashboardTheme === 'light' ? 'bg-black/10' : 'bg-white/10'}`} />

              {/* Homepage */}
              <Link
                to="/"
                className={`inline-flex items-center justify-center h-8 w-8 rounded-xl transition ${
                  dashboardTheme === 'light'
                    ? 'text-black/60 hover:text-black hover:bg-black/5'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Go to Station Homepage"
                aria-label="Station Homepage"
              >
                <HomeIcon className="w-4 h-4" />
              </Link>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-xl transition ${
                  dashboardTheme === 'light'
                    ? 'text-black/60 hover:text-black hover:bg-black/5'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Theme"
                aria-label="Toggle Theme"
              >
                {dashboardTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center h-8 w-8 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel admin-dashboard-container min-h-[80vh] rounded-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl relative z-10">
          <AdminSidebar onLogout={handleLogout} isAdminUser={userRole === 'admin'} userRole={userRole} />
          <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="min-h-full"
              >
                <ErrorBoundary key={location.pathname}>
                  <Suspense fallback={<LoadingFallback />}>
                    {tabLoading ? (
                      <LoadingFallback />
                    ) : (
                      <Routes>
                        <Route path="/" element={isAdmin ? <AdminAnalytics isAdminUser={true} /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/live-tools" element={isLiveToolsEnabled ? <AdminLiveTools /> : <Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />} />
                        <Route path="/menu" element={isAdmin ? <AdminMenu /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/pages" element={isAdmin ? <AdminPages /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/features" element={isAdmin ? <AdminFeatures /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/djs" element={isAdmin ? <AdminDJs /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/popup" element={isAdmin ? <AdminPopup /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/ads" element={isAdmin ? <AdminAds /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/events" element={isAdmin && isSpecialEventsEnabled ? <AdminEvents /> : <Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />} />
                        <Route path="/shoutouts" element={isShoutoutsEnabled ? <AdminShoutouts isAdminUser={isAdmin} /> : <Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />} />
                        <Route path="/bookings" element={isAdmin && isBookingsEnabled ? <AdminBookings /> : <Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />} />
                        <Route path="/schedule" element={isAdmin ? <AdminSchedule /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/profile" element={<AdminProfile />} />
                        <Route path="/song-requests" element={isBoothEnabled ? <AdminSongRequests /> : <Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />} />

                        <Route path="/settings" element={isAdmin ? <AdminSettings /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/advanced" element={isAdmin ? <AdminAdvanced /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/media" element={isAdmin ? <AdminMedia /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/branding" element={isAdmin ? <AdminBranding /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/users" element={isAdmin ? <AdminUsers isAdminUser={isAdmin} userRole={userRole} currentUsername={adminUsername} /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/chat-users" element={isAdmin && isChatEnabled ? <AdminChatUsers isAdminUser={isAdmin} /> : <Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />} />
                        <Route path="/chat-room-setting" element={isAdmin ? <AdminChatRoomSettings /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/audit-logs" element={isAdmin ? <AdminAuditLogs /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/email" element={isAdmin ? <AdminEmail /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/backup" element={isAdmin && isBackupEnabled ? <AdminBackup /> : <Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />} />
                        <Route path="/meta-integrations" element={isAdmin && isMetaEnabled ? <AdminMetaIntegrations /> : <Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />} />
                        <Route path="/seo" element={isAdmin ? <AdminSEO /> : <Navigate to={defaultDjPath} replace />} />
                        <Route path="/owner-control" element={isOwner ? <AdminOwnerControl /> : <Navigate to={adminBasePath} replace />} />

                        <Route path="*" element={<Navigate to={isAdmin ? adminBasePath : defaultDjPath} replace />} />
                      </Routes>
                    )}
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
