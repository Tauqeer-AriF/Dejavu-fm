import React, { useState, useEffect, Suspense } from "react";
import { useNavigate, Routes, Route, useLocation, Navigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon, Radio, LogOut, Home as HomeIcon } from "lucide-react";
import { fetchAdmin } from "./admin/adminApi";
import { LoadingFallback } from "./admin/LoadingFallback";
import { AdminSecretGate } from "./admin/AdminAuth";
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminAnalytics } from "./admin/AdminAnalytics";
import { AdminLiveTools } from "./admin/AdminLiveTools";
import { AdminDJs } from "./admin/AdminDJs";
import { AdminFeatures } from "./admin/AdminFeatures";
import { AdminPopup } from "./admin/AdminPopup";
import { AdminShoutouts } from "./admin/AdminShoutouts";
import { AdminBookings } from "./admin/AdminBookings";
import { AdminSchedule } from "./admin/AdminSchedule";
import { AdminProfile } from "./admin/AdminProfile";
import { AdminAdvanced, AdminBranding, AdminSettings } from "./admin/AdminSystem";
import { AdminUsers } from "./admin/AdminUsers";
import { AdminChatUsers } from "./admin/AdminChatUsers";
import { AdminChatRoomSettings } from "./admin/AdminChatRoomSettings";
import { AdminAuditLogs } from "./admin/AdminAuditLogs";
import { AdminBackup } from "./admin/AdminBackup";
import { AdminAds } from "./admin/AdminAds";
import { AdminSEO } from "./admin/AdminSEO";
import { AdminMedia } from "./admin/AdminMedia";
const AdminStudio = React.lazy(() => import("./admin/AdminStudio").then(m => ({ default: m.AdminStudio })));
import { AdminApiKeys } from "./admin/AdminApiKeys";
const AdminMetaIntegrations = React.lazy(() => import("./admin/AdminMetaIntegrations").then(m => ({ default: m.AdminMetaIntegrations })));
import { useLogo } from "../hooks/useLogo";
import { PremiumRingLoader } from "../components/PremiumRingLoader";
import { AppLoader } from "../components/AppLoader";
import { suppressAccessibilityForAdmin, applyFrontAccessibilityOptions } from "../utils/accessibility";

