import React, { useState, useEffect, Suspense } from "react";
import { useNavigate, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon } from "lucide-react";
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
import { AdminApiKeys } from "./admin/AdminApiKeys";
import { useLogo } from "../hooks/useLogo";

export default function Admin() {
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetchAdmin("/api/admin/check");
        if (res.ok) {
          const data = await res.json();
          setIsLogged(true);
          setUserRole(data.user?.role || null);
        }
      } catch (err) {
        console.error("[Admin Auth] Session check failed:", err);
      } finally {
        setLoading(false);
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

  const { isLightMode } = useLogo();
  const toggleTheme = () => {
    const next = !isLightMode;
    if (next) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-neon-purple rounded-full animate-spin shadow-[0_0_15px_rgba(176,38,255,0.5)]" />
      </div>
    );
  }

  if (!isLogged) {
    return (
      <AdminSecretGate
        onPass={() => setIsLogged(false)}
        onLogin={(user) => {
          setIsLogged(true);
          setUserRole(user?.role || null);
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-4 py-8 md:py-16"
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

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center justify-center min-h-[3rem] min-w-[3rem] rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
          title="Toggle theme"
        >
          {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>

      <div className="glass-panel min-h-[80vh] rounded-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl relative z-10">
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
                <Routes location={location}>
                  <Route path="/" element={<AdminAnalytics isAdminUser={userRole === 'admin'} />} />
                  <Route path="/live-tools" element={<AdminLiveTools />} />
                  <Route path="/djs" element={<AdminDJs />} />
                  <Route path="/features" element={<AdminFeatures />} />
                  <Route path="/popup" element={<AdminPopup />} />
                  <Route path="/ads" element={<AdminAds />} />
                  <Route path="/shoutouts" element={<AdminShoutouts isAdminUser={userRole === 'admin'} />} />
                  <Route path="/bookings" element={<AdminBookings />} />
                  <Route path="/schedule" element={<AdminSchedule />} />
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

                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
