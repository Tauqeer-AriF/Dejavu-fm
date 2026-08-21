import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Film,
  Activity,
  Settings,
  Plus,
  ArrowLeft,
  Flame,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  LogOut,
  Sliders,
  Layers,
  ShieldAlert,
  Shield,
  Sun,
  Moon
} from "lucide-react";
import { AIJob, AIReel, AIPromptPreset, AIStats } from "./ai-studio/types";
import { aiStudioApi } from "./ai-studio/aiStudioApi";
import { ReelsReviewSuite } from "./ai-studio/ReelsReviewSuite";
import { JobsPipelineMonitor } from "./ai-studio/JobsPipelineMonitor";
import { AIAuditLogsVault } from "./ai-studio/AIAuditLogsVault";
import { NewJobModal } from "./ai-studio/NewJobModal";
import { SettingsAndPresetsModal } from "./ai-studio/SettingsAndPresetsModal";
import { AIStudioThemeProvider, useAIStudioTheme } from "./ai-studio/themeContext";
import { io } from "socket.io-client";

interface Props {
  onLogout?: () => void;
}

const AdminAIContentStudioInner: React.FC<Props> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { isLight, toggleTheme } = useAIStudioTheme();
  const [activeTab, setActiveTab] = useState<"reels" | "jobs" | "audit">("reels");
  const [stats, setStats] = useState<AIStats>({
    totalJobs: 0,
    activeJobs: 0,
    totalReels: 0,
    pendingReview: 0,
    approvedReels: 0,
    rejectedReels: 0,
    avgViralityScore: 0,
  });

  const [reels, setReels] = useState<AIReel[]>([]);
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [presets, setPresets] = useState<AIPromptPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();

    // Setup Socket.IO listener for real-time AI job progress
    const socket = io({ transports: ["websocket"] });

    socket.on("ai_job_progress", (data: any) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === data.jobId
            ? { ...j, progress: data.progress, stage_message: data.message, status: data.status || j.status }
            : j
        )
      );
    });

    socket.on("ai_job_completed", () => loadAllData());
    socket.on("ai_job_failed", () => loadAllData());
    socket.on("ai_job_deleted", () => loadAllData());
    socket.on("ai_reel_created", () => loadAllData());
    socket.on("ai_reel_status_updated", () => loadAllData());
    socket.on("ai_reel_deleted", () => loadAllData());

    // Fallback polling interval every 12 seconds
    const interval = setInterval(() => {
      loadAllData(false);
    }, 12000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [selectedJobId]);

  const loadAllData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [statsData, reelsData, jobsData, presetsData] = await Promise.all([
        aiStudioApi.getStats().catch(() => stats),
        aiStudioApi.getReels(selectedJobId ? { job_id: selectedJobId } : undefined).catch(() => []),
        aiStudioApi.getJobs().catch(() => []),
        aiStudioApi.getPresets().catch(() => []),
      ]);

      setStats(statsData);
      setReels(reelsData);
      setJobs(jobsData);
      setPresets(presetsData);
    } catch (err) {
      console.warn("Failed to load AI Content Studio data:", err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const handleFilterJobReels = (jobId: string | null) => {
    setSelectedJobId(jobId);
    setActiveTab("reels");
    aiStudioApi.getReels(jobId ? { job_id: jobId } : undefined).then(setReels).catch(() => {});
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ai-studio-root ${
      isLight ? "bg-[#F8FAFC] text-slate-900" : "bg-[#0A0C16] text-white"
    }`}>
      {/* Top Banner Navigation */}
      <header className={`border-b backdrop-blur-xl sticky top-0 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 transition-colors ${
        isLight
          ? "bg-white/90 border-slate-200/90 text-slate-900 shadow-xs"
          : "bg-black/40 border-white/10 text-white"
      }`}>
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neon-purple flex items-center justify-center shadow-lg shadow-neon-purple/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-black tracking-tight uppercase font-display">
                  AI Social <span className="text-neon-purple">Content Studio</span>
                </h1>
              </div>
              <p className={`text-[11px] font-mono hidden md:block ${
                isLight ? "text-slate-500" : "text-white/40"
              }`}>
                Auto-Analysis & 9:16 Social Reel Generation Suite
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition flex items-center justify-center ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:text-slate-900"
                : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10 hover:text-white"
            }`}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle AI Studio Theme"
          >
            {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4 text-neon-blue" />
            <span className="hidden sm:inline">AI Settings</span>
          </button>

          <button
            onClick={() => setIsNewJobOpen(true)}
            className="px-4 py-2 rounded-xl bg-neon-purple hover:bg-neon-purple/90 text-white text-xs font-bold shadow-lg shadow-neon-purple/30 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Reels</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className={`p-2 rounded-xl border transition ${
                isLight
                  ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                  : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        {/* KPI Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div className={`p-4 rounded-2xl border space-y-1 transition-all ${
            isLight
              ? "bg-white border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
              : "glass-panel border-white/10 bg-black/30"
          }`}>
            <div className={`flex items-center justify-between text-xs ${
              isLight ? "text-slate-500" : "text-white/50"
            }`}>
              <span className="font-mono uppercase">Total Social Clips</span>
              <Film className="w-4 h-4 text-neon-purple" />
            </div>
            <div className={`text-2xl font-black font-display ${isLight ? "text-slate-900" : "text-white"}`}>
              {stats.totalReels}
            </div>
            <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-white/40"}`}>
              From {stats.totalJobs} show analysis jobs
            </div>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 transition-all ${
            isLight
              ? "bg-white border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
              : "glass-panel border-white/10 bg-black/30"
          }`}>
            <div className={`flex items-center justify-between text-xs ${
              isLight ? "text-slate-500" : "text-white/50"
            }`}>
              <span className="font-mono uppercase">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black font-display text-amber-500">{stats.pendingReview}</div>
            <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-white/40"}`}>
              {stats.approvedReels} approved for export
            </div>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 transition-all ${
            isLight
              ? "bg-white border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
              : "glass-panel border-white/10 bg-black/30"
          }`}>
            <div className={`flex items-center justify-between text-xs ${
              isLight ? "text-slate-500" : "text-white/50"
            }`}>
              <span className="font-mono uppercase">Avg Virality</span>
              <Flame className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black font-display text-rose-500">{stats.avgViralityScore}%</div>
            <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-white/40"}`}>
              AI hook & transition rating
            </div>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 transition-all ${
            isLight
              ? "bg-white border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
              : "glass-panel border-white/10 bg-black/30"
          }`}>
            <div className={`flex items-center justify-between text-xs ${
              isLight ? "text-slate-500" : "text-white/50"
            }`}>
              <span className="font-mono uppercase">Active Pipeline</span>
              <Activity className="w-4 h-4 text-neon-blue" />
            </div>
            <div className="text-2xl font-black font-display text-neon-blue">{stats.activeJobs}</div>
            <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-white/40"}`}>
              Real-time background tasks
            </div>
          </div>
        </div>

        {/* Workspace Tab Switcher */}
        <div className={`flex items-center justify-between border-b pb-4 ${
          isLight ? "border-slate-200" : "border-white/10"
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("reels")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "reels"
                  ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                  : isLight
                  ? "bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50 shadow-xs"
                  : "bg-black/30 text-white/60 hover:text-white border border-white/10"
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Social Reels Review Suite</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === "reels" ? "bg-white/20 text-white" : isLight ? "bg-slate-100 text-slate-700" : "bg-white/10 text-white/70"
              }`}>
                {reels.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("jobs")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 relative ${
                activeTab === "jobs"
                  ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                  : isLight
                  ? "bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50 shadow-xs"
                  : "bg-black/30 text-white/60 hover:text-white border border-white/10"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Jobs & Processing Pipeline</span>
              {stats.activeJobs > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-neon-blue text-black text-[10px] font-black font-mono animate-pulse">
                  {stats.activeJobs} active
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "audit"
                  ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                  : isLight
                  ? "bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50 shadow-xs"
                  : "bg-black/30 text-white/60 hover:text-white border border-white/10"
              }`}
            >
              <Shield className="w-4 h-4 text-neon-blue" />
              <span>Security & Audit Vault</span>
            </button>
          </div>

          <button
            onClick={() => loadAllData(true)}
            disabled={isLoading}
            className={`px-3.5 py-2.5 rounded-2xl border transition flex items-center gap-2 text-xs font-bold ${
              isLight
                ? "bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200/90 shadow-xs"
                : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/10"
            }`}
            title="Refresh AI Studio Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-neon-purple" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Active Filter Banner */}
        {selectedJobId && activeTab === "reels" && (
          <div className={`mb-4 px-4 py-2.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            isLight ? "bg-purple-50 text-purple-900 border-purple-200" : "bg-purple-950/40 text-purple-200 border-purple-800/50"
          }`}>
            <span>Filtered by Job ID: <span className="font-mono">{selectedJobId}</span></span>
            <button
              onClick={() => handleFilterJobReels(null)}
              className="px-2.5 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition text-[11px]"
            >
              Show All Reels
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "reels" ? (
          <ReelsReviewSuite
            reels={reels}
            onRefresh={() => loadAllData(false)}
            onSelectJob={handleFilterJobReels}
          />
        ) : activeTab === "jobs" ? (
          <JobsPipelineMonitor
            jobs={jobs}
            onRefresh={() => loadAllData(false)}
            onViewReels={handleFilterJobReels}
          />
        ) : (
          <AIAuditLogsVault
            onNavigateToReels={handleFilterJobReels}
            onNavigateToJobs={() => setActiveTab("jobs")}
          />
        )}
      </main>

      {/* Modals */}
      <NewJobModal
        isOpen={isNewJobOpen}
        onClose={() => setIsNewJobOpen(false)}
        onJobCreated={() => {
          loadAllData();
          setActiveTab("jobs");
        }}
        presets={presets}
      />

      <SettingsAndPresetsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        presets={presets}
        onPresetsUpdated={() => loadAllData(false)}
      />
    </div>
  );
};

export const AdminAIContentStudio: React.FC<Props> = (props) => {
  return (
    <AIStudioThemeProvider>
      <AdminAIContentStudioInner {...props} />
    </AIStudioThemeProvider>
  );
};

export default AdminAIContentStudio;
