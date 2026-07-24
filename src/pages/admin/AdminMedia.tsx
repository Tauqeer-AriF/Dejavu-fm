import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Video, Music, Trash2, Search, Loader2, Upload, Plus, CheckSquare, Square, ChevronLeft, ChevronRight, X, Clipboard, Check, ChevronDown, Clock, RefreshCw, Settings, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAdmin } from './adminApi';
import { useLogo } from '../../hooks/useLogo';
import { useModal } from '../../context/ModalContext';

type MediaUsage = { table: string; column: string; recordId: string };

type MediaItem = {
  filename: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'other';
  size: number;
  created_at: string;
  usages: MediaUsage[];
};

type MediaAutoDeleteSettings = {
  enabled: boolean;
  hours: number;
  mode: 'orphaned' | 'all';
  lastRun: string;
  totalFiles: number;
  orphanedFiles: number;
  totalSizeBytes: number;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const getTypeIcon = (type: string) => {
  if (type === 'image') return <ImageIcon className="w-4 h-4" />;
  if (type === 'video') return <Video className="w-4 h-4" />;
  if (type === 'audio') return <Music className="w-4 h-4" />;
  return <ImageIcon className="w-4 h-4" />;
};

export function AdminMedia() {
  const { isLightMode } = useLogo();
  const { showAlert, showConfirm } = useModal();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showOrphanedOnly, setShowOrphanedOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingReferences, setViewingReferences] = useState<MediaItem | null>(null);
  const [customValue, setCustomValue] = useState<string>('24');
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('hours');
  const [showAutoDeletePanel, setShowAutoDeletePanel] = useState<boolean>(true);
  const itemsPerPage = 20;

  const { data: autoDeleteSettings, isLoading: isAutoDeleteLoading } = useQuery<MediaAutoDeleteSettings>({
    queryKey: ['mediaAutoDeleteSettings'],
    queryFn: async () => {
      const res = await fetchAdmin('/api/admin/media/auto-delete');
      if (!res.ok) throw new Error('Failed to load auto-delete settings');
      return res.json();
    }
  });

  const updateAutoDeleteMutation = useMutation({
    mutationFn: async (payload: { enabled?: boolean; hours?: number; mode?: 'orphaned' | 'all' }) => {
      const res = await fetchAdmin('/api/admin/media/auto-delete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update auto-delete settings');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaAutoDeleteSettings'] });
      showAlert({ title: 'Retention Updated', message: 'Media retention settings saved successfully.', style: 'success' });
    },
    onError: (err: any) => {
      showAlert({ title: 'Error', message: err.message || 'Failed to update settings.', style: 'danger' });
    }
  });

  const runAutoDeleteNowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchAdmin('/api/admin/media/auto-delete/run-now', {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to run media cleanup');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['mediaAutoDeleteSettings'] });
      queryClient.invalidateQueries({ queryKey: ['adminMedia'] });
      showAlert({
        title: 'Purge Complete',
        message: `Cleaned up ${data.deletedCount || 0} expired media asset(s).`,
        style: 'success'
      });
    },
    onError: (err: any) => {
      showAlert({ title: 'Error', message: err.message || 'Failed to run media purge.', style: 'danger' });
    }
  });

  const formatRetentionHours = (hours: number) => {
    if (hours % 24 === 0 && hours >= 24) {
      const days = hours / 24;
      return `${days} ${days === 1 ? 'Day' : 'Days'} (${hours}h)`;
    }
    return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
  };

  const handleApplyCustomRetention = () => {
    const val = parseInt(customValue, 10);
    if (isNaN(val) || val < 1) {
      showAlert({ title: 'Invalid Duration', message: 'Please enter a valid positive number.', style: 'warning' });
      return;
    }
    const totalHours = customUnit === 'days' ? val * 24 : val;
    if (totalHours > 8760) {
      showAlert({ title: 'Duration Limit Exceeded', message: 'Retention period cannot exceed 365 days (8760 hours).', style: 'warning' });
      return;
    }
    updateAutoDeleteMutation.mutate({ hours: totalHours });
  };

  const handleManualPurge = async () => {
    const modeText = autoDeleteSettings?.mode === 'all' ? 'ALL media assets' : 'ORPHANED (unused) media assets';
    const hoursText = formatRetentionHours(autoDeleteSettings?.hours || 168);
    const confirmed = await showConfirm({
      title: 'Run Media Purge Now?',
      message: `Are you sure you want to run media cleanup now? This will permanently delete ${modeText} older than ${hoursText} from disk storage and remove database references. This cannot be undone.`,
      style: 'danger',
      confirmText: 'Run Purge Now'
    });
    if (confirmed) {
      runAutoDeleteNowMutation.mutate();
    }
  };

  const { data: media = [], isLoading, isError } = useQuery<MediaItem[], Error>({
    queryKey: ['adminMedia'],
    queryFn: async () => {
      const res = await fetchAdmin('/api/admin/media');
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load media assets');
      }
      return res.json();
    },
  });

  const uploadMutation = useMutation<unknown, Error, File[]>({
    mutationFn: async (files) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('media', file));

      const res = await fetchAdmin('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMedia'] });
      setSelectedFiles(null);
      showAlert({ title: 'Uploaded', message: 'Media files uploaded successfully.', style: 'success' });
    },
    onError: (error: any) => {
      showAlert({ title: 'Error', message: error?.message || 'Upload failed.', style: 'danger' });
    }
  });

  const deleteMutation = useMutation<unknown, Error, string[]>({
    mutationFn: async (filenames) => {
      const res = await fetchAdmin('/api/admin/media', {
        method: 'DELETE',
        body: JSON.stringify({ files: filenames }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete media items');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMedia'] });
      setSelectedItems([]);
      showAlert({ title: 'Deleted', message: 'Media file(s) removed successfully.', style: 'success' });
    },
    onError: (error: any) => {
      showAlert({ title: 'Error', message: error?.message || 'Could not delete media.', style: 'danger' });
    }
  });

  const filteredMedia = useMemo(() => {
    const query = search.trim().toLowerCase();
    
    let filtered = media;

    if (filterType !== 'all') {
      if (filterType === 'orphaned') {
        filtered = filtered.filter(item => item.usages.length === 0);
      } else {
        filtered = filtered.filter(item => item.type === filterType);
      }
    }

    if (!query) return filtered;

    return filtered.filter((item: any) => {
      const filenameMatch = item.filename.toLowerCase().includes(query);
      const typeMatch = item.type.toLowerCase().includes(query);
      const usageMatch = item.usages?.some((usage: any) =>
        String(usage.table).toLowerCase().includes(query) ||
        String(usage.column).toLowerCase().includes(query) ||
        String(usage.recordId).toLowerCase().includes(query)
      );
      return filenameMatch || typeMatch || usageMatch;
    });
  }, [media, search, filterType]);

  const counts = useMemo(() => ({
    image: media.filter((item: any) => item.type === 'image').length,
    video: media.filter((item: any) => item.type === 'video').length,
    audio: media.filter((item: any) => item.type === 'audio').length,
    other: media.filter((item: any) => item.type === 'other').length,
    orphaned: media.filter((item: any) => item.usages.length === 0).length,
  }), [media]);

  const totalPages = Math.ceil(filteredMedia.length / itemsPerPage);
  const paginatedMedia = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMedia.slice(start, start + itemsPerPage);
  }, [filteredMedia, currentPage]);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  const handleDelete = async (filename: string | string[]) => {
    const fileList = Array.isArray(filename) ? filename : [filename];
    const count = fileList.length;
    const confirmed = await showConfirm({ title: 'Confirm Deletion', message: `Delete ${count} selected media file${count === 1 ? '' : 's'} from storage and remove database references? This cannot be undone.`, style: 'danger', confirmText: 'Delete' });
    if (confirmed) {
      deleteMutation.mutate(fileList);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleUpload = () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      showAlert({ title: 'Select files', message: 'Please choose at least one file to upload.', style: 'warning' });
      return;
    }
    uploadMutation.mutate(Array.from(selectedFiles));
  };

  const toggleSelection = (filename: string) => {
    setSelectedItems((prev) =>
      prev.includes(filename) ? prev.filter((item) => item !== filename) : [...prev, filename]
    );
  };

  const isSelected = (filename: string) => selectedItems.includes(filename);

  const toggleSelectAll = () => {
    setSelectedItems(selectedItems.length === paginatedMedia.length ? [] : paginatedMedia.map(item => item.filename));
  };

  return (
    <div className={`space-y-8 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-neon-purple" />
          <div>
            <h2 className="text-3xl font-display font-black uppercase tracking-tight">Media</h2>
            <p className="text-sm opacity-70">Browse and remove uploaded images, audio, and videos across the application.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-dark-bg/50 p-4">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center text-neon-purple shrink-0"><ImageIcon className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold truncate">{counts.image}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Images</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-dark-bg/50 p-4">
            <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue shrink-0"><Video className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold truncate">{counts.video}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Videos</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-dark-bg/50 p-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 shrink-0"><Music className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold truncate">{counts.audio}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Audio</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-dark-bg/50 p-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0"><Trash2 className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold truncate">{counts.orphaned}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Orphaned Assets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Automatic Media Retention & Purge Panel */}
      <div className={`rounded-3xl border p-6 space-y-6 transition-all ${isLightMode ? 'bg-white border-slate-200 shadow-xl' : 'bg-dark-bg/60 border-white/10 shadow-2xl'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-purple/10 text-neon-purple border border-neon-purple/20 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold tracking-tight">Automatic Media Auto-Deletion</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  autoDeleteSettings?.enabled 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-white/10 text-white/50 border border-white/10'
                }`}>
                  {autoDeleteSettings?.enabled 
                    ? `Active · Purging Every ${formatRetentionHours(autoDeleteSettings.hours)}`
                    : 'Disabled'}
                </span>
              </div>
              <p className="text-xs opacity-70 mt-1">
                Automate the cleanup of media assets from disk storage (`/uploads/`) and database references on a recurring schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => updateAutoDeleteMutation.mutate({ enabled: !autoDeleteSettings?.enabled })}
              disabled={updateAutoDeleteMutation.isPending}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoDeleteSettings?.enabled ? 'bg-neon-purple' : 'bg-white/20'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  autoDeleteSettings?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
              {autoDeleteSettings?.enabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {autoDeleteSettings?.enabled && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Mode / Scope Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => updateAutoDeleteMutation.mutate({ mode: 'orphaned' })}
                className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                  autoDeleteSettings.mode === 'orphaned'
                    ? 'border-neon-purple bg-neon-purple/10 text-white ring-1 ring-neon-purple/50'
                    : isLightMode ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-white/10 bg-black/30 text-white/70 hover:bg-white/5'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${autoDeleteSettings.mode === 'orphaned' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-white/10 text-white/50'}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Orphaned Assets Only</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Recommended & Safe</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    Only deletes files in `/uploads/` that have 0 references in any database table (e.g. removed posts, deleted avatars). Active banners and media remain safe.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateAutoDeleteMutation.mutate({ mode: 'all' })}
                className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                  autoDeleteSettings.mode === 'all'
                    ? 'border-rose-500 bg-rose-500/10 text-white ring-1 ring-rose-500/50'
                    : isLightMode ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-white/10 bg-black/30 text-white/70 hover:bg-white/5'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${autoDeleteSettings.mode === 'all' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-white/50'}`}>
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">All Uploaded Files</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">Full Storage Purge</span>
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    Purges all media files created or modified older than the retention timer from storage disk and clears database references.
                  </p>
                </div>
              </button>
            </div>

            {/* Retention Timer Presets & Custom Duration */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider opacity-60">
                Retention Interval / Timer Threshold
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1 Hour', hours: 1 },
                  { label: '6 Hours', hours: 6 },
                  { label: '24 Hours (1 Day)', hours: 24 },
                  { label: '3 Days', hours: 72 },
                  { label: '7 Days', hours: 168 },
                  { label: '30 Days', hours: 720 },
                ].map((preset) => {
                  const isActive = autoDeleteSettings.hours === preset.hours;
                  return (
                    <button
                      key={preset.hours}
                      type="button"
                      onClick={() => updateAutoDeleteMutation.mutate({ hours: preset.hours })}
                      className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20'
                          : isLightMode ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Duration Input */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="number"
                    min="1"
                    max="8760"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="Duration"
                    className={`w-28 px-4 py-2.5 rounded-xl border text-sm font-mono focus:border-neon-purple focus:outline-none ${
                      isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                    }`}
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as 'hours' | 'days')}
                    className={`px-3 py-2.5 rounded-xl border text-sm focus:border-neon-purple focus:outline-none ${
                      isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-black/40 border-white/10 text-white'
                    }`}
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyCustomRetention}
                    disabled={updateAutoDeleteMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-neon-purple hover:bg-neon-blue text-white text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 shrink-0"
                  >
                    Apply Custom Time
                  </button>
                </div>

                <div className="text-xs opacity-50 ml-auto font-mono">
                  Current Setting: <span className="font-bold text-neon-purple">{formatRetentionHours(autoDeleteSettings.hours)}</span>
                </div>
              </div>
            </div>

            {/* Run Purge Now & Metadata Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs">
              <div className="space-y-1 opacity-70">
                <p>
                  Last Purge Execution:{' '}
                  <span className="font-semibold">
                    {autoDeleteSettings.lastRun ? new Date(autoDeleteSettings.lastRun).toLocaleString() : 'Never'}
                  </span>
                </p>
                <p>
                  Current Target:{' '}
                  <span className="font-semibold">
                    {autoDeleteSettings.mode === 'orphaned' ? `${autoDeleteSettings.orphanedFiles} Orphaned Asset(s)` : `${autoDeleteSettings.totalFiles} Total File(s)`}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualPurge}
                disabled={runAutoDeleteNowMutation.isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-widest transition disabled:opacity-50"
              >
                {runAutoDeleteNowMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {runAutoDeleteNowMutation.isPending ? 'Purging Media...' : 'Purge Expired Media Now'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search media by name, type, or usage"
            className="w-full rounded-full border border-white/10 bg-black/40 px-12 py-3 text-sm text-white placeholder-white/40 focus:border-neon-purple focus:outline-none transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full md:w-auto appearance-none rounded-full border border-white/10 bg-black/40 px-5 py-3 text-sm text-white/80 focus:border-neon-purple focus:outline-none transition-all"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="orphaned">Orphaned Assets</option>
            <option value="other">Other</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        </div>
      </div>

      {selectedFiles && selectedFiles.length > 0 ? (
        <div className="rounded-3xl border border-neon-purple/30 bg-neon-purple/10 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">{selectedFiles.length} file(s) selected for upload</h3>
            <button type="button" onClick={() => setSelectedFiles(null)} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {Array.from(selectedFiles).map((file: any, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-black/30 rounded-lg text-xs">
                <span className="truncate font-semibold">{file.name}</span>
                <span className="text-white/50 font-mono shrink-0 ml-4">{formatBytes(file.size)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedFiles(null)}
              className="px-6 py-2 rounded-xl bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-neon-purple px-6 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-neon-blue disabled:opacity-50 disabled:cursor-wait"
            >
              {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadMutation.isPending ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <label className="rounded-3xl border border-white/10 bg-dark-bg/50 p-4 cursor-pointer transition hover:border-neon-purple/50 hover:bg-neon-purple/5 flex items-center gap-3">
              <Upload className="w-5 h-5 text-neon-purple" />
              <span className="font-semibold">Add media</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*,video/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={() => handleDelete(selectedItems)}
                disabled={deleteMutation.isPending}
                className={`inline-flex items-center justify-center gap-2 rounded-3xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${isLightMode ? 'border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20' : 'border-red-500/20 bg-red-500/10 text-red-100 hover:bg-red-500/20'}`}
              >
                <Trash2 className="w-4 h-4" />
                Delete selected
              </button>
            )}
          </div>
          <div className="text-xs text-white/50 max-w-xs truncate">
            Choose media files to upload (images, audio, video)
          </div>
        </div>
      )}

      {isError ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100">
          Failed to load media. Refresh the page or check the server.
        </div>
      ) : null}

      <div className="flex justify-end">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 transition-colors hover:bg-white/5">
          <input
            type="checkbox"
            onChange={toggleSelectAll}
            checked={paginatedMedia.length > 0 && selectedItems.length >= paginatedMedia.length && paginatedMedia.every(item => selectedItems.includes(item.filename))}
            className="h-4 w-4 rounded border-white/20 bg-white/10 text-neon-purple focus:ring-neon-purple/50"
          />
          <span>
            Select All
          </span>
        </label>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {filteredMedia.length === 0 && !isLoading ? (
          <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-slate-950/60 p-12 text-center flex flex-col items-center gap-4 my-8">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/30">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Media Found</h3>
              <p className="text-sm text-white/50 mt-1 max-w-sm">
                {search.trim() || filterType !== 'all' ? 'No assets match your current search or filter.' : 'Your media library is empty. Upload your first file to get started.'}
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-neon-purple px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-neon-blue disabled:opacity-50 disabled:cursor-wait">
              <Upload className="w-4 h-4" />
              Upload Media
            </button>
          </div>
        ) : null}

        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <MediaSkeletonCard key={index} isLightMode={isLightMode} />
          ))
        ) : (
          paginatedMedia.map((item: MediaItem) => (
            <MediaItemCard
              isLightMode={isLightMode}
              key={item.filename}
              item={item}
              isSelected={isSelected(item.filename)}
              onToggleSelection={toggleSelection}
              onShowReferences={() => setViewingReferences(item)}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending && selectedItems.includes(item.filename)}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <AnimatePresence>
        {viewingReferences && (
          <ReferencesModal item={viewingReferences} onClose={() => setViewingReferences(null)} isLightMode={isLightMode} />
        )}
      </AnimatePresence>

      <div className="rounded-3xl border border-white/10 bg-dark-bg/50 p-6 text-sm text-white/60">
        <p className="font-semibold">Notes</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Deleting a media asset removes the file from the uploads directory and clears known database references.</li>
          <li>If the same file is stored with a full URL or used in a custom field, it may still exist elsewhere.</li>
          <li>Use the search box to find file names, media types, and usage matches.</li>
        </ul>
      </div>
    </div>
  );
}

function MediaSkeletonCard({ isLightMode }: { isLightMode: boolean; key?: any }) {
  return (
    <div className={`rounded-3xl border overflow-hidden shadow-lg animate-pulse ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950/95 border-white/10 shadow-[0_22px_55px_rgba(0,0,0,0.24)]'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/20'}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-full shrink-0 ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}></div>
          <div className="min-w-0 space-y-1.5">
            <div className={`h-2.5 w-32 rounded-full ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}></div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className={`w-8 h-8 rounded-lg ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}></div>
          <div className={`w-8 h-8 rounded-lg ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}></div>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        <div className={`relative overflow-hidden rounded-xl aspect-video ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <div className={`h-4 w-24 rounded-full ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}></div>
          </div>
          <div className={`h-16 w-full rounded-xl mt-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
        </div>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) {
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const halfMaxPages = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= halfMaxPages + 1) {
        for (let i = 1; i <= maxPagesToShow; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - halfMaxPages) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - maxPagesToShow + 1; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - halfMaxPages + 1; i <= currentPage + halfMaxPages - 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex justify-center items-center mt-6 space-x-2">
      <button onClick={() => onPageChange(Math.max(currentPage - 1, 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white/50 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
      {pageNumbers.map((page, index) =>
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-xl border text-xs font-bold transition-all ${currentPage === page ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'}`}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="w-10 h-10 flex items-center justify-center text-white/30 text-xs font-bold">...</span>
        )
      )}
      <button onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages} className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white/50 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
    </div>
  );
}

function MediaItemCard({ item, isSelected, onToggleSelection, onDelete, isDeleting, isLightMode, onShowReferences }: { item: MediaItem, isSelected: boolean, onToggleSelection: (filename: string) => void, onDelete: (filename: string) => void, isDeleting: boolean, isLightMode: boolean, onShowReferences: () => void, key?: any }) {
  const createdAt = new Date(item.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const [copied, setCopied] = useState(false);

  return (
    <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${isLightMode ? 'bg-white border-slate-200 shadow-lg' : 'bg-slate-950/95 border-white/10 shadow-[0_22px_55px_rgba(0,0,0,0.24)]'} ${isSelected ? 'ring-2 ring-neon-purple/80 shadow-[0_28px_80px_rgba(124,58,237,0.22)]' : 'hover:-translate-y-0.5 hover:shadow-xl'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/20'}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onToggleSelection(item.filename)}
            className={`rounded-full border p-2 transition hover:bg-neon-purple/10 shrink-0 ${isLightMode ? 'border-black/10 bg-black/5 text-black/80' : 'border-white/10 bg-black/50 text-white/80'}`}
          >
            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
          <div className="min-w-0">
            <p className={`truncate text-[10px] ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>
              {item.type.toUpperCase()} · {formatBytes(item.size)} · {createdAt}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => {
              const fullUrl = new URL(item.url, window.location.origin).href;
              navigator.clipboard.writeText(fullUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`inline-flex items-center justify-center p-2 rounded-lg border transition disabled:cursor-wait disabled:opacity-50 ${isLightMode ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20' : 'border-neon-blue/20 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20'}`}
            title="Copy URL"
          >
            {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onDelete(item.filename)}
            className={`inline-flex items-center justify-center p-2 rounded-lg border transition disabled:cursor-wait disabled:opacity-50 ${isLightMode ? 'border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/20'}`}
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        {item.type === 'image' ? (
          <div 
            onClick={onShowReferences}
            className={`relative overflow-hidden rounded-xl aspect-video cursor-pointer group transition-all duration-300 ${isLightMode ? 'bg-slate-100' : 'bg-slate-950'}`}
          >
            <img src={item.url} alt={item.filename} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                <Search className="w-5 h-5" />
              </div>
            </div>
          </div>
        ) : item.type === 'video' ? (
          <div className={`relative overflow-hidden rounded-xl aspect-video ${isLightMode ? 'bg-slate-100' : 'bg-slate-950'}`}>
            <video src={item.url} controls className="h-full w-full object-cover" />
          </div>
        ) : item.type === 'audio' ? (
          <div className={`rounded-xl border p-4 ${isLightMode ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-black/70'}`}>
            <p className="text-sm font-semibold">Audio preview</p>
            <audio src={item.url} controls className="mt-4 w-full" />
          </div>
        ) : (
          <div className={`rounded-xl border p-6 text-center text-sm ${isLightMode ? 'border-slate-200 bg-slate-100 text-black/60' : 'border-white/10 bg-black/70 text-white/60'}`}>
            No preview available for this file type.
          </div>
        )}

        <div className="grid gap-2">
          {item.usages?.length > 0 ? (
            <button
              onClick={onShowReferences}
              className={`w-full text-left text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border transition-all ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
            >
              View {item.usages.length} Reference{item.usages.length === 1 ? '' : 's'}
            </button>
          ) : (
             <div className="flex flex-wrap gap-2">
              <span className={`w-full text-center rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] uppercase tracking-widest ${isLightMode ? 'text-emerald-700' : 'text-emerald-200'}`}>
                  Orphaned Asset
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferencesModal({ item, onClose, isLightMode }: { item: MediaItem, onClose: () => void, isLightMode: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col border rounded-3xl overflow-hidden shadow-2xl ${isLightMode ? 'bg-white border-slate-200' : 'bg-dark-bg border-white/10'}`}
      >
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b flex-shrink-0 ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-white/5'}`}>
          <div className="min-w-0">
            <h3 className={`font-bold text-lg truncate ${isLightMode ? 'text-black' : 'text-white'}`}>{item.filename}</h3>
            <p className={`text-xs truncate ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
              {item.type.toUpperCase()} · {formatBytes(item.size)}
            </p>
          </div>
          <button type="button" onClick={onClose} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-black/10 text-black/40' : 'hover:bg-white/5 text-white/40'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Preview */}
          <div className="space-y-4">
            <h4 className={`text-sm font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Preview</h4>
            {item.type === 'image' ? (
              <div className={`relative overflow-hidden rounded-xl aspect-video ${isLightMode ? 'bg-slate-100' : 'bg-slate-950'}`}>
                <img src={item.url} alt={item.filename} className="h-full w-full object-contain" />
              </div>
            ) : item.type === 'video' ? (
              <div className={`relative overflow-hidden rounded-xl aspect-video ${isLightMode ? 'bg-slate-100' : 'bg-slate-950'}`}>
                <video src={item.url} controls className="h-full w-full object-contain" />
              </div>
            ) : item.type === 'audio' ? (
              <div className={`rounded-xl border p-4 ${isLightMode ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-black/70'}`}>
                <audio src={item.url} controls className="mt-4 w-full" />
              </div>
            ) : (
              <div className={`rounded-xl border p-6 text-center text-sm ${isLightMode ? 'border-slate-200 bg-slate-100 text-black/60' : 'border-white/10 bg-black/70 text-white/60'}`}>
                No preview available.
              </div>
            )}
          </div>

          {/* Right: Usages */}
          <div className="space-y-4">
            <h4 className={`text-sm font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
              {item.usages.length} Reference{item.usages.length === 1 ? '' : 's'}
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {item.usages.map((usage, index) => (
                <div key={index} className={`p-3 rounded-xl border ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                  <p className={`font-mono text-xs font-bold ${isLightMode ? 'text-cyan-700' : 'text-neon-blue'}`}>
                    {usage.table}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${isLightMode ? 'bg-black/5 text-black/60' : 'bg-white/10 text-white/60'}`}>
                      {usage.column}
                    </span>
                    <span className={`font-mono ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                      ID: {String(usage.recordId)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
