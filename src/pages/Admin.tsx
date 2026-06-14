import React, { useState, useEffect, Suspense } from "react";
import { useNavigate, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./admin/adminApi";
import { LoadingFallback } from "./admin/LoadingFallback";
import { AdminSecretGate } from "./admin/AdminAuth";
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminAnalytics } from "./admin/AdminAnalytics";
import { AdminLiveTools } from "./admin/AdminLiveTools";
import { AdminDJs } from "./admin/AdminDJs";
import { AdminBlogs } from "./admin/AdminBlogs";
import { AdminPopup } from "./admin/AdminPopup";
import { AdminShoutouts } from "./admin/AdminShoutouts";
import { AdminBookings } from "./admin/AdminBookings";
import { AdminSchedule } from "./admin/AdminSchedule";
import { AdminProfile } from "./admin/AdminProfile";
import { AdminAdvanced, AdminBranding, AdminSettings } from "./admin/AdminSystem";
import { AdminUsers } from "./admin/AdminUsers";
import { AdminChatUsers } from "./admin/AdminChatUsers";
import { AdminAuditLogs } from "./admin/AdminAuditLogs";

export default function Admin() {
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetchAdmin("/api/admin/check");
        if (res.ok) {
          const data = await res.json();
          setIsLogged(true);
          if (data.user?.role === "admin") {
            setIsAdminUser(true);
          }
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
      setIsAdminUser(false);
      navigate("/admin");
    });
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
          if (user?.role === "admin") setIsAdminUser(true);
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
      <div className="mb-10 md:mb-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-5xl lg:text-5xl font-display font-black uppercase tracking-tighter text-white leading-none">
            Creator <span className="text-neon-purple">Dashboard</span>
          </h1>
          <div className="flex items-center space-x-4 mt-4">
            <div className="h-px w-12 bg-neon-purple" />
            <p className="text-white/40 text-xs md:text-sm font-mono uppercase tracking-[0.3em]">
              Control center for DejavuFM station
            </p>
          </div>
        </motion.div>
      </div>

      <div className="glass-panel min-h-[80vh] rounded-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl relative z-10">
        <AdminSidebar onLogout={handleLogout} isAdminUser={isAdminUser} />
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
                  <Route path="/" element={<AdminAnalytics isAdminUser={isAdminUser} />} />
                  <Route path="/live-tools" element={<AdminLiveTools />} />
                  <Route path="/djs" element={<AdminDJs />} />
                  <Route path="/blogs" element={<AdminBlogs />} />
                  <Route path="/popup" element={<AdminPopup />} />
                  <Route path="/shoutouts" element={<AdminShoutouts isAdminUser={isAdminUser} />} />
                  <Route path="/bookings" element={<AdminBookings />} />
                  <Route path="/schedule" element={<AdminSchedule />} />
                  <Route path="/profile" element={<AdminProfile />} />

                  <Route path="/settings" element={isAdminUser ? <AdminSettings /> : <Navigate to="/admin" replace />} />
                  <Route path="/advanced" element={isAdminUser ? <AdminAdvanced /> : <Navigate to="/admin" replace />} />
                  <Route path="/branding" element={isAdminUser ? <AdminBranding /> : <Navigate to="/admin" replace />} />
                  <Route path="/users" element={isAdminUser ? <AdminUsers isAdminUser={isAdminUser} /> : <Navigate to="/admin" replace />} />
                  <Route path="/chat-users" element={isAdminUser ? <AdminChatUsers isAdminUser={isAdminUser} /> : <Navigate to="/admin" replace />} />
                  <Route path="/audit-logs" element={isAdminUser ? <AdminAuditLogs /> : <Navigate to="/admin" replace />} />

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
