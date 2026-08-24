import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  Sparkles,
  Scissors,
  Download,
  Trash2,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Sliders,
  Film,
  Music,
  Maximize2,
  CheckSquare,
  Square,
  Layers,
  Palette,
  HardDrive,
  Tv,
  Sparkles as SparklesIcon
} from "lucide-react";
import { AIReel, ReelCategory, ReelStatus } from "./types";
import { aiStudioApi } from "./aiStudioApi";
import { useAIStudioTheme } from "./themeContext";
import { useModal } from "../../../context/ModalContext";
import { StudioPhonePreviewFrame } from "./StudioPhonePreviewFrame";
import { ReelGalleryCard } from "./ReelGalleryCard";

interface Props {
  reels: AIReel[];
  onRefresh: () => void;
  onSelectJob?: (jobId: string) => void;
}

export const ReelsReviewSuite: React.FC<Props> = ({ reels, onRefresh, onSelectJob }) => {
  const { isLight } = useAIStudioTheme();
  const { showConfirm, showAlert } = useModal();
  const [selectedReel, setSelectedReel] = useState<AIReel | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "virality">("date");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Batch Multi-Select
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Edit / Trim / Theme State
  const [editTitle, setEditTitle] = useState("");
  const [editHook, setEditHook] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editSocialCopy, setEditSocialCopy] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editCategory, setEditCategory] = useState<ReelCategory>("Drop");
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(30);
  const [selectedTheme, setSelectedTheme] = useState<string>("neon_cyber");
  const [selectedAspect, setSelectedAspect] = useState<string>("9:16");
  const [isTrimming, setIsTrimming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCleaningDisk, setIsCleaningDisk] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Video playback
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      setIsDownloading(true);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (reels.length > 0 && !selectedReel) {
      handleSelectReel(reels[0]);
    } else if (selectedReel) {
      const updated = reels.find((r) => r.id === selectedReel.id);
      if (updated) {
        setSelectedReel(updated);
      } else {
        if (reels.length > 0) {
          handleSelectReel(reels[0]);
        } else {
          setSelectedReel(null);
        }
      }
    }
  }, [reels]);

  const handleSelectReel = (reel: AIReel) => {
    setSelectedReel(reel);
    setEditTitle(reel.title);
    setEditHook(reel.hook || "");
    setEditSummary(reel.summary || "");
    setEditSocialCopy(reel.social_copy || "");
    setEditHashtags(reel.hashtags || "");
    setEditCategory(reel.category);
    setTrimStart(reel.start_seconds);
    setTrimEnd(reel.end_seconds);
    setSelectedTheme(reel.template || "neon_cyber");
    setSelectedAspect(reel.aspect_ratio || "9:16");
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Multi-select helpers
  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedIds.length === filteredReels.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReels.map((r) => r.id));
    }
  };

  // Batch Handlers
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsBatchProcessing(true);
      const res = await aiStudioApi.batchApproveReels(selectedIds);
      setActionSuccess(`Batch approved ${res.approvedCount} reel(s)!`);
      setTimeout(() => setActionSuccess(null), 3000);
      setSelectedIds([]);
      onRefresh();
    } catch (e: any) {
      showAlert({ title: "Batch Approve Failed", message: e.message || "Failed to approve reels", style: "danger" });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await showConfirm({
      title: "Batch Delete Reels",
      message: `Are you sure you want to delete ${selectedIds.length} selected reel(s) and their media files?`,
      style: "danger",
      confirmText: "Delete All",
      cancelText: "Cancel"
    });
    if (!confirmed) return;

    try {
      setIsBatchProcessing(true);
      await aiStudioApi.batchDeleteReels(selectedIds);
      setActionSuccess(`Successfully deleted ${selectedIds.length} reel(s)!`);
      setTimeout(() => setActionSuccess(null), 3000);
      setSelectedIds([]);
      onRefresh();
    } catch (e: any) {
      showAlert({ title: "Batch Delete Failed", message: e.message || "Failed to delete reels", style: "danger" });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDownloadZip = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsBatchProcessing(true);
      const blob = await aiStudioApi.batchDownloadZip(selectedIds);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `DejavuFM_Reels_Package_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setActionSuccess(`Downloaded ZIP archive with ${selectedIds.length} reels!`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      showAlert({ title: "ZIP Download Failed", message: e.message || "Failed to download zip", style: "danger" });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Disk Asset Cleanup
  const handleDiskCleanup = async () => {
    const confirmed = await showConfirm({
      title: "Clean Temporary Disk Assets",
      message: "Prune intermediate multi-hour radio recordings older than 24 hours to save server disk storage?",
      style: "warning",
      confirmText: "Clean Disk",
      cancelText: "Cancel"
    });
    if (!confirmed) return;

    try {
      setIsCleaningDisk(true);
      const res = await aiStudioApi.cleanupDisk(24);
      showAlert({
        title: "Disk Pruning Complete",
        message: `Freed ${res.freedMB} MB across ${res.deletedFilesCount} temporary files.`,
        style: "success"
      });
    } catch (e: any) {
      showAlert({ title: "Cleanup Failed", message: e.message || "Disk cleanup failed", style: "danger" });
    } finally {
      setIsCleaningDisk(false);
    }
  };

  const handleStatusChange = async (reelId: string, status: ReelStatus) => {
    const target = reelId === selectedReel?.id ? selectedReel : reels.find(r => r.id === reelId);
    if ((target?.status === 'APPROVED' || target?.status === 'EXPORTED' || target?.status === 'PUBLISHED') && status === 'REJECTED') {
      showAlert({ title: "Action Not Allowed", message: "Approved reels cannot be rejected.", style: "warning" });
      return;
    }
    try {
      setIsSaving(true);
      const res = await aiStudioApi.updateReel(reelId, { status });
      if (res?.reel && selectedReel?.id === reelId) {
        setSelectedReel(res.reel);
      } else if (selectedReel?.id === reelId) {
        setSelectedReel(prev => prev ? { ...prev, status } : null);
      }
      setActionSuccess(`Status updated to ${status}`);
      setTimeout(() => setActionSuccess(null), 3000);
      onRefresh();
    } catch (e: any) {
      showAlert({ title: "Update Failed", message: e.message || "Failed to update status", style: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedReel) return;
    try {
      setIsSaving(true);
      await aiStudioApi.updateReel(selectedReel.id, {
        title: editTitle,
        hook: editHook,
        summary: editSummary,
        category: editCategory,
        social_copy: editSocialCopy,
        hashtags: editHashtags,
      });
      setActionSuccess("Reel metadata saved successfully!");
      setTimeout(() => setActionSuccess(null), 3000);
      onRefresh();
    } catch (e: any) {
      showAlert({ title: "Save Failed", message: e.message || "Failed to save changes", style: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomReRender = async () => {
    if (!selectedReel) return;
    if (trimEnd <= trimStart) {
      showAlert({ title: "Invalid Timestamps", message: "End timestamp must be strictly greater than start timestamp.", style: "danger" });
      return;
    }
    try {
      setIsTrimming(true);
      const res = await aiStudioApi.reRenderReel(selectedReel.id, {
        template: selectedTheme,
        aspect_ratio: selectedAspect,
        hook: editHook,
        start_seconds: trimStart,
        end_seconds: trimEnd
      });
      setSelectedReel(res.reel);
      setActionSuccess("Reel re-rendered with visual theme successfully!");
      setTimeout(() => setActionSuccess(null), 3000);
      onRefresh();
    } catch (e: any) {
      showAlert({ title: "Re-render Failed", message: e.message || "Failed to re-render reel", style: "danger" });
    } finally {
      setIsTrimming(false);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    const confirmed = await showConfirm({
      title: "Delete Reel",
      message: "Are you sure you want to permanently delete this reel and its generated video file?",
      style: "danger",
      confirmText: "Delete",
      cancelText: "Cancel"
    });
    if (!confirmed) return;

    try {
      await aiStudioApi.deleteReel(reelId);
      if (selectedReel?.id === reelId) {
        setSelectedReel(null);
      }
      onRefresh();
    } catch (e: any) {
      showAlert({ title: "Deletion Failed", message: e.message || "Failed to delete reel", style: "danger" });
    }
  };

  // Video controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  // Filtered reels
  const filteredReels = reels.filter((reel) => {
    if (statusFilter !== "ALL" && reel.status !== statusFilter) return false;
    if (categoryFilter !== "ALL" && reel.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = reel.title?.toLowerCase().includes(q);
      const matchHook = reel.hook?.toLowerCase().includes(q);
      const matchDj = reel.dj_name?.toLowerCase().includes(q);
      const matchShow = reel.show_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchHook && !matchDj && !matchShow) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "virality") {
      return b.virality_score - a.virality_score;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getCategoryColor = (cat: ReelCategory) => {
    if (isLight) {
      switch (cat) {
        case "Drop":
          return "bg-rose-50 text-rose-700 border-rose-200";
        case "Transition":
          return "bg-cyan-50 text-cyan-700 border-cyan-200";
        case "Banter":
          return "bg-amber-50 text-amber-800 border-amber-200";
        case "Shoutout":
          return "bg-purple-50 text-purple-700 border-purple-200";
        case "Exclusive":
          return "bg-emerald-50 text-emerald-700 border-emerald-200";
        default:
          return "bg-blue-50 text-blue-700 border-blue-200";
      }
    }
    switch (cat) {
      case "Drop":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "Transition":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      case "Banter":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Shoutout":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "Exclusive":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }
  };

  const getStatusBadge = (st: ReelStatus) => {
    switch (st) {
      case "APPROVED":
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          }`}>
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            isLight ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-red-500/20 text-red-300 border-red-500/30"
          }`}>
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            isLight ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-amber-500/20 text-amber-300 border-amber-500/30"
          }`}>
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
    }
  };

  const visualizerThemes = [
    { id: "neon_cyber", label: "Neon Cyber", desc: "Cyan & Magenta Club Pulse", color: "from-cyan-500 to-fuchsia-500" },
    { id: "minimal_studio", label: "Minimal Studio", desc: "Clean Monochrome & Gold", color: "from-amber-400 to-slate-200" },
    { id: "retro_vinyl", label: "Retro Vinyl", desc: "Warm Amber & Orange", color: "from-amber-600 to-orange-500" },
    { id: "waveform_pulse", label: "Waveform Pulse", desc: "Emerald & Mint Glow", color: "from-emerald-400 to-teal-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl backdrop-blur-md ${
              isLight
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
            }`}
          >
            <div className="flex items-center gap-3 font-semibold text-sm">
              <CheckCircle2 className={`w-5 h-5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
              {actionSuccess}
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className={`text-xs font-bold hover:underline ${
                isLight ? "text-emerald-700" : "text-emerald-400"
              }`}
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control / Filter Bar */}
      <div className={`p-4 rounded-2xl border space-y-3 transition-colors ${
        isLight
          ? "bg-white border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          : "glass-panel border-white/10"
      }`}>
        {/* Top Row: Search, Status Filter & Action Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                isLight ? "text-slate-400" : "text-white/40"
              }`} />
              <input
                type="text"
                placeholder="Search by DJ, show, or hook keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-neon-purple transition ${
                  isLight
                    ? "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white"
                    : "bg-black/30 border border-white/10 text-white placeholder-white/40"
                }`}
              />
            </div>

            {/* Status Filter */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-black/30 border-white/10"
            }`}>
              {["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === st
                      ? "bg-neon-purple text-white shadow-md shadow-neon-purple/30"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {st === "ALL" ? "All Status" : st === "PENDING_REVIEW" ? "Pending" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Right Tools: Clean Disk & Sort */}
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            <button
              onClick={handleDiskCleanup}
              disabled={isCleaningDisk}
              title="Clean intermediate audio files older than 24 hours"
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
                isLight
                  ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
              }`}
            >
              <HardDrive className={`w-3.5 h-3.5 ${isCleaningDisk ? 'animate-spin' : 'text-amber-500'}`} />
              {isCleaningDisk ? "Pruning..." : "Clean Disk"}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-neon-purple border transition ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-800 focus:bg-white"
                  : "bg-black/30 border-white/10 text-white"
              }`}
            >
              <option value="date">Sort: Most Recent</option>
              <option value="virality">Sort: Highest Virality 🔥</option>
            </select>
          </div>
        </div>

        {/* Bottom Row: Category Tags & Result Count */}
        <div className={`pt-2.5 border-t flex flex-wrap items-center justify-between gap-2.5 ${
          isLight ? "border-slate-100" : "border-white/5"
        }`}>
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
              isLight ? "text-slate-400" : "text-white/40"
            }`}>
              Category:
            </span>
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${
              isLight ? "bg-slate-100/80 border-slate-200" : "bg-black/20 border-white/10"
            }`}>
              {["ALL", "Drop", "Transition", "Banter", "Shoutout", "Exclusive"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    categoryFilter === cat
                      ? isLight
                        ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200"
                        : "bg-white/20 text-white font-bold"
                      : isLight
                      ? "text-slate-500 hover:text-slate-900"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {cat === "ALL" ? "All Tags" : cat}
                </button>
              ))}
            </div>
          </div>

          <div className={`text-xs font-mono font-medium ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Showing <span className={`font-bold ${isLight ? "text-slate-800" : "text-white"}`}>{filteredReels.length}</span> of {reels.length} Reels
          </div>
        </div>
      </div>

      {/* Batch Actions Bar (Visible when 1+ reels selected) */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-lg backdrop-blur-md ${
              isLight
                ? "bg-slate-900 text-white border-slate-800"
                : "bg-neon-purple/20 border-neon-purple/50 text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllFiltered}
                className="flex items-center gap-2 text-xs font-bold text-neon-blue hover:underline"
              >
                {selectedIds.length === filteredReels.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedIds.length} selected
              </button>
              <span className="text-xs text-white/50">|</span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-white/70 hover:text-white hover:underline"
              >
                Clear selection
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchApprove}
                disabled={isBatchProcessing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve ({selectedIds.length})
              </button>

              <button
                onClick={handleBatchDownloadZip}
                disabled={isBatchProcessing}
                className="px-3 py-1.5 bg-neon-purple hover:bg-neon-purple/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download ZIP ({selectedIds.length})
              </button>

              <button
                onClick={handleBatchDelete}
                disabled={isBatchProcessing}
                className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIds.length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Review Workspace: Master Grid & Detailed Inspector */}
      {filteredReels.length === 0 ? (
        <div className={`p-16 rounded-3xl border text-center space-y-4 ${
          isLight ? "bg-white border-slate-200 text-slate-900 shadow-xs" : "glass-panel border-white/10 text-white"
        }`}>
          <Film className={`w-16 h-16 mx-auto ${isLight ? "text-slate-300" : "text-white/20"}`} />
          <h3 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
            No reels match your active filters
          </h3>
          <p className={`text-sm max-w-md mx-auto ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Try adjusting your search query, status filters, or trigger a new show analysis to generate social media clips.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Reels Grid (5 cols) */}
          <div className="lg:col-span-5 space-y-3 max-h-[85vh] overflow-y-auto pr-1">
            <div className={`flex items-center justify-between text-xs font-mono uppercase tracking-widest mb-2 px-1 ${
              isLight ? "text-slate-500 font-bold" : "text-white/40"
            }`}>
              <span>Generated Reels ({filteredReels.length})</span>
              <button
                onClick={selectAllFiltered}
                className="text-[11px] font-bold text-neon-purple hover:underline lowercase capitalize"
              >
                {selectedIds.length === filteredReels.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="space-y-3">
              {filteredReels.map((reel) => {
                const isSelected = selectedReel?.id === reel.id;
                const isChecked = selectedIds.includes(reel.id);

                return (
                  <ReelGalleryCard
                    key={reel.id}
                    reel={reel}
                    isSelected={isSelected}
                    isChecked={isChecked}
                    onSelect={() => handleSelectReel(reel)}
                    onToggleCheck={(e) => toggleSelectId(reel.id, e)}
                    getCategoryColor={getCategoryColor}
                    getStatusBadge={getStatusBadge}
                    isLight={isLight}
                  />
                );
              })}
            </div>
          </div>

          {/* Right Column: Video Player & Inspector Studio (7 cols) */}
          {selectedReel && (
            <div className="lg:col-span-7 space-y-6">
              {/* Top Inspector Card */}
              <div className={`p-6 rounded-3xl border space-y-6 transition-colors ${
                isLight
                  ? "bg-white border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                  : "glass-panel border-white/10"
              }`}>
                {/* Header with Title & Quick Review Actions */}
                <div className={`flex flex-wrap items-start justify-between gap-4 border-b pb-5 ${
                  isLight ? "border-slate-200" : "border-white/10"
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getCategoryColor(selectedReel.category)}`}>
                        {selectedReel.category}
                      </span>
                      {getStatusBadge(selectedReel.status)}
                      <span className={`text-xs font-mono ${isLight ? "text-slate-400" : "text-white/40"}`}>
                        ID: {selectedReel.id.substring(0, 14)}...
                      </span>
                    </div>
                    <h3 className={`text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {selectedReel.title}
                    </h3>
                    <p className={`text-xs ${isLight ? "text-slate-600" : "text-white/50"}`}>
                      {selectedReel.summary}
                    </p>
                  </div>

                  {/* Approve / Reject Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(selectedReel.id, "APPROVED")}
                      disabled={isSaving || selectedReel.status === "APPROVED"}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        selectedReel.status === "APPROVED"
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 cursor-default"
                          : isLight
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white cursor-pointer"
                          : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white cursor-pointer"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {selectedReel.status === "APPROVED" ? "Approved Clip" : "Approve Clip"}
                    </button>

                    <button
                      onClick={() => handleStatusChange(selectedReel.id, "REJECTED")}
                      disabled={isSaving || selectedReel.status === "APPROVED" || selectedReel.status === "EXPORTED" || selectedReel.status === "PUBLISHED"}
                      title={selectedReel.status === "APPROVED" ? "Approved clips cannot be rejected" : undefined}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        selectedReel.status === "APPROVED" || selectedReel.status === "EXPORTED" || selectedReel.status === "PUBLISHED"
                          ? isLight
                            ? "bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed"
                            : "bg-white/5 text-white/30 border border-white/5 opacity-40 cursor-not-allowed"
                          : selectedReel.status === "REJECTED"
                          ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20"
                          : isLight
                          ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white cursor-pointer"
                          : "bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500 hover:text-white cursor-pointer"
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>

                {/* Video Stage & Playback Controls */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Smartphone Preview Frame (5 cols) */}
                  <div className="md:col-span-5 flex justify-center">
                    <StudioPhonePreviewFrame
                      reel={selectedReel}
                      videoRef={videoRef}
                      isPlaying={isPlaying}
                      onTogglePlay={togglePlay}
                      isMuted={isMuted}
                      onToggleMute={toggleMute}
                      currentTime={currentTime}
                      duration={duration || selectedReel.duration_seconds || 30}
                      selectedAspect={selectedAspect}
                      isLight={isLight}
                    />
                  </div>

                  {/* Video Customizer & Precision Trim Panel */}
                  <div className="md:col-span-7 space-y-4">
                    <div className={`p-4 rounded-2xl border space-y-3.5 ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/10"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${
                          isLight ? "text-slate-900" : "text-white"
                        }`}>
                          <Palette className="w-4 h-4 text-neon-purple" />
                          Visualizer Theme & Aspect Ratio
                        </span>
                        <span className={`text-[11px] font-mono ${
                          isLight ? "text-slate-500" : "text-white/50"
                        }`}>
                          FFmpeg Engine
                        </span>
                      </div>

                      {/* Visualizer Themes */}
                      <div className="grid grid-cols-2 gap-2">
                        {visualizerThemes.map((th) => (
                          <button
                            key={th.id}
                            onClick={() => setSelectedTheme(th.id)}
                            className={`p-2 rounded-xl border text-left transition flex flex-col gap-0.5 ${
                              selectedTheme === th.id
                                ? isLight
                                  ? "bg-white border-neon-purple shadow-sm ring-1 ring-neon-purple"
                                  : "bg-neon-purple/20 border-neon-purple shadow-md"
                                : isLight
                                ? "bg-white/60 border-slate-200 hover:bg-white"
                                : "bg-white/5 border-white/10 hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                                {th.label}
                              </span>
                              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${th.color}`} />
                            </div>
                            <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/50"}`}>
                              {th.desc}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Aspect Ratio Options */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-mono uppercase font-bold ${isLight ? "text-slate-600" : "text-white/50"}`}>
                          Format:
                        </span>
                        {[
                          { id: "9:16", label: "9:16 Reel / Story" },
                          { id: "1:1", label: "1:1 Square" },
                          { id: "16:9", label: "16:9 Landscape" },
                        ].map((asp) => (
                          <button
                            key={asp.id}
                            onClick={() => setSelectedAspect(asp.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                              selectedAspect === asp.id
                                ? "bg-neon-purple text-white border-neon-purple"
                                : isLight
                                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                : "bg-white/5 border-white/10 text-white/70 hover:text-white"
                            }`}
                          >
                            {asp.label}
                          </button>
                        ))}
                      </div>

                      {/* Precision Trim */}
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/50">
                        <div>
                          <label className={`text-[10px] font-mono uppercase font-bold ${
                            isLight ? "text-slate-600" : "text-white/50"
                          }`}>
                            Start Time (sec)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={trimStart}
                            onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                            className={`w-full mt-1 px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-neon-blue ${
                              isLight
                                ? "bg-white border border-slate-300 text-slate-900"
                                : "bg-black/40 border border-white/10 text-white"
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`text-[10px] font-mono uppercase font-bold ${
                            isLight ? "text-slate-600" : "text-white/50"
                          }`}>
                            End Time (sec)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={trimEnd}
                            onChange={(e) => setTrimEnd(parseFloat(e.target.value) || 0)}
                            className={`w-full mt-1 px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-neon-blue ${
                              isLight
                                ? "bg-white border border-slate-300 text-slate-900"
                                : "bg-black/40 border border-white/10 text-white"
                            }`}
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCustomReRender}
                        disabled={isTrimming}
                        className="w-full py-2.5 bg-neon-purple hover:bg-neon-purple/90 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md shadow-neon-purple/20"
                      >
                        {isTrimming ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Rendering High-Definition Social Video...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            Re-Render with Selected Theme & Aspect
                          </>
                        )}
                      </button>
                    </div>

                    {/* Download & Delete Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {selectedReel.video_url && (
                        <button
                          onClick={() => handleDownloadFile(
                            selectedReel.video_url!,
                            `DejavuFM_${selectedReel.category || 'Reel'}_${selectedReel.id}.mp4`
                          )}
                          disabled={isDownloading}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border ${
                            isLight
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200 shadow-xs"
                              : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                          } disabled:opacity-50`}
                        >
                          {isDownloading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-neon-purple" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 text-neon-purple" />
                              Download MP4 Video
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteReel(selectedReel.id)}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition border ${
                          isLight
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                            : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                        }`}
                        title="Delete this reel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Social Media Copy & Metadata Editor */}
                <div className={`border-t pt-5 space-y-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-bold flex items-center gap-2 ${
                      isLight ? "text-slate-900" : "text-white"
                    }`}>
                      <Share2 className="w-4 h-4 text-neon-purple" />
                      Social Media Ready Post Kit
                    </h4>
                    <button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="px-4 py-1.5 bg-neon-purple hover:bg-neon-purple/90 text-white rounded-xl text-xs font-bold shadow-md shadow-neon-purple/20 transition"
                    >
                      Save Edits
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* On-screen Hook */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-[11px] font-mono uppercase font-bold ${
                          isLight ? "text-slate-600" : "text-white/50"
                        }`}>
                          On-Screen Video Hook
                        </label>
                        <button
                          onClick={() => handleCopy(editHook, "hook")}
                          className="text-[10px] font-mono text-neon-purple hover:underline flex items-center gap-1 font-bold"
                        >
                          {copiedKey === "hook" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === "hook" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editHook}
                        onChange={(e) => setEditHook(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-neon-purple font-bold uppercase transition ${
                          isLight
                            ? "bg-slate-50 border border-slate-300 text-cyan-800 focus:bg-white"
                            : "bg-black/40 border border-white/10 text-neon-blue"
                        }`}
                      />
                    </div>

                    {/* Social Post Caption */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-[11px] font-mono uppercase font-bold ${
                          isLight ? "text-slate-600" : "text-white/50"
                        }`}>
                          Social Caption (IG / TikTok / Shorts)
                        </label>
                        <button
                          onClick={() => handleCopy(`${editSocialCopy}\n\n${editHashtags}`, "caption")}
                          className="text-[10px] font-mono text-neon-purple hover:underline flex items-center gap-1 font-bold"
                        >
                          {copiedKey === "caption" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === "caption" ? "Copied 1-Click Kit" : "1-Click Copy All"}
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={editSocialCopy}
                        onChange={(e) => setEditSocialCopy(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-neon-purple resize-none transition ${
                          isLight
                            ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white"
                            : "bg-black/40 border border-white/10 text-white"
                        }`}
                      />
                    </div>

                    {/* Hashtags */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-[11px] font-mono uppercase font-bold ${
                          isLight ? "text-slate-600" : "text-white/50"
                        }`}>
                          Hashtags
                        </label>
                        <button
                          onClick={() => handleCopy(editHashtags, "hashtags")}
                          className="text-[10px] font-mono text-neon-purple hover:underline flex items-center gap-1 font-bold"
                        >
                          {copiedKey === "hashtags" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === "hashtags" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editHashtags}
                        onChange={(e) => setEditHashtags(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-neon-purple transition ${
                          isLight
                            ? "bg-slate-50 border border-slate-300 text-slate-800 focus:bg-white"
                            : "bg-black/40 border border-white/10 text-white/80"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