export default function Admin() {
  const [isLogged, setIsLogged] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const isStudioRoute = location.pathname.startsWith('/admin/studio');

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

  // Listen to background messages when user is not on the Studio page
  useEffect(() => {
    if (!isLogged || (userRole !== 'admin' && userRole !== 'dj') || isStudioRoute) {
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

      let currentThreads: Record<string, any> = {};
      try {
        const savedThreads = localStorage.getItem('dejavu_studio_threads');
        if (savedThreads) currentThreads = JSON.parse(savedThreads);
      } catch {}

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
          imageUrl: msg.imageUrl,
          audioUrl: msg.audioUrl,
          videoUrl: msg.videoUrl,
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
          imageUrl: shoutout.imageUrl,
          audioUrl: shoutout.audioUrl,
          videoUrl: shoutout.videoUrl,
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
        imageUrl: message.imageUrl,
        audioUrl: message.audioUrl,
        videoUrl: message.videoUrl,
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

    socket.on('chatMessage', onChatMessage);
    socket.on('privateMessage', onPrivateMessage);
    socket.on('new_shoutout', onNewShoutout);
    socket.on('privateHistory', onPrivateHistory);
    socket.on('shoutoutHistory', onShoutoutHistory);

    return () => {
      socket.off('chatMessage', onChatMessage);
      socket.off('privateMessage', onPrivateMessage);
      socket.off('new_shoutout', onNewShoutout);
      socket.off('privateHistory', onPrivateHistory);
      socket.off('shoutoutHistory', onShoutoutHistory);
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
    if (!isLogged || location.pathname.startsWith('/admin/studio') || sessionChecking || premiumLoading) {
      return;
    }

    setTabLoading(true);
    const timer = setTimeout(() => {
      setTabLoading(false);
    }, 450); // 450ms transition time

    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetchAdmin("/api/admin/check");
        if (res.ok) {
          const data = await res.json();
          setIsLogged(true);
          setUserRole(data.user?.role || null);
          setAdminUsername(data.user?.username || data.username || null);
        }
      } catch (err) {
        console.warn("[Admin Auth] Session check failed (likely network error or unauthenticated).");
      } finally {
        setSessionChecking(false);
      }
    };

    verifySession();
  }, []);

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

  if (sessionChecking || premiumLoading) {
    return <AppLoader onComplete={() => setPremiumLoading(false)} />;
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

  // Render the Studio page as a full-screen, standalone component if the path matches
  if (location.pathname.startsWith('/admin/studio')) {
    if (userRole !== 'admin' && userRole !== 'dj') {
      return <Navigate to="/admin/live-tools" replace />;
    }
    return (
      <Suspense fallback={<AppLoader onComplete={() => {}} />}>
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
        <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1"
          >
            <h1 className={`text-5xl md:text-5xl lg:text-5xl font-display font-black uppercase tracking-tighter leading-none ${userRole === 'admin' ? 'text-[var(--theme-text)]' : 'text-white'}`}>
              Creator <span className="text-neon-purple">Dashboard</span>
            </h1>
            <div className="flex items-center space-x-4 mt-4">
              <div className="h-px w-12 bg-neon-purple" />
              <p className={`text-xs md:text-sm font-mono uppercase tracking-[0.3em] ${location.pathname.includes('admin') ? 'text-[var(--theme-text)] opacity-40' : 'text-white/40'}`}>
                Control center for DejavuFM station
              </p>
            </div>
          </motion.div>
 
          <div className="flex items-center gap-3">
            {(userRole === 'admin' || userRole === 'dj') && (
              <Link
                to="/admin/studio"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full border border-neon-purple/30 bg-neon-purple/10 text-neon-purple font-bold uppercase text-xs tracking-widest transition hover:bg-neon-purple hover:text-white hover:shadow-lg hover:shadow-neon-purple/20 relative"
                title="Go to Live Studio Tools"
              >
                <Radio className="w-4 h-4" />
                Studio
                {totalUnread > 0 && (
                  <span 
                    className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black font-mono leading-none text-white border border-[#0A0C16]/40 shadow-[0_2px_10px_-1px_var(--color-neon-purple)]"
                    style={{ background: 'linear-gradient(135deg, var(--color-neon-purple), var(--color-neon-blue))' }}
                  >
                    {totalUnread}
                  </span>
                )}
              </Link>
            )}
            <Link
              to="/"
              className={`inline-flex items-center justify-center h-12 w-12 rounded-full border transition admin-home-btn ${
                dashboardTheme === 'light'
                  ? 'border-black/10 bg-black/5 text-black/80 hover:bg-black/10 hover:text-black'
                  : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              title="Go to Homepage"
            >
              <HomeIcon className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center min-h-[3rem] min-w-[3rem] rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white admin-theme-toggle-btn"
              title="Toggle theme"
            >
              {dashboardTheme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={`inline-flex items-center justify-center h-12 w-12 rounded-full border transition duration-200 ${
                dashboardTheme === 'light'
                  ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-sm'
                  : 'border-red-500/20 bg-red-500/10 text-red-400/90 hover:bg-red-500/20 hover:text-red-400'
              }`}
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="glass-panel admin-dashboard-container min-h-[80vh] rounded-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl relative z-10">
          <AdminSidebar onLogout={handleLogout} isAdminUser={userRole === 'admin'} />
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
                <Suspense fallback={<LoadingFallback />}>
                  {tabLoading ? (
                    <LoadingFallback />
                  ) : (
                    <Routes location={location}>
                      <Route path="/" element={userRole === 'admin' ? <AdminAnalytics isAdminUser={true} /> : <Navigate to="/admin/live-tools" replace />} />
                      <Route path="/live-tools" element={<AdminLiveTools />} />
                      <Route path="/djs" element={userRole === 'admin' ? <AdminDJs /> : <Navigate to="/admin/live-tools" replace />} />
                      <Route path="/features" element={userRole === 'admin' ? <AdminFeatures /> : <Navigate to="/admin/live-tools" replace />} />
                      <Route path="/popup" element={userRole === 'admin' ? <AdminPopup /> : <Navigate to="/admin/live-tools" replace />} />
                      <Route path="/ads" element={userRole === 'admin' ? <AdminAds /> : <Navigate to="/admin/live-tools" replace />} />
                      <Route path="/shoutouts" element={<AdminShoutouts isAdminUser={userRole === 'admin'} />} />
                      <Route path="/bookings" element={userRole === 'admin' ? <AdminBookings /> : <Navigate to="/admin/live-tools" replace />} />
                      <Route path="/schedule" element={userRole === 'admin' ? <AdminSchedule /> : <Navigate to="/admin/live-tools" replace />} />
                      <Route path="/profile" element={<AdminProfile />} />

                      <Route path="/settings" element={userRole === 'admin' ? <AdminSettings /> : <Navigate to="/admin" replace />} />
                      <Route path="/seo" element={userRole === 'admin' ? <AdminSEO /> : <Navigate to="/admin" replace />} />
                      <Route path="/media" element={userRole === 'admin' ? <AdminMedia /> : <Navigate to="/admin" replace />} />
                      <Route path="/advanced" element={userRole === 'admin' ? <AdminAdvanced /> : <Navigate to="/admin" replace />} />
                      <Route path="/branding" element={userRole === 'admin' ? <AdminBranding /> : <Navigate to="/admin" replace />} />
                      <Route path="/users" element={userRole === 'admin' ? <AdminUsers isAdminUser={userRole === 'admin'} /> : <Navigate to="/admin" replace />} />
                      <Route path="/chat-users" element={userRole === 'admin' ? <AdminChatUsers isAdminUser={userRole === 'admin'} /> : <Navigate to="/admin" replace />} />
                      <Route path="/chat-room-setting" element={userRole === 'admin' ? <AdminChatRoomSettings /> : <Navigate to="/admin" replace />} />
                      <Route path="/audit-logs" element={userRole === 'admin' ? <AdminAuditLogs /> : <Navigate to="/admin" replace />} />
                      <Route path="/backup" element={userRole === 'admin' ? <AdminBackup /> : <Navigate to="/admin" replace />} />
                      <Route path="/api-keys" element={userRole === 'admin' ? <AdminApiKeys /> : <Navigate to="/admin" replace />} />
                      <Route path="/meta-integrations" element={userRole === 'admin' ? <AdminMetaIntegrations /> : <Navigate to="/admin" replace />} />

                      <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                  )}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
