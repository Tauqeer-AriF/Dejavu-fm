import React, { useEffect, useMemo, useState } from "react";
import { Clock, MessageSquare, RefreshCw, Save, Trash2, Image as ImageIcon, Music, Video, Shield, BarChart2, Database, Zap, Globe, Sparkles, CheckCircle2, Mic, Paintbrush, History, UserCheck } from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { fetchAdmin } from "./adminApi";
import { useLogo } from "../../hooks/useLogo";

type PurgeHistoryItem = {
  id: number;
  username: string;
  role: string;
  scope: string;
  timestamp: string;
  version?: string;
  purgedAt?: string;
  clientsNotified?: number;
  auto?: boolean;
};

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

  // Cache settings
  systemCacheVersion: string;
  systemCacheLastPurged: string;
  autoPurgeOnSave?: boolean;
  purgeHistory?: PurgeHistoryItem[];
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
  analyticsCount: 0,

  systemCacheVersion: "1.0.0",
  systemCacheLastPurged: "",
  autoPurgeOnSave: true,
  purgeHistory: []
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
  const [autoPurgeOnSave, setAutoPurgeOnSave] = useState(true);
  const [selectedPurgeScope, setSelectedPurgeScope] = useState<'all' | 'visitor_ui' | 'podcasts' | 'audio_meta'>('all');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [purgingCache, setPurgingCache] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { showAlert, showConfirm } = useModal();

  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());
  const componentMountedTime = React.useRef(Date.now()).current;
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

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
        autoPurgeOnSave: data.autoPurgeOnSave !== undefined ? data.autoPurgeOnSave : true,
        purgeHistory: Array.isArray(data.purgeHistory) ? data.purgeHistory : []
      };
      setSettings(next);
      setEnabled(next.enabled);
      setHours(next.hours);
      setDataPruneEnabled(next.dataPruneEnabled);
      setDataPruneDays(next.dataPruneDays);
      setAutoPurgeOnSave(next.autoPurgeOnSave);
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
    const base = (settings.lastRun && !Number.isNaN(Date.parse(settings.lastRun)))
      ? new Date(settings.lastRun).getTime()
      : componentMountedTime;
    return new Date(base + hours * 60 * 60 * 1000).toLocaleString();
  }, [enabled, hours, settings.lastRun, componentMountedTime]);

  const chatPurgeTimeLeft = useMemo(() => {
    if (!enabled) return "";
    const base = (settings.lastRun && !Number.isNaN(Date.parse(settings.lastRun)))
      ? new Date(settings.lastRun).getTime()
      : componentMountedTime;
    const nextRun = base + hours * 60 * 60 * 1000;
    const msRemaining = nextRun - currentTimestamp;
    
    if (msRemaining <= 0) return "Executing soon...";
    
    const totalSecs = Math.floor(msRemaining / 1000);
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    
    const pad = (num: number) => String(num).padStart(2, '0');
    
    if (d > 0) {
      return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }
    if (h > 0) {
      return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }
    return `${pad(m)}m ${pad(s)}s`;
  }, [enabled, hours, settings.lastRun, currentTimestamp, componentMountedTime]);

  const lastPruneLabel = useMemo(() => {
    if (!settings.dataPruneLastRun) return "Not run yet";
    const date = new Date(settings.dataPruneLastRun);
    if (Number.isNaN(date.getTime())) return "Not run yet";
    return date.toLocaleString();
  }, [settings.dataPruneLastRun]);

  const nextPruneLabel = useMemo(() => {
    if (!dataPruneEnabled) return "Timer disabled";
    const base = (settings.dataPruneLastRun && !Number.isNaN(Date.parse(settings.dataPruneLastRun)))
      ? new Date(settings.dataPruneLastRun).getTime()
      : componentMountedTime;
    return new Date(base + 24 * 60 * 60 * 1000).toLocaleString();
  }, [dataPruneEnabled, settings.dataPruneLastRun, componentMountedTime]);

  const historicalPruneTimeLeft = useMemo(() => {
    if (!dataPruneEnabled) return "";
    const base = (settings.dataPruneLastRun && !Number.isNaN(Date.parse(settings.dataPruneLastRun)))
      ? new Date(settings.dataPruneLastRun).getTime()
      : componentMountedTime;
    const nextPrune = base + 24 * 60 * 60 * 1000;
    const msRemaining = nextPrune - currentTimestamp;
    
    if (msRemaining <= 0) return "Executing soon...";
    
    const totalSecs = Math.floor(msRemaining / 1000);
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    
    const pad = (num: number) => String(num).padStart(2, '0');
    
    if (d > 0) {
      return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }
    if (h > 0) {
      return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }
    return `${pad(m)}m ${pad(s)}s`;
  }, [dataPruneEnabled, settings.dataPruneLastRun, currentTimestamp, componentMountedTime]);

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
          dataPruneDays,
          autoPurgeOnSave
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      showAlert({ title: "Saved", message: "Data operations & cache settings updated.", style: "success" });
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

  const purgeCacheNow = async (scope: 'all' | 'visitor_ui' | 'podcasts' | 'audio_meta' = selectedPurgeScope) => {
    if (cooldownSeconds > 0) {
      showAlert({
        title: "Cooldown Active",
        message: `Please wait ${cooldownSeconds} second${cooldownSeconds > 1 ? 's' : ''} before initiating another cache purge.`,
        style: "info"
      });
      return;
    }

    const scopeDescriptions: Record<string, string> = {
      all: "This will flush server memory caches, refresh backend data feeds, and issue a global cache-invalidation version to all active and returning visitors' browsers without interrupting active audio playback.",
      visitor_ui: "This will invalidate browser cache for layout, station schedule, custom pages, and theme assets without reloading the page or cutting audio.",
      podcasts: "This will clear in-memory podcast episode caches and force immediate re-synchronization with external podcast RSS feeds.",
      audio_meta: "This will flush now-playing metadata, artwork buffers, and listener presence cache."
    };

    const confirmed = await showConfirm({
      title: `Purge Cache (${scope.toUpperCase()})`,
      message: `${scopeDescriptions[scope] || scopeDescriptions.all} Proceed?`,
      style: "warning",
      confirmText: `Purge ${scope === 'all' ? 'All' : scope}`,
    });
    if (!confirmed) return;

    setPurgingCache(true);
    try {
      const res = await fetchAdmin("/api/admin/system/purge-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to purge cache");

      // Local browser CacheStorage flush
      if (scope === 'all' || scope === 'visitor_ui') {
        if ('caches' in window) {
          try {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
          } catch (e) {}
        }
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
        message: `System cache (${scope}) flushed. Generation: ${data.version || "updated"}.${data.clientsNotified ? ` Reached ${data.clientsNotified} visitor browser instances.` : ''}`,
        style: "success",
      });
      setCooldownSeconds(15);
      await loadSettings();
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message || "Failed to purge system cache.", style: "danger" });
    } finally {
      setPurgingCache(false);
    }
  };

  const clearPurgeHistory = async () => {
    const confirmed = await showConfirm({
      title: "Clear Purge History",
      message: "Are you sure you want to clear the purge audit logs? This action cannot be undone.",
      style: "danger",
      confirmText: "Clear History"
    });
    if (!confirmed) return;

    try {
      const res = await fetchAdmin("/api/admin/system/purge-history", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear purge history");

      showAlert({ title: "History Cleared", message: "Purge audit history records have been cleared.", style: "success" });
      setSettings(prev => ({ ...prev, purgeHistory: [] }));
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message || "Failed to clear purge history.", style: "danger" });
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
              {chatPurgeTimeLeft && (
                <p className="mt-1 text-[10px] text-neon-purple font-bold font-mono">
                  Time left: {chatPurgeTimeLeft}
                </p>
              )}
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

            <div className={`mt-2 p-3 rounded-xl text-[10.5px] leading-relaxed transition-colors flex items-start gap-2 border ${
              isLightMode 
                ? 'bg-amber-500/5 border-amber-500/15 text-amber-900/80' 
                : 'bg-amber-500/5 border-amber-500/10 text-amber-200/80'
            }`}>
              <span className="text-xs shrink-0 select-none">ℹ️</span>
              <span>
                <strong className={isLightMode ? 'text-black' : 'text-white'}>Pruning Schedule vs. Retention:</strong> The automated cleanup task executes once every <strong>24 hours</strong>. When it next runs, it will scan your database and purge only logs and analytics events older than your selected <strong>{dataPruneDays} days</strong> retention period.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className={`border rounded-xl p-3 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
              <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Last Historical Prune</p>
              <p className={`mt-1 text-[11px] font-mono leading-none ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{lastPruneLabel}</p>
            </div>
            <div className={`border rounded-xl p-3 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
              <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Next Historical Prune</p>
              <p className={`mt-1 text-[11px] font-mono leading-none ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{nextPruneLabel}</p>
              {historicalPruneTimeLeft && (
                <p className="mt-1 text-[10px] text-neon-blue font-bold font-mono">
                  Time left: {historicalPruneTimeLeft}
                </p>
              )}
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

        {/* Panel 3: Application & Browser Cache Purge */}
        <div className={`md:col-span-2 border rounded-2xl p-6 space-y-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h4 className={`font-bold uppercase tracking-widest text-xs flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Application & Browser Cache Management
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>
                Flush in-memory server caches, refresh podcast RSS feeds, and broadcast an immediate cache-invalidation version to all active and returning visitors' browsers without disrupting active audio streams.
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => purgeCacheNow(selectedPurgeScope)}
                disabled={purgingCache || loading || cooldownSeconds > 0}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shrink-0 border shadow-lg ${
                  cooldownSeconds > 0
                    ? isLightMode
                      ? 'opacity-75 cursor-not-allowed bg-emerald-700 border-emerald-800 !text-white'
                      : 'opacity-75 cursor-not-allowed bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : isLightMode 
                      ? 'bg-emerald-600 !text-white border-emerald-700 hover:bg-emerald-700 hover:!text-white shadow-emerald-600/25' 
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-white shadow-emerald-500/10'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${purgingCache ? 'animate-pulse' : ''} ${isLightMode ? '!text-white text-white' : ''}`} />
                <span className={isLightMode ? '!text-white' : ''}>
                  {purgingCache 
                    ? "Purging Cache..." 
                    : cooldownSeconds > 0 
                      ? `Cooldown (${cooldownSeconds}s)` 
                      : `Purge ${selectedPurgeScope === 'all' ? 'All Caches' : selectedPurgeScope.toUpperCase()}`}
                </span>
              </button>
            </div>
          </div>

          {/* Granular Scope Selector */}
          <div className="space-y-2">
            <label className={`block text-[10px] uppercase font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>
              Select Target Cache Layer
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPurgeScope('all')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedPurgeScope === 'all'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                    : isLightMode
                      ? 'bg-black/[0.02] border-black/10 hover:bg-black/[0.05] text-black/80'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-[9px] font-mono uppercase px-1 rounded bg-emerald-500/20 text-emerald-400">All</span>
                </div>
                <div className="text-xs font-bold">Full Purge</div>
                <div className={`text-[10px] mt-0.5 leading-tight ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  Server, RSS & all visitor caches
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPurgeScope('visitor_ui')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedPurgeScope === 'visitor_ui'
                    ? 'bg-neon-purple/20 border-neon-purple text-neon-purple shadow-sm'
                    : isLightMode
                      ? 'bg-black/[0.02] border-black/10 hover:bg-black/[0.05] text-black/80'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Paintbrush className="w-4 h-4 text-neon-purple" />
                  <span className="text-[9px] font-mono uppercase px-1 rounded bg-neon-purple/20 text-neon-purple">UI</span>
                </div>
                <div className="text-xs font-bold">Visitor UI</div>
                <div className={`text-[10px] mt-0.5 leading-tight ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  Layouts, schedule & themes
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPurgeScope('podcasts')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedPurgeScope === 'podcasts'
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-sm'
                    : isLightMode
                      ? 'bg-black/[0.02] border-black/10 hover:bg-black/[0.05] text-black/80'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Mic className="w-4 h-4 text-pink-400" />
                  <span className="text-[9px] font-mono uppercase px-1 rounded bg-pink-500/20 text-pink-400">RSS</span>
                </div>
                <div className="text-xs font-bold">Podcasts</div>
                <div className={`text-[10px] mt-0.5 leading-tight ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  External RSS episode feeds
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPurgeScope('audio_meta')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedPurgeScope === 'audio_meta'
                    ? 'bg-neon-blue/20 border-neon-blue text-neon-blue shadow-sm'
                    : isLightMode
                      ? 'bg-black/[0.02] border-black/10 hover:bg-black/[0.05] text-black/80'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-white/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Music className="w-4 h-4 text-neon-blue" />
                  <span className="text-[9px] font-mono uppercase px-1 rounded bg-neon-blue/20 text-neon-blue">AUDIO</span>
                </div>
                <div className="text-xs font-bold">Audio & Meta</div>
                <div className={`text-[10px] mt-0.5 leading-tight ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  Artwork buffers & now playing
                </div>
              </button>
            </div>
          </div>

          {/* Auto-Purge on Save Switch */}
          <div className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
            isLightMode ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.02] border-white/10'
          }`}>
            <div className="space-y-0.5">
              <div className="text-xs font-bold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                Auto-Purge on Settings & Schedule Updates
              </div>
              <p className={`text-[11px] ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>
                Automatically flush the cache whenever station settings, schedule lineups, or theme configurations are updated.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoPurgeOnSave}
                onChange={e => setAutoPurgeOnSave(e.target.checked)}
              />
              <div className={`w-11 h-6 rounded-full transition-all peer-focus:outline-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${
                isLightMode ? 'bg-black/10' : 'bg-white/10'
              }`} />
            </label>
          </div>

          {/* Cache Telemetry Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className={`border rounded-xl p-3 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
              <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Active Generation Version</p>
              <p className={`mt-1 text-[11px] font-mono leading-none truncate ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>
                v{settings.systemCacheVersion || "1.0.0"}
              </p>
            </div>
            <div className={`border rounded-xl p-3 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
              <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Last Purge Executed</p>
              <p className={`mt-1 text-[11px] font-mono leading-none ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>
                {settings.systemCacheLastPurged ? new Date(settings.systemCacheLastPurged).toLocaleString() : "Never / Initial state"}
              </p>
            </div>
            <div className={`border rounded-xl p-3 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
              <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Visitor Cache Sync</p>
              <p className={`mt-1 text-[11px] font-mono leading-none text-emerald-400 font-bold`}>
                Real-time WebSocket & PWA
              </p>
            </div>
          </div>

          {/* Purge History & Audit Log */}
          {settings.purgeHistory && settings.purgeHistory.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-dashed border-white/10">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h5 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? 'text-black/70' : 'text-white/70'}`}>
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  Recent Purge Audit History
                </h5>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                    Last {settings.purgeHistory.length} events
                  </span>
                  <button
                    type="button"
                    onClick={clearPurgeHistory}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition border ${
                      isLightMode
                        ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                        : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300'
                    }`}
                    title="Clear Purge Audit History"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                      isLightMode ? 'border-black/10 text-black/50' : 'border-white/10 text-white/40'
                    }`}>
                      <th className="pb-2 pl-2">Time</th>
                      <th className="pb-2">Initiator</th>
                      <th className="pb-2">Scope</th>
                      <th className="pb-2">Reach</th>
                      <th className="pb-2 pr-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {settings.purgeHistory.map((item) => (
                      <tr key={item.id} className={isLightMode ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.02]'}>
                        <td className="py-2.5 pl-2">
                          {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2.5">
                          <span className="flex items-center gap-1 font-sans">
                            {item.auto ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 font-mono">SYSTEM AUTO</span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-emerald-400" />
                                {item.username || 'admin'}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.scope === 'podcasts' 
                              ? 'bg-pink-500/20 text-pink-400'
                              : item.scope === 'visitor_ui'
                                ? 'bg-neon-purple/20 text-neon-purple'
                                : item.scope === 'audio_meta'
                                  ? 'bg-neon-blue/20 text-neon-blue'
                                  : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {item.scope || 'all'}
                          </span>
                        </td>
                        <td className="py-2.5 text-[10px] text-white/60">
                          {item.clientsNotified !== undefined ? `${item.clientsNotified} visitors` : 'Broadcasted'}
                        </td>
                        <td className="py-2.5 pr-2 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-sans font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Purged
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
