import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  Sparkles,
  Film,
  Trash2,
  StopCircle,
  Eye,
  Calendar,
  User,
  AlertTriangle,
  Play
} from "lucide-react";
import { AIJob, JobStatus } from "./types";
import { aiStudioApi } from "./aiStudioApi";
import { useAIStudioTheme } from "./themeContext";
import { useModal } from "../../../context/ModalContext";

interface Props {
  jobs: AIJob[];
  onRefresh: () => void;
  onViewReels: (jobId: string) => void;
}

export const JobsPipelineMonitor: React.FC<Props> = ({ jobs, onRefresh, onViewReels }) => {
  const { isLight } = useAIStudioTheme();
  const { showConfirm, showAlert } = useModal();
  const [selectedJobForModal, setSelectedJobForModal] = useState<AIJob | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [onAirStatus, setOnAirStatus] = useState<any>(null);

  useEffect(() => {
    const fetchOnAir = async () => {
      try {
        const res = await aiStudioApi.getOnAirStatus();
        setOnAirStatus(res);
      } catch (e) {}
    };
    fetchOnAir();
    const interval = setInterval(fetchOnAir, 30000); // refresh on-air status every 30s
    return () => clearInterval(interval);
  }, []);

  const handleCancelJob = async (jobId: string) => {
    const confirmed = await showConfirm({
      title: "Cancel Job",
      message: "Are you sure you want to cancel this processing job?",
      style: "danger",
      confirmText: "Cancel Job",
      cancelText: "Keep Running"
    });
    if (!confirmed) return;

    try {
      await aiStudioApi.cancelJob(jobId);
      onRefresh();
    } catch (e: any) {
      showAlert({ title: "Error", message: e.message || "Failed to cancel job", style: "danger" });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const confirmed = await showConfirm({
      title: "Delete Job",
      message: "Are you sure you want to permanently delete this job and all its generated reels?",
      style: "danger",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!confirmed) return;

    try {
      await aiStudioApi.deleteJob(jobId);
      onRefresh();
    } catch (e: any) {
      showAlert({ title: "Error", message: e.message || "Failed to delete job", style: "danger" });
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (filterStatus === "ALL") return true;
    if (filterStatus === "ACTIVE") {
      return ["QUEUED", "CAPTURING", "ANALYZING", "GENERATING"].includes(job.status);
    }
    return job.status === filterStatus;
  });

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case "FAILED":
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isLight ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-red-500/20 text-red-300 border-red-500/30"
          }`}>
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case "CANCELLED":
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isLight ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-white/10 text-white/50 border border-white/20"
          }`}>
            <StopCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case "QUEUED":
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border animate-pulse ${
            isLight ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-amber-500/20 text-amber-300 border-amber-500/30"
          }`}>
            <Clock className="w-3.5 h-3.5" /> Queued
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neon-purple/20 text-neon-purple border border-neon-purple/30 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* On-Air Live Broadcast Monitor Banner */}
      {onAirStatus?.isOnAir ? (
        <div className={`p-5 rounded-3xl border space-y-3 relative overflow-hidden ${
          isLight 
            ? "bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 border-purple-200/80 shadow-xs" 
            : "bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-black/60 border-purple-500/30"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                ON AIR NOW
              </span>
              <span className={`text-xs font-mono ${isLight ? "text-slate-500" : "text-white/50"}`}>
                Slot: {onAirStatus.startTime} – {onAirStatus.endTime}
              </span>
            </div>

            <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Broadcast Elapsed: {onAirStatus.elapsedMins}m / {onAirStatus.totalMins}m ({onAirStatus.progressPercent}%)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className={`text-lg font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                {onAirStatus.showName}
              </h3>
              <p className={`text-xs font-semibold ${isLight ? "text-slate-600" : "text-cyan-300"}`}>
                Hosted by {onAirStatus.djName}
              </p>
            </div>

            <div className={`text-xs font-mono px-3 py-1.5 rounded-xl border ${
              isLight ? "bg-white/80 border-purple-200 text-purple-900" : "bg-black/40 border-purple-500/30 text-purple-200"
            }`}>
              ⚡ Auto-Reels pipeline will automatically trigger when this show concludes at <strong>{onAirStatus.endTime}</strong> ({onAirStatus.remainingMins} mins remaining)
            </div>
          </div>

          {/* On-Air Live Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="w-full h-2 rounded-full overflow-hidden bg-black/20 border border-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, onAirStatus.progressPercent || 0)}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-mono ${
          isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-black/30 border-white/10 text-white/60"
        }`}>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>📻 Schedule Monitor Active — No show currently broadcast on air</span>
          </div>
          <span className="text-[11px] opacity-75">Checking live timetable every 60s</span>
        </div>
      )}

      {/* Control bar */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition-colors ${
        isLight
          ? "bg-white border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          : "glass-panel border-white/10"
      }`}>
        <div className="flex items-center gap-2">
          {["ALL", "ACTIVE", "COMPLETED", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                filterStatus === st
                  ? "bg-neon-purple text-white shadow-md shadow-neon-purple/30"
                  : isLight
                  ? "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/90"
                  : "bg-black/30 text-white/60 hover:text-white border border-white/5"
              }`}
            >
              {st === "ALL" ? "All Jobs" : st === "ACTIVE" ? "In Progress" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className={`p-16 rounded-3xl border text-center space-y-4 ${
          isLight ? "bg-white border-slate-200 text-slate-900 shadow-xs" : "glass-panel border-white/10 text-white"
        }`}>
          <Activity className={`w-16 h-16 mx-auto ${isLight ? "text-slate-300" : "text-white/20"}`} />
          <h3 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
            No processing jobs found
          </h3>
          <p className={`text-sm max-w-md mx-auto ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Jobs appear here whenever you analyze completed DJ shows or start a new automatic reel generation task.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const isActive = ["QUEUED", "CAPTURING", "ANALYZING", "GENERATING"].includes(job.status);
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-3xl border transition ${
                  isActive
                    ? isLight
                      ? "border-neon-purple/50 bg-neon-purple/5 shadow-sm"
                      : "border-neon-purple/40 bg-neon-purple/5"
                    : isLight
                    ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                    : "glass-panel border-white/10"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Job Metadata */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {getStatusBadge(job.status)}
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                        isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-white/5 text-white/60 border-white/10"
                      }`}>
                        {job.source_type.toUpperCase()}
                      </span>
                      {job.created_by === 'AUTO_SCHEDULE_LISTENER' && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neon-purple/20 text-cyan-300 border border-neon-purple/40 flex items-center gap-1">
                          ⚡ AUTO-SCHEDULED
                        </span>
                      )}
                      <span className={`text-xs font-mono ${isLight ? "text-slate-400" : "text-white/40"}`}>
                        Created: {new Date(job.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className={`text-lg font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                        {job.show_name}
                      </h4>
                      <span className={isLight ? "text-slate-300" : "text-white/30"}>•</span>
                      <span className="text-sm font-semibold text-cyan-600 dark:text-neon-blue flex items-center gap-1 truncate">
                        <User className="w-3.5 h-3.5" />
                        {job.dj_name}
                      </span>
                    </div>

                    {job.stage_message && (
                      <p className={`text-xs font-mono flex items-center gap-1.5 ${
                        isLight ? "text-slate-600" : "text-white/70"
                      }`}>
                        <Activity className="w-3.5 h-3.5 text-neon-purple" />
                        {job.stage_message}
                      </p>
                    )}

                    {job.error_message && (
                      <p className={`text-xs font-mono p-2 rounded-xl border flex items-center gap-1.5 ${
                        isLight
                          ? "text-rose-700 bg-rose-50 border-rose-200"
                          : "text-red-400 bg-red-500/10 border-red-500/20"
                      }`}>
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {job.error_message}
                      </p>
                    )}
                  </div>

                  {/* Right Side: Actions & Reel count */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    {job.status === "COMPLETED" && (
                      <button
                        onClick={() => onViewReels(job.id)}
                        className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-neon-purple/20 transition"
                      >
                        <Film className="w-4 h-4" />
                        View Reels ({job.reels_count || 0})
                      </button>
                    )}

                    {isActive && (
                      <button
                        onClick={() => handleCancelJob(job.id)}
                        className={`px-3 py-2 border rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                          isLight
                            ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        <StopCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedJobForModal(job)}
                      className={`p-2 rounded-xl border transition ${
                        isLight
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                          : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
                      }`}
                      title="Inspect Job JSON"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className={`p-2 rounded-xl border transition ${
                        isLight
                          ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                          : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                      }`}
                      title="Delete Job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar for Active Jobs */}
                {isActive && (
                  <div className={`mt-4 pt-3 border-t space-y-1.5 ${isLight ? "border-slate-100" : "border-white/5"}`}>
                    <div className={`flex justify-between text-[11px] font-mono ${
                      isLight ? "text-slate-600" : "text-white/60"
                    }`}>
                      <span>Pipeline Progress</span>
                      <span className="text-neon-purple font-bold">{job.progress}%</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden border ${
                      isLight ? "bg-slate-200 border-slate-300" : "bg-black/50 border-white/10"
                    }`}>
                      <motion.div
                        className="h-full bg-neon-purple"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(5, job.progress)}%` }}
                        transition={{ ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Raw JSON Inspector Modal */}
      {selectedJobForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className={`w-full max-w-2xl max-h-[85vh] rounded-3xl border p-6 flex flex-col space-y-4 shadow-2xl ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0D0F1D] border-white/20 text-white"
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              isLight ? "border-slate-200" : "border-white/10"
            }`}>
              <h3 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Job Diagnostics & Config
              </h3>
              <button
                onClick={() => setSelectedJobForModal(null)}
                className={`text-xs font-mono font-bold hover:underline ${
                  isLight ? "text-slate-500 hover:text-slate-900" : "text-white/50 hover:text-white"
                }`}
              >
                Close
              </button>
            </div>
            <pre className={`flex-1 overflow-auto p-4 rounded-2xl border text-xs font-mono ${
              isLight
                ? "bg-slate-900 text-emerald-400 border-slate-800"
                : "bg-black/80 text-emerald-400 border-white/10"
            }`}>
              {JSON.stringify(selectedJobForModal, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
