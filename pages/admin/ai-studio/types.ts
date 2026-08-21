export type JobStatus = 'QUEUED' | 'CAPTURING' | 'ANALYZING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ReelStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPORTED' | 'PUBLISHED';

export type ReelCategory = 'Drop' | 'Transition' | 'Banter' | 'Shoutout' | 'Exclusive' | 'CrowdHype';

export type SourceType = 'live_stream' | 'stream_url' | 'podcast' | 'upload' | 'schedule_slot';

export interface AIJob {
  id: string;
  show_name: string;
  dj_name: string;
  dj_id?: string | null;
  source_type: SourceType;
  source_url?: string | null;
  status: JobStatus;
  progress: number;
  stage_message?: string | null;
  error_message?: string | null;
  config_json?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  reels_count?: number;
}

export interface AIReelCaption {
  start: number;
  end: number;
  text: string;
  highlight?: boolean;
}

export interface AIReel {
  id: string;
  job_id: string;
  title: string;
  hook?: string | null;
  summary?: string | null;
  virality_score: number;
  category: ReelCategory;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  audio_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  waveform_data?: string | null;
  captions_json?: string | null;
  social_copy?: string | null;
  hashtags?: string | null;
  status: ReelStatus;
  admin_notes?: string | null;
  aspect_ratio: string;
  template?: string;
  created_at: string;
  updated_at: string;
  show_name?: string;
  dj_name?: string;
  dj_id?: string;
}

export interface AIPromptPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt_instructions: string;
  style_tags?: string | null;
  target_duration: number;
  is_default: number;
  created_at: string;
}

export interface AIStudioSettings {
  ai_studio_enabled: boolean;
  ai_gemini_model: string;
  ai_default_reel_duration: number;
  ai_brand_handle: string;
  ai_brand_hashtag: string;
  ai_auto_process_on_show_end: boolean;
  ai_auto_delete_reels_enabled: boolean;
  ai_auto_delete_reels_hours: number;
  ai_auto_delete_unapproved_only: boolean;
  ai_system_prompt: string;
  ai_custom_gemini_api_key?: string;
  has_system_gemini_key?: boolean;
  stream_url?: string;
  studio_video_url?: string;
}

export interface AIStats {
  totalJobs: number;
  activeJobs: number;
  totalReels: number;
  pendingReview: number;
  approvedReels: number;
  rejectedReels: number;
  avgViralityScore: number;
}

export interface AIAuditLog {
  id: number;
  username: string;
  role: string;
  action: string;
  resource: string;
  resource_id?: string | null;
  details?: string | null;
  timestamp: string;
}

export interface AIAuditStats {
  totalAIEvents: number;
  jobOperations: number;
  reelReviews: number;
  mediaEngineering: number;
  maintenanceActions: number;
  configUpdates: number;
}

export interface AIAuditLogsResponse {
  logs: AIAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: AIAuditStats;
}
