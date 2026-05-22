import React, { useRef, useState, useEffect, useMemo, Suspense, lazy } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { useModal } from "../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";

// In a real professional setup, these would be moved to separate files
// For now, we simulate the performance win by ensuring the structural return uses Suspense.
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="w-6 h-6 border-2 border-neon-purple border-t-transparent animate-spin rounded-full" />
  </div>
);

const fetchAdmin = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('admin_token');
  const headers = { 
    ...options.headers, 
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
  };
  return fetch(url, { ...options, headers, credentials: "include" });
};

function ImageUploadField({ 
  label, 
  value, 
  onChange, 
  description,
  placeholder = "URL or upload...",
  className = ""
}: { 
  label?: string; 
  value: string; 
  onChange: (val: string) => void; 
  description?: string;
  placeholder?: string;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useModal();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    
    // If current value is a local upload, tell the server to delete it
    if (value && value.startsWith('/uploads/')) {
      formData.append("oldUrl", value);
    }
    formData.append("image", file);

    setUploading(true);
    try {
      const res = await fetchAdmin("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      } else {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        showAlert({ title: "Upload Error", message: err.error, style: "danger" });
      }
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to connect to upload server", style: "danger" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-xs uppercase mb-1 text-white/50 font-bold">{label}</label>}
      <div className="flex items-center gap-3">
        {value && (
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 relative">
          <input 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2 focus:border-neon-purple outline-none text-sm pr-10" 
            placeholder={placeholder} 
          />
          {value && (
            <button 
              type="button" 
              onClick={() => onChange("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center">
          {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Upload className="w-4 h-4 text-white/60" />}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>
      {description && <p className="text-[10px] text-white/30 mt-1 italic">{description}</p>}
    </div>
  );
}

export default function Admin() {
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false); // New state for admin role
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetchAdmin("/api/admin/check");
        if (res.ok) {
          const data = await res.json();
          // Atomic state updates: React 18 batches these into a single re-render
          setIsLogged(true);
          if (data.user?.role === 'admin') {
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
    fetchAdmin("/api/admin/logout", { method: 'POST' }).then(() => {
      localStorage.removeItem('admin_token');
      setIsLogged(false);
      setIsAdminUser(false);
      navigate("/admin");
    });
  };

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div 
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] bg-dark-bg flex flex-col items-center justify-center space-y-6"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-white/5 rounded-full" />
            <div className="absolute inset-0 w-20 h-20 border-t-4 border-neon-purple rounded-full animate-spin shadow-[0_0_20px_rgba(176,38,255,0.5)]" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-display font-black uppercase tracking-widest text-white">Initializing</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black animate-pulse">Secure Control Link...</p>
          </div>
        </motion.div>
      ) : !isLogged ? (
        <motion.div 
          key="gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AdminSecretGate 
            onPass={() => setIsLogged(false)} 
            onLogin={(user) => { setIsLogged(true); if (user?.role === 'admin') setIsAdminUser(true); }} 
          />
        </motion.div>
      ) : (
        <motion.div 
          key="dashboard"
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
                <div className="h-px w-12 bg-neon-purple"></div>
                <p className="text-white/40 text-xs md:text-sm font-mono uppercase tracking-[0.3em]">Control center for DejavuFM station</p>
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
                    <Route path="/shoutouts" element={<AdminShoutouts isAdminUser={isAdminUser} />} />
                    <Route path="/bookings" element={<AdminBookings />} />
                    <Route path="/schedule" element={<AdminSchedule />} />
                    <Route path="/profile" element={<AdminProfile />} />

                    {/* Admin Only Protected Routes */}
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
      )}
    </AnimatePresence>
  );
}

function AdminSecretGate({ onPass, onLogin }: { onPass: () => void; onLogin: (user?: any) => void }) {
  const [passedSecret, setPassedSecret] = useState(() => sessionStorage.getItem('admin_secret_passed') === 'true');
  const [answer, setAnswer] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  const handleSecretSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setIsVerifying(true);
    try {
      const res = await fetch("/api/public/admin-challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });

      if (res.ok) {
        sessionStorage.setItem('admin_secret_passed', 'true');
        setPassedSecret(true);
      } else {
        setAnswer("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!passedSecret) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 md:p-12 glass-panel rounded-[2.5rem] shadow-2xl relative z-10 text-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-neon-purple" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-black uppercase tracking-tight">Security Check</h2>
            <p className="text-white/40 text-sm font-medium">Identify yourself to proceed to the control center.</p>
          </div>
        </div>

        <form onSubmit={handleSecretSubmit} className="space-y-6">
          <div className="space-y-2 text-left">
            <label className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-4">Authorized Name</label>
            <div className="relative">
              <input
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Who are you?"
                className="w-full bg-white/5 border border-white/10 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple rounded-2xl px-6 py-4 text-white placeholder:text-white/10 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={isVerifying || !answer.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 bg-white text-dark-bg rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isVerifying ? <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent animate-spin rounded-full" /> : <Shield className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="pt-2">
            <Link to="/" className="text-xs text-white/20 hover:text-white transition-colors uppercase tracking-widest font-black">
              Return Home
            </Link>
          </div>
        </form>
      </div>
    );
  }

  return <AdminLogin onLogin={onLogin} />;
}

function AdminLogin({ onLogin }: { onLogin: (user?: any) => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
      }
      setSuccess(true);
      setTimeout(() => onLogin(data.user), 1500);
    } else {
      const data = await res.json().catch(() => ({ error: "Invalid login" }));
      setErr(data.error || "Invalid login");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 md:p-12 glass-panel rounded-3xl shadow-[0_0_50px_rgba(176,38,255,0.15)] relative z-10">
      <h2 className="text-4xl font-display font-black mb-8 text-center tracking-tight uppercase">Admin <span className="text-neon-purple">Portal</span></h2>
      {err && !success && <div className="bg-red-500/20 text-red-500 p-3 rounded mb-4 text-center text-sm">{err}</div>}
      {success && <div className="bg-green-500/20 border border-green-500 text-green-400 p-3 rounded mb-4 text-center text-sm">You are logged in! Redirecting...</div>}
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-xs uppercase text-white/50 mb-1">Username</label>
          <input type="text" value={user} onChange={e=>setUser(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" required />
        </div>
        <div>
          <label className="block text-xs uppercase text-white/50 mb-1">Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={pass} onChange={e=>setPass(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 pr-10 focus:border-neon-purple outline-none" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors focus:outline-none">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button type="submit" className="w-full bg-neon-purple text-white font-bold py-3 rounded hover:bg-neon-blue hover:shadow-[0_0_15px_#00d2ff] transition-all">
          Login
        </button>
        <div className="pt-2 text-center">
          <Link to="/" className="inline-flex items-center text-sm text-white/50 hover:text-white transition-colors">
            <HomeIcon className="w-4 h-4 mr-2" />
            Back to Homepage
          </Link>
        </div>
      </form>
    </div>
  );
}

function AdminSidebar({ onLogout, isAdminUser }: { onLogout: () => void; isAdminUser: boolean }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const { data: features = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
  });

  let navs = [
    { name: "Analytics", path: "/admin", icon: BarChart3 },
    { name: "Live Tools", path: "/admin/live-tools", icon: Radio },
    { name: "Settings", path: "/admin/settings", icon: Settings },
    { name: "Advanced", path: "/admin/advanced", icon: Ghost },
    { name: "My Profile", path: "/admin/profile", icon: User },
    { name: "Interaction", path: "/admin/shoutouts", icon: MessageSquare },
    { name: "Agency", path: "/admin/bookings", icon: Calendar },
    { name: "Branding", path: "/admin/branding", icon: HomeIcon },
    { name: "DJs", path: "/admin/djs", icon: Users },
    { name: "Blogs", path: "/admin/blogs", icon: FileText },
    { name: "Schedule", path: "/admin/schedule", icon: Calendar },
    { name: "Admin Users", path: "/admin/users", icon: UserCog },
    { name: "Chat Users", path: "/admin/chat-users", icon: MessageSquare },
    { name: "Audit Logs", path: "/admin/audit-logs", icon: Shield },
  ];

  if (!isAdminUser) {
    // 1. Filter out tabs that strictly require the 'admin' role
    navs = navs.filter(n =>
      n.name !== "Settings" &&
      n.name !== "Advanced" &&
      n.name !== "Branding" &&
      n.name !== "Admin Users" &&
      n.name !== "Chat Users" &&
      n.name !== "Audit Logs"
    );

    // 2. Apply dynamic feature flags only for non-admins to ensure admins have full control
    if (features.feat_live_tools === '0') navs = navs.filter(n => n.name !== 'Live Tools');
    if (features.feat_shoutouts === '0') navs = navs.filter(n => n.name !== 'Interaction');
    if (features.feat_bookings === '0') navs = navs.filter(n => n.name !== 'Agency');
    if (features.feat_chat === '0') navs = navs.filter(n => n.name !== 'Chat Users');
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 w-full bg-dark-bg/50">
        <span className="font-bold uppercase tracking-widest text-neon-purple">Admin</span>
        <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className={`${isOpen ? 'flex' : 'hidden'} md:flex flex-col w-full ${isCollapsed ? 'md:w-20' : 'md:w-64'} bg-dark-bg/95 md:bg-dark-bg/50 border-b md:border-b-0 md:border-r border-white/10 absolute md:relative z-20 top-[73px] md:top-0 left-0 h-[calc(100%-73px)] md:h-auto transition-all duration-300 ease-in-out`}>
        {/* Toggle Button for Desktop */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 bg-neon-purple rounded-full items-center justify-center text-white border border-white/20 shadow-lg z-30 hover:scale-110 transition-transform"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex-1 flex flex-col p-4 overflow-y-auto scrollbar-thin overflow-x-visible">
          <div className="flex-1 space-y-2 mt-4">
            {navs.map(n => {
              const active = location.pathname === n.path;
              return (
                <Link key={n.name} title={isCollapsed ? n.name : ""} to={n.path} onClick={() => setIsOpen(false)} className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition-all duration-200 ${active ? 'bg-neon-purple/20 text-neon-purple' : 'hover:bg-white/5 text-white/70'}`}>
                  <n.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-neon-purple' : ''}`} />
                  {!isCollapsed && <span className="font-semibold text-sm truncate">{n.name}</span>}
                </Link>
              )
            })}
          </div>
          <div className="mt-auto space-y-2 pt-4">
            <a 
              href="/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3 rounded-xl bg-neon-blue/10 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue hover:text-dark-bg transition-all duration-300 shadow-[0_0_15px_rgba(0,210,255,0.1)] group mb-2`}
              title={isCollapsed ? "Station View" : ""}
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Globe className="w-5 h-5 flex-shrink-0 group-hover:rotate-12 transition-transform" />
                {!isCollapsed && <span className="font-bold text-sm">Station View</span>}
              </div>
              {!isCollapsed && <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue group-hover:bg-dark-bg opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue group-hover:bg-dark-bg"></span>
              </span>}
            </a>
            <button onClick={onLogout} title={isCollapsed ? "Logout" : ""} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg text-white/50 hover:text-red-500 hover:bg-red-500/10 transition-colors`}>
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-semibold text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function AdminAdvanced() {
  const queryClient = useQueryClient();
  const { data: serverSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
  });

  const [features, setFeatures] = useState<Record<string, boolean>>({
    feat_chat: true,
    feat_shoutouts: true,
    feat_cinematic: true,
    feat_pwa: true,
    feat_bookings: true,
    feat_live_tools: true,
    feat_stream_quality: true,
  });
  const { showAlert } = useModal();

  useEffect(() => {
    if (serverSettings) {
      setFeatures({
        feat_chat: serverSettings.feat_chat !== '0',
        feat_shoutouts: serverSettings.feat_shoutouts !== '0',
        feat_cinematic: serverSettings.feat_cinematic !== '0',
        feat_pwa: serverSettings.feat_pwa !== '0',
        feat_bookings: serverSettings.feat_bookings !== '0',
        feat_live_tools: serverSettings.feat_live_tools !== '0',
        feat_stream_quality: serverSettings.feat_stream_quality !== '0',
      });
    }
  }, [serverSettings]);

  const handleToggle = (key: string, checked: boolean) => {
    setFeatures(prev => ({ ...prev, [key]: checked }));
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    
    // Save all features
    const settingsToSave = Object.fromEntries(
      Object.entries(features).map(([k, v]) => [k, v ? '1' : '0'])
    );

    const res = await fetchAdmin("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsToSave)
    });
    
    if (res.ok) {
      showAlert({ title: "Success", message: "Advanced features saved!", style: "success" });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } else {
      showAlert({ title: "Error", message: "Failed to save settings", style: "danger" });
    }
  };

  const toggleItems = [
    { id: 'feat_chat', title: 'Chat Room', description: 'Enable real-time chat functionality.' },
    { id: 'feat_shoutouts', title: 'Shoutout Widget', description: 'Enable direct interaction (fire, hearts, messages).' },
    { id: 'feat_cinematic', title: 'Cinematic Visualizer', description: 'Enable the immersive audio visualizer mode.' },
    { id: 'feat_pwa', title: 'PWA Install Prompt', description: 'Prompt users to install the web app to their home screen.' },
    { id: 'feat_bookings', title: 'DJ Bookings (Agency)', description: 'Enable the DJ inquiry and booking system.' },
    { id: 'feat_live_tools', title: 'Live Tools / Studio Cam', description: 'Enable the studio camera watch live tools.' },
    { id: 'feat_stream_quality', title: 'Stream Quality Toggle', description: 'Show or hide the stream quality selector in the playbar.' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-display font-black uppercase text-neon-purple tracking-wider flex items-center">
        <Ghost className="w-8 h-8 mr-3" /> Advanced Features
      </h2>

      <div className="bg-dark-bg/50 border border-white/10 rounded-2xl p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4">
            {toggleItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div>
                  <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                  <p className="text-sm text-white/50">{item.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={features[item.id] || false} 
                    onChange={e => handleToggle(item.id, e.target.checked)} 
                  />
                  <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neon-purple shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"></div>
                </label>
              </div>
            ))}
          </div>
          <button type="submit" className="bg-neon-purple text-white font-bold py-3 px-8 rounded hover:bg-neon-blue transition-all">Save Changes</button>
        </form>
      </div>
    </div>
  );
}

function AdminBranding() {
  const [appName, setAppName] = useState("");
  const [appTitle, setAppTitle] = useState("");
  const [appTagline, setAppTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoDark, setLogoDark] = useState("");
  const [logoLight, setLogoLight] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#b026ff");
  const [secondaryColor, setSecondaryColor] = useState("#00d2ff");
  const [fontSans, setFontSans] = useState("Inter");
  const [fontDisplay, setFontDisplay] = useState("Inter");
  const { showAlert, showConfirm } = useModal();

  const DEFAULTS = {
    appName: "DEJAVU FM",
    appTitle: "DEJAVU FM | THE SOUND OF LONDON",
    appTagline: "The Underground Worldwide",
    logo_url: "",
    logo_dark: "",
    logo_light: "",
    primary_color: "#b026ff",
    secondary_color: "#00d2ff",
    font_sans: "Inter",
    font_display: "Inter"
  };

  const fontOptions = [
    { name: "Inter (Modern Sans)", value: "Inter" },
    { name: "Space Grotesk (Tech Display)", value: "Space Grotesk" },
    { name: "Outfit (Clean Geometric)", value: "Outfit" },
    { name: "Playfair Display (Premium Serif)", value: "Playfair Display" },
    { name: "JetBrains Mono (Technical)", value: "JetBrains Mono" },
    { name: "Bebas Neue (Bold Headline)", value: "Bebas Neue" },
    { name: "Syne (Artistic / Future)", value: "Syne" },
    { name: "Plus Jakarta Sans (Minimal)", value: "Plus Jakarta Sans" }
  ];

  useEffect(() => {
    fetch("/api/public/settings").then(r=>r.json()).then(d => {
      setAppName(d.app_name || DEFAULTS.appName);
      setAppTitle(d.app_title || DEFAULTS.appTitle);
      setAppTagline(d.app_tagline || DEFAULTS.appTagline);
      setLogoUrl(d.logo_url || DEFAULTS.logo_url);
      setLogoDark(d.logo_dark || DEFAULTS.logo_dark);
      setLogoLight(d.logo_light || DEFAULTS.logo_light);
      setPrimaryColor(d.primary_color || DEFAULTS.primary_color);
      setSecondaryColor(d.secondary_color || DEFAULTS.secondary_color);
      setFontSans(d.font_sans || DEFAULTS.font_sans);
      setFontDisplay(d.font_display || DEFAULTS.font_display);
    });
  }, []);

  const handleReset = async () => {
    const confirmed = await showConfirm({
      title: "Factory Reset",
      message: "Are you sure you want to reset ALL branding options to factory defaults? This action cannot be undone.",
      style: "danger",
      confirmText: "Reset Defaults"
    });
    if (!confirmed) return;

    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          app_name: DEFAULTS.appName,
          app_title: DEFAULTS.appTitle,
          app_tagline: DEFAULTS.appTagline,
          logo_url: DEFAULTS.logo_url,
          logo_dark: DEFAULTS.logo_dark,
          logo_light: DEFAULTS.logo_light,
          primary_color: DEFAULTS.primary_color,
          secondary_color: DEFAULTS.secondary_color,
          font_sans: DEFAULTS.font_sans,
          font_display: DEFAULTS.font_display
        })
      });
      if (res.ok) {
        showAlert({ title: "Reset Complete", message: "All branding settings have been restored to defaults.", style: "success" });
        setAppName(DEFAULTS.appName);
        setAppTitle(DEFAULTS.appTitle);
        setAppTagline(DEFAULTS.appTagline);
        setLogoUrl(DEFAULTS.logo_url);
        setLogoDark(DEFAULTS.logo_dark);
        setLogoLight(DEFAULTS.logo_light);
        setPrimaryColor(DEFAULTS.primary_color);
        setSecondaryColor(DEFAULTS.secondary_color);
        setFontSans(DEFAULTS.font_sans);
        setFontDisplay(DEFAULTS.font_display);
      }
    } catch(e) {
      console.error(e);
      showAlert({ title: "Error", message: "Failed to reset settings.", style: "danger" });
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          app_name: appName,
          app_title: appTitle,
          app_tagline: appTagline,
          logo_url: logoUrl,
          logo_dark: logoDark,
          logo_light: logoLight,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          font_sans: fontSans,
          font_display: fontDisplay
        })
      });
      if (res.ok) {
        showAlert({ title: "Success", message: "Branding settings saved!", style: "success" });
      }
    } catch(e) {
      console.error(e);
      showAlert({ title: "Error", message: "Failed to save branding settings", style: "danger" });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">Branding Settings</h3>
      
      <div className="bg-dark-bg/30 p-6 rounded-2xl border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-white/5">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white border border-black/10 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                {(logoLight || logoUrl) ? (
                  <img src={logoLight || logoUrl || undefined} alt="Light Mode" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <HomeIcon className="w-6 h-6 text-black/20" />
                )}
              </div>
              <span className="text-[9px] font-black uppercase text-white/40 mt-2 tracking-widest">Light Mode</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-dark-bg border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                {(logoDark || logoUrl) ? (
                  <img src={logoDark || logoUrl || undefined} alt="Dark Mode" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <HomeIcon className="w-6 h-6 text-white/10" />
                )}
              </div>
              <span className="text-[9px] font-black uppercase text-white/40 mt-2 tracking-widest">Dark Mode</span>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold uppercase tracking-tight" style={{ color: primaryColor, fontFamily: fontDisplay }}>{appName || "Your App Name"}</h4>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-black mt-1" style={{ fontFamily: fontSans }}>{appTagline || "Live Radio Preview"}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Application Name</label>
              <input 
                required
                value={appName} 
                onChange={e=>setAppName(e.target.value)} 
                className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" 
                placeholder="DEJAVU FM"
              />
            </div>
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">SEO Page Title</label>
              <input 
                required
                value={appTitle} 
                onChange={e=>setAppTitle(e.target.value)} 
                className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" 
                placeholder="DEJAVU FM | LONDON UNDERGROUND RADIO"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Branding Tagline</label>
            <input 
              required
              value={appTagline} 
              onChange={e=>setAppTagline(e.target.value)} 
              className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" 
              placeholder="The Sound of London"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Body Font (Sans)</label>
              <select 
                value={fontSans} 
                onChange={e=>setFontSans(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none"
              >
                {fontOptions.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Headings Font (Display)</label>
              <select 
                value={fontDisplay} 
                onChange={e=>setFontDisplay(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none"
              >
                {fontOptions.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <ImageUploadField label="Logo URL (Global / Fallback)" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." description="Base logo used if specific theme logos are missing." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField label="Dark Mode Logo" value={logoDark} onChange={setLogoDark} description="Optimized for dark backgrounds." />
              <ImageUploadField label="Light Mode Logo" value={logoLight} onChange={setLogoLight} description="Optimized for light backgrounds." />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Primary Brand Color</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={e=>setPrimaryColor(e.target.value)} 
                  className="w-10 h-10 bg-dark-bg border border-white/10 rounded cursor-pointer p-0 overflow-hidden" 
                />
                <input 
                  type="text" 
                  value={primaryColor} 
                  onChange={e=>setPrimaryColor(e.target.value)} 
                  className="flex-1 bg-dark-bg border border-white/10 rounded px-3 py-2 text-sm outline-none uppercase font-mono" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Secondary Color</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="color" 
                  value={secondaryColor} 
                  onChange={e=>setSecondaryColor(e.target.value)} 
                  className="w-10 h-10 bg-dark-bg border border-white/10 rounded cursor-pointer p-0 overflow-hidden" 
                />
                <input 
                  type="text" 
                  value={secondaryColor} 
                  onChange={e=>setSecondaryColor(e.target.value)} 
                  className="flex-1 bg-dark-bg border border-white/10 rounded px-3 py-2 text-sm outline-none uppercase font-mono" 
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5">
            <button 
              type="submit" 
              className="bg-neon-purple px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-neon-blue transition-all text-white shadow-lg shadow-neon-purple/20 flex-1" 
              style={{ backgroundColor: primaryColor }}
            >
              Save Branding
            </button>
            <button 
              type="button" 
              onClick={handleReset}
              className="bg-white/5 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all"
            >
              Reset to Factory Defaults
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminSettings() {
  const [stream, setStream] = useState("");
  const [streamLow, setStreamLow] = useState("");
  const [streamMedium, setStreamMedium] = useState("");
  const [streamHigh, setStreamHigh] = useState("");
  const [rss, setRss] = useState("");
  const [studioVideoUrl, setStudioVideoUrl] = useState("");
  const [isOnAir, setIsOnAir] = useState(false);
  const { showAlert } = useModal();

  useEffect(() => {
    fetch("/api/public/settings").then(r=>r.json()).then(d => {
      setStream(d.stream_url || "");
      setStreamLow(d.stream_url_low || "");
      setStreamMedium(d.stream_url_medium || "");
      setStreamHigh(d.stream_url_high || "");
      setRss(d.rss_feed_url || "");
      setStudioVideoUrl(d.studio_video_url || "");
      setIsOnAir(d.is_on_air === '1');
    });
  }, []);

  const saveNode = async () => {
    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          stream_url: stream, 
          stream_url_low: streamLow,
          stream_url_medium: streamMedium,
          stream_url_high: streamHigh,
          rss_feed_url: rss, 
          studio_video_url: studioVideoUrl,
          is_on_air: isOnAir
        })
      });
      if (res.ok) {
        showAlert({ title: "Success", message: "General settings saved!", style: "success" });
      }
    } catch(e) {
      console.error(e);
      showAlert({ title: "Error", message: "Failed to save settings", style: "danger" });
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">General Settings</h3>
      
      <div className="bg-neon-purple/10 border border-neon-purple/30 p-6 rounded-2xl flex items-center justify-between max-w-xl">
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${isOnAir ? 'bg-neon-purple animate-pulse' : 'bg-white/20'}`}></div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs">Live Status Indicator</h4>
            <p className="text-[10px] text-white/40">Toggles the "LIVE" banner on the frontend.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOnAir(!isOnAir)}
          className={`w-14 h-7 rounded-full relative transition-colors ${isOnAir ? 'bg-neon-purple' : 'bg-white/10'}`}
        >
          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isOnAir ? 'left-8' : 'left-1'}`}></div>
        </button>
      </div>

      <div className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm mb-1 text-white/70">Default Stream URL (Fallback)</label>
          <input value={stream} onChange={e=>setStream(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2" />
        </div>
        
        <div className="pt-4 border-t border-white/5">
          <h4 className="text-lg font-bold mb-4">Stream Qualities</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-white/70">Low Quality URL (e.g. 64kbps AAC)</label>
              <input value={streamLow} onChange={e=>setStreamLow(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-white/70">Medium Quality URL (e.g. 128kbps MP3)</label>
              <input value={streamMedium} onChange={e=>setStreamMedium(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-white/70">High Quality URL (e.g. 256kbps MP3 or lossless)</label>
              <input value={streamHigh} onChange={e=>setStreamHigh(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <label className="block text-sm mb-1 text-white/70">Studio Video Embed URL (e.g. Twitch player URL)</label>
          <input value={studioVideoUrl} onChange={e=>setStudioVideoUrl(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2" placeholder="https://player.twitch.tv/?channel=bbcnews&parent=localhost" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-white/70">Podomatic RSS Feed URL</label>
          <div className="flex gap-2">
            <input value={rss} onChange={e=>setRss(e.target.value)} className="flex-1 bg-dark-bg border border-white/10 rounded px-4 py-2" />
            <button 
              type="button" 
              onClick={async () => {
                const res = await fetchAdmin("/api/admin/podcasts/refresh", { method: "POST" });
                if (res.ok) showAlert({ title: "Success", message: "Podcast cache cleared. It will re-import on next load.", style: "success" });
              }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded text-xs font-bold hover:bg-white/10 transition-colors"
            >
              Force Refresh
            </button>
          </div>
        </div>
        <button onClick={saveNode} className="bg-neon-purple px-6 py-2 rounded font-bold hover:bg-neon-blue transition-colors">Save Settings</button>
      </div>
    </div>
  );
}

function AdminDJs() {
  const [djs, setDJs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { showConfirm, showAlert } = useModal();
  
  const queryClient = useQueryClient();
  const load = () => {
    fetch("/api/public/djs").then(r=>r.json()).then(setDJs);
    queryClient.invalidateQueries({ queryKey: ['schedule'] });
    queryClient.invalidateQueries({ queryKey: ['djs'] });
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm({
      title: "Delete DJ",
      message: "Are you sure you want to delete this DJ and all their schedules?",
      style: "danger",
      confirmText: "Delete"
    });
    if(confirmed) {
      const res = await fetchAdmin(`/api/admin/djs/${id}`, { method: "DELETE" });
      if (res.ok) {
        showAlert({ title: "Success", message: "DJ deleted from the database.", style: "success" });
        load();
      }
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">Manage DJs</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {djs.map(dj => (
          <div key={dj.id} className="bg-dark-bg border border-white/10 p-4 rounded-xl flex flex-col space-y-4">
            {editingId === dj.id ? (
              <EditDJForm dj={dj} onSave={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <img src={dj.image_url || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=200&q=80"} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-bold block">{dj.name}</span>
                  {dj.bio && <span className="text-xs text-white/50 block mt-1 line-clamp-1">{dj.bio}</span>}
                </div>
                <div className="flex space-x-4 mt-2 sm:mt-0">
                  <button onClick={() => setEditingId(dj.id)} className="text-neon-blue hover:text-white transition-colors text-sm px-2 py-1">Edit</button>
                  <button onClick={() => handleDelete(dj.id)} className="text-red-500 hover:text-red-400 text-sm px-2 py-1">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <AddDJForm onAdd={load} />
    </div>
  );
}

function EditDJForm({dj, onSave, onCancel}: {dj: any, onSave: ()=>void, onCancel: ()=>void}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(dj.name);
  const [bio, setBio] = useState(dj.bio || "");
  const [image, setImage] = useState(dj.image_url || "");
  const [instagram, setInstagram] = useState(dj.instagram || "");
  const [soundcloud, setSoundcloud] = useState(dj.soundcloud || "");
  const [mixcloud, setMixcloud] = useState(dj.mixcloud || "");
  const { showAlert } = useModal();
  
  const handleSave = async (e:any) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/djs/${dj.id}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, bio, image_url: image, instagram, soundcloud, mixcloud })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: `${name} updated successfully!`, style: "success" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['djs'] });
      onSave();
    } else {
      showAlert({ title: "Error", message: "Failed to update DJ", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1">Name</label>
          <input required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm" />
        </div>
        <ImageUploadField label="Image URL" value={image} onChange={setImage} className="!space-y-1" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1">Bio</label>
        <textarea value={bio} onChange={e=>setBio(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm" rows={2} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Instagram</label>
          <input value={instagram} onChange={e=>setInstagram(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-[10px]" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Soundcloud</label>
          <input value={soundcloud} onChange={e=>setSoundcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-[10px]" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Mixcloud</label>
          <input value={mixcloud} onChange={e=>setMixcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-[10px]" />
        </div>
      </div>
      <div className="flex space-x-2">
        <button type="submit" className="bg-neon-purple text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-neon-blue transition-colors">Save</button>
        <button type="button" onClick={onCancel} className="bg-white/10 text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-white/20 transition-colors">Cancel</button>
      </div>
    </form>
  )
}

function AddDJForm({onAdd}: {onAdd:()=>void}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [instagram, setInstagram] = useState("");
  const [soundcloud, setSoundcloud] = useState("");
  const [mixcloud, setMixcloud] = useState("");
  const { showAlert } = useModal();
  
  const handleAdd = async (e:any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/djs", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, bio, image_url: image, instagram, soundcloud, mixcloud })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: `${name} added to the roster!`, style: "success" });
      queryClient.invalidateQueries({ queryKey: ['djs'] });
      setName(""); setBio(""); setImage(""); setInstagram(""); setSoundcloud(""); setMixcloud("");
      onAdd();
    } else {
      showAlert({ title: "Error", message: "Failed to add DJ", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleAdd} className="mt-8 bg-dark-bg/50 p-6 rounded-xl border border-white/5 space-y-4 max-w-2xl">
      <h4 className="font-bold">Add New DJ</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1">Name</label>
          <input required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
        </div>
        <ImageUploadField label="Image URL" value={image} onChange={setImage} className="!space-y-1" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1">Bio (Short)</label>
        <input value={bio} onChange={e=>setBio(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Instagram</label>
          <input value={instagram} onChange={e=>setInstagram(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Soundcloud</label>
          <input value={soundcloud} onChange={e=>setSoundcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Mixcloud</label>
          <input value={mixcloud} onChange={e=>setMixcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-xs" />
        </div>
      </div>
      <button className="bg-neon-blue text-dark-bg px-4 py-2 font-bold rounded">Add DJ</button>
    </form>
  )
}

function AdminBlogs() {
  const queryClient = useQueryClient();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showAlert, showConfirm } = useModal();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/blogs");
      if (res.ok) {
        const data = await res.json();
        setBlogs(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const refreshBlogs = () => {
    queryClient.invalidateQueries({ queryKey: ["blogs"] });
    load();
  };

  const handleDelete = async (blog: any) => {
    const confirmed = await showConfirm({
      title: "Delete Blog Post",
      message: `Delete "${blog.title}" permanently? This cannot be undone.`,
      style: "danger",
      confirmText: "Delete"
    });

    if (!confirmed) return;

    const res = await fetchAdmin(`/api/admin/blogs/${blog.id}`, { method: "DELETE" });
    if (res.ok) {
      showAlert({ title: "Deleted", message: "Blog post removed.", style: "success" });
      refreshBlogs();
    } else {
      showAlert({ title: "Error", message: "Failed to delete blog post.", style: "danger" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h3 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tighter">
            Blog <span className="text-neon-purple">Desk</span>
          </h3>
          <p className="text-white/40 text-xs mt-2 uppercase tracking-[0.2em] font-black">Write, publish, and maintain station stories</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-neon-purple/10 border border-neon-purple/20 rounded-xl w-fit">
          <FileText className="w-4 h-4 text-neon-purple" />
          <span className="text-[10px] font-black uppercase tracking-widest text-neon-purple">{blogs.length} Posts</span>
        </div>
      </div>

      <BlogForm mode="create" onSaved={refreshBlogs} />

      <div className="space-y-4">
        <h4 className="text-sm font-black uppercase tracking-[0.25em] text-white/40">Existing Posts</h4>
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map(item => (
              <div key={item} className="bg-dark-bg border border-white/10 rounded-2xl p-5 animate-pulse h-40" />
            ))}
          </div>
        ) : blogs.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {blogs.map(blog => (
              <div key={blog.id} className={`bg-dark-bg border border-white/10 rounded-2xl p-4 space-y-4 ${editingId === blog.id ? "lg:col-span-2" : ""}`}>
                {editingId === blog.id ? (
                  <BlogForm mode="edit" blog={blog} onSaved={() => { setEditingId(null); refreshBlogs(); }} onCancel={() => setEditingId(null)} />
                ) : (
                  <>
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        {blog.image_url ? (
                          <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-white/15" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${blog.is_published ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-white/5 text-white/40 border border-white/10"}`}>
                            {blog.is_published ? "Published" : "Draft"}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-white/25">{blog.slug}</span>
                        </div>
                        <h5 className="font-display font-black text-xl leading-tight line-clamp-2">{blog.title}</h5>
                        <p className="text-xs text-white/45 mt-2 line-clamp-2">{blog.excerpt || blog.content}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                      <span className="text-[10px] text-white/30 font-mono">
                        {blog.created_at ? new Date(blog.created_at).toLocaleString() : "Recently created"}
                      </span>
                      <div className="flex gap-2">
                        {blog.is_published ? (
                          <Link to={`/blog/${blog.slug}`} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
                            View
                          </Link>
                        ) : null}
                        <button onClick={() => setEditingId(blog.id)} className="px-3 py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-[10px] font-black uppercase tracking-widest hover:bg-neon-blue/20 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(blog)} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-dark-bg/50 border border-white/10 rounded-2xl">
            <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 uppercase tracking-widest text-xs font-black">No blog posts yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BlogForm({ mode, blog, onSaved, onCancel }: { mode: "create" | "edit"; blog?: any; onSaved: () => void; onCancel?: () => void }) {
  const [title, setTitle] = useState(blog?.title || "");
  const [excerpt, setExcerpt] = useState(blog?.excerpt || "");
  const [imageUrl, setImageUrl] = useState(blog?.image_url || "");
  const [content, setContent] = useState(blog?.content || "");
  const [paragraphImageUrl, setParagraphImageUrl] = useState("");
  const [paragraphImageCaption, setParagraphImageCaption] = useState("");
  const [isPublished, setIsPublished] = useState(blog?.is_published !== 0);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const { showAlert } = useModal();

  const reset = () => {
    setTitle("");
    setExcerpt("");
    setImageUrl("");
    setContent("");
    setIsPublished(true);
  };

  const insertParagraphImage = () => {
    const url = paragraphImageUrl.trim();
    if (!url) {
      showAlert({ title: "Image URL Required", message: "Add an image URL before inserting it into the post.", style: "danger" });
      return;
    }

    const caption = paragraphImageCaption.trim() || "Blog image";
    const marker = `\n\n![${caption}](${url})\n\n`;
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const nextContent = `${content.slice(0, start)}${marker}${content.slice(end)}`;

    setContent(nextContent);
    setParagraphImageUrl("");
    setParagraphImageCaption("");

    requestAnimationFrame(() => {
      contentRef.current?.focus();
      const cursor = start + marker.length;
      contentRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showAlert({ title: "Missing Content", message: "A blog post needs a heading and post text.", style: "danger" });
      return;
    }

    setSaving(true);
    const endpoint = mode === "edit" ? `/api/admin/blogs/${blog.id}` : "/api/admin/blogs";
    const res = await fetchAdmin(endpoint, {
      method: mode === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        excerpt,
        image_url: imageUrl,
        content,
        is_published: isPublished
      })
    });
    setSaving(false);

    if (res.ok) {
      showAlert({ title: "Saved", message: mode === "edit" ? "Blog post updated." : "Blog post created.", style: "success" });
      if (mode === "create") reset();
      onSaved();
    } else {
      const data = await res.json().catch(() => ({ error: "Failed to save blog post." }));
      showAlert({ title: "Error", message: data.error || "Failed to save blog post.", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleSave} className={`${mode === "create" ? "bg-dark-bg/50 border border-white/10 rounded-2xl p-5 md:p-6" : ""} space-y-5`}>
      {mode === "create" && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-purple/15 border border-neon-purple/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h4 className="font-black uppercase tracking-tight">New Blog Post</h4>
            <p className="text-xs text-white/40">Add a heading, image, and text for a public post.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Heading</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm" placeholder="Post title" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Short Summary</label>
            <input value={excerpt} onChange={e => setExcerpt(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm" placeholder="Optional preview text for the blog page" />
          </div>
          <ImageUploadField label="Image URL" value={imageUrl} onChange={setImageUrl} placeholder="https://..." />
        </div>

        <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 min-h-[220px] flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-3 p-6">
              <ImageIcon className="w-10 h-10 text-white/15 mx-auto" />
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">Image Preview</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Post Text</label>
        <textarea ref={contentRef} required value={content} onChange={e => setContent(e.target.value)} rows={mode === "create" ? 8 : 12} className="w-full bg-panel-bg border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm leading-6" placeholder="Write the full blog post here..." />
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
          <div className="flex items-center gap-2 text-white/50">
            <ImageIcon className="w-4 h-4 text-neon-blue" />
            <span className="text-[10px] font-black uppercase tracking-widest">Insert image into post text</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(180px,280px)_auto] gap-3 items-end">
            <ImageUploadField value={paragraphImageUrl} onChange={setParagraphImageUrl} placeholder="Image URL" className="!space-y-0" />
            <input value={paragraphImageCaption} onChange={e => setParagraphImageCaption(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-neon-blue" placeholder="Caption / alt text" />
            <button type="button" onClick={insertParagraphImage} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple hover:text-white transition-colors">
              Insert
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="sr-only peer" />
          <span className="w-12 h-6 bg-white/10 rounded-full relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:bg-neon-purple peer-checked:after:translate-x-6"></span>
          <span className="text-xs font-black uppercase tracking-widest text-white/50">{isPublished ? "Published" : "Draft"}</span>
        </label>

        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
              Cancel
            </button>
          )}
          <button disabled={saving} className="px-5 py-2.5 rounded-xl bg-neon-purple hover:bg-neon-blue disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-colors">
            {saving ? "Saving..." : mode === "edit" ? "Save Post" : "Create Post"}
          </button>
        </div>
      </div>
    </form>
  );
}

function AdminSchedule() {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [djs, setDJs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { showConfirm, showAlert } = useModal();
  
  const load = () => {
    fetch("/api/public/schedule").then(r=>r.json()).then(setSchedule);
    fetch("/api/public/djs").then(r=>r.json()).then(setDJs);
    queryClient.invalidateQueries({ queryKey: ['schedule'] });
  };
  useEffect(() => { load(); }, []);

  const d = (day: number) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">Manage Schedule</h3>
      
      <div className="space-y-2">
        {schedule.map(s => (
          <div key={s.id} className="bg-dark-bg border border-white/10 p-3 rounded-lg flex flex-col">
            {editingId === s.id ? (
              <EditScheduleForm schedule={s} djs={djs} onSave={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-center">
                  <span className="inline-block w-full md:w-12 font-bold text-neon-blue mb-1 md:mb-0">{d(s.day_of_week)}</span>
                  <span className="font-mono text-sm text-white/50 md:mx-4 mb-1 md:mb-0 block md:inline-block">{s.start_time} - {s.end_time}</span>
                  <div>
                    <span className="font-bold">{s.dj_name}</span> <span className="text-sm text-white/50 ml-2">({s.show_name})</span>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button onClick={() => setEditingId(s.id)} className="text-neon-blue hover:text-white text-sm px-2 py-1">Edit</button>
                  <button onClick={async () => {
                    const confirmed = await showConfirm({
                      title: "Remove Schedule",
                      message: "Are you sure you want to remove this schedule entry?",
                      style: "danger",
                      confirmText: "Remove"
                    });
                    if (confirmed) {
                      const res = await fetchAdmin(`/api/admin/schedule/${s.id}`, { method: 'DELETE'});
                      if (res.ok) {
                        showAlert({ title: "Success", message: "Schedule entry removed.", style: "success" });
                        load();
                      }
                    }
                  }} className="text-red-500 hover:text-red-400 text-sm px-2 py-1">Remove</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <AddScheduleForm djs={djs} onAdd={load} />
    </div>
  );
}

function EditScheduleForm({schedule, djs, onSave, onCancel}: {schedule: any, djs: any[], onSave: ()=>void, onCancel: ()=>void}) {
  const queryClient = useQueryClient();
  const [djId, setDjId] = useState(schedule.dj_id.toString());
  const [day, setDay] = useState(schedule.day_of_week.toString());
  const [start, setStart] = useState(schedule.start_time);
  const [end, setEnd] = useState(schedule.end_time);
  const [show, setShow] = useState(schedule.show_name);
  const { showAlert } = useModal();

  const handleSave = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/schedule/${schedule.id}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({dj_id: parseInt(djId), day_of_week: parseInt(day), start_time: start, end_time: end, show_name: show})
    });
    if (res.ok) {
      showAlert({ title: "Success", message: "Schedule entry updated!", style: "success" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      onSave();
    } else {
      showAlert({ title: "Error", message: "Failed to update schedule", style: "danger" });
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1">Day</label>
          <select required value={day} onChange={e=>setDay(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm">
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">Start (HH:mm)</label>
          <input required type="time" value={start} onChange={e=>setStart(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">End (HH:mm)</label>
          <input required type="time" value={end} onChange={e=>setEnd(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">DJ</label>
          <select required value={djId} onChange={e=>setDjId(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm">
            <option value="">Select DJ...</option>
            {djs.map(dj => <option key={dj.id} value={dj.id}>{dj.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">Show Name</label>
          <input required value={show} onChange={e=>setShow(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-sm" />
        </div>
      </div>
      <div className="flex space-x-2">
        <button type="submit" className="bg-neon-purple text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-neon-blue transition-colors">Save</button>
        <button type="button" onClick={onCancel} className="bg-white/10 text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-white/20 transition-colors">Cancel</button>
      </div>
    </form>
  )
}

function AddScheduleForm({djs, onAdd}: {djs: any[], onAdd: ()=>void}) {
  const queryClient = useQueryClient();
  const [djId, setDjId] = useState("");
  const [day, setDay] = useState("0");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [show, setShow] = useState("");
  const { showAlert } = useModal();

  const handleAdd = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/schedule", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({dj_id: parseInt(djId), day_of_week: parseInt(day), start_time: start, end_time: end, show_name: show})
    });
    if (res.ok) {
      showAlert({ title: "Success", message: "Show added to the schedule!", style: "success" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setDjId(""); setDay("0"); setStart(""); setEnd(""); setShow("");
      onAdd();
    } else {
      showAlert({ title: "Error", message: "Failed to add show", style: "danger" });
    }
  }

  return (
    <form onSubmit={handleAdd} className="mt-8 bg-dark-bg/50 p-6 rounded-xl border border-white/5 space-y-4 max-w-xl">
      <h4 className="font-bold">Add Schedule Slot</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1">DJ</label>
          <select required value={djId} onChange={e=>setDjId(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple">
            <option value="">Select DJ...</option>
            {djs.map(dj => <option key={dj.id} value={dj.id}>{dj.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">Day</label>
          <select required value={day} onChange={e=>setDay(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple">
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">Start Time (HH:mm)</label>
          <input required type="time" value={start} onChange={e=>setStart(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">End Time (HH:mm)</label>
          <input required type="time" value={end} onChange={e=>setEnd(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs uppercase mb-1">Show Name</label>
          <input required value={show} onChange={e=>setShow(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
        </div>
      </div>
      <button className="bg-neon-blue text-dark-bg px-4 py-2 font-bold rounded mt-4">Add Slot</button>
    </form>
  )
}

function AdminUsers({ isAdminUser }: { isAdminUser: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("dj"); // Default to 'dj'
  const [changePasswordUser, setChangePasswordUser] = useState("");
  const [changePasswordVal, setChangePasswordVal] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const { showConfirm, showAlert } = useModal();

  const load = () => {
    fetchAdmin("/api/admin/users").then(r=>r.json()).then(setUsers);
    fetchAdmin("/api/admin/settings/secret").then(r=>r.json()).then(d => {
      setAdminSecret(d.secret || "waynee");
    });
  };

  useEffect(() => { load(); }, []);

  const handleUpdateSecret = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/settings/secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: adminSecret })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: "Secret door answer updated!", style: "success" });
    } else {
      showAlert({ title: "Error", message: "Failed to update secret", style: "danger" });
    }
  };

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newUserRole })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: `Admin user '${newUsername}' created!`, style: "success" });
      setNewUsername(""); setNewPassword(""); load();
    } else {
      const data = await res.json();
      showAlert({ title: "Error", message: data.error, style: "danger" });
    }
  };

  const handleChangePassword = async (e: any, username: string) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/users/${username}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({password: changePasswordVal})
    });
    if (res.ok) {
      setChangePasswordUser(""); setChangePasswordVal(""); 
      showAlert({ title: "Success", message: "Password changed!", style: "success" });
    } else {
      const data = await res.json();
      showAlert({ title: "Error", message: data.error, style: "danger" });
    }
  };

  const handleDeleteUser = async (username: string) => {
    const confirmed = await showConfirm({
      title: "Delete User",
      message: `Are you sure you want to delete user ${username}?`,
      style: "danger",
      confirmText: "Delete"
    });
    if (confirmed) {
      const res = await fetchAdmin(`/api/admin/users/${username}`, { method: "DELETE" });
      if (res.ok) {
        showAlert({ title: "Success", message: `User '${username}' deleted.`, style: "success" });
        load();
      } else {
        const data = await res.json();
        showAlert({ title: "Error", message: data.error, style: "danger" });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <h3 className="text-2xl font-bold">Manage Users</h3>
        <div className="bg-neon-purple/10 border border-neon-purple/20 px-4 py-2 rounded-xl flex items-center space-x-3">
          <Shield className="w-4 h-4 text-neon-purple" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-tighter text-neon-purple">Security Door</span>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Active Shield</span>
          </div>
        </div>
      </div>

      <div className="bg-dark-bg/50 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <h4 className="text-lg font-bold flex items-center space-x-2">
            <Ghost className="w-5 h-5 text-neon-purple" />
            <span>Secret Door Challenge</span>
          </h4>
          <p className="text-sm text-white/40">This sets the required answer to the question "What's your name?" when clicking the settings icon in the header.</p>
        </div>
        
        <form onSubmit={handleUpdateSecret} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-2 ml-1">Answer Key</label>
            <input 
              value={adminSecret} 
              onChange={e => setAdminSecret(e.target.value)} 
              className="w-full bg-panel-bg border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-white font-medium" 
              placeholder="e.g. waynee or your name"
            />
          </div>
          <button className="bg-white text-dark-bg px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform shrink-0">
            Update Secret
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {users.map(u => (
          <div key={u.username} className="bg-dark-bg border border-white/10 p-4 rounded-xl flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{u.username}</span>
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">{u.role}</span>
              </div>
              <div className="flex space-x-4">
                <button onClick={() => setChangePasswordUser(changePasswordUser === u.username ? "" : u.username)} className="text-neon-blue hover:text-white transition-colors text-sm px-2 py-1">Change Password</button>
                {u.username !== "admin" && (
                  <button onClick={() => handleDeleteUser(u.username)} className="text-red-500 hover:text-red-400 text-sm px-2 py-1">Delete</button>
                )}
              </div>
            </div>
            {changePasswordUser === u.username && (
              <form onSubmit={e => handleChangePassword(e, u.username)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mt-2">
                <input type="password" placeholder="New Password" value={changePasswordVal} onChange={e => setChangePasswordVal(e.target.value)} required className="flex-1 bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-neon-purple" />
                <button className="bg-neon-purple text-white px-4 py-1.5 rounded text-sm hover:bg-neon-blue transition-colors">Update</button>
              </form>
            )}
          </div>
        ))}
      </div>

      {isAdminUser && ( // Only show this form if the logged-in user is an 'admin'
        <form onSubmit={handleAddUser} className="bg-dark-bg/50 p-6 rounded-xl border border-white/5 space-y-4 max-w-xl">
          <h4 className="font-bold">Add New Admin User</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-1">Username</label>
              <input required value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple" />
            </div>
            <div>
              <label className="block text-xs uppercase mb-1">Password</label>
              <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple" />
            </div>
            <div className="col-span-full">
              <label className="block text-xs uppercase mb-1">Role</label>
              <select
                required
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value)}
                className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple"
              >
                <option value="dj">DJ</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button className="bg-neon-blue text-dark-bg px-4 py-2 font-bold rounded mt-4">Add User</button>
        </form>
      )}
      {!isAdminUser && (
        <div className="py-16 text-center bg-dark-bg/50 border border-white/10 rounded-2xl">
          <Shield className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 uppercase tracking-widest text-xs font-black">Only 'admin' role users can manage admin accounts.</p>
        </div>
      )}
    </div>
  );
}

function AdminProfile() {
  // This component should ideally fetch its own user's role to display it, but not for editing.
  const [profile, setProfile] = useState<any>(null);
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showAlert } = useModal();

  useEffect(() => {
    fetchAdmin("/api/admin/profile").then(r => r.json()).then(data => {
      setProfile(data);
      setBio(data?.bio || "");
      setPhotoUrl(data?.photo_url || "");
    });
  }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await fetchAdmin("/api/admin/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, photo_url: photoUrl })
    });
    setIsSaving(false);
    if (res.ok) {
      showAlert({ title: "Success", message: "Profile updated!", style: "success" });
    } else {
      showAlert({ title: "Error", message: "Failed to update profile", style: "danger" });
    }
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">My Profile Settings</h3>
      
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
        <div className="relative group">
          <img 
            src={photoUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=200&q=80"} 
            alt="Profile Avatar" 
            className="w-24 h-24 rounded-full object-cover border-2 border-white/10 bg-dark-bg" 
          />
        </div>
        <div className="flex-1">
          <h4 className="text-xl font-bold">{profile.username}</h4>
          <p className="text-white/50 text-sm mb-4">Administrator</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <ImageUploadField label="Profile Photo URL" value={photoUrl} onChange={setPhotoUrl} placeholder="https://..." />
        <div>
          <label className="block text-sm mb-1 text-white/70">Bio</label>
          <textarea 
            value={bio} 
            onChange={e => setBio(e.target.value)} 
            rows={4}
            className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" 
            placeholder="Tell us about yourself..."
          />
        </div>
        <button 
          type="submit" 
          disabled={isSaving}
          className="bg-neon-purple px-6 py-2 rounded font-bold hover:bg-neon-blue transition-colors disabled:opacity-50 text-white"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}

function AdminLiveTools() {
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const { showAlert } = useModal();

  const handlePushTrack = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/push-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artist, title })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: `Pushed "${artist} - ${title}" to live stream!`, style: "success" });
      setArtist("");
      setTitle("");
    } else {
      showAlert({ title: "Error", message: "Failed to push track ID.", style: "danger" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">Live Studio Tools</h3>
      
      <div className="bg-dark-bg border border-white/10 p-6 rounded-xl">
        <h4 className="text-lg font-bold mb-4 flex items-center space-x-2">
          <Radio className="w-5 h-5 text-neon-blue" />
          <span>Push Track ID</span>
        </h4>
        <p className="text-sm text-white/50 mb-6">
          Display the current track being played on the live video stream and drop an alert in the public chat.
        </p>
        <form onSubmit={handlePushTrack} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Artist Name</label>
            <input 
              type="text" 
              value={artist} 
              onChange={e => setArtist(e.target.value)} 
              required
              className="w-full bg-panel-bg border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-neon-purple"
              placeholder="e.g. Disclosure"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Track Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required
              className="w-full bg-panel-bg border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-neon-purple"
              placeholder="e.g. Latch"
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-neon-purple text-white rounded hover:bg-neon-blue transition-colors uppercase tracking-widest text-sm font-bold flex items-center justify-center w-full sm:w-auto">
            Push to Stream
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminChatUsers({ isAdminUser }: { isAdminUser: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { showConfirm, showAlert } = useModal();

  const load = () => fetchAdmin("/api/admin/chat_users").then(r => r.json()).then(setUsers);
  useEffect(() => { load(); }, []);

  const handleDeleteUser = async (id: number, username: string) => {
    const confirmed = await showConfirm({
      title: "Remove Chat User",
      message: `Are you sure you want to remove the chat user '@${username}'?`,
      style: "danger",
      confirmText: "Remove"
    });
    if (confirmed) {
      await fetchAdmin(`/api/admin/chat_users/${id}`, { method: "DELETE" });
      load();
    }
  };

  const exportChatUsersToCSV = () => {
    if (users.length === 0) {
      showAlert({ title: "No Data", message: "There are no chat users to export.", style: "danger" });
      return;
    }

    const headers = ["ID", "Email", "Source", "Joined At"];
    const rows = users.map(u => [
      u.id,
      `"${(u.username || "").replace(/"/g, '""')}"`,
      u.source || 'register',
      new Date(u.created_at).toISOString()
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dejavu_chat_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Exported", message: "Chat users list generated.", style: "success" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <h3 className="text-2xl font-bold">Chat Users</h3>
        <button 
          onClick={exportChatUsersToCSV}
          className="px-4 py-2 bg-white/5 hover:bg-neon-blue/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-blue"
        >
          Export CSV
        </button>
      </div>
      
      {isAdminUser && ( // Only show this form if the logged-in user is an 'admin'
        <AddChatUserForm onAdd={load} />
      )}

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-dark-bg/50 border border-white/10 p-4 rounded-xl flex flex-col">
            {editingId === u.id ? (
              <EditChatUserForm user={u} onSave={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/30 uppercase font-black tracking-widest block mb-0.5">Email</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-lg block truncate">{u.username}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-tighter ${
                      u.source === 'shoutout' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      u.source === 'admin' ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/20' :
                      'bg-neon-purple/10 text-neon-purple border-neon-purple/20'
                    }`}>{u.source || 'register'}</span>
                  </div>
                  <span className="text-xs text-white/50 mt-1 block">Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex space-x-4">
                  <button onClick={() => setEditingId(u.id)} className="text-neon-blue hover:text-white transition-colors px-2 py-1.5 text-sm">Edit</button>
                  {isAdminUser && ( // Only allow 'admin' role to delete chat users
                    <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-500 hover:text-red-400 text-sm bg-red-500/10 px-3 py-1.5 rounded transition-colors">Remove</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-white/50 text-center py-8">No chat users registered yet.</p>
        )}
      </div>
    </div>
  );
}

function AddChatUserForm({onAdd}: {onAdd: ()=>void}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showAlert } = useModal();

  const handleAdd = async (e: any) => {
    e.preventDefault();
    if (!email || !password) return;
    const res = await fetchAdmin("/api/admin/chat_users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert({ title: "Success", message: `New chat user '${email}' created!`, style: "success" });
      setEmail("");
      setPassword("");
      onAdd();
    } else {
      showAlert({ title: "Error", message: data.error || "Failed to add chat user", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleAdd} className="bg-dark-bg border border-white/10 p-4 rounded-xl space-y-4">
      <h4 className="font-bold text-lg">Add New Chat Member</h4>
      <div className="flex flex-col sm:flex-row gap-4">
        <input 
          required 
          type="email"
          value={email} 
          onChange={e=>setEmail(e.target.value)} 
          placeholder="Member Email Address" 
          className="flex-1 bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
        />
        <input 
          required 
          type="password"
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
          placeholder="Password" 
          className="flex-1 bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
        />
        <button type="submit" className="bg-neon-purple text-white px-4 py-2 font-bold rounded hover:bg-neon-blue transition-colors">Add</button>
      </div>
    </form>
  )
}

function EditChatUserForm({user, onSave, onCancel}: {user: any, onSave: ()=>void, onCancel: ()=>void}) {
  const [email, setEmail] = useState(user.username);
  const [password, setPassword] = useState("");
  const { showAlert } = useModal();

  const handleSave = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/chat_users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert({ title: "Success", message: `User '${email}' updated!`, style: "success" });
      onSave();
    } else {
      showAlert({ title: "Error", message: data.error || "Failed to update chat user", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 w-full">
      <div className="flex flex-col space-y-3">
        <div>
          <label className="block text-xs uppercase mb-1">Email Address</label>
          <input 
            required 
            type="email"
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            className="w-full bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
          />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/70">New Password (leave blank to keep current)</label>
          <input 
            type="password"
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            placeholder="New Password" 
            className="w-full bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
          />
        </div>
      </div>
      <div className="flex space-x-2">
        <button type="submit" className="bg-neon-purple text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-neon-blue transition-colors">Save</button>
        <button type="button" onClick={onCancel} className="bg-white/10 text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-white/20 transition-colors">Cancel</button>
      </div>
    </form>
  )
}

function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { showConfirm, showAlert } = useModal();

  const load = () => {
    fetchAdmin("/api/admin/audit-logs")
      .then(r => r.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return logs;
    return logs.filter(log => 
      (log.username || "").toLowerCase().includes(term) || 
      (log.action || "").toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  const handleClearLogs = async () => {
    const confirmed = await showConfirm({
      title: "Clear Audit Logs",
      message: "Are you sure you want to permanently delete all activity logs? This action cannot be undone.",
      style: "danger",
      confirmText: "Clear All"
    });

    if (confirmed) {
      const res = await fetchAdmin("/api/admin/audit-logs", { method: "DELETE" });
      if (res.ok) {
        showAlert({ title: "Success", message: "Audit logs have been cleared.", style: "success" });
        setSearchTerm("");
        load();
      }
    }
  };

  const exportAuditLogsToCSV = () => {
    if (filteredLogs.length === 0) {
      showAlert({ title: "No Data", message: "There are no logs to export.", style: "danger" });
      return;
    }

    const headers = ["ID", "Timestamp", "User", "Role", "Action", "Resource", "Details"];
    const rows = filteredLogs.map(log => [
      log.id,
      new Date(log.timestamp).toISOString(),
      `"${(log.username || "").replace(/"/g, '""')}"`,
      `"${(log.role || "").replace(/"/g, '""')}"`,
      `"${(log.action || "").replace(/"/g, '""')}"`,
      `"${(log.resource || "").replace(/"/g, '""')}${log.resource_id ? `:${log.resource_id}` : ''}"`,
      `"${(log.details || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dejavu_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Exported", message: "Audit logs CSV generated.", style: "success" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-4">
        <h3 className="text-2xl font-bold">Audit Logs</h3>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text"
              placeholder="Filter by user or action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-neon-purple/50 transition-all placeholder:text-white/20"
            />
          </div>
          <button 
            onClick={exportAuditLogsToCSV}
            className="px-4 py-2.5 bg-white/5 hover:bg-neon-blue/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-blue"
          >
            Export CSV
          </button>
          <button 
            onClick={handleClearLogs}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-black uppercase text-red-500 tracking-widest rounded-xl transition-all whitespace-nowrap"
          >
            Clear Logs
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-white/40 text-[10px] uppercase font-black tracking-widest">
              <th className="p-4">Time</th>
              <th className="p-4">User</th>
              <th className="p-4">Action</th>
              <th className="p-4">Resource</th>
              <th className="p-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-dark-bg/20">
            {filteredLogs.map(log => (
              <tr key={log.id} className="text-xs hover:bg-white/5 transition-colors">
                <td className="p-4 text-white/50 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-bold">{log.username}</span>
                    <span className="text-[10px] text-white/30 uppercase tracking-tighter">{log.role}</span>
                  </div>
                </td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] uppercase font-black">{log.action}</span></td>
                <td className="p-4 text-neon-blue font-bold">{log.resource}{log.resource_id ? `:${log.resource_id}` : ''}</td>
                <td className="p-4 text-white/40 truncate max-w-xs">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAnalytics({ isAdminUser }: { isAdminUser?: boolean }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const { showAlert, showConfirm } = useModal();

  const fetchStats = async (selectedRange: string) => {
    try {
      const res = await fetchAdmin(`/api/admin/analytics?range=${selectedRange}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setError("");
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to fetch analytics data");
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
      setError("Network error: Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState("");

  const purgeAnalytics = async () => {
    const confirmed = await showConfirm({
      title: "Purge Analytics Data",
      message: "Are you sure you want to PERMANENTLY delete all historical analytics? This will reset all visitor counts, peak listener records, and geo-data. This action cannot be undone.",
      style: "danger",
      confirmText: "Purge Everything"
    });

    if (confirmed) {
      try {
        const res = await fetchAdmin("/api/admin/analytics/purge", { method: "DELETE" });
        if (res.ok) {
          showAlert({
            title: "Data Purged",
            message: "All analytics history has been successfully deleted.",
            style: "success"
          });
          fetchStats(range);
        }
      } catch (err) {
        console.error("Failed to purge analytics", err);
        showAlert({
          title: "Error",
          message: "Failed to purge analytics data.",
          style: "danger"
        });
      }
    }
  };

  useEffect(() => {
    fetchStats(range);
    
    // Connect to Socket.io for instant updates
    const socket = (window as any).socket;
    if (socket) {
      socket.on('stats_update', (update: any) => {
        setStats((prev: any) => ({
          ...prev,
          ...update
        }));
      });
    }
    
    // Fallback polling for historical data
    const interval = setInterval(() => fetchStats(range), 60000);
    return () => {
      clearInterval(interval);
      if (socket) socket.off('stats_update');
    };
  }, [range]);

  if (loading && !stats) return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-10 w-48 bg-white/5 rounded-xl"></div>
        <div className="h-10 w-64 bg-white/5 rounded-full"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1,2,3].map(i => (
          <div key={i} className="h-32 bg-white/5 rounded-3xl"></div>
        ))}
      </div>
      <div className="h-64 bg-white/5 rounded-3xl"></div>
    </div>
  );
  
  if (error && !stats) return (
    <div className="p-8 space-y-4">
      <div className="bg-red-500/20 border border-red-500/50 p-6 rounded-3xl text-red-400">
        <h4 className="text-lg font-bold mb-2 uppercase">Analytics Error</h4>
        <p className="text-sm opacity-80">{error}</p>
        <button 
          onClick={() => { setLoading(true); fetchStats(range); }}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-400 transition-colors"
        >
          Retry Fetch
        </button>
      </div>
    </div>
  );

  if (!stats) return <div className="text-white/50 p-8">No analytics data available yet.</div>;

  const ranges = [
    { label: "Today", value: "today" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-black font-display uppercase tracking-tight">System <span className="text-neon-purple">Analytics</span></h3>
          <p className="text-white/40 text-sm mt-1 font-mono">Performance and listener insights.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          {isAdminUser && (
            <button 
              onClick={purgeAnalytics}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-black uppercase text-red-500 tracking-widest rounded-full transition-all shrink-0"
            >
              <X className="w-3 h-3" />
              <span>Purge History</span>
            </button>
          )}
          
          <div className="flex bg-white/5 border border-white/10 rounded-full p-1 h-fit shrink-0">
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setLoading(true);
                  setRange(r.value);
                }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  range === r.value 
                    ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20" 
                    : "text-white/40 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2 bg-red-500/5 border border-red-500/20 px-4 py-2 rounded-full h-fit shrink-0">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">{stats.realtimeListeners} Live</span>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:border-neon-purple/50 transition-colors shadow-xl">
          <div className="p-3 bg-neon-purple/10 rounded-2xl w-fit mb-4">
            <Users className="w-6 h-6 text-neon-purple" />
          </div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Total Site Visits</p>
          <p className="text-3xl font-black mt-1">{(stats.monthlyListeners || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:border-neon-blue/50 transition-colors shadow-xl">
          <div className="p-3 bg-neon-blue/10 rounded-2xl w-fit mb-4">
            <TrendingUp className="w-6 h-6 text-neon-blue" />
          </div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Peak Listeners (All Time)</p>
          <p className="text-3xl font-black mt-1">{stats.peakListeners}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:border-yellow-400/50 transition-colors shadow-xl">
          <div className="p-3 bg-yellow-400/10 rounded-2xl w-fit mb-4">
            <PlayCircle className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Total Podcast Plays</p>
          <p className="text-3xl font-black mt-1">{(stats.totalPodcastPlays || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Retention / Hourly Pattern */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
          <h4 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-neon-blue" />
            <span>Listener Activity ({range === 'all' ? 'Historical' : range})</span>
          </h4>
          {stats.retentionData && stats.retentionData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.retentionData}>
                  <defs>
                    <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#00d2ff' }}
                  />
                  <Area type="monotone" dataKey="listeners" stroke="#00d2ff" fillOpacity={1} fill="url(#colorListeners)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-white/30 text-sm">Collecting hourly pattern data...</p>
            </div>
          )}
        </div>

        {/* Geo Distribution */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
          <h4 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <Globe className="w-5 h-5 text-neon-purple" />
            <span>Real-time Global Reach</span>
          </h4>
          {stats.geoData && stats.geoData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[200px] w-full max-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.geoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.geoData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4 w-full">
                {stats.geoData.map((g: any) => (
                  <div key={g.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="text-sm font-semibold">{g.name}</span>
                    </div>
                    <span className="text-white/40 text-sm">{g.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-white/30 text-sm">Waiting for listeners to connect...</p>
            </div>
          )}
        </div>

        {/* Top Podcasts */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
          <h4 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <PlayCircle className="w-5 h-5 text-yellow-400" />
            <span>Top Performing Catch Ups</span>
          </h4>
          {stats.topPodcasts && stats.topPodcasts.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topPodcasts} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#fff" fontSize={12} width={150} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="plays" radius={[0, 4, 4, 0]} barSize={24}>
                    {stats.topPodcasts.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-white/30 text-sm">No podcast play data recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminShoutouts({ isAdminUser }: { isAdminUser?: boolean }) {
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showConfirm, showAlert } = useModal();
  const load = () => {
    fetchAdmin("/api/admin/shoutouts").then(r => r.json()).then(data => {
      setShoutouts(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    const socket = (window as any).socket;
    
    const onNewShoutout = () => load();
    const onCleared = () => {
      setShoutouts([]);
      load();
    };
    
    if (socket) {
      socket.on('new_shoutout', onNewShoutout);
      socket.on('shoutouts_cleared', onCleared);
    }
    
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('new_shoutout', onNewShoutout);
        socket.off('shoutouts_cleared', onCleared);
      }
    };
  }, []);

  const deleteShoutout = async (id: number) => {
    try {
      const res = await fetchAdmin(`/api/admin/shoutouts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setShoutouts(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const exportToCSV = () => {
    if (shoutouts.length === 0) {
      showAlert({ title: "No Data", message: "There are no interactions to export.", style: "danger" });
      return;
    }

    const headers = ["ID", "Timestamp", "Email", "Message", "Type"];
    const rows = shoutouts.map(s => [
      s.id,
      new Date(s.timestamp).toISOString(),
      `"${(s.listener_name || "").replace(/"/g, '""')}"`,
      `"${(s.message || "").replace(/"/g, '""')}"`,
      s.type
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dejavu_interactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Exported", message: "CSV file has been generated.", style: "success" });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-6 gap-6 sm:gap-0">
        <div className="text-center sm:text-left">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-black uppercase tracking-tighter italic leading-none">Station <span className="text-neon-purple not-italic">Interactions</span></h3>
          <p className="text-white/40 text-[10px] sm:text-xs mt-2 uppercase tracking-[0.2em] font-black">Live Listener Pulse</p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 mt-2 sm:mt-0">
          <button 
            onClick={exportToCSV}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white/5 hover:bg-neon-blue/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-blue"
          >
            Export CSV
          </button>
          {isAdminUser && (
            <button 
              onClick={async () => {
                const confirmed = await showConfirm({
                  title: "Purge All Interactions",
                  message: "Are you sure you want to PERMANENTLY delete ALL shoutouts? This action cannot be undone.",
                  style: "danger",
                  confirmText: "Purge Everything"
                });

                if (confirmed) {
                  setShoutouts([]); // Optimistic update: Clear the list immediately
                  await fetchAdmin("/api/admin/shoutouts/all", { method: 'DELETE' });
                  showAlert({ title: "Purged", message: "All interactions have been cleared.", style: "success" });
                  load();
                }
              }} // Changed to use custom modal
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white/5 hover:bg-red-500/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap"
            >
              Purge Deck
            </button>
          )}
          <div className="flex items-center space-x-2 px-4 py-2.5 bg-neon-purple/20 border border-neon-purple/30 rounded-xl flex-shrink-0">
            <div className="w-2 h-2 bg-neon-purple rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-neon-purple tracking-widest whitespace-nowrap">Streaming Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {shoutouts.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center glass-panel rounded-3xl border-dashed">
            <Ghost className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 uppercase font-black tracking-widest text-xs">No activity yet. Promoting the station might help!</p>
          </div>
        )}
        
        <AnimatePresence>
          {shoutouts.map((s) => (
            <motion.div 
              key={s.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className="glass-panel p-4 sm:p-6 rounded-[2rem] border border-white/5 transition-all relative group overflow-hidden hover:border-neon-purple/30"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] pointer-events-none ${s.type === 'reaction' ? 'bg-neon-blue/10' : 'bg-neon-purple/10'}`}></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10 gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white/40" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white truncate tracking-tight">{s.listener_name}</h4>
                    <p className="text-[10px] text-white/30">{new Date(s.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteShoutout(s.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg text-white/20 hover:text-red-500 transition-all"
                  title="Permanent Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative z-10">
                {s.type === 'reaction' ? (
                  <div className="text-4xl text-center py-4 animate-bounce">
                    {s.message}
                  </div>
                ) : (
                  <p className="text-sm text-white/80 leading-relaxed font-medium italic">"{s.message}"</p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between relative z-10">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${s.type === 'reaction' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-neon-purple/20 text-neon-purple'}`}>
                  {s.type}
                </span>
                <span className="text-[8px] text-white/20 font-black uppercase">{s.id}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const { showAlert, showConfirm } = useModal();

  const load = () => {
    fetchAdmin("/api/admin/bookings").then(r => r.json()).then(setBookings);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetchAdmin(`/api/admin/bookings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    load();
    showAlert({ title: "Updated", message: `Booking status changed to ${status}`, style: "success" });
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: "Delete Booking",
      message: `Are you sure you want to delete the booking from '${name}'? This action cannot be undone.`,
      style: "danger",
      confirmText: "Delete Permanently"
    });

    if (confirmed) {
      try {
        const res = await fetchAdmin(`/api/admin/bookings/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert({ title: "Deleted", message: "Booking has been removed.", style: "success" });
          load();
        }
      } catch (err) {
        console.error("Failed to delete booking", err);
        showAlert({ title: "Error", message: "Failed to delete booking", style: "danger" });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-6 gap-6 sm:gap-0">
        <div className="text-center sm:text-left">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-black uppercase tracking-tighter italic leading-none">Agency <span className="text-neon-blue not-italic">Desk</span></h3>
          <p className="text-white/40 text-[10px] sm:text-xs mt-2 uppercase tracking-[0.2em] font-black">Professional Inquiries & Bookings</p>
        </div>
        <div className="flex items-center justify-center sm:justify-end">
          <div className="flex items-center space-x-2 px-4 py-2.5 bg-neon-blue/20 border border-neon-blue/30 rounded-xl">
            <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-neon-blue tracking-widest whitespace-nowrap">Agent Active</span>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-[2rem] border border-white/5 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Artist</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Client</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Event Date</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-6">
                    <span className="font-black text-neon-purple uppercase text-xs tracking-wider">{b.dj_name}</span>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold tracking-tight">{b.client_name}</span>
                      <span className="text-[10px] text-white/40 font-mono italic">{b.client_email}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-xs font-mono text-white/60">{b.event_date || 'TBD'}</span>
                  </td>
                  <td className="p-6">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                      b.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      b.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-neon-blue/10 text-neon-blue border-neon-blue/20 animate-pulse'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => setSelectedBooking(b)} 
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all transform hover:scale-105"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(b.id, 'confirmed')} 
                        className="p-2.5 bg-green-500/5 hover:bg-green-500/10 border border-green-500/10 rounded-xl text-green-400/60 hover:text-green-400 transition-all transform hover:scale-105"
                        title="Confirm Booking"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(b.id, 'rejected')} 
                        className="p-2.5 bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10 rounded-xl text-yellow-500/60 hover:text-yellow-500 transition-all transform hover:scale-105"
                        title="Reject Booking"
                      >
                        <LogOut className="w-4 h-4 rotate-90" />
                      </button>
                      <button 
                        onClick={() => handleDelete(b.id, b.client_name)} 
                        className="p-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-red-500/60 hover:text-red-500 transition-all transform hover:scale-105"
                        title="Delete Booking"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {bookings.map(b => (
          <motion.div 
            key={b.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-5 rounded-[2rem] border border-white/5 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neon-purple block mb-1">Artist</span>
                <p className="font-black text-lg text-white tracking-tighter italic">{b.dj_name}</p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                b.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                b.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                'bg-neon-blue/10 text-neon-blue border-neon-blue/20 animate-pulse'
              }`}>
                {b.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Client</span>
                <p className="text-xs font-bold truncate">{b.client_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Date</span>
                <p className="text-xs font-mono text-white/60">{b.event_date || 'TBD'}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setSelectedBooking(b)}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2"
              >
                <Eye className="w-3 h-3" />
                <span>Details</span>
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => updateStatus(b.id, 'confirmed')}
                  className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 outline-none"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(b.id, b.client_name)}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {bookings.length === 0 && (
        <div className="py-20 text-center glass-panel rounded-[3rem] border-dashed border-white/5">
          <Ghost className="w-12 h-12 text-white/5 mx-auto mb-4" />
          <p className="text-white/20 uppercase font-black tracking-widest text-xs">Awaiting new opportunities...</p>
        </div>
      )}


      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-dark-bg border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-purple block mb-1">Booking Inquiry</span>
                    <h4 className="text-2xl font-black uppercase tracking-tight italic">Artist: <span className="text-neon-purple not-italic">{selectedBooking.dj_name}</span></h4>
                  </div>
                  <button 
                    onClick={() => setSelectedBooking(null)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-white/40" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Client Name</p>
                    <p className="font-bold text-sm sm:text-base">{selectedBooking.client_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Email Address</p>
                    <p className="font-mono text-xs sm:text-sm break-all">{selectedBooking.client_email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Event Date</p>
                    <p className="font-mono text-xs sm:text-sm">{selectedBooking.event_date || 'TBD'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Booking Status</p>
                    <div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded inline-block border ${
                        selectedBooking.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        selectedBooking.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-neon-blue/10 text-neon-blue border-neon-blue/20'
                      }`}>
                        {selectedBooking.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3">Inquiry Message</p>
                  <div className="bg-white/5 p-4 rounded-2xl text-xs sm:text-sm text-white/70 leading-relaxed italic border border-white/5 overflow-y-auto max-h-[200px]">
                    "{selectedBooking.message || 'No additional message provided.'}"
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    onClick={() => { updateStatus(selectedBooking.id, 'confirmed'); setSelectedBooking(null); }}
                    className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 py-3 rounded-xl text-green-400 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => { updateStatus(selectedBooking.id, 'rejected'); setSelectedBooking(null); }}
                    className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 py-3 rounded-xl text-yellow-500 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => { handleDelete(selectedBooking.id, selectedBooking.client_name); setSelectedBooking(null); }}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 py-3 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
