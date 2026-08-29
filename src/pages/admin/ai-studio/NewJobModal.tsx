import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Radio,
  Upload,
  Layers,
  Calendar,
  User,
  Clock,
  Sliders,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { AIPromptPreset, SourceType } from "./types";
import { aiStudioApi } from "./aiStudioApi";
import { fetchAdmin } from "../adminApi";
import { useAIStudioTheme } from "./themeContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: () => void;
  presets: AIPromptPreset[];
}

export const NewJobModal: React.FC<Props> = ({ isOpen, onClose, onJobCreated, presets }) => {
  const { isLight } = useAIStudioTheme();
  const [sourceType, setSourceType] = useState<SourceType>("schedule_slot");
  const [showName, setShowName] = useState("");
  const [djName, setDjName] = useState("");
  const [djId, setDjId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("neon_cyber");
  const [selectedAspect, setSelectedAspect] = useState<string>("9:16");
  const [targetReelsCount, setTargetReelsCount] = useState<number>(3);
  const [durationSeconds, setDurationSeconds] = useState<number>(7200); // Default to 2 hours (7200s) for standard broadcasts

  // Station DJs and Schedule
  const [djsList, setDjsList] = useState<any[]>([]);
  const [scheduleList, setScheduleList] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDjsAndSchedule();
      if (presets.length > 0 && !selectedPresetId) {
        const defaultP = presets.find((p) => p.is_default === 1) || presets[0];
        setSelectedPresetId(defaultP.id);
      }
    }
  }, [isOpen, presets]);

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const loadDjsAndSchedule = async () => {
    try {
      const djRes = await fetchAdmin("/api/djs");
      if (djRes.ok) {
        const djs = await djRes.json();
        setDjsList(Array.isArray(djs) ? djs : []);
      }
      const schedRes = await fetch("/api/public/schedule");
      if (schedRes.ok) {
        const sched = await schedRes.json();
        const list = Array.isArray(sched) ? sched : [];
        setScheduleList(list);

        // Auto-select first schedule slot if show name isn't set yet
        if (list.length > 0 && !showName) {
          const firstSlot = list[0];
          setShowName(firstSlot.show_name || "DJ Show");
          setDjName(firstSlot.dj_name || "Resident DJ");
          setDjId(firstSlot.dj_id || "");
          if (firstSlot.start_time && firstSlot.end_time) {
            try {
              const [sh, sm] = firstSlot.start_time.split(":").map(Number);
              const [eh, em] = firstSlot.end_time.split(":").map(Number);
              let startMins = (sh || 0) * 60 + (sm || 0);
              let endMins = (eh || 0) * 60 + (em || 0);
              if (endMins <= startMins) endMins += 24 * 60;
              const showSecs = (endMins - startMins) * 60;
              if (showSecs >= 300) setDurationSeconds(showSecs);
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load DJs / schedule:", e);
    }
  };

  const handleSelectScheduleSlot = (slotId: string) => {
    const slot = scheduleList.find((s) => String(s.id) === slotId);
    if (slot) {
      setShowName(slot.show_name || "DJ Show");
      setDjName(slot.dj_name || slot.dj?.name || "Resident DJ");
      setDjId(slot.dj_id || "");

      // Auto-calculate exact show duration from start_time and end_time
      if (slot.start_time && slot.end_time) {
        try {
          const [sh, sm] = slot.start_time.split(":").map(Number);
          const [eh, em] = slot.end_time.split(":").map(Number);
          let startMins = (sh || 0) * 60 + (sm || 0);
          let endMins = (eh || 0) * 60 + (em || 0);
          if (endMins <= startMins) endMins += 24 * 60; // Overnight broadcast
          const showSecs = (endMins - startMins) * 60;
          if (showSecs >= 300) {
            setDurationSeconds(showSecs);
          }
        } catch (e) {}
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMsg(null);
      const res = await aiStudioApi.uploadSourceMedia(file);
      setUploadedFileUrl(res.url);
      setUploadedFileName(file.name);
      setSourceUrl(res.url);
      if (!showName) {
        setShowName(file.name.replace(/\.[^/.]+$/, ""));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload audio/video file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const finalShowName = showName.trim() || "DejavuFM Studio Show";
    const finalDjName = djName.trim() || "Station DJ";

    try {
      setIsSubmitting(true);
      await aiStudioApi.createJob({
        show_name: finalShowName,
        dj_name: finalDjName,
        dj_id: djId || undefined,
        source_type: sourceType,
        source_url: sourceUrl || undefined,
        custom_prompt: customPrompt || undefined,
        preset_id: selectedPresetId || undefined,
        template: selectedTemplate,
        aspect_ratio: selectedAspect,
        target_reels_count: targetReelsCount,
        duration_seconds: durationSeconds,
      });

      onJobCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create processing job");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-2xl rounded-3xl border p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-[#0D0F1D] border-white/20 text-white"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3.5 ${isLight ? "border-slate-200" : "border-white/10"}`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-neon-purple flex items-center justify-center shadow-lg shadow-neon-purple/30 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className={`text-base sm:text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Generate Social Reels with AI
              </h3>
              <p className={`text-[11px] sm:text-xs font-mono ${isLight ? "text-slate-500" : "text-white/50"}`}>
                Analyze DJ shows & generate 9:16 clips
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

        {errorMsg && (
          <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
            isLight ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-red-500/20 border-red-500/30 text-red-300"
          }`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Source Selection Tabs */}
          <div>
            <label className={`text-xs font-mono uppercase font-bold mb-2 block ${
              isLight ? "text-slate-700" : "text-white/60"
            }`}>
              1. Select Audio / Video Source
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "schedule_slot", label: "Completed Show", icon: Calendar },
                { id: "live_stream", label: "Live Radio Stream", icon: Radio },
                { id: "upload", label: "Upload DJ Set", icon: Upload },
                { id: "stream_url", label: "Custom Stream URL", icon: Layers },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = sourceType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceType(tab.id as SourceType)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-2 ${
                      active
                        ? isLight
                          ? "bg-neon-purple/10 border-neon-purple text-neon-purple shadow-sm font-bold"
                          : "bg-neon-purple/20 border-neon-purple text-white shadow-md shadow-neon-purple/20 font-bold"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300"
                        : "bg-black/30 border-white/10 text-white/60 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? "text-neon-purple" : isLight ? "text-slate-400" : "text-white/40"}`} />
                    <span className="text-xs font-bold leading-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Source Inputs */}
          {sourceType === "schedule_slot" && (
            <div className={`space-y-3 p-4 rounded-2xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
            }`}>
              <label className={`text-xs font-mono uppercase font-bold block ${
                isLight ? "text-slate-700" : "text-white/60"
              }`}>
                Pick Show from Schedule
              </label>
              <select
                onChange={(e) => handleSelectScheduleSlot(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple border transition ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-900"
                    : "bg-black/60 border-white/10 text-white"
                }`}
              >
                <option value="">-- Choose Show or DJ Schedule Slot --</option>
                {scheduleList.map((slot) => {
                  const dayLabel = DAYS[slot.day_of_week] !== undefined ? `[${DAYS[slot.day_of_week]}] ` : "";
                  const timeLabel = slot.start_time && slot.end_time ? ` (${slot.start_time} - ${slot.end_time})` : slot.start_time ? ` (${slot.start_time})` : "";
                  return (
                    <option key={slot.id} value={slot.id}>
                      {dayLabel}{slot.show_name} — {slot.dj_name || "Resident DJ"}{timeLabel}
                    </option>
                  );
                })}
              </select>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className={`text-[10px] font-mono uppercase font-bold ${
                    isLight ? "text-slate-600" : "text-white/50"
                  }`}>
                    Show Title
                  </label>
                  <input
                    type="text"
                    value={showName}
                    onChange={(e) => setShowName(e.target.value)}
                    placeholder="e.g. Underground Vibes"
                    className={`w-full mt-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple border transition ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                        : "bg-black/50 border-white/10 text-white placeholder-white/30"
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-[10px] font-mono uppercase font-bold ${
                    isLight ? "text-slate-600" : "text-white/50"
                  }`}>
                    DJ Name
                  </label>
                  <input
                    type="text"
                    value={djName}
                    onChange={(e) => setDjName(e.target.value)}
                    placeholder="e.g. DJ Pulse"
                    className={`w-full mt-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple border transition ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                        : "bg-black/50 border-white/10 text-white placeholder-white/30"
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {sourceType === "live_stream" && (
            <div className={`space-y-3 p-4 rounded-2xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
            }`}>
              <div className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between flex-wrap gap-2 ${
                isLight ? "bg-white border-slate-200 text-slate-700" : "bg-black/40 border-white/10 text-cyan-300"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="font-bold">Connected Station Live Stream:</span>
                </div>
                <span className="font-bold text-neon-purple truncate max-w-xs">
                  {sourceUrl || "https://dejavufm.radioca.st/;"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[10px] font-mono uppercase font-bold ${
                    isLight ? "text-slate-600" : "text-white/50"
                  }`}>
                    Show / Broadcast Title
                  </label>
                  <input
                    type="text"
                    value={showName}
                    onChange={(e) => setShowName(e.target.value)}
                    placeholder="Live Radio Broadcast"
                    className={`w-full mt-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple border transition ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                        : "bg-black/50 border-white/10 text-white placeholder-white/30"
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-[10px] font-mono uppercase font-bold ${
                    isLight ? "text-slate-600" : "text-white/50"
                  }`}>
                    DJ on Air
                  </label>
                  <input
                    type="text"
                    value={djName}
                    onChange={(e) => setDjName(e.target.value)}
                    placeholder="Live On Air DJ"
                    className={`w-full mt-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple border transition ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                        : "bg-black/50 border-white/10 text-white placeholder-white/30"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/50"
                }`}>
                  Custom Stream URL Override (Optional)
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Leave empty to use station default (https://dejavufm.radioca.st/;)"
                  className={`w-full mt-1 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-neon-purple border transition ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-black/50 border-white/10 text-white placeholder-white/30"
                  }`}
                />
              </div>
            </div>
          )}

          {sourceType === "upload" && (
            <div className={`space-y-3 p-4 rounded-2xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
            }`}>
              <label className={`text-xs font-mono uppercase font-bold block ${
                isLight ? "text-slate-700" : "text-white/60"
              }`}>
                Upload Audio / Video File (MP3, WAV, MP4, AAC)
              </label>
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                className={`w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-neon-purple file:text-white hover:file:bg-neon-purple/90 cursor-pointer ${
                  isLight ? "text-slate-700" : "text-white/70"
                }`}
              />
              {isUploading && (
                <div className="text-xs font-mono text-cyan-600 dark:text-neon-blue flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Uploading media to station storage...
                </div>
              )}
              {uploadedFileName && (
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Ready: {uploadedFileName}
                </div>
              )}
            </div>
          )}

          {sourceType === "stream_url" && (
            <div className={`space-y-3 p-4 rounded-2xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
            }`}>
              <div>
                <label className={`text-[10px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/50"
                }`}>
                  Custom Stream or Podcast Audio URL
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full mt-1 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-neon-purple border transition ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-black/50 border-white/10 text-white placeholder-white/30"
                  }`}
                />
              </div>
            </div>
          )}

          {/* AI Configuration Section */}
          <div className="space-y-4">
            <label className={`text-xs font-mono uppercase font-bold block ${
              isLight ? "text-slate-700" : "text-white/60"
            }`}>
              2. AI Reel Generation Recipe
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-[10px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/50"
                }`}>
                  Prompt Preset
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className={`w-full mt-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple border transition ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-black/50 border-white/10 text-white"
                  }`}
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-[10px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/50"
                }`}>
                  Number of Reels to Generate
                </label>
                <select
                  value={targetReelsCount}
                  onChange={(e) => setTargetReelsCount(parseInt(e.target.value))}
                  className={`w-full mt-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple border transition ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-black/50 border-white/10 text-white"
                  }`}
                >
                  <option value={1}>1 Reel (Top Highlight)</option>
                  <option value={2}>2 Reels</option>
                  <option value={3}>3 Reels (Recommended)</option>
                  <option value={4}>4 Reels</option>
                  <option value={5}>5 Reels</option>
                  <option value={6}>6 Reels (Deep Analysis)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-[10px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/50"
                }`}>
                  Visualizer Theme Style
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className={`w-full mt-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple border transition ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-black/50 border-white/10 text-white"
                  }`}
                >
                  <option value="gold_luxury">24K Gold Record (Gold / Diamond)</option>
                  <option value="retro_vinyl">Retro Vinyl (Amber / Mahogany)</option>
                  <option value="neon_cyber">Neon Cyber (Purple / Cyan)</option>
                  <option value="minimal_studio">Minimal Studio (Gold / Slate)</option>
                  <option value="waveform_pulse">Waveform Pulse (Emerald / Mint)</option>
                </select>
              </div>

              <div>
                <label className={`text-[10px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/50"
                }`}>
                  Video Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {[
                    { id: "9:16", label: "9:16 Story" },
                    { id: "1:1", label: "1:1 Square" },
                    { id: "16:9", label: "16:9 Wide" },
                  ].map((asp) => (
                    <button
                      key={asp.id}
                      type="button"
                      onClick={() => setSelectedAspect(asp.id)}
                      className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold text-center transition ${
                        selectedAspect === asp.id
                          ? isLight
                            ? "bg-neon-purple/10 border-neon-purple text-neon-purple shadow-sm"
                            : "bg-neon-purple/30 border-neon-purple text-white shadow-md shadow-neon-purple/20"
                          : isLight
                          ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                          : "bg-black/40 border-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      {asp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Broadcast / Stream Analysis Length */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-[10px] font-mono uppercase font-bold ${
                  isLight ? "text-slate-600" : "text-white/50"
                }`}>
                  Stream / Schedule Listening Duration
                </label>
                <span className={`text-[10px] font-mono font-bold ${isLight ? "text-neon-purple" : "text-cyan-400"}`}>
                  {durationSeconds >= 3600
                    ? `${(durationSeconds / 3600).toFixed(1)} Hours (${Math.round(durationSeconds / 60)} mins)`
                    : `${Math.round(durationSeconds / 60)} Minutes`}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: "2 Hours (Std)", sec: 7200 },
                  { label: "3 Hours", sec: 10800 },
                  { label: "4 Hours (Full)", sec: 14400 },
                  { label: "1 Hour", sec: 3600 },
                  { label: "30 Mins", sec: 1800 },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => setDurationSeconds(item.sec)}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold text-center transition ${
                      durationSeconds === item.sec
                        ? isLight
                          ? "bg-neon-purple/10 border-neon-purple text-neon-purple shadow-sm"
                          : "bg-neon-purple/30 border-neon-purple text-white shadow-md shadow-neon-purple/20"
                        : isLight
                        ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                        : "bg-black/40 border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className={`text-[10px] mt-1.5 font-mono ${isLight ? "text-slate-500" : "text-white/40"}`}>
                ⚡ AI Studio will monitor & analyze up to 2–4 hours of the broadcast audio, distributing candidate peak moments across the entire show timeline.
              </p>
            </div>

            <div>
              <label className={`text-[10px] font-mono uppercase font-bold ${
                isLight ? "text-slate-600" : "text-white/50"
              }`}>
                Custom Instructions / Director Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Focus specifically on the grime switch-ups and when the MC started shouting out east London..."
                className={`w-full mt-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple resize-none border transition ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                    : "bg-black/50 border-white/10 text-white placeholder-white/30"
                }`}
              />
            </div>
          </div>

          {/* Submit Action */}
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2.5 rounded-xl bg-neon-purple hover:bg-neon-purple/90 text-white text-xs font-bold shadow-lg shadow-neon-purple/30 transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">🌀</span> Launching AI Analysis...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Start AI Analysis Pipeline
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
