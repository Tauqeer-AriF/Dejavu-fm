import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  X,
  Settings,
  Sliders,
  Sparkles,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Radio,
  Cpu,
  Layers,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Clock,
  HardDrive
} from "lucide-react";
import { AIPromptPreset, AIStudioSettings } from "./types";
import { aiStudioApi } from "./aiStudioApi";
import { useAIStudioTheme } from "./themeContext";
import { useModal } from "../../../context/ModalContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  presets: AIPromptPreset[];
  onPresetsUpdated: () => void;
}

export const SettingsAndPresetsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  presets,
  onPresetsUpdated,
}) => {
  const { isLight } = useAIStudioTheme();
  const { showConfirm, showAlert } = useModal();
  const [activeTab, setActiveTab] = useState<"general" | "presets" | "prompt">("general");
  const [settings, setSettings] = useState<AIStudioSettings>({
    ai_studio_enabled: true,
    ai_gemini_model: "gemini-3.7-flash",
    ai_default_reel_duration: 30,
    ai_brand_handle: "@dejavufm",
    ai_brand_hashtag: "#DejavuFM #UKUnderground #DJSet #ElectronicMusic #RadioReels",
    ai_auto_process_on_show_end: false,
    ai_stream_recording_mode: "full_show",
    ai_full_stream_capture_mins: 60,
    ai_auto_delete_reels_enabled: false,
    ai_auto_delete_reels_hours: 48,
    ai_auto_delete_unapproved_only: true,
    ai_system_prompt: "",
    ai_custom_gemini_api_key: "",
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCheckingSchedule, setIsCheckingSchedule] = useState(false);
  const [scheduleCheckResult, setScheduleCheckResult] = useState<string | null>(null);

  const [isPurgingReels, setIsPurgingReels] = useState(false);
  const [purgeReelsResult, setPurgeReelsResult] = useState<string | null>(null);

  const [isCleaningDisk, setIsCleaningDisk] = useState(false);
  const [diskCleanResult, setDiskCleanResult] = useState<string | null>(null);
  const [cleanupAgeHours, setCleanupAgeHours] = useState<number>(24);

  const handleCleanDiskNow = async () => {
    const confirmed = await showConfirm({
      title: "Clean Temporary Files",
      message: `Clean orphaned raw audio buffers, FFmpeg temp render files, and clips older than ${cleanupAgeHours} hours from server storage?`,
      style: "danger",
      confirmText: `Clean Temp Files (> ${cleanupAgeHours}h)`,
      cancelText: "Cancel"
    });
    if (!confirmed) return;

    setIsCleaningDisk(true);
    setDiskCleanResult(null);
    try {
      const res = await aiStudioApi.cleanupDisk(cleanupAgeHours);
      setDiskCleanResult(`🧹 Cleaned ${res.deletedFilesCount} temporary file(s), freed ${res.freedMB} MB of disk space!`);
    } catch (e: any) {
      setDiskCleanResult(`Cleanup error: ${e.message}`);
    } finally {
      setIsCleaningDisk(false);
    }
  };

  const handlePurgeReelsNow = async () => {
    const hours = settings.ai_auto_delete_reels_hours || 48;
    const confirmed = await showConfirm({
      title: "Purge Expired Reels",
      message: `Are you sure you want to delete reels older than ${hours} hours? This will delete media files from storage and remove database records.`,
      style: "danger",
      confirmText: `Purge Reels > ${hours}h`,
      cancelText: "Cancel"
    });
    if (!confirmed) return;

    setIsPurgingReels(true);
    setPurgeReelsResult(null);
    try {
      const res = await aiStudioApi.cleanupReels(
        settings.ai_auto_delete_reels_hours,
        settings.ai_auto_delete_unapproved_only
      );
      setPurgeReelsResult(`🗑️ ${res.message}`);
    } catch (e: any) {
      setPurgeReelsResult(`Cleanup error: ${e.message}`);
    } finally {
      setIsPurgingReels(false);
    }
  };

  const handleCheckScheduleNow = async () => {
    setIsCheckingSchedule(true);
    setScheduleCheckResult(null);
    try {
      const res = await aiStudioApi.triggerScheduleCheck();
      if (res.triggeredCount > 0) {
        setScheduleCheckResult(`🚀 Auto-triggered ${res.triggeredCount} job(s) creating 3-5 reels for completed show(s)!`);
      } else {
        setScheduleCheckResult(`Schedule listener checked: ${res.messages[0] || 'No new concluded shows pending processing.'}`);
      }
    } catch (e: any) {
      setScheduleCheckResult(`Schedule check error: ${e.message}`);
    } finally {
      setIsCheckingSchedule(false);
    }
  };

  // New preset form
  const [editingPreset, setEditingPreset] = useState<Partial<AIPromptPreset> | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const data = await aiStudioApi.getSettings();
      setSettings(data);
    } catch (e) {
      console.warn("Failed to load settings:", e);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await aiStudioApi.saveSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      showAlert({ title: "Error", message: e.message || "Failed to save settings", style: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreset = async (preset: Partial<AIPromptPreset>) => {
    if (!preset.name || !preset.prompt_instructions) {
      showAlert({ title: "Validation Error", message: "Please provide a preset name and instructions.", style: "danger" });
      return;
    }
    try {
      await aiStudioApi.savePreset(preset);
      setEditingPreset(null);
      onPresetsUpdated();
    } catch (e: any) {
      showAlert({ title: "Error", message: e.message || "Failed to save preset", style: "danger" });
    }
  };

  const handleDeletePreset = async (id: string) => {
    const confirmed = await showConfirm({
      title: "Delete Preset",
      message: "Are you sure you want to delete this prompt preset?",
      style: "danger",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!confirmed) return;

    try {
      await aiStudioApi.deletePreset(id);
      onPresetsUpdated();
    } catch (e: any) {
      showAlert({ title: "Error", message: e.message || "Failed to delete preset", style: "danger" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-3xl rounded-3xl border p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-[#0D0F1D] border-white/20 text-white"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3.5 ${
          isLight ? "border-slate-200" : "border-white/10"
        }`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-neon-purple flex items-center justify-center shadow-lg shadow-neon-purple/30 shrink-0">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className={`text-base sm:text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                AI Social Studio Configuration
              </h3>
              <p className={`text-[11px] sm:text-xs font-mono ${isLight ? "text-slate-500" : "text-white/50"}`}>
                Gemini model settings & presets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl transition shrink-0 ${
              isLight
                ? "text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200"
                : "text-white/50 hover:text-white bg-white/5 hover:bg-white/10"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex items-center gap-2 border-b pb-3 ${isLight ? "border-slate-200" : "border-white/10"}`}>
          {[
            { id: "general", label: "Model & Branding", icon: Cpu },
            { id: "presets", label: "Prompt Presets", icon: Layers },
            { id: "prompt", label: "System Prompt Template", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  active
                    ? "bg-neon-purple text-white shadow-md shadow-neon-purple/20"
                    : isLight
                    ? "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/90"
                    : "bg-black/30 text-white/60 hover:text-white border border-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {saveSuccess && (
          <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            isLight
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
          }`}>
            <CheckCircle2 className="w-4 h-4" /> Settings updated successfully!
          </div>
        )}

        {/* Tab 1: General & Branding */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-[11px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/60"
                }`}>
                  Gemini AI Model
                </label>
                <select
                  value={settings.ai_gemini_model}
                  onChange={(e) => setSettings({ ...settings, ai_gemini_model: e.target.value })}
                  className={`w-full mt-1.5 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-neon-purple border transition ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-black/50 border-white/10 text-white"
                  }`}
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Recommended - Ultra-Fast Multimodal & Music Highlight Analysis)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Multimodal Reasoning & Complex Acoustic Analysis)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Lightweight & Low Latency)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={`text-[11px] font-mono uppercase font-bold ${
                    isLight ? "text-slate-600" : "text-white/60"
                  }`}>
                    Target Reel Length
                  </label>
                  <span className={`text-[11px] font-mono font-bold ${isLight ? "text-neon-purple" : "text-cyan-400"}`}>
                    {settings.ai_default_reel_duration}s per Reel
                  </span>
                </div>
                
                {/* Duration Preset Toggles */}
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {[
                    { label: "15s (Short)", val: 15 },
                    { label: "30s (Std)", val: 30 },
                    { label: "45s (Ext)", val: 45 },
                    { label: "60s (Max)", val: 60 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setSettings({ ...settings, ai_default_reel_duration: preset.val })}
                      className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold text-center transition ${
                        settings.ai_default_reel_duration === preset.val
                          ? isLight
                            ? "bg-neon-purple/10 border-neon-purple text-neon-purple shadow-sm font-black"
                            : "bg-neon-purple/30 border-neon-purple text-white shadow-md shadow-neon-purple/20 font-black"
                          : isLight
                          ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                          : "bg-black/50 border-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-white/40"}`}>
                    Custom length (10-90s):
                  </span>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={settings.ai_default_reel_duration}
                    onChange={(e) =>
                      setSettings({ ...settings, ai_default_reel_duration: Math.max(10, Math.min(120, parseInt(e.target.value) || 30)) })
                    }
                    className={`w-20 px-2.5 py-1 rounded-lg text-xs font-mono focus:outline-none focus:border-neon-purple border transition ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900"
                        : "bg-black/50 border-white/10 text-white"
                    }`}
                  />
                  <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-white/30"}`}>
                    seconds
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-[11px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/60"
                }`}>
                  Station Brand Handle
                </label>
                <input
                  type="text"
                  value={settings.ai_brand_handle}
                  onChange={(e) => setSettings({ ...settings, ai_brand_handle: e.target.value })}
                  placeholder="@dejavufm"
                  className={`w-full mt-1.5 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-neon-purple border transition ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-black/50 border-white/10 text-white placeholder-white/30"
                  }`}
                />
              </div>

              <div>
                <label className={`text-[11px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/60"
                }`}>
                  Default Export Hashtags
                </label>
                <input
                  type="text"
                  value={settings.ai_brand_hashtag}
                  onChange={(e) => setSettings({ ...settings, ai_brand_hashtag: e.target.value })}
                  className={`w-full mt-1.5 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-neon-purple border transition ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-black/50 border-white/10 text-white placeholder-white/30"
                  }`}
                />
              </div>
            </div>

            {/* Manual Gemini API Key Override Section */}
            <div className={`p-4 rounded-2xl border space-y-3 relative overflow-hidden transition-colors ${
              isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-black/60 border-white/15"
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${
                isLight ? "border-slate-200" : "border-white/10"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isLight ? "bg-neon-purple/10 text-neon-purple" : "bg-neon-purple/20 border border-neon-purple/30 text-neon-purple"
                  }`}>
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold flex items-center gap-2 ${
                      isLight ? "text-slate-900" : "text-white"
                    }`}>
                      Gemini API Key (Manual Override)
                    </h4>
                    <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-white/50"}`}>
                      Optional custom key for Gemini highlight analysis & viral clip generation
                    </p>
                  </div>
                </div>

                {/* Key Status Indicator */}
                <div>
                  {settings.ai_custom_gemini_api_key?.trim() ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                      isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    }`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Custom Key Active
                    </span>
                  ) : settings.has_system_gemini_key ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                      isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                    }`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      System Environment Key Active
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                      isLight ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Fallback Heuristic Mode
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.ai_custom_gemini_api_key || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, ai_custom_gemini_api_key: e.target.value })
                    }
                    placeholder="Enter manual Gemini API key (e.g. AIzaSy...)"
                    className={`w-full px-3.5 py-2.5 pr-20 rounded-xl text-xs font-mono focus:outline-none focus:border-neon-purple transition border ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                        : "bg-black/70 border-white/15 text-white placeholder-white/30"
                    }`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {settings.ai_custom_gemini_api_key && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, ai_custom_gemini_api_key: "" })}
                        className={`px-2 py-1 text-[10px] font-mono rounded transition ${
                          isLight
                            ? "text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200"
                            : "text-white/50 hover:text-white bg-white/5 hover:bg-white/10"
                        }`}
                        title="Clear custom key"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className={`p-1.5 rounded-lg transition ${
                        isLight ? "text-slate-500 hover:text-slate-900" : "text-white/50 hover:text-white"
                      }`}
                      title={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-500" : "text-white/40"}`}>
                  Enter your Google AI Studio API key if you want to use your own quota or specific credentials. If left empty, the server automatically uses the pre-configured system key.
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border space-y-4 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Auto-Process Completed DJ Shows
                    </h4>
                    {settings.ai_auto_process_on_show_end && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Schedule Listener Active
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-500" : "text-white/50"}`}>
                    AI Studio continuously listens to the DejavuFM broadcast schedule. When a scheduled show concludes, it automatically creates <strong>3 to 5 viral social reels</strong> from the broadcast stream!
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ai_auto_process_on_show_end}
                  onChange={(e) => setSettings({ ...settings, ai_auto_process_on_show_end: e.target.checked })}
                  className="w-5 h-5 accent-neon-purple rounded cursor-pointer mt-0.5"
                />
              </div>

              {settings.ai_auto_process_on_show_end && (
                <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                  isLight ? "bg-white border-slate-200" : "bg-black/40 border-white/10"
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`text-[11px] font-mono ${isLight ? "text-slate-600" : "text-white/60"}`}>
                      ⚡ Automatic schedule monitor checks broadcast slots every 60s
                    </span>
                    <button
                      type="button"
                      onClick={handleCheckScheduleNow}
                      disabled={isCheckingSchedule}
                      className="px-3 py-1 bg-neon-purple hover:bg-neon-purple/90 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5"
                    >
                      {isCheckingSchedule ? "Checking Schedule..." : "Run Schedule Check Now"}
                    </button>
                  </div>
                  {scheduleCheckResult && (
                    <div className="p-2 rounded-lg bg-neon-purple/10 border border-neon-purple/30 text-[11px] font-mono text-cyan-300">
                      {scheduleCheckResult}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Full Stream Recording Mechanism Settings */}
            <div className={`p-4 rounded-2xl border space-y-4 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <h4 className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                    Live Stream Recording Mechanism & Coverage
                  </h4>
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-500" : "text-white/50"}`}>
                  Choose how AI Studio captures live web stream audio for scheduled DJ shows.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  (settings.ai_stream_recording_mode || 'full_show') === 'full_show'
                    ? (isLight ? "bg-purple-50/80 border-purple-300" : "bg-purple-950/30 border-purple-500/50")
                    : (isLight ? "bg-white border-slate-200 hover:border-slate-300" : "bg-black/20 border-white/10 hover:border-white/20")
                }`}>
                  <input
                    type="radio"
                    name="stream_recording_mode"
                    value="full_show"
                    checked={(settings.ai_stream_recording_mode || 'full_show') === 'full_show'}
                    onChange={() => setSettings({ ...settings, ai_stream_recording_mode: 'full_show' })}
                    className="mt-0.5 accent-neon-purple"
                  />
                  <div className="space-y-1">
                    <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Full Broadcast Recording (Recommended)
                    </span>
                    <p className={`text-[10px] leading-normal ${isLight ? "text-slate-500" : "text-white/50"}`}>
                      Records full show audio (e.g. 30–120 mins). Waveform analysis scans every minute of the broadcast to extract top drops & mic moments from anywhere in the show.
                    </p>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  settings.ai_stream_recording_mode === 'snippet'
                    ? (isLight ? "bg-purple-50/80 border-purple-300" : "bg-purple-950/30 border-purple-500/50")
                    : (isLight ? "bg-white border-slate-200 hover:border-slate-300" : "bg-black/20 border-white/10 hover:border-white/20")
                }`}>
                  <input
                    type="radio"
                    name="stream_recording_mode"
                    value="snippet"
                    checked={settings.ai_stream_recording_mode === 'snippet'}
                    onChange={() => setSettings({ ...settings, ai_stream_recording_mode: 'snippet' })}
                    className="mt-0.5 accent-neon-purple"
                  />
                  <div className="space-y-1">
                    <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Quick 2-Minute Highlight Snippet
                    </span>
                    <p className={`text-[10px] leading-normal ${isLight ? "text-slate-500" : "text-white/50"}`}>
                      Captures a short 2–3 minute audio buffer at show end for rapid, low-bandwidth reel generation.
                    </p>
                  </div>
                </label>
              </div>

              {(settings.ai_stream_recording_mode || 'full_show') === 'full_show' && (
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="space-y-0.5">
                    <label className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-white/90"}`}>
                      Max Stream Capture Limit
                    </label>
                    <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/40"}`}>
                      Maximum audio duration in minutes to record per live show job.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={15}
                      max={360}
                      step={15}
                      value={settings.ai_full_stream_capture_mins || 60}
                      onChange={(e) => setSettings({ ...settings, ai_full_stream_capture_mins: Math.max(15, Math.min(360, parseInt(e.target.value, 10) || 60)) })}
                      className={`w-20 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold text-center focus:outline-none focus:border-neon-purple ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-black/60 border-white/20 text-white"
                      }`}
                    />
                    <span className={`text-xs font-mono ${isLight ? "text-slate-600" : "text-white/60"}`}>mins</span>
                  </div>
                </div>
              )}
            </div>

            {/* Disk Storage & Temporary Files Cleanup */}
            <div className={`p-4 rounded-2xl border space-y-4 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    <h4 className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Temporary Files & Cache Storage
                    </h4>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-500" : "text-white/50"}`}>
                    Clear orphaned audio stream captures, temporary FFmpeg render chunks, and cached waveforms from disk storage.
                  </p>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs space-y-3 ${
                isLight ? "bg-white border-slate-200" : "bg-black/40 border-white/10"
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono ${isLight ? "text-slate-600" : "text-white/60"}`}>
                      Delete temp files older than:
                    </span>
                    <select
                      value={cleanupAgeHours}
                      onChange={(e) => setCleanupAgeHours(parseInt(e.target.value, 10))}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:border-cyan-400 ${
                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-black/60 border-white/20 text-white"
                      }`}
                    >
                      <option value={1}>1 Hour (Aggressive)</option>
                      <option value={6}>6 Hours</option>
                      <option value={12}>12 Hours</option>
                      <option value={24}>24 Hours (1 Day)</option>
                      <option value={48}>48 Hours (2 Days)</option>
                      <option value={168}>7 Days</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleCleanDiskNow}
                    disabled={isCleaningDisk}
                    className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black rounded-lg text-[11px] transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isCleaningDisk ? "Cleaning Disk..." : "Clean Temporary Files"}
                  </button>
                </div>

                {diskCleanResult && (
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                    {diskCleanResult}
                  </div>
                )}
              </div>
            </div>

            {/* Automated Reel Retention & Expiry Policy */}
            <div className={`p-4 rounded-2xl border space-y-4 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500" />
                    <h4 className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Automated Reel Retention & Custom Expiry Policy
                    </h4>
                    {settings.ai_auto_delete_reels_enabled && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                        Auto-Pruning Active ({settings.ai_auto_delete_reels_hours}h)
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-500" : "text-white/50"}`}>
                    Automatically delete generated social reels after a custom duration to optimize server storage and database health.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ai_auto_delete_reels_enabled}
                  onChange={(e) => setSettings({ ...settings, ai_auto_delete_reels_enabled: e.target.checked })}
                  className="w-5 h-5 accent-rose-500 rounded cursor-pointer mt-0.5"
                />
              </div>

              {settings.ai_auto_delete_reels_enabled && (
                <div className={`p-3.5 rounded-xl border text-xs space-y-3 ${
                  isLight ? "bg-white border-slate-200" : "bg-black/40 border-white/10"
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-[11px] font-mono uppercase font-bold ${
                        isLight ? "text-slate-700" : "text-white/70"
                      }`}>
                        Retention Time Window
                      </label>
                      <span className="text-[11px] font-mono font-bold text-rose-400">
                        Delete after {settings.ai_auto_delete_reels_hours} hours ({
                          settings.ai_auto_delete_reels_hours >= 24
                            ? `${(settings.ai_auto_delete_reels_hours / 24).toFixed(1)} days`
                            : `${settings.ai_auto_delete_reels_hours} hrs`
                        })
                      </span>
                    </div>

                    {/* Quick presets for retention period */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { label: "12 Hours", val: 12 },
                        { label: "24h (1 Day)", val: 24 },
                        { label: "48h (2 Days)", val: 48 },
                        { label: "72h (3 Days)", val: 72 },
                        { label: "7 Days", val: 168 },
                        { label: "14 Days", val: 336 },
                        { label: "30 Days", val: 720 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setSettings({ ...settings, ai_auto_delete_reels_hours: p.val })}
                          className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold text-center transition ${
                            settings.ai_auto_delete_reels_hours === p.val
                              ? "bg-rose-500/20 border-rose-500 text-rose-300 font-black shadow-sm"
                              : isLight
                              ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                              : "bg-black/30 border-white/10 text-white/60 hover:text-white"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Hours Input */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className={`text-[11px] font-mono ${isLight ? "text-slate-500" : "text-white/50"}`}>
                        Custom Retention Hours:
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={8760}
                        value={settings.ai_auto_delete_reels_hours}
                        onChange={(e) => setSettings({
                          ...settings,
                          ai_auto_delete_reels_hours: Math.max(1, parseInt(e.target.value) || 24)
                        })}
                        className={`w-24 px-2.5 py-1 rounded-lg text-xs font-mono focus:outline-none focus:border-rose-500 border transition ${
                          isLight
                            ? "bg-white border-slate-300 text-slate-900"
                            : "bg-black/50 border-white/10 text-white"
                        }`}
                      />
                      <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-white/40"}`}>
                        hours
                      </span>
                    </div>
                  </div>

                  {/* Filter checkbox: Unapproved vs All */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="unapproved_only_check"
                      checked={settings.ai_auto_delete_unapproved_only}
                      onChange={(e) => setSettings({ ...settings, ai_auto_delete_unapproved_only: e.target.checked })}
                      className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                    />
                    <label htmlFor="unapproved_only_check" className={`text-[11px] font-medium cursor-pointer ${
                      isLight ? "text-slate-700" : "text-white/80"
                    }`}>
                      Only delete <strong>Pending Review</strong> & <strong>Rejected</strong> reels (Preserve Approved, Exported & Published reels)
                    </label>
                  </div>

                  {/* Manual trigger button */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-2">
                    <span className={`text-[10px] font-mono ${isLight ? "text-slate-500" : "text-white/50"}`}>
                      Runs automatically every 4 hours via background service
                    </span>
                    <button
                      type="button"
                      onClick={handlePurgeReelsNow}
                      disabled={isPurgingReels}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isPurgingReels ? "Purging Expired Reels..." : `Purge Expired Reels Now`}
                    </button>
                  </div>

                  {purgeReelsResult && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] font-mono text-rose-300">
                      {purgeReelsResult}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Prompt Presets */}
        {activeTab === "presets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono uppercase font-bold ${
                isLight ? "text-slate-700" : "text-white/60"
              }`}>
                Manage AI Analysis Presets
              </span>
              <button
                onClick={() =>
                  setEditingPreset({
                    name: "",
                    category: "Drop",
                    description: "",
                    prompt_instructions: "",
                    target_duration: 30,
                    is_default: 0,
                  })
                }
                className="px-3 py-1.5 bg-neon-purple hover:bg-neon-purple/90 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Preset
              </button>
            </div>

            {/* Presets List */}
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 transition ${
                    isLight
                      ? "bg-slate-50 border-slate-200"
                      : "bg-black/40 border-white/10"
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{p.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                        isLight ? "bg-cyan-50 text-cyan-800 border border-cyan-200" : "bg-white/10 text-neon-blue"
                      }`}>
                        {p.category}
                      </span>
                      {p.is_default === 1 && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          isLight ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/20 text-emerald-300"
                        }`}>
                          Default
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isLight ? "text-slate-600" : "text-white/60"}`}>{p.description}</p>
                    <p className={`text-[11px] font-mono line-clamp-1 ${
                      isLight ? "text-slate-400" : "text-white/40"
                    }`}>
                      {p.prompt_instructions}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingPreset(p)}
                      className={`p-1.5 rounded-lg transition text-xs font-bold ${
                        isLight
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                          : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                      }`}
                    >
                      Edit
                    </button>
                    {p.is_default !== 1 && (
                      <button
                        onClick={() => handleDeletePreset(p.id)}
                        className={`p-1.5 rounded-lg transition ${
                          isLight
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700"
                            : "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Edit / Add Preset Form Modal */}
            {editingPreset && (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight
                  ? "bg-white border-neon-purple shadow-lg"
                  : "bg-black/70 border-neon-purple/40"
              }`}>
                <h4 className="text-xs font-bold text-neon-purple uppercase font-mono">
                  {editingPreset.id ? "Edit Preset" : "New Prompt Preset"}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] font-mono uppercase font-bold ${
                      isLight ? "text-slate-600" : "text-white/50"
                    }`}>
                      Preset Name
                    </label>
                    <input
                      type="text"
                      value={editingPreset.name || ""}
                      onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                      placeholder="e.g. Peak Time Drops"
                      className={`w-full mt-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-neon-purple border transition ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900"
                          : "bg-black/60 border-white/10 text-white"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] font-mono uppercase font-bold ${
                      isLight ? "text-slate-600" : "text-white/50"
                    }`}>
                      Category Tag
                    </label>
                    <input
                      type="text"
                      value={editingPreset.category || "Drop"}
                      onChange={(e) => setEditingPreset({ ...editingPreset, category: e.target.value })}
                      placeholder="Drop, Transition, Banter, Shoutout"
                      className={`w-full mt-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-neon-purple border transition ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900"
                          : "bg-black/60 border-white/10 text-white"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-[10px] font-mono uppercase font-bold ${
                    isLight ? "text-slate-600" : "text-white/50"
                  }`}>
                    Prompt Instructions for Gemini
                  </label>
                  <textarea
                    rows={3}
                    value={editingPreset.prompt_instructions || ""}
                    onChange={(e) =>
                      setEditingPreset({ ...editingPreset, prompt_instructions: e.target.value })
                    }
                    placeholder="Instructions for Gemini model analysis..."
                    className={`w-full mt-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-neon-purple resize-none border transition ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-black/60 border-white/10 text-white"
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingPreset(null)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      isLight
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSavePreset(editingPreset)}
                    className="px-4 py-1 bg-neon-purple text-white rounded-lg text-xs font-bold"
                  >
                    Save Preset
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: System Prompt Template */}
        {activeTab === "prompt" && (
          <div className="space-y-3">
            <p className={`text-xs ${isLight ? "text-slate-600" : "text-white/60"}`}>
              Customize the overarching prompt guidance sent to Gemini during multi-clip timestamp detection.
            </p>
            <textarea
              rows={8}
              value={settings.ai_system_prompt}
              onChange={(e) => setSettings({ ...settings, ai_system_prompt: e.target.value })}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-mono focus:outline-none focus:border-neon-purple resize-none border transition ${
                isLight
                  ? "bg-slate-900 text-emerald-300 border-slate-800"
                  : "bg-black/50 border-white/10 text-emerald-300"
              }`}
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className={`border-t pt-5 flex items-center justify-end gap-3 ${
          isLight ? "border-slate-200" : "border-white/10"
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition border ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                : "border-white/10 text-white/70 hover:text-white"
            }`}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-neon-purple hover:bg-neon-purple/90 text-white text-xs font-bold shadow-lg shadow-neon-purple/30 transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save AI Settings"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
