import React, { useEffect, useMemo, useState } from "react";
import { Clock, MessageSquare, RefreshCw, Save, Trash2 } from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { fetchAdmin } from "./adminApi";
import { useLogo } from "../../hooks/useLogo";

type ChatRoomSettings = {
  enabled: boolean;
  hours: number;
  lastRun: string;
  publicMessages: number;
  privateMessages: number;
};

const DEFAULT_SETTINGS: ChatRoomSettings = {
  enabled: false,
  hours: 24,
  lastRun: "",
  publicMessages: 0,
  privateMessages: 0,
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

export function AdminChatRoomSettings() {
  const { isLightMode } = useLogo();
  const [settings, setSettings] = useState<ChatRoomSettings>(DEFAULT_SETTINGS);
  const [enabled, setEnabled] = useState(false);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const { showAlert, showConfirm } = useModal();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/chat-room-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load chat room settings");

      const next = {
        ...DEFAULT_SETTINGS,
        ...data,
        hours: Number(data.hours) || DEFAULT_SETTINGS.hours,
      };
      setSettings(next);
      setEnabled(next.enabled);
      setHours(next.hours);
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to load chat room settings.", style: "danger" });
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

    const handleCountsUpdated = (counts: { publicMessages?: number; privateMessages?: number }) => {
      setSettings(prev => ({
        ...prev,
        publicMessages: counts.publicMessages ?? prev.publicMessages,
        privateMessages: counts.privateMessages ?? prev.privateMessages,
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

  const saveSettings = async () => {
    if (!Number.isInteger(hours) || hours < 1 || hours > 8760) {
      showAlert({ title: "Invalid Timer", message: "Choose a timer between 1 hour and 8760 hours.", style: "danger" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetchAdmin("/api/admin/chat-room-settings", {
        method: "PUT",
        body: { enabled, hours },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save chat room settings");

      showAlert({ title: "Saved", message: "Chat room auto-delete settings updated.", style: "success" });
      await loadSettings();
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message || "Failed to save chat room settings.", style: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const purgeNow = async () => {
    const confirmed = await showConfirm({
      title: "Delete Chat Room Data",
      message: "This will permanently delete all public chat messages and all private chat conversations. Chat user accounts will remain.",
      style: "danger",
      confirmText: "Delete All Chat Data",
    });
    if (!confirmed) return;

    setPurging(true);
    try {
      const res = await fetchAdmin("/api/admin/chat-room-settings/data", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete chat room data");

      showAlert({
        title: "Deleted",
        message: `Removed ${data.publicDeleted || 0} public and ${data.privateDeleted || 0} private messages.`,
        style: "success",
      });
      await loadSettings();
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message || "Failed to delete chat room data.", style: "danger" });
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 transition-colors ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <h3 className={`text-xl sm:text-2xl font-bold flex items-center gap-3 ${isLightMode ? 'text-black' : 'text-white'}`}>
          <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-neon-purple" />
          Chat Room Setting
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`border rounded-2xl p-5 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Public messages</p>
          <p className="text-3xl font-black mt-2 text-neon-purple">{settings.publicMessages}</p>
        </div>
        <div className={`border rounded-2xl p-5 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
          <p className={`text-[10px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Private messages</p>
          <p className="text-3xl font-black mt-2 text-neon-blue">{settings.privateMessages}</p>
        </div>
      </div>

      <div className={`border rounded-2xl p-6 space-y-8 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex-1">
            <h4 className={`font-bold uppercase tracking-widest text-sm flex items-center gap-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
              <Clock className="w-5 h-5 text-neon-purple" />
              Auto-delete timer
            </h4>
            <p className={`text-xs sm:text-sm mt-2 leading-relaxed ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Deletes all public and private chat conversations on the saved interval.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
            />
            <div className={`w-14 h-7 rounded-full transition-all peer-focus:outline-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neon-purple peer-checked:after:translate-x-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] ${
              isLightMode ? 'bg-black/10' : 'bg-white/10'
            }`} />
          </label>
        </div>

        <div className="space-y-4">
          <label className={`block text-[10px] uppercase font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Purge Interval</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIMER_PRESETS.map(preset => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setHours(preset.value)}
                className={`px-3 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
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
          <div className="pt-2 max-w-xs">
            <label className={`block text-[10px] uppercase mb-2 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Custom Hours</label>
            <input
              type="number"
              min={1}
              max={8760}
              value={hours}
              onChange={e => setHours(parseInt(e.target.value, 10) || 1)}
              className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`border rounded-xl p-4 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
            <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Last deletion</p>
            <p className={`mt-1.5 text-xs font-mono ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{lastRunLabel}</p>
          </div>
          <div className={`border rounded-xl p-4 transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/5' : 'bg-white/5 border-white/5'}`}>
            <p className={`text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Next deletion</p>
            <p className={`mt-1.5 text-xs font-mono ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{nextRunLabel}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t transition-colors border-dashed border-neon-purple/20">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving || loading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-neon-purple px-6 py-4 rounded-xl font-black uppercase tracking-widest text-white text-xs hover:bg-neon-blue transition-all disabled:opacity-50 shadow-lg shadow-neon-purple/20"
          >
            <Save className="w-4 h-4" />
            {saving ? "Updating" : "Save Interval"}
          </button>
          <button
            type="button"
            onClick={purgeNow}
            disabled={purging || loading}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 border ${
              isLightMode 
                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white' 
                : 'bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500 hover:text-white'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {purging ? "Purging..." : "Manual Purge"}
          </button>
        </div>
      </div>
    </div>
  );
}
