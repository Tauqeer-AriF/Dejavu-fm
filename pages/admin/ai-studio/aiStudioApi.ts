import { fetchAdmin } from "../adminApi";
import { AIJob, AIReel, AIPromptPreset, AIStudioSettings, AIStats } from "./types";

export const aiStudioApi = {
  getStats: async (): Promise<AIStats> => {
    const res = await fetchAdmin("/api/admin/ai-studio/stats");
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  getJobs: async (status?: string): Promise<AIJob[]> => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetchAdmin(`/api/admin/ai-studio/jobs${q}`);
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  },

  getJobDetails: async (jobId: string): Promise<{ job: AIJob; reels: AIReel[] }> => {
    const res = await fetchAdmin(`/api/admin/ai-studio/jobs/${jobId}`);
    if (!res.ok) throw new Error("Failed to fetch job details");
    return res.json();
  },

  createJob: async (data: {
    show_name: string;
    dj_name: string;
    dj_id?: string;
    source_type: string;
    source_url?: string;
    custom_prompt?: string;
    preset_id?: string;
    template?: string;
    aspect_ratio?: string;
    target_reels_count?: number;
    duration_seconds?: number;
  }): Promise<{ success: boolean; job: AIJob }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create AI analysis job");
    }
    return res.json();
  },

  cancelJob: async (jobId: string): Promise<{ success: boolean; job: AIJob }> => {
    const res = await fetchAdmin(`/api/admin/ai-studio/jobs/${jobId}/cancel`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to cancel job");
    return res.json();
  },

  deleteJob: async (jobId: string): Promise<{ success: boolean }> => {
    const res = await fetchAdmin(`/api/admin/ai-studio/jobs/${jobId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete job");
    return res.json();
  },

  getReels: async (params?: {
    status?: string;
    category?: string;
    search?: string;
    job_id?: string;
    sort?: string;
  }): Promise<AIReel[]> => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.category) sp.set("category", params.category);
    if (params?.search) sp.set("search", params.search);
    if (params?.job_id) sp.set("job_id", params.job_id);
    if (params?.sort) sp.set("sort", params.sort);

    const res = await fetchAdmin(`/api/admin/ai-studio/reels?${sp.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch reels");
    return res.json();
  },

  getReel: async (reelId: string): Promise<AIReel> => {
    const res = await fetchAdmin(`/api/admin/ai-studio/reels/${reelId}`);
    if (!res.ok) throw new Error("Failed to fetch reel");
    return res.json();
  },

  updateReel: async (
    reelId: string,
    data: {
      title?: string;
      hook?: string;
      summary?: string;
      category?: string;
      status?: string;
      social_copy?: string;
      hashtags?: string;
      admin_notes?: string | null;
    }
  ): Promise<{ success: boolean; reel: AIReel }> => {
    const res = await fetchAdmin(`/api/admin/ai-studio/reels/${reelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update reel");
    }
    return res.json();
  },

  trimReel: async (
    reelId: string,
    start_seconds: number,
    end_seconds: number
  ): Promise<{ success: boolean; reel: AIReel }> => {
    const res = await fetchAdmin(`/api/admin/ai-studio/reels/${reelId}/trim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_seconds, end_seconds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to trim and re-render reel");
    }
    return res.json();
  },

  reRenderReel: async (
    reelId: string,
    data: {
      template?: string;
      aspect_ratio?: string;
      hook?: string;
      caption?: string;
      start_seconds?: number;
      end_seconds?: number;
    }
  ): Promise<{ success: boolean; reel: AIReel }> => {
    const res = await fetchAdmin(`/api/admin/ai-studio/reels/${reelId}/re-render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to re-render reel");
    }
    return res.json();
  },

  batchApproveReels: async (reelIds: string[]): Promise<{ success: boolean; approvedCount: number }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/reels/batch-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reelIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to batch approve reels");
    }
    return res.json();
  },

  batchDeleteReels: async (reelIds: string[]): Promise<{ success: boolean; deletedCount: number }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/reels/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reelIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to batch delete reels");
    }
    return res.json();
  },

  batchDownloadZip: async (reelIds: string[]): Promise<Blob> => {
    const res = await fetchAdmin("/api/admin/ai-studio/reels/batch-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reelIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to download reels batch archive");
    }
    return res.blob();
  },

  cleanupDisk: async (maxAgeHours: number = 48): Promise<{
    success: boolean;
    deletedFilesCount: number;
    freedBytes: number;
    freedMB: string;
  }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxAgeHours }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to clean disk assets");
    }
    return res.json();
  },

  cleanupReels: async (maxAgeHours?: number, unapprovedOnly?: boolean): Promise<{
    success: boolean;
    deletedCount: number;
    freedMB: string;
    message: string;
  }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/cleanup-reels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxAgeHours, unapprovedOnly }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to purge expired reels");
    }
    return res.json();
  },

  deleteReel: async (reelId: string): Promise<{ success: boolean }> => {
    const res = await fetchAdmin(`/api/admin/ai-studio/reels/${reelId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete reel");
    return res.json();
  },

  getPresets: async (): Promise<AIPromptPreset[]> => {
    const res = await fetchAdmin("/api/admin/ai-studio/presets");
    if (!res.ok) throw new Error("Failed to fetch presets");
    return res.json();
  },

  savePreset: async (preset: Partial<AIPromptPreset>): Promise<{ success: boolean; preset: AIPromptPreset }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    });
    if (!res.ok) throw new Error("Failed to save preset");
    return res.json();
  },

  deletePreset: async (presetId: string): Promise<{ success: boolean }> => {
    const res = await fetchAdmin(`/api/admin/ai-studio/presets/${presetId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete preset");
    return res.json();
  },

  getSettings: async (): Promise<AIStudioSettings> => {
    const res = await fetchAdmin("/api/admin/ai-studio/settings");
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
  },

  saveSettings: async (settings: Partial<AIStudioSettings>): Promise<{ success: boolean; settings: AIStudioSettings }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error("Failed to save settings");
    return res.json();
  },

  triggerScheduleCheck: async (): Promise<{ success: boolean; triggeredCount: number; messages: string[] }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/check-schedule-now", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to trigger schedule check");
    return res.json();
  },

  getOnAirStatus: async (): Promise<{
    isOnAir: boolean;
    showName?: string;
    djName?: string;
    startTime?: string;
    endTime?: string;
    elapsedMins?: number;
    totalMins?: number;
    remainingMins?: number;
    progressPercent?: number;
    existingJob?: any;
  }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/on-air-status");
    if (!res.ok) throw new Error("Failed to fetch on-air status");
    return res.json();
  },

  uploadSourceMedia: async (file: File): Promise<{ success: boolean; url: string; filename: string; size: number }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchAdmin("/api/admin/ai-studio/upload-source", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to upload media");
    }
    return res.json();
  },

  getAuditLogs: async (params?: {
    action?: string;
    category?: string;
    search?: string;
    timeframe?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: {
      totalAIEvents: number;
      jobOperations: number;
      reelReviews: number;
      mediaEngineering: number;
      maintenanceActions: number;
      configUpdates: number;
    };
  }> => {
    const sp = new URLSearchParams();
    if (params?.action) sp.set("action", params.action);
    if (params?.category) sp.set("category", params.category);
    if (params?.search) sp.set("search", params.search);
    if (params?.timeframe) sp.set("timeframe", params.timeframe);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));

    const res = await fetchAdmin(`/api/admin/ai-studio/audit-logs?${sp.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch AI Studio audit logs");
    return res.json();
  },

  clearAuditLogs: async (): Promise<{ success: boolean; message: string; deletedCount: number }> => {
    const res = await fetchAdmin("/api/admin/ai-studio/audit-logs", {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to clear AI Studio audit logs");
    }
    return res.json();
  }
};
