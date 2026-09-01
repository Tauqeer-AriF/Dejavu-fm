import React, { useState, useEffect } from "react";
import { fetchAdmin } from "./adminApi";
import { ShieldAlert, Power, Radio, RefreshCw, AlertOctagon, Mail, Lock, CheckCircle, Eye, EyeOff, Sliders, Ghost, Shield, KeyRound, User, Link } from "lucide-react";
import { useLogo, getCachedSettings, setCachedSettings } from "../../hooks/useLogo";
import { safeFetchJson } from "../../utils/safeFetch";
import { motion } from "motion/react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AdminOwnerControl() {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();

  const { data: serverSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => safeFetchJson('/api/public/settings'),
    initialData: getCachedSettings,
  });

  const [isKilled, setIsKilled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard Path Settings State
  const [ownerCustomPath, setOwnerCustomPath] = useState<string>("/owner");
  const [pathUpdating, setPathUpdating] = useState<boolean>(false);
  const [pathSuccess, setPathSuccess] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);

  // Credentials State
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [credUpdating, setCredUpdating] = useState<boolean>(false);
  const [credSuccess, setCredSuccess] = useState<string | null>(null);
  const [credError, setCredError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<boolean>(false);

  // Owner Security Check Authorized Name State
  const [ownerSecret, setOwnerSecret] = useState<string>("");
  const [ownerSecretUpdating, setOwnerSecretUpdating] = useState<boolean>(false);
  const [ownerSecretSuccess, setOwnerSecretSuccess] = useState<string | null>(null);
  const [ownerSecretError, setOwnerSecretError] = useState<string | null>(null);
  const [showOwnerSecret, setShowOwnerSecret] = useState<boolean>(false);

  // Advanced Feature Visibility State (hidden = true means owner hid it from Advanced Tab)
  const [hiddenFeatures, setHiddenFeatures] = useState<Record<string, boolean>>({});
  const [savingFeatureId, setSavingFeatureId] = useState<string | null>(null);

  const advancedFeatureList = [
    { id: 'feat_email', title: 'Centralised Email Suite', description: 'Self-hosted SMTP dispatch engine, automated system notifications, template editor, and broadcast manager.' },
    { id: 'feat_studio', title: 'Studio Inbox Console', description: 'Real-time multi-channel DJ inbox, external chat feeds, broadcast messenger, and listener thread manager.' },
    { id: 'feat_meta', title: 'Meta & Social Integrations', description: 'Webhook processing, Instagram/Facebook social bridge, and messaging connections.' },
    { id: 'feat_backup', title: 'Database & System Backup', description: 'System backups, automated snapshot timers, and database download management.' },
    { id: 'feat_greeting', title: 'Personalised Welcome Greeting Modal', description: 'Interactive welcome greeting modal for returning listeners and show alerts.' },
    { id: 'feat_chat', title: 'Real-Time Chat Room', description: 'Live audience chat sidebar and message room.' },
    { id: 'feat_gamification', title: 'Listener Gamification & Rewards', description: 'XP leveling, achievement badges, leaderboards, and daily streak rewards.' },
    { id: 'feat_shoutouts', title: 'Shoutout & Reaction Widget', description: 'Floating shoutout button and live reaction triggers (fire, hearts, chat).' },
    { id: 'feat_ai_studio', title: 'AI Social Content Studio', description: 'Automated AI social reel pipeline, video generation, and prompt presets.' },
    { id: 'feat_cinematic', title: 'Cinematic Visualiser Mode', description: 'Immersive full-screen audio frequency & particle visualizer.' },
    { id: 'feat_pwa', title: 'PWA Installation Prompt', description: 'Banner prompting mobile & desktop users to install station app.' },
    { id: 'feat_bookings', title: 'DJ Agency & Artist Bookings', description: 'Booking request forms and agency roster management.' },
    { id: 'feat_live_tools', title: 'Live Tools & Studio Camera', description: 'Live broadcast studio webcam and DJ interaction controls.' },
    { id: 'feat_booth', title: 'Virtual DJ Booth System', description: 'Interactive virtual booth, request queue, and booth page.' },
    { id: 'feat_special_events', title: 'Special Events Module', description: 'Enable or disable the special events broadcast listings, RSVP details, and floating date/schedule badges.' },
    { id: 'feat_accessibility', title: 'Accessibility Hub', description: 'Header accessibility and high-contrast settings menu.' },
    { id: 'feat_stream_quality', title: 'Stream Quality Selector', description: 'Audio bit-rate quality selector in player controls.' },
  ];

  useEffect(() => {
    if (serverSettings) {
      const initialHidden: Record<string, boolean> = {};
      advancedFeatureList.forEach(item => {
        initialHidden[item.id] = serverSettings[`owner_hide_${item.id}`] === '1';
      });
      setHiddenFeatures(initialHidden);
      
      if (serverSettings.owner_custom_path) {
        setOwnerCustomPath(serverSettings.owner_custom_path);
      }
    }
  }, [serverSettings]);

  const handleToggleFeatureVisibility = async (featureId: string, hide: boolean) => {
    setSavingFeatureId(featureId);
    const nextState = { ...hiddenFeatures, [featureId]: hide };
    setHiddenFeatures(nextState);

    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`owner_hide_${featureId}`]: hide ? '1' : '0'
        })
      });

      if (res.ok) {
        toast.success(
          hide
            ? `Feature hidden from Advanced Tab`
            : `Feature made visible in Advanced Tab`
        );
        const updated = { ...(serverSettings || {}), [`owner_hide_${featureId}`]: hide ? '1' : '0' };
        setCachedSettings(updated);
        queryClient.setQueryData(['settings'], updated);
        await queryClient.invalidateQueries({ queryKey: ['settings'] });
        await queryClient.refetchQueries({ queryKey: ['settings'] });
      } else {
        toast.error("Failed to update feature visibility.");
        setHiddenFeatures(prev => ({ ...prev, [featureId]: !hide }));
      }
    } catch {
      toast.error("Network error while updating feature visibility.");
      setHiddenFeatures(prev => ({ ...prev, [featureId]: !hide }));
    } finally {
      setSavingFeatureId(null);
    }
  };

  const fetchStatusAndProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch kill switch status
      const res = await fetchAdmin("/api/admin/owner/kill-status");
      if (res.ok) {
        const data = await res.json();
        setIsKilled(!!data.killed);
      } else {
        setError("Failed to fetch current system status.");
      }

      // Fetch logged-in owner profile for username and email prefilling
      const profileRes = await fetchAdmin("/api/admin/profile");
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUsername(profileData.username || "");
        setEmail(profileData.email || "");
      }

      // Fetch owner security check authorized name
      const secretRes = await fetchAdmin("/api/admin/owner/secret");
      if (secretRes.ok) {
        const secretData = await secretRes.json();
        setOwnerSecret(secretData.secret || "owner");
      }
    } catch (err) {
      setError("An unexpected error occurred while loading settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndProfile();
  }, []);

  const handleToggleKill = async () => {
    try {
      setUpdating(true);
      setError(null);
      const targetState = !isKilled;
      const res = await fetchAdmin("/api/admin/owner/toggle-kill", {
        method: "POST",
        body: { active: targetState },
      });

      if (res.ok) {
        const data = await res.json();
        const newState = !!data.killed;
        setIsKilled(newState);
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        if (newState) {
          toast.error("Emergency Kill Switch ACTIVATED. Public access shut down.", { duration: 5000 });
        } else {
          toast.success("Emergency Kill Switch DEACTIVATED. Public access restored.", { duration: 5000 });
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update kill switch state.");
        toast.error("Failed to update kill switch state");
      }
    } catch (err) {
      setError("Failed to toggle system power state.");
      toast.error("Failed to toggle system power state");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateOwnerSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerSecretError(null);
    setOwnerSecretSuccess(null);

    const trimmed = ownerSecret.trim();
    if (!trimmed) {
      setOwnerSecretError("Owner authorized name cannot be empty.");
      return;
    }
    if (trimmed.length < 2) {
      setOwnerSecretError("Owner authorized name must be at least 2 characters long.");
      return;
    }

    try {
      setOwnerSecretUpdating(true);
      const res = await fetchAdmin("/api/admin/owner/secret", {
        method: "POST",
        body: JSON.stringify({ secret: trimmed }),
      });

      if (res.ok) {
        setOwnerSecretSuccess("Owner security check authorized name has been updated successfully!");
        toast.success("Owner authorized security name updated!");
      } else {
        const data = await res.json();
        setOwnerSecretError(data.error || "Failed to update owner security name.");
        toast.error(data.error || "Failed to update owner security name.");
      }
    } catch (err) {
      setOwnerSecretError("An unexpected error occurred while updating owner security name.");
      toast.error("Failed to update owner security name.");
    } finally {
      setOwnerSecretUpdating(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setCredSuccess(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setCredError("Owner username cannot be empty.");
      return;
    }

    if (trimmedUsername.length < 2) {
      setCredError("Username must be at least 2 characters long.");
      return;
    }

    if (password && password.length < 6) {
      setCredError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setCredError("Passwords do not match.");
      return;
    }

    try {
      setCredUpdating(true);
      const updateRes = await fetchAdmin("/api/admin/profile", {
        method: "PUT",
        body: JSON.stringify({
          username: trimmedUsername,
          email: email.trim(),
          password: password ? password : undefined,
        }),
      });

      if (updateRes.ok) {
        const resData = await updateRes.json();
        if (resData.token) {
          localStorage.setItem('admin_token', resData.token);
        }
        setCredSuccess("Your owner credentials have been updated successfully!");
        setPassword("");
        setConfirmPassword("");
        queryClient.invalidateQueries({ queryKey: ['admin_user'] });
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      } else {
        const data = await updateRes.json();
        setCredError(data.error || "Failed to update owner credentials.");
      }
    } catch (err) {
      setCredError("An unexpected error occurred while saving your credentials.");
    } finally {
      setCredUpdating(false);
    }
  };

  const handleUpdateDashboardPath = async (e: React.FormEvent) => {
    e.preventDefault();
    setPathError(null);
    setPathSuccess(null);

    let formattedPath = ownerCustomPath.trim();
    if (!formattedPath) {
      formattedPath = "/owner";
    }
    if (!formattedPath.startsWith('/')) {
      formattedPath = '/' + formattedPath;
    }
    // Remove trailing slash if length > 1
    if (formattedPath.length > 1 && formattedPath.endsWith('/')) {
      formattedPath = formattedPath.slice(0, -1);
    }

    // Basic validation
    if (formattedPath === "/") {
      setPathError("Dashboard path cannot be the root '/' URL as it is reserved for the public home page.");
      return;
    }

    // Regexp check: must be a valid path (alphanumeric, dashes, underscores, slashes)
    const validPathRegex = /^\/[a-zA-Z0-9\-_/]+$/;
    if (!validPathRegex.test(formattedPath)) {
      setPathError("Path must only contain letters, numbers, dashes, underscores, and slashes.");
      return;
    }

    try {
      setPathUpdating(true);
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_custom_path: formattedPath
        })
      });

      if (res.ok) {
        setOwnerCustomPath(formattedPath);
        setPathSuccess(`Dashboard Access URL has been successfully updated to ${formattedPath}!`);
        toast.success(`Dashboard Access URL updated to ${formattedPath}`);
        
        // Sync cache and react-query
        const updated = { ...(serverSettings || {}), owner_custom_path: formattedPath };
        setCachedSettings(updated);
        queryClient.setQueryData(['settings'], updated);
        await queryClient.invalidateQueries({ queryKey: ['settings'] });
      } else {
        const data = await res.json().catch(() => ({}));
        setPathError(data.error || "Failed to update Dashboard Access URL.");
        toast.error("Failed to update Dashboard Access URL.");
      }
    } catch (err) {
      setPathError("An unexpected error occurred while saving the dashboard URL.");
      toast.error("Failed to update Dashboard Access URL.");
    } finally {
      setPathUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 text-neon-purple animate-spin" />
        <span className={`text-xs font-semibold uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
          Authenticating Owner Access...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-dashed border-neon-purple/20 gap-4">
        <div>
          <span className="font-black uppercase tracking-tighter text-3xl sm:text-4xl text-neon-purple font-display">
            System Control
          </span>
          <p className={`text-xs uppercase tracking-widest font-semibold mt-1 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Primary Owner Authority Panel
          </p>
        </div>
        <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
          isKilled
            ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
        }`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isKilled ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isKilled ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
          </span>
          <span>{isKilled ? 'System Offline' : 'System Operational'}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-xs font-semibold">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Action Control Card */}
      <div className={`rounded-3xl p-6 sm:p-10 border transition-all duration-300 relative overflow-hidden shadow-2xl ${
        isLightMode
          ? 'bg-white/80 backdrop-blur-xl border-slate-200/90'
          : 'bg-[#0f1115]/80 backdrop-blur-xl border-white/10'
      }`}>
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
            isKilled
              ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
          }`}>
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="max-w-md space-y-2">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              {isKilled ? "Emergency Shutdown Active" : "Emergency Kill Switch"}
            </h2>
            <p className={`text-xs leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
              {isKilled
                ? "The application's public-facing functions have been completely deactivated. Visitors and staff accounts are locked out of the station. Click below to restore standard operation."
                : "Activating the Kill Switch instantly deactivates all public functions of the application. The system will go entirely Off-Air and show an emergency termination page to all visitors."}
            </p>
          </div>

          {/* Glowing Switch Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleToggleKill}
            disabled={updating}
            className={`px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3.5 border transition-all duration-300 shadow-xl cursor-pointer disabled:opacity-50 select-none ${
              isKilled
                ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                : 'bg-red-600 border-red-500 text-white hover:bg-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]'
            }`}
          >
            {updating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            <span>{isKilled ? "Restore Station Functions" : "Activate Emergency Kill Switch"}</span>
          </motion.button>
        </div>

        {/* Ambient background decoration */}
        <div className={`absolute -right-24 -bottom-24 w-64 h-64 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 ${
          isKilled ? 'bg-red-500/10' : 'bg-emerald-500/10'
        }`} />
      </div>

      {/* Owner Credentials Card */}
      <div className={`rounded-3xl p-6 sm:p-10 border transition-all duration-300 relative overflow-hidden shadow-xl ${
        isLightMode
          ? 'bg-white/80 backdrop-blur-xl border-slate-200/90 text-slate-800'
          : 'bg-[#0f1115]/80 backdrop-blur-xl border-white/10 text-white'
      }`}>
        <div className="space-y-6 max-w-xl">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">Owner Credentials Management</h3>
            <p className={`text-xs mt-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Modify the primary credentials used to authenticate owner station authority below.
            </p>
          </div>

          {credSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-xs font-semibold animate-fadeIn">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{credSuccess}</span>
            </div>
          )}

          {credError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-xs font-semibold animate-fadeIn">
              <AlertOctagon className="w-5 h-5 shrink-0" />
              <span>{credError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateCredentials} className="space-y-4">
            {/* Username & Email Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Owner Username */}
              <div className="space-y-1.5">
                <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  Owner Username
                </label>
                <div className="relative">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full text-sm border rounded-xl pl-11 pr-4 py-3.5 focus:border-neon-purple focus:outline-none transition-all ${
                      isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                    }`}
                    placeholder="owner"
                  />
                </div>
                <p className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                  Primary username for owner station login
                </p>
              </div>

              {/* Owner Email Address (Optional) */}
              <div className="space-y-1.5">
                <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  Owner Email Address <span className="normal-case opacity-60 font-medium">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full text-sm border rounded-xl pl-11 pr-4 py-3.5 focus:border-neon-purple focus:outline-none transition-all ${
                      isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                    }`}
                    placeholder="owner@station.com (optional)"
                  />
                </div>
                <p className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                  Optional for notifications & email login
                </p>
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  New Password (Optional)
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full text-sm border rounded-xl pl-11 pr-10 py-3.5 focus:border-neon-purple focus:outline-none transition-all ${
                      isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                      isLightMode ? 'hover:bg-black/5 text-black/40' : 'hover:bg-white/5 text-white/30'
                    }`}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full text-sm border rounded-xl pl-11 pr-4 py-3.5 focus:border-neon-purple focus:outline-none transition-all ${
                      isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={credUpdating}
                className="px-6 py-3 rounded-xl bg-neon-purple text-white font-black text-xs uppercase tracking-widest hover:bg-neon-purple/90 hover:shadow-lg hover:shadow-neon-purple/20 transition-all cursor-pointer disabled:opacity-50 select-none flex items-center gap-2"
              >
                {credUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Owner Profile</span>
              </motion.button>
            </div>
          </form>
        </div>
      </div>

      {/* Custom Dashboard Access URL Setup Card */}
      <div className={`rounded-3xl p-6 sm:p-10 border transition-all duration-300 relative overflow-hidden shadow-xl ${
        isLightMode
          ? 'bg-white/80 backdrop-blur-xl border-slate-200/90 text-slate-800'
          : 'bg-[#0f1115]/80 backdrop-blur-xl border-white/10 text-white'
      }`}>
        <div className="space-y-6 max-w-xl">
          <div>
            <div className="flex items-center gap-2.5">
              <Link className="w-5 h-5 text-neon-purple shrink-0" />
              <h3 className="text-lg font-black uppercase tracking-tight">Dashboard Access URL</h3>
            </div>
            <p className={`text-xs mt-1.5 leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Establish a custom, obfuscated relative path to access the DejavuFM Owner & Administrator Dashboard. This acts as an additional security layer, preventing unauthorized actors from discovering the login gateway.
            </p>
          </div>

          {pathSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-xs font-semibold animate-fadeIn">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{pathSuccess}</span>
            </div>
          )}

          {pathError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-xs font-semibold animate-fadeIn">
              <AlertOctagon className="w-5 h-5 shrink-0" />
              <span>{pathError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateDashboardPath} className="space-y-4">
            <div className="space-y-1.5">
              <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                Dashboard Custom Relative Path
              </label>
              
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className={`flex items-center px-4 rounded-xl text-xs font-mono select-none border whitespace-nowrap ${
                  isLightMode 
                    ? 'bg-black/[0.03] border-black/10 text-black/50' 
                    : 'bg-white/5 border-white/10 text-white/40'
                }`}>
                  {typeof window !== 'undefined' ? window.location.origin : 'https://dejavufm.com'}
                </div>
                
                <div className="relative flex-1">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono font-bold select-none ${
                    isLightMode ? 'text-black/40' : 'text-white/30'
                  }`}>
                    /
                  </span>
                  <input
                    type="text"
                    required
                    value={ownerCustomPath.replace(/^\//, '')}
                    onChange={(e) => setOwnerCustomPath('/' + e.target.value.trim().replace(/^\//, ''))}
                    className={`w-full text-sm border rounded-xl pl-8 pr-4 py-3.5 focus:border-neon-purple focus:outline-none transition-all font-mono ${
                      isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                    }`}
                    placeholder="owner"
                  />
                </div>
              </div>
              
              <div className={`text-[10px] space-y-1 leading-relaxed ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                <p>
                  • Must start with a slash and contain only letters, numbers, dashes, or underscores.
                </p>
                <p>
                  • Default is <code className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">/owner</code>. This is separate from the Settings tab dashboard path, enabling both URLs to host the dashboard simultaneously.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={pathUpdating}
                className="px-6 py-3 rounded-xl bg-neon-purple text-white font-black text-xs uppercase tracking-widest hover:bg-neon-purple/90 hover:shadow-lg hover:shadow-neon-purple/20 transition-all cursor-pointer disabled:opacity-50 select-none flex items-center gap-2"
              >
                {pathUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Access URL</span>
              </motion.button>
            </div>
          </form>
        </div>
      </div>

      {/* Owner Security Check Authorised Name Card */}
      <div className={`rounded-3xl p-6 sm:p-10 border transition-all duration-300 relative overflow-hidden shadow-xl ${
        isLightMode
          ? 'bg-white/80 backdrop-blur-xl border-slate-200/90 text-slate-800'
          : 'bg-[#0f1115]/80 backdrop-blur-xl border-white/10 text-white'
      }`}>
        <div className="space-y-6 max-w-xl">
          <div>
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-neon-purple shrink-0" />
              <h3 className="text-lg font-black uppercase tracking-tight">Security Check Authorised Name (Owner)</h3>
            </div>
            <p className={`text-xs mt-1.5 leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Set the exclusive Owner identity answer for the initial <strong>Security Check</strong> gate. Entering either the standard Admin name or this Owner name will pass the gate to reach the login screen. <strong>This passphrase can only be modified here in the Owner Control Panel.</strong>
            </p>
          </div>

          {ownerSecretSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-xs font-semibold animate-fadeIn">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{ownerSecretSuccess}</span>
            </div>
          )}

          {ownerSecretError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-xs font-semibold animate-fadeIn">
              <AlertOctagon className="w-5 h-5 shrink-0" />
              <span>{ownerSecretError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateOwnerSecret} className="space-y-4">
            <div className="space-y-1.5">
              <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                Owner Authorised Name (Secret Word)
              </label>
              <div className="relative">
                <KeyRound className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                <input
                  type={showOwnerSecret ? "text" : "password"}
                  required
                  value={ownerSecret}
                  onChange={(e) => setOwnerSecret(e.target.value)}
                  className={`w-full text-sm border rounded-xl pl-11 pr-12 py-3.5 focus:border-neon-purple focus:outline-none transition-all ${
                    isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                  }`}
                  placeholder="e.g. owner"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerSecret(!showOwnerSecret)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                    isLightMode ? 'hover:bg-black/5 text-black/40' : 'hover:bg-white/5 text-white/30'
                  }`}
                >
                  {showOwnerSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                Default value: <code className="px-1.5 py-0.5 rounded bg-neon-purple/10 text-neon-purple font-mono font-bold">owner</code> (case-insensitive).
              </p>
            </div>

            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={ownerSecretUpdating}
                className="px-6 py-3 rounded-xl bg-neon-purple text-white font-black text-xs uppercase tracking-widest hover:bg-neon-purple/90 hover:shadow-lg hover:shadow-neon-purple/20 transition-all cursor-pointer disabled:opacity-50 select-none flex items-center gap-2"
              >
                {ownerSecretUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Owner Security Name</span>
              </motion.button>
            </div>
          </form>
        </div>
      </div>

      {/* Advanced Features Visibility Management Card */}
      <div className={`rounded-3xl p-6 sm:p-10 border transition-all duration-300 relative overflow-hidden shadow-xl ${
        isLightMode
          ? 'bg-white/80 backdrop-blur-xl border-slate-200/90 text-slate-800'
          : 'bg-[#0f1115]/80 backdrop-blur-xl border-white/10 text-white'
      }`}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-neon-purple" />
                <span>Advanced Tab Feature Visibility Control</span>
              </h3>
              <p className={`text-xs mt-1 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Control which features are visible to administrators inside the Advanced Features Tab. Disabling a feature here immediately removes its toggle from the Advanced Tab.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {advancedFeatureList.map((item) => {
              const isHidden = !!hiddenFeatures[item.id];
              const isSaving = savingFeatureId === item.id;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                    isLightMode
                      ? isHidden
                        ? 'bg-slate-100/60 border-slate-200 text-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                      : isHidden
                        ? 'bg-black/20 border-white/5 text-slate-500'
                        : 'bg-black/40 border-white/10 text-white'
                  }`}
                >
                  <div className="space-y-1 max-w-xl pr-4 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isHidden ? 'line-through opacity-60' : ''}`}>
                        {item.title}
                      </span>
                      {isHidden ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                          Hidden from Advanced Tab
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Visible in Advanced Tab
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatureVisibility(item.id, !isHidden)}
                      disabled={isSaving}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer disabled:opacity-50 ${
                        isHidden
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                      }`}
                    >
                      {isSaving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isHidden ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                      <span>{isHidden ? "Make Visible" : "Hide from Tab"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
