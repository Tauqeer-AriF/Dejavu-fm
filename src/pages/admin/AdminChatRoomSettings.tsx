import React, { useEffect, useMemo, useState } from "react";
import { Clock, MessageSquare, RefreshCw, Save, Trash2, Image as ImageIcon, Music, Video, Shield, BarChart2, Database } from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { fetchAdmin } from "./adminApi";
import { useLogo } from "../../hooks/useLogo";

type SystemSettings = {
  enabled: boolean;
  hours: number;
  lastRun: string;
  publicMessages: number;
  privateMessages: number;
  shoutoutCount: number;
  imageCount: number;
  audioCount: number;
  videoCount: number;
  
  // Historical data pruning
  dataPruneEnabled: boolean;
  dataPruneDays: number;
  dataPruneLastRun: string;
  auditCount: number;
  analyticsCount: number;
};

const DEFAULT_SETTINGS: SystemSettings = {
  enabled: false,
  hours: 24,
  lastRun: "",
  publicMessages: 0,
  privateMessages: 0,
  shoutoutCount: 0,
  imageCount: 0,
  audioCount: 0,
  videoCount: 0,
  
  dataPruneEnabled: true,
  dataPruneDays: 90,
  dataPruneLastRun: "",
  auditCount: 0,
  analyticsCount: 0
};

const TIMER_PRESETS = [
  { label: "1 hour", value: 1 },
  { label: "6 hours", value: 6 },
  { label: "12 hours", value: 12 },
  { label: "24 hours", value: 24 },
  { label: "3 days", value: 72 },
  { label: "7 days", value: 168 },
  { label: "30 days", value: 720 },
];

const PRUNE_PRESETS = [
  { label: "All (0 days)", value: 0 },
  { label: "1 day", value: 1 },
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "365 days", value: 365 },
];

