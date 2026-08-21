import React, { useState, useEffect } from "react";
import { fetchAdmin } from "./adminApi";
import { ShieldAlert, Power, Radio, RefreshCw, AlertOctagon, Mail, Lock, CheckCircle, Eye, EyeOff, Sliders, Ghost } from "lucide-react";
import { useLogo } from "../../hooks/useLogo";
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
  });

  const [isKilled, setIsKilled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Credentials State
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [credUpdating, setCredUpdating] = useState<boolean>(false);
  const [credSuccess, setCredSuccess] = useState<string | null>(null);
  const [credError, setCredError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<boolean>(false);

  // Advanced Feature Visibility State (hidden = true means owner hid it from Advanced Tab)
  const [hiddenFeatures, setHiddenFeatures] = useState<Record<string, boolean>>({});
  const [savingFeatureId, setSavingFeatureId] = useState<string | null>(null);

  const advancedFeatureList = [
    { id: 'feat_greeting', title: 'Personalised Welcome Greeting Modal', description: 'Interactive welcome greeting modal for returning listeners and show alerts.' },
    { id: 'feat_chat', title: 'Real-Time Chat Room', description: 'Live audience chat sidebar and message room.' },
    { id: 'feat_shoutouts', title: 'Shoutout & Reaction Widget', description: 'Floating shoutout button and live reaction triggers (fire, hearts, chat).' },
    { id: 'feat_ai_studio', title: 'AI Social Content Studio', description: 'Automated AI social reel pipeline, video generation, and prompt presets.' },
    { id: 'feat_cinematic', title: 'Cinematic Visualiser Mode', description: 'Immersive full-screen audio frequency & particle visualizer.' },
    { id: 'feat_pwa', title: 'PWA Installation Prompt', description: 'Banner prompting mobile & desktop users to install station app.' },
    { id: 'feat_bookings', title: 'DJ Agency & Artist Bookings', description: 'Booking request forms and agency roster management.' },
    { id: 'feat_live_tools', title: 'Live Tools & Studio Camera', description: 'Live broadcast studio webcam and DJ interaction controls.' },
    { id: 'feat_booth', title: 'Virtual DJ Booth System', description: 'Interactive virtual booth, request queue, and booth page.' },
    { id: 'feat_special_events', title: 'Special Events Module', description: 'Enable or disable the special events broadcast listings, RSVP details, and floating date/schedule badges.' },
    { id: 'feat_stream_quality', title: 'Stream Quality Selector', description: 'Audio bit-rate quality selector in player controls.' },
  ];

  useEffect(() => {
    if (serverSettings) {
      const initialHidden: Record<string, boolean> = {};
      advancedFeatureList.forEach(item => {
        initialHidden[item.id] = serverSettings[`owner_hide_${item.id}`] === '1';
      });
      setHiddenFeatures(initialHidden);
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

      // Fetch logged-in owner profile for email prefilling
      const profileRes = await fetchAdmin("/api/admin/profile");
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setEmail(profileData.email || "");
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

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setCredSuccess(null);

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
          email: email.trim(),
          password: password ? password : undefined,
        }),
      });

      if (updateRes.ok) {
        setCredSuccess("Your owner credentials have been updated successfully!");
        setPassword("");
        setConfirmPassword("");
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
            {/* Email Address */}
            <div className="space-y-1.5">
              <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                Owner Email Address
              </label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full text-sm border rounded-xl pl-11 pr-4 py-3.5 focus:border-neon-purple focus:outline-none transition-all ${
                    isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                  }`}
                  placeholder="owner@station.com"
                />
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
