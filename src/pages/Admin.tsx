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
import { PremiumLoader } from "../components/PremiumLoader";

export default function Admin() {
  const [isLogged, setIsLogged] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [premiumLoading, setPremiumLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

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
    // Determine if the front-facing theme is light
    const frontThemeIsLight = localStorage.getItem('theme') === 'light';

    // Apply dashboard theme
    if (dashboardTheme === 'light') {
      document.documentElement.classList.add('admin-light-mode');
      document.documentElement.classList.remove('light'); // Hide front light mode styling
    } else {
      document.documentElement.classList.remove('admin-light-mode');
      document.documentElement.classList.remove('light'); // Ensure front light mode is disabled in admin dark mode
    }

    // Cleanup: restore front-facing theme when leaving the dashboard
    return () => {
      document.documentElement.classList.remove('admin-light-mode');
      if (frontThemeIsLight) {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    };
  }, [dashboardTheme]);

  const toggleTheme = () => {
    const next = dashboardTheme === 'light' ? 'dark' : 'light';
    setDashboardTheme(next);
    localStorage.setItem('dashboard_theme', next);
    window.dispatchEvent(new Event('dashboard-theme-change'));
  };

  if (sessionChecking || premiumLoading) {
    return <PremiumLoader onComplete={() => setPremiumLoading(false)} />;
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
            }}
          />
        </div>
      </div>
    );
  }

  // Render the Studio page as a full-screen, standalone component if the path matches
  if (location.pathname.startsWith('/admin/studio')) {
    if (userRole !== 'admin') {
      return <Navigate to="/admin/live-tools" replace />;
    }
    return (
      <Suspense fallback={<PremiumLoader onComplete={() => {}} />}>
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
            {userRole === 'admin' && (
              <Link
                to="/admin/studio"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full border border-neon-purple/30 bg-neon-purple/10 text-neon-purple font-bold uppercase text-xs tracking-widest transition hover:bg-neon-purple hover:text-white hover:shadow-lg hover:shadow-neon-purple/20"
                title="Go to Live Studio Tools"
              >
                <Radio className="w-4 h-4" />
                Studio
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