export function AdminChatRoomSettings() {
  const { isLightMode } = useLogo();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [enabled, setEnabled] = useState(false);
  const [hours, setHours] = useState(24);
  const [dataPruneEnabled, setDataPruneEnabled] = useState(true);
  const [dataPruneDays, setDataPruneDays] = useState(90);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [pruning, setPruning] = useState(false);
  const { showAlert, showConfirm } = useModal();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/chat-room-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load system settings");

      const next = {
        ...DEFAULT_SETTINGS,
        ...data,
        hours: Number(data.hours) || DEFAULT_SETTINGS.hours,
        dataPruneDays: (data.dataPruneDays !== undefined && data.dataPruneDays !== null) ? Number(data.dataPruneDays) : DEFAULT_SETTINGS.dataPruneDays,
      };
      setSettings(next);
      setEnabled(next.enabled);
      setHours(next.hours);
      setDataPruneEnabled(next.dataPruneEnabled);
      setDataPruneDays(next.dataPruneDays);
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to load system settings.", style: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleCountsUpdated = (counts: { 
      publicMessages?: number; 
      privateMessages?: number;
      shoutoutCount?: number;
      imageCount?: number;
      audioCount?: number;
      videoCount?: number;
    }) => {
      setSettings(prev => ({
        ...prev,
        publicMessages: counts.publicMessages ?? prev.publicMessages,
        privateMessages: counts.privateMessages ?? prev.privateMessages,
        shoutoutCount: counts.shoutoutCount ?? prev.shoutoutCount,
        imageCount: counts.imageCount ?? prev.imageCount,
        audioCount: counts.audioCount ?? prev.audioCount,
        videoCount: counts.videoCount ?? prev.videoCount,
      }));
    };

    socket.on('chatCountsUpdated', handleCountsUpdated);
    return () => {
      socket.off('chatCountsUpdated', handleCountsUpdated);
    };
  }, []);

  const lastRunLabel = useMemo(() => {
    if (!settings.lastRun) return "Not run yet";
    const date = new Date(settings.lastRun);
    if (Number.isNaN(date.getTime())) return "Not run yet";
    return date.toLocaleString();
  }, [settings.lastRun]);

  const nextRunLabel = useMemo(() => {
    if (!enabled) return "Timer disabled";
    const base = settings.lastRun ? new Date(settings.lastRun).getTime() : Date.now();
    if (Number.isNaN(base)) return "After the next saved interval";
    return new Date(base + hours * 60 * 60 * 1000).toLocaleString();
  }, [enabled, hours, settings.lastRun]);

  const lastPruneLabel = useMemo(() => {
    if (!settings.dataPruneLastRun) return "Not run yet";
    const date = new Date(settings.dataPruneLastRun);
    if (Number.isNaN(date.getTime())) return "Not run yet";
    return date.toLocaleString();
  }, [settings.dataPruneLastRun]);

  const saveSettings = async () => {
    if (!Number.isInteger(hours) || hours < 1 || hours > 8760) {
      showAlert({ title: "Invalid Timer", message: "Choose a timer between 1 hour and 8760 hours.", style: "danger" });
      return;
    }
    if (!Number.isInteger(dataPruneDays) || dataPruneDays < 0 || dataPruneDays > 3650) {
      showAlert({ title: "Invalid Days", message: "Choose retention days between 0 and 3650 days.", style: "danger" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetchAdmin("/api/admin/chat-room-settings", {
        method: "PUT",
        body: { 
          enabled, 
          hours,
          dataPruneEnabled,
          dataPruneDays
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      showAlert({ title: "Saved", message: "Data operations settings updated.", style: "success" });
      await loadSettings();
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message || "Failed to save settings.", style: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const purgeNow = async () => {
    const confirmed = await showConfirm({
      title: "Force Delete Chat & Shoutouts",
      message: "This will permanently delete all public chat messages, all private conversations, and all shoutout records, including uploaded media. Chat user accounts will remain. This action is irreversible.",
      style: "danger",
      confirmText: "Purge All Chat & Shoutouts",
    });
    if (!confirmed) return;

    setPurging(true);
    try {
      const res = await fetchAdmin("/api/admin/chat-room-settings/data", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete chat data");

      showAlert({
        title: "Purged",
        message: `Removed ${data.publicDeleted || 0} public, ${data.privateDeleted || 0} private, and ${data.shoutoutsDeleted || 0} shoutout messages.`,
        style: "success",
      });
      await loadSettings();
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message || "Failed to delete chat data.", style: "danger" });
    } finally {
      setPurging(false);
    }
  };

  const pruneHistoricalNow = async () => {
    const confirmed = await showConfirm({
      title: "Prune Historical Data Now",
      message: `This will instantly delete audit logs and analytics events older than ${dataPruneDays} days. Would you like to proceed?`,
      style: "warning",
      confirmText: "Prune Logs Now",
    });
    if (!confirmed) return;

    setPruning(true);
    try {
      const res = await fetchAdmin("/api/admin/chat-room-settings/prune-data", {
        method: "POST",
        body: { days: dataPruneDays },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prune historical data");

      showAlert({
        title: "Pruned Successfully",
        message: `Removed ${data.auditDeleted || 0} audit log entries and ${data.analyticsDeleted || 0} analytics events.`,
        style: "success",
      });
      await loadSettings();
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message || "Failed to prune historical data.", style: "danger" });
    } finally {
      setPruning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 transition-colors ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <h3 className={`text-xl sm:text-2xl font-bold flex items-center gap-3 ${isLightMode ? 'text-black' : 'text-white'}`}>
          <Database className="w-6 h-6 sm:w-7 sm:h-7 text-neon-purple" />
          Data Operations
        </h3>
        <button
          type="button"
          onClick={loadSettings}
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 border ${
            isLightMode ? 'bg-black/5 border-black/10 text-black hover:bg-black/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <div className={`border rounded-2xl p-4 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-neon-purple" />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Public Chats</p>
          </div>
          <p className="text-2xl font-black text-neon-purple">{settings.publicMessages}</p>
        </div>
        
        <div className={`border rounded-2xl p-4 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-neon-blue" />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Private Chats</p>
          </div>
          <p className="text-2xl font-black text-neon-blue">{settings.privateMessages}</p>
        </div>

        <div className={`border rounded-2xl p-4 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Shout-outs</p>
          </div>
          <p className="text-2xl font-black text-pink-400">{settings.shoutoutCount}</p>
        </div>

        <div className={`border rounded-2xl p-4 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Audit Log Entries</p>
          </div>
          <p className="text-2xl font-black text-sky-400">{settings.auditCount}</p>
        </div>

        <div className={`border rounded-2xl p-4 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-violet-400" />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Analytics Events</p>
          </div>
          <p className="text-2xl font-black text-violet-400">{settings.analyticsCount}</p>
        </div>

        <div className={`border rounded-2xl p-4 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Images</p>
          </div>
          <p className="text-2xl font-black text-emerald-400">{settings.imageCount}</p>
        </div>

        <div className={`border rounded-2xl p-4 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Audio Files</p>
          </div>
          <p className="text-2xl font-black text-amber-400">{settings.audioCount}</p>
        </div>

        <div className={`border rounded-2xl p-4 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Videos</p>
          </div>
          <p className="text-2xl font-black text-rose-400">{settings.videoCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Chat and Shoutout Auto-Delete Timer */}
        <div className={`border rounded-2xl p-6 space-y-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className={`font-bold uppercase tracking-widest text-xs flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
                <Clock className="w-4 h-4 text-neon-purple" />
                Auto-Delete Chat & Shoutouts
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>
                Automatically clear all public/private chat messages and shoutout records periodically.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
              />
              <div className={`w-12 h-6 rounded-full transition-all peer-focus:outline-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-purple peer-checked:after:translate-x-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${
                isLightMode ? 'bg-black/10' : 'bg-white/10'
              }`} />
            </label>
          </div>

          <div className="space-y-3">
            <label className={`block text-[10px] uppercase font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Purge Interval</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TIMER_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setHours(preset.value)}
                  className={`px-2 py-2.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${
                    hours === preset.value
                      ? "bg-neon-purple text-white border-neon-purple shadow-lg shadow-neon-purple/20"
                      : isLightMode 
                        ? "bg-black/5 text-black/60 border-black/5 hover:bg-black/10 hover:text-black"
                        : "bg-white/5 text-white/60 border-white/5 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="pt-1">
              <label className={`block text-[10px] uppercase mb-1.5 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Custom Hours</label>
              <input
                type="number"
                min={1}
                max={8760}
                value={hours}
                onChange={e => setHours(parseInt(e.target.value, 10) || 1)}
                className={`w-full rounded-xl px-4 py-2.5 text-xs focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className={`border rounded-xl p-3 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
              <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Last Execution</p>
              <p className={`mt-1 text-[11px] font-mono leading-none ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{lastRunLabel}</p>
            </div>
            <div className={`border rounded-xl p-3 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
              <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Next Execution</p>
              <p className={`mt-1 text-[11px] font-mono leading-none ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{nextRunLabel}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-dashed border-neon-purple/20">
            <button
              type="button"
              onClick={purgeNow}
              disabled={purging || loading}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 border ${
                isLightMode 
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white' 
                  : 'bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500 hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {purging ? "Purging..." : "Manual Force Purge"}
            </button>
          </div>
        </div>

        {/* Panel 2: Historical Log & Analytics Pruning */}
        <div className={`border rounded-2xl p-6 space-y-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className={`font-bold uppercase tracking-widest text-xs flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
                <Shield className="w-4 h-4 text-neon-blue" />
                Log & Analytics Pruning
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>
                Automatically prune historical audit logs and system analytics events to keep database lightweight.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={dataPruneEnabled}
                onChange={e => setDataPruneEnabled(e.target.checked)}
              />
              <div className={`w-12 h-6 rounded-full transition-all peer-focus:outline-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-blue peer-checked:after:translate-x-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${
                isLightMode ? 'bg-black/10' : 'bg-white/10'
              }`} />
            </label>
          </div>

          <div className="space-y-3">
            <label className={`block text-[10px] uppercase font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Retention Period</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PRUNE_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setDataPruneDays(preset.value)}
                  className={`px-1 py-2.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${
                    dataPruneDays === preset.value
                      ? "bg-neon-blue text-white border-neon-blue shadow-lg shadow-neon-blue/20"
                      : isLightMode 
                        ? "bg-black/5 text-black/60 border-black/5 hover:bg-black/10 hover:text-black"
                        : "bg-white/5 text-white/60 border-white/5 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="pt-1">
              <label className={`block text-[10px] uppercase mb-1.5 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Custom Days</label>
              <input
                type="number"
                min={0}
                max={3650}
                value={dataPruneDays}
                onChange={e => setDataPruneDays(e.target.value === "" ? 0 : (parseInt(e.target.value, 10) || 0))}
                className={`w-full rounded-xl px-4 py-2.5 text-xs focus:border-neon-blue outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <div className={`border rounded-xl p-3 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
              <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Last Historical Prune</p>
              <p className={`mt-1 text-[11px] font-mono leading-none ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{lastPruneLabel}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-dashed border-neon-blue/20">
            <button
              type="button"
              onClick={pruneHistoricalNow}
              disabled={pruning || loading}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 border ${
                isLightMode 
                  ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-600 hover:text-white' 
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              {pruning ? "Pruning..." : "Manual Prune Now"}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving || loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-neon-purple px-8 py-4 rounded-xl font-black uppercase tracking-widest text-white text-xs hover:bg-neon-blue transition-all disabled:opacity-50 shadow-lg shadow-neon-purple/20"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving Settings..." : "Save Configured Settings"}
        </button>
      </div>
    </div>
  );
}
