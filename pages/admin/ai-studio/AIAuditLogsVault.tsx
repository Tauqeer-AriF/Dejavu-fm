import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Search,
  RefreshCw,
  Download,
  Trash2,
  Filter,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Sliders,
  HardDrive,
  Film,
  Scissors,
  Bot,
  User,
  Clock,
  Code2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Layers,
  Flame,
  Radio
} from "lucide-react";
import { AIAuditLog, AIAuditStats } from "./types";
import { aiStudioApi } from "./aiStudioApi";
import { useAIStudioTheme } from "./themeContext";
import { useModal } from "../../../context/ModalContext";

interface Props {
  onNavigateToReels?: (jobId?: string | null) => void;
  onNavigateToJobs?: () => void;
}

export const AIAuditLogsVault: React.FC<Props> = ({ onNavigateToReels, onNavigateToJobs }) => {
  const { isLight } = useAIStudioTheme();
  const { showConfirm, showAlert } = useModal();

  const [logs, setLogs] = useState<AIAuditLog[]>([]);
  const [stats, setStats] = useState<AIAuditStats>({
    totalAIEvents: 0,
    jobOperations: 0,
    reelReviews: 0,
    mediaEngineering: 0,
    maintenanceActions: 0,
    configUpdates: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [timeframe, setTimeframe] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Log for JSON payload inspection
  const [selectedLog, setSelectedLog] = useState<AIAuditLog | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [currentPage, pageSize, categoryFilter, actionFilter, timeframe]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadLogs();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiStudioApi.getAuditLogs({
        page: currentPage,
        limit: pageSize,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        action: actionFilter !== "ALL" ? actionFilter : undefined,
        timeframe: timeframe !== "ALL" ? timeframe : undefined,
        search: searchTerm.trim() || undefined,
      });

      setLogs(data.logs || []);
      setTotalRecords(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load AI Studio audit logs");
    } finally {
      setLoading(false);
    }
  };

  const handleClearAuditLogs = async () => {
    const confirmed = await showConfirm({
      title: "Purge AI Studio Audit Vault",
      message: "Are you sure you want to permanently clear all AI Studio audit records and telemetry? This security action cannot be undone.",
      style: "danger",
      confirmText: "Purge AI Logs",
    });

    if (confirmed) {
      try {
        const res = await aiStudioApi.clearAuditLogs();
        showAlert({
          title: "Audit Records Purged",
          message: res.message || `Successfully removed ${res.deletedCount} log records.`,
          style: "success",
        });
        loadLogs();
      } catch (err: any) {
        showAlert({
          title: "Purge Failed",
          message: err.message || "Failed to clear audit logs",
          style: "danger",
        });
      }
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      showAlert({ title: "No Data", message: "There are no audit logs to export.", style: "danger" });
      return;
    }

    const headers = ["ID", "Timestamp (UTC)", "Operator", "Role", "Action", "Target Resource", "Resource ID", "Details"];
    const rows = logs.map((log) => [
      log.id,
      log.timestamp || "",
      `"${(log.username || "").replace(/"/g, '""')}"`,
      `"${(log.role || "").replace(/"/g, '""')}"`,
      `"${(log.action || "").replace(/"/g, '""')}"`,
      `"${(log.resource || "").replace(/"/g, '""')}"`,
      `"${(log.resource_id || "").replace(/"/g, '""')}"`,
      `"${(log.details || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dejavu_ai_studio_audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Export Complete", message: "AI Studio audit CSV exported successfully.", style: "success" });
  };

  const handleExportJSON = () => {
    if (logs.length === 0) {
      showAlert({ title: "No Data", message: "There are no audit logs to export.", style: "danger" });
      return;
    }

    const jsonContent = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dejavu_ai_studio_audit_logs_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Export Complete", message: "AI Studio audit JSON generated.", style: "success" });
  };

  const copyPayloadToClipboard = () => {
    if (!selectedLog) return;
    let textToCopy = selectedLog.details || "{}";
    try {
      const parsed = JSON.parse(selectedLog.details || "{}");
      textToCopy = JSON.stringify(parsed, null, 2);
    } catch {}
    navigator.clipboard.writeText(textToCopy);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Helper formatting for action badges
  const renderActionBadge = (action: string) => {
    const act = (action || "").toUpperCase();

    if (act === "APPROVE" || act === "BATCH_APPROVE") {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
          isLight
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        }`}>
          <CheckCircle2 className="w-3 h-3" />
          {act}
        </span>
      );
    }

    if (act === "REJECT") {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
          isLight
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
        }`}>
          <XCircle className="w-3 h-3" />
          {act}
        </span>
      );
    }

    if (act === "CREATE" || act === "JOB_COMPLETED" || act === "AUTO_TRIGGER") {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
          isLight
            ? "bg-purple-50 text-purple-700 border-purple-200"
            : "bg-purple-500/10 text-neon-purple border-purple-500/20"
        }`}>
          <Sparkles className="w-3 h-3" />
          {act}
        </span>
      );
    }

    if (act === "JOB_FAILED") {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
          isLight
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        }`}>
          <AlertTriangle className="w-3 h-3" />
          {act}
        </span>
      );
    }

    if (act === "TRIM" || act === "RE_RENDER") {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
          isLight
            ? "bg-sky-50 text-sky-700 border-sky-200"
            : "bg-sky-500/10 text-sky-400 border-sky-500/20"
        }`}>
          <Scissors className="w-3 h-3" />
          {act}
        </span>
      );
    }

    if (act === "BATCH_DOWNLOAD" || act === "DOWNLOAD") {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
          isLight
            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
        }`}>
          <Download className="w-3 h-3" />
          {act}
        </span>
      );
    }

    if (act === "CLEANUP_DISK" || act === "CLEANUP_EXPIRED_REELS" || act === "DELETE" || act === "PURGE" || act === "BATCH_DELETE") {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
          isLight
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>
          <Trash2 className="w-3 h-3" />
          {act}
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
        isLight
          ? "bg-slate-100 text-slate-700 border-slate-200"
          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
      }`}>
        <Sliders className="w-3 h-3" />
        {act || "LOG"}
      </span>
    );
  };

  // Humanize JSON details summary
  const renderHumanizedDetails = (log: AIAuditLog) => {
    if (!log.details) return <span className={`italic ${isLight ? "text-slate-400" : "text-white/30"}`}>No parameters</span>;

    try {
      const parsed = JSON.parse(log.details);
      
      if (log.action === "CREATE" || log.action === "AUTO_TRIGGER" || log.action === "JOB_COMPLETED") {
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {parsed.show_name && (
              <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                "{parsed.show_name}"
              </span>
            )}
            {parsed.dj_name && (
              <span className={isLight ? "text-slate-500" : "text-white/50"}>
                (DJ {parsed.dj_name})
              </span>
            )}
            {parsed.reels_generated !== undefined && (
              <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                isLight ? "bg-purple-50 text-purple-700" : "bg-purple-500/10 text-neon-purple"
              }`}>
                {parsed.reels_generated} clips
              </span>
            )}
            {parsed.template && (
              <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                isLight ? "bg-slate-100 text-slate-600" : "bg-white/10 text-white/70"
              }`}>
                {parsed.template}
              </span>
            )}
          </div>
        );
      }

      if (log.action === "APPROVE" || log.action === "REJECT") {
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              {parsed.title || `Reel #${log.resource_id}`}
            </span>
            {parsed.changes?.status && (
              <span className={isLight ? "text-slate-500" : "text-white/50"}>
                Status &rarr; <span className="font-mono font-bold uppercase">{parsed.changes.status}</span>
              </span>
            )}
          </div>
        );
      }

      if (log.action === "TRIM") {
        return (
          <div className={`flex items-center gap-2 text-[11px] font-mono ${isLight ? "text-slate-700" : "text-slate-300"}`}>
            <span>Trim: {parsed.start}s &rarr; {parsed.end}s</span>
            {parsed.duration && <span className="text-sky-500 font-bold">({parsed.duration}s clip)</span>}
          </div>
        );
      }

      if (log.action === "RE_RENDER") {
        return (
          <div className={`flex flex-wrap items-center gap-1.5 text-[11px] ${isLight ? "text-slate-700" : "text-slate-300"}`}>
            <span>Re-rendered with theme <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{parsed.template || "custom"}</span> ({parsed.aspect || "9:16"})</span>
          </div>
        );
      }

      if (log.action === "BATCH_APPROVE" || log.action === "BATCH_DELETE" || log.action === "BATCH_DOWNLOAD") {
        return (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{parsed.count || parsed.ids?.length || 0} reels</span>
            <span className={isLight ? "text-slate-500" : "text-white/50"}>processed in batch</span>
          </div>
        );
      }

      if (log.action === "CLEANUP_DISK" || log.action === "CLEANUP_EXPIRED_REELS") {
        return (
          <div className="flex items-center gap-1.5 text-[11px]">
            {parsed.freedMB && <span className="font-bold text-emerald-500">Freed {parsed.freedMB} MB</span>}
            {parsed.deletedFilesCount !== undefined && <span className={isLight ? "text-slate-500" : "text-white/50"}>({parsed.deletedFilesCount} temp artifacts pruned)</span>}
            {parsed.deletedCount !== undefined && <span className={isLight ? "text-slate-500" : "text-white/50"}>({parsed.deletedCount} expired reels purged)</span>}
          </div>
        );
      }

      // Default JSON summary
      const keys = Object.keys(parsed);
      return (
        <span className={`text-[11px] font-mono truncate max-w-xs block ${isLight ? "text-slate-600" : "text-white/60"}`}>
          {keys.map((k) => `${k}: ${typeof parsed[k] === "object" ? "..." : parsed[k]}`).join(" • ")}
        </span>
      );
    } catch {
      return (
        <span className={`text-[11px] truncate max-w-xs block ${isLight ? "text-slate-600" : "text-white/60"}`}>
          {log.details}
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Overview Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-black/30 border-white/10"
          }`}
        >
          <div className={`flex items-center justify-between text-[11px] mb-1 ${
            isLight ? "text-slate-500" : "text-white/50"
          }`}>
            <span className="font-mono uppercase font-bold">Total Events</span>
            <Shield className="w-3.5 h-3.5 text-neon-purple" />
          </div>
          <div className={`text-xl font-black font-display ${
            isLight ? "text-slate-900" : "text-white"
          }`}>
            {stats.totalAIEvents}
          </div>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/40"}`}>
            Audit records logged
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-black/30 border-white/10"
          }`}
        >
          <div className={`flex items-center justify-between text-[11px] mb-1 ${
            isLight ? "text-slate-500" : "text-white/50"
          }`}>
            <span className="font-mono uppercase font-bold">Pipeline Runs</span>
            <Bot className="w-3.5 h-3.5 text-neon-blue" />
          </div>
          <div className="text-xl font-black font-display text-neon-blue">
            {stats.jobOperations}
          </div>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/40"}`}>
            Job actions & triggers
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-black/30 border-white/10"
          }`}
        >
          <div className={`flex items-center justify-between text-[11px] mb-1 ${
            isLight ? "text-slate-500" : "text-white/50"
          }`}>
            <span className="font-mono uppercase font-bold">Editorial</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black font-display text-emerald-500">
            {stats.reelReviews}
          </div>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/40"}`}>
            Reviews & approvals
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-black/30 border-white/10"
          }`}
        >
          <div className={`flex items-center justify-between text-[11px] mb-1 ${
            isLight ? "text-slate-500" : "text-white/50"
          }`}>
            <span className="font-mono uppercase font-bold">Media Renders</span>
            <Scissors className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-black font-display text-sky-400">
            {stats.mediaEngineering}
          </div>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/40"}`}>
            Trims, renders & zips
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-black/30 border-white/10"
          }`}
        >
          <div className={`flex items-center justify-between text-[11px] mb-1 ${
            isLight ? "text-slate-500" : "text-white/50"
          }`}>
            <span className="font-mono uppercase font-bold">Cleanups</span>
            <HardDrive className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black font-display text-amber-500">
            {stats.maintenanceActions}
          </div>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/40"}`}>
            Disk & retention tasks
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-xs"
              : "bg-black/30 border-white/10"
          }`}
        >
          <div className={`flex items-center justify-between text-[11px] mb-1 ${
            isLight ? "text-slate-500" : "text-white/50"
          }`}>
            <span className="font-mono uppercase font-bold">Config & Presets</span>
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-black font-display text-indigo-400">
            {stats.configUpdates}
          </div>
          <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/40"}`}>
            Prompt & model updates
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div
        className={`p-4 rounded-2xl border transition-all space-y-3 ${
          isLight ? "bg-white border-slate-200 shadow-xs" : "bg-black/30 border-white/10"
        }`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isLight ? "text-slate-400" : "text-white/40"
            }`} />
            <input
              type="text"
              placeholder="Search by operator, show name, reel ID, or parameters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-neon-purple"
                  : "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-neon-purple"
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => loadLogs()}
              disabled={loading}
              className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
              }`}
              title="Refresh Audit Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-neon-purple" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                isLight
                  ? "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200"
                  : "bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/20"
              }`}
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                isLight
                  ? "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                  : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20"
              }`}
              title="Export JSON"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>

            <button
              onClick={handleClearAuditLogs}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                isLight
                  ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                  : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
              }`}
              title="Purge AI Studio Audit Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Purge</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className={`flex flex-wrap items-center justify-between gap-3 pt-2 border-t ${
          isLight ? "border-slate-200/60" : "border-white/5"
        }`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[10px] font-mono font-bold uppercase mr-1 flex items-center gap-1 ${
              isLight ? "text-slate-500" : "text-white/40"
            }`}>
              <Filter className="w-3 h-3" /> Category:
            </span>
            {[
              { id: "ALL", label: "All Events" },
              { id: "jobs", label: "Job Pipeline" },
              { id: "editorial", label: "Editorial & Reviews" },
              { id: "media", label: "Media & Renders" },
              { id: "maintenance", label: "Maintenance" },
              { id: "config", label: "Settings & Presets" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategoryFilter(cat.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  categoryFilter === cat.id
                    ? "bg-neon-purple text-white shadow-xs"
                    : isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Timeframe selector */}
            <select
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter audit logs by timeframe"
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none transition ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-700"
                  : "bg-black/40 border-white/10 text-white/80"
              }`}
            >
              <option value="ALL">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Audit logs rows per page"
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold focus:outline-none transition ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-700"
                  : "bg-black/40 border-white/10 text-white/80"
              }`}
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Audit Records Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          isLight ? "bg-white border-slate-200 shadow-xs" : "bg-black/30 border-white/10"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={`border-b text-[10px] font-black uppercase tracking-wider font-mono ${
                  isLight
                    ? "bg-slate-50 text-slate-500 border-slate-200"
                    : "bg-white/5 text-white/50 border-white/10"
                }`}
              >
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Parameters & Payload Summary</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y text-xs ${
                isLight ? "divide-slate-100" : "divide-white/5"
              }`}
            >
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-neon-purple border-t-transparent animate-spin rounded-full" />
                      <span className={`text-xs font-mono ${
                        isLight ? "text-slate-500" : "text-white/40"
                      }`}>
                        Querying AI Studio telemetry vault...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-rose-500">
                      <AlertTriangle className="w-6 h-6" />
                      <span className="text-xs font-bold">{error}</span>
                      <button
                        onClick={() => loadLogs()}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className={`inline-flex flex-col items-center gap-2 ${
                      isLight ? "text-slate-500" : "text-white/30"
                    }`}>
                      <Shield className="w-8 h-8 opacity-40" />
                      <p className="text-xs font-bold uppercase tracking-wider">No AI Studio records found</p>
                      <p className="text-[11px]">Try adjusting your search query or timeframe filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`transition-colors group hover:bg-slate-50/80 dark:hover:bg-white/[0.02]`}
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`font-mono text-[11px] font-bold ${
                          isLight ? "text-slate-700" : "text-white/80"
                        }`}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "---"}
                        </span>
                        <span className={`text-[10px] font-mono ${
                          isLight ? "text-slate-400" : "text-white/40"
                        }`}>
                          {log.timestamp ? new Date(log.timestamp).toISOString().split('T')[0] : ""}
                        </span>
                      </div>
                    </td>

                    {/* Operator */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          log.role === 'ai_pipeline' || log.role === 'scheduler' || log.username.includes('System') || log.username.includes('Daemon')
                            ? 'bg-neon-blue/20 text-neon-blue'
                            : log.role === 'owner'
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-purple-500/20 text-purple-600 dark:text-neon-purple'
                        }`}>
                          {log.username.includes('System') || log.role === 'ai_pipeline' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-bold text-xs ${
                            isLight ? "text-slate-900" : "text-white"
                          }`}>
                            {log.username || "System"}
                          </span>
                          <span className={`text-[9px] font-mono uppercase ${
                            isLight ? "text-slate-500" : "text-white/40"
                          }`}>
                            {log.role || "process"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderActionBadge(log.action)}
                    </td>

                    {/* Target Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-neon-blue uppercase">
                          {log.resource}
                        </span>
                        {log.resource_id && (
                          <button
                            onClick={() => {
                              if (log.resource === 'ai_job' && onNavigateToJobs) {
                                onNavigateToJobs();
                              } else if (log.resource === 'ai_reel' && onNavigateToReels) {
                                onNavigateToReels(null);
                              }
                            }}
                            className={`font-mono text-[10px] hover:text-neon-purple transition underline decoration-dotted ${
                              isLight ? "text-slate-600" : "text-white/50"
                            }`}
                            title={`Inspect ${log.resource_id}`}
                          >
                            #{log.resource_id.length > 14 ? `${log.resource_id.substring(0, 12)}...` : log.resource_id}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Humanized Details */}
                    <td className="py-3.5 px-4 max-w-md">
                      {renderHumanizedDetails(log)}
                    </td>

                    {/* Inspect Payload Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className={`p-1.5 rounded-lg border transition ${
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                            : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
                        }`}
                        title="View Full JSON Payload"
                      >
                        <Code2 className="w-3.5 h-3.5 text-neon-purple" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-black/20 border-white/10 text-white/60"
            }`}
          >
            <div className="font-mono text-[11px]">
              Showing <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                {Math.min(currentPage * pageSize, totalRecords)}
              </span>{" "}
              of <span className="font-bold text-neon-purple">{totalRecords}</span> audit records
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1 font-bold text-xs disabled:opacity-30 ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <div className={`px-3 font-mono text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1 font-bold text-xs disabled:opacity-30 ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                }`}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Payload Inspector Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
                isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0f111a] border-white/15 text-white"
              }`}
            >
              {/* Modal Header */}
              <div
                className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-neon-purple/20 text-neon-purple flex items-center justify-center">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase font-display">
                      Audit Event #{selectedLog.id} Payload
                    </h3>
                    <p className={`text-[11px] font-mono ${isLight ? "text-slate-500" : "text-white/40"}`}>
                      {selectedLog.action} &bull; {selectedLog.resource}{selectedLog.resource_id ? `:${selectedLog.resource_id}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyPayloadToClipboard}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                      isLight
                        ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
                    }`}
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neon-purple" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedLog(null)}
                    className={`p-1.5 rounded-xl border transition ${
                      isLight
                        ? "bg-white hover:bg-slate-100 text-slate-500 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border-white/10"
                    }`}
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                {/* Meta details grid */}
                <div
                  className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl border text-xs ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
                  }`}
                >
                  <div>
                    <div className={`text-[10px] font-mono uppercase ${isLight ? "text-slate-500" : "text-white/40"}`}>Operator</div>
                    <div className="font-bold mt-0.5">{selectedLog.username}</div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-mono uppercase ${isLight ? "text-slate-500" : "text-white/40"}`}>Role</div>
                    <div className="font-bold font-mono mt-0.5">{selectedLog.role}</div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-mono uppercase ${isLight ? "text-slate-500" : "text-white/40"}`}>Action</div>
                    <div className="mt-0.5">{renderActionBadge(selectedLog.action)}</div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-mono uppercase ${isLight ? "text-slate-500" : "text-white/40"}`}>Timestamp</div>
                    <div className="font-mono text-[11px] mt-0.5">
                      {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : "---"}
                    </div>
                  </div>
                </div>

                {/* Formatted JSON payload */}
                <div>
                  <div className={`text-xs font-mono font-bold uppercase mb-2 flex items-center gap-1.5 ${
                    isLight ? "text-slate-500" : "text-white/40"
                  }`}>
                    <FileText className="w-3.5 h-3.5 text-neon-purple" />
                    Detailed Payload & Parameters
                  </div>
                  <pre
                    className={`p-4 rounded-2xl border font-mono text-[11px] leading-relaxed overflow-x-auto select-all ${
                      isLight
                        ? "bg-slate-900 text-emerald-400 border-slate-800"
                        : "bg-black/60 text-emerald-400 border-white/10"
                    }`}
                  >
                    {(() => {
                      try {
                        const parsed = JSON.parse(selectedLog.details || "{}");
                        return JSON.stringify(parsed, null, 2);
                      } catch {
                        return selectedLog.details || "No payload details recorded.";
                      }
                    })()}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className={`px-6 py-3 border-t flex items-center justify-end ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/10"
                }`}
              >
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 rounded-xl bg-neon-purple text-white text-xs font-bold hover:bg-neon-purple/90 transition shadow-lg shadow-neon-purple/20"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
