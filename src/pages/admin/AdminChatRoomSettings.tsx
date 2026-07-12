import React, { useEffect, useMemo, useState } from "react";
import { Clock, MessageSquare, RefreshCw, Save, Trash2 } from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { fetchAdmin } from "./adminApi";

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
    <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-neon-purple" />
          Chat Room Setting
        </h3>
        <button
          type="button"
          onClick={loadSettings}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-dark-bg/40 border border-white/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-white/40 font-bold">Public messages</p>
          <p className="text-3xl font-black mt-2 text-neon-purple">{settings.publicMessages}</p>
        </div>
        <div className="bg-dark-bg/40 border border-white/10 rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-white/40 font-bold">Private messages</p>
          <p className="text-3xl font-black mt-2 text-neon-blue">{settings.privateMessages}</p>
        </div>
      </div>

      <div className="bg-dark-bg/40 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
              <Clock className="w-5 h-5 text-neon-purple" />
              Auto-delete timer
            </h4>
            <p className="text-sm text-white/50 mt-2">Deletes all public and private chat conversations on the saved interval.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
            />
            <div className="w-14 h-7 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neon-purple" />
          </label>
        </div>

        <div>
          <label className="block text-xs uppercase mb-2 text-white/50 font-bold">Delete all chat data every</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIMER_PRESETS.map(preset => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setHours(preset.value)}
                className={`px-3 py-3 rounded-lg border text-xs font-black uppercase tracking-widest transition-colors ${
                  hours === preset.value
                    ? "bg-neon-purple text-white border-neon-purple"
                    : "bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-4 max-w-xs">
            <label className="block text-xs uppercase mb-2 text-white/50 font-bold">Custom hours</label>
            <input
              type="number"
              min={1}
              max={8760}
              value={hours}
              onChange={e => setHours(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 focus:border-neon-purple outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs uppercase tracking-widest text-white/40 font-bold">Last deletion</p>
            <p className="mt-2 text-white/80">{lastRunLabel}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs uppercase tracking-widest text-white/40 font-bold">Next deletion</p>
            <p className="mt-2 text-white/80">{nextRunLabel}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving || loading}
            className="inline-flex items-center justify-center gap-2 bg-neon-purple px-6 py-3 rounded-xl font-black uppercase tracking-widest text-white hover:bg-neon-blue transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving" : "Save Timer"}
          </button>
          <button
            type="button"
            onClick={purgeNow}
            disabled={purging || loading}
            className="inline-flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-red-300 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {purging ? "Deleting" : "Delete Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
