import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Radio, 
  FileAudio, 
  Database,
  Sliders
} from 'lucide-react';
import { toast } from 'sonner';
import { useModal } from '../../../context/ModalContext';
import { useLogo } from '../../../hooks/useLogo';
import { fetchAdmin } from '../adminApi';

interface AudioStorageStats {
  total_audio_files: number;
  total_audio_bytes: number;
  total_audio_formatted: string;
  categories: {
    ai_temp_captures: { count: number; bytes: number; formatted: string };
    stream_recordings: { count: number; bytes: number; formatted: string };
    orphaned_temp_uploads: { count: number; bytes: number; formatted: string };
    library_audio: { count: number; bytes: number; formatted: string };
  };
  database: {
    db_size_formatted: string;
    wal_size_formatted: string;
    stale_telemetry_rows: number;
  };
}

interface Props {
  onCleanupComplete?: () => void;
  compact?: boolean;
}

export const AudioStorageCleanupCard: React.FC<Props> = ({ onCleanupComplete, compact = false }) => {
  const { isLightMode } = useLogo();
  const { showConfirm } = useModal();
  const [stats, setStats] = useState<AudioStorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    freed_formatted: string;
    deleted_files_count: number;
    purged_db_rows: number;
    new_db_size: string;
    details: string[];
  } | null>(null);

  // Configuration options
  const [retentionHours, setRetentionHours] = useState<number>(24);
  const [cleanTempCaptures, setCleanTempCaptures] = useState<boolean>(true);
  const [cleanRecordings, setCleanRecordings] = useState<boolean>(false);
  const [cleanOrphanedAudio, setCleanOrphanedAudio] = useState<boolean>(true);
  const [pruneDbTelemetry, setPruneDbTelemetry] = useState<boolean>(true);
  const [runVacuum, setRunVacuum] = useState<boolean>(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin('/api/admin/audio-storage/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load audio storage stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExecuteCleanup = async () => {
    const confirmed = await showConfirm({
      title: 'Execute Audio & Database Cleanup',
      message: `Are you sure you want to delete temporary audio files older than ${retentionHours === 0 ? 'all time' : `${retentionHours} hours`} and reclaim database disk space?`,
      confirmText: 'Start Cleanup Task',
      style: 'danger'
    });

    if (!confirmed) return;

    setCleaning(true);
    setLastResult(null);
    const toastId = toast.loading('Executing server-side audio & database cleanup...');

    try {
      const res = await fetchAdmin('/api/admin/audio-storage/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retention_hours: retentionHours,
          clean_temp_captures: cleanTempCaptures,
          clean_recordings: cleanRecordings,
          clean_orphaned_audio: cleanOrphanedAudio,
          prune_db_telemetry: pruneDbTelemetry,
          run_vacuum: runVacuum
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastResult(data);
        toast.success(`Reclaimed ${data.freed_formatted} disk space and purged ${data.purged_db_rows} database records! New DB size: ${data.new_db_size}`, { id: toastId });
        fetchStats();
        if (onCleanupComplete) onCleanupComplete();
      } else {
        toast.error(data.error || 'Failed to complete cleanup task.', { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || 'An unexpected error occurred.', { id: toastId });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div 
      id="audio-storage-cleanup-section" 
      className={`border rounded-2xl p-5 sm:p-6 space-y-6 transition-colors relative overflow-hidden ${
        isLightMode 
          ? 'bg-[#f8f9fa] border-black/10 shadow-xs' 
          : 'bg-gray-900 border-gray-800 shadow-xl'
      }`}
    >
      {/* Background Accent Glow */}
      <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
        isLightMode ? 'bg-cyan-500/10' : 'bg-cyan-500/5'
      }`} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl border ${
              isLightMode 
                ? 'bg-cyan-50 border-cyan-200 text-cyan-700' 
                : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
            }`}>
              <FileAudio className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${
                isLightMode ? 'text-slate-900' : 'text-white'
              }`}>
                Audio Storage & Database Reclaim Task
              </h2>
              <p className={`text-xs ${
                isLightMode ? 'text-slate-600' : 'text-gray-400'
              }`}>
                Purge stale audio captures, temp render chunks, obsolete recordings, and defragment database storage.
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-refresh-audio-stats"
          type="button"
          onClick={fetchStats}
          disabled={loading || cleaning}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 border ${
            isLightMode 
              ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs' 
              : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 border-gray-700'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Scan Storage
        </button>
      </div>

      {/* Storage Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
        <div className={`p-3.5 border rounded-xl space-y-1 ${
          isLightMode 
            ? 'bg-white border-slate-200 shadow-xs' 
            : 'bg-gray-950/60 border-gray-800/80'
        }`}>
          <div className={`flex items-center justify-between text-xs ${
            isLightMode ? 'text-slate-600' : 'text-gray-400'
          }`}>
            <span>Temp AI Captures</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <p className={`text-base font-bold font-mono ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            {stats ? stats.categories.ai_temp_captures.formatted : '...'}
          </p>
          <p className={`text-[10px] font-mono ${
            isLightMode ? 'text-slate-500' : 'text-gray-500'
          }`}>
            {stats ? `${stats.categories.ai_temp_captures.count} files` : 'Scanning...'}
          </p>
        </div>

        <div className={`p-3.5 border rounded-xl space-y-1 ${
          isLightMode 
            ? 'bg-white border-slate-200 shadow-xs' 
            : 'bg-gray-950/60 border-gray-800/80'
        }`}>
          <div className={`flex items-center justify-between text-xs ${
            isLightMode ? 'text-slate-600' : 'text-gray-400'
          }`}>
            <span>Stream Archives</span>
            <Radio className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className={`text-base font-bold font-mono ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            {stats ? stats.categories.stream_recordings.formatted : '...'}
          </p>
          <p className={`text-[10px] font-mono ${
            isLightMode ? 'text-slate-500' : 'text-gray-500'
          }`}>
            {stats ? `${stats.categories.stream_recordings.count} recordings` : 'Scanning...'}
          </p>
        </div>

        <div className={`p-3.5 border rounded-xl space-y-1 ${
          isLightMode 
            ? 'bg-white border-slate-200 shadow-xs' 
            : 'bg-gray-950/60 border-gray-800/80'
        }`}>
          <div className={`flex items-center justify-between text-xs ${
            isLightMode ? 'text-slate-600' : 'text-gray-400'
          }`}>
            <span>Temp Uploads</span>
            <Layers className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className={`text-base font-bold font-mono ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            {stats ? stats.categories.orphaned_temp_uploads.formatted : '...'}
          </p>
          <p className={`text-[10px] font-mono ${
            isLightMode ? 'text-slate-500' : 'text-gray-500'
          }`}>
            {stats ? `${stats.categories.orphaned_temp_uploads.count} files` : 'Scanning...'}
          </p>
        </div>

        <div className={`p-3.5 border rounded-xl space-y-1 ${
          isLightMode 
            ? 'bg-white border-slate-200 shadow-xs' 
            : 'bg-gray-950/60 border-gray-800/80'
        }`}>
          <div className={`flex items-center justify-between text-xs ${
            isLightMode ? 'text-slate-600' : 'text-gray-400'
          }`}>
            <span>DB Telemetry Logs</span>
            <Database className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className={`text-base font-bold font-mono ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            {stats ? `${stats.database.stale_telemetry_rows} Rows` : '...'}
          </p>
          <p className={`text-[10px] font-mono ${
            isLightMode ? 'text-slate-500' : 'text-gray-500'
          }`}>
            {stats ? `DB: ${stats.database.db_size_formatted}` : 'Scanning...'}
          </p>
        </div>
      </div>

      {/* Target Scope and Options */}
      <div className={`p-4 border rounded-xl space-y-4 relative z-10 ${
        isLightMode 
          ? 'bg-white/80 border-slate-200 shadow-xs' 
          : 'bg-gray-950/50 border-gray-800'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className={`flex items-center gap-2 text-xs font-medium ${
            isLightMode ? 'text-slate-700' : 'text-gray-300'
          }`}>
            <Sliders className="w-4 h-4 text-cyan-500" />
            <span>Cleanup Time Threshold:</span>
          </div>
          <select
            id="select-audio-retention"
            value={retentionHours}
            onChange={(e) => setRetentionHours(parseInt(e.target.value, 10))}
            className={`px-3 py-1.5 border rounded-lg text-xs font-mono focus:outline-none focus:border-cyan-500 ${
              isLightMode 
                ? 'bg-white border-slate-300 text-slate-900 shadow-xs' 
                : 'bg-gray-800 border-gray-700 text-white'
            }`}
          >
            <option value={0}>All Temporary Files (Immediate Full Wipe)</option>
            <option value={1}>Older than 1 Hour</option>
            <option value={6}>Older than 6 Hours</option>
            <option value={24}>Older than 24 Hours (Recommended)</option>
            <option value={48}>Older than 48 Hours</option>
            <option value={168}>Older than 7 Days</option>
          </select>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t ${
          isLightMode ? 'border-slate-200' : 'border-gray-800/60'
        }`}>
          <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition ${
            isLightMode 
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' 
              : 'bg-gray-900/60 hover:bg-gray-900 border-gray-800 text-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={cleanTempCaptures}
              onChange={(e) => setCleanTempCaptures(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-gray-800 border-gray-700"
            />
            <span>Delete AI Studio temp stream captures & FFmpeg chunks</span>
          </label>

          <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition ${
            isLightMode 
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' 
              : 'bg-gray-900/60 hover:bg-gray-900 border-gray-800 text-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={cleanOrphanedAudio}
              onChange={(e) => setCleanOrphanedAudio(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-gray-800 border-gray-700"
            />
            <span>Delete orphaned uploads in /temp</span>
          </label>

          <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition ${
            isLightMode 
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' 
              : 'bg-gray-900/60 hover:bg-gray-900 border-gray-800 text-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={pruneDbTelemetry}
              onChange={(e) => setPruneDbTelemetry(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-gray-800 border-gray-700"
            />
            <span>Purge stale stream health & telemetry rows from database</span>
          </label>

          <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs transition ${
            isLightMode 
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' 
              : 'bg-gray-900/60 hover:bg-gray-900 border-gray-800 text-gray-300'
          }`}>
            <input
              type="checkbox"
              checked={runVacuum}
              onChange={(e) => setRunVacuum(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-gray-800 border-gray-700"
            />
            <span className={`font-semibold ${isLightMode ? 'text-cyan-700' : 'text-cyan-300'}`}>
              Run SQLite VACUUM to shrink .db file on disk
            </span>
          </label>
        </div>

        <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
          <div className={`text-[11px] flex items-center gap-1.5 ${
            isLightMode ? 'text-slate-600 font-medium' : 'text-gray-400'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>Active library music tracks and curated playlist tracks are protected and will not be touched.</span>
          </div>

          <button
            id="btn-trigger-audio-cleanup"
            type="button"
            onClick={handleExecuteCleanup}
            disabled={cleaning || loading}
            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-98"
          >
            <Trash2 className="w-4 h-4" />
            {cleaning ? 'Reclaiming Storage...' : 'Reclaim Audio & Database Space Now'}
          </button>
        </div>
      </div>

      {/* Results Output */}
      {lastResult && (
        <div 
          id="cleanup-results-panel" 
          className={`p-4 rounded-xl border space-y-2 relative z-10 ${
            isLightMode 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className={`flex items-center gap-2 font-bold text-xs ${
            isLightMode ? 'text-emerald-800' : 'text-emerald-400'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            <span>Cleanup Task Completed Successfully!</span>
          </div>
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1 ${
            isLightMode ? 'text-emerald-900' : 'text-emerald-200'
          }`}>
            <div>Freed Storage: <span className={`font-bold ${isLightMode ? 'text-emerald-950 font-black' : 'text-white'}`}>{lastResult.freed_formatted}</span></div>
            <div>Deleted Files: <span className={`font-bold ${isLightMode ? 'text-emerald-950 font-black' : 'text-white'}`}>{lastResult.deleted_files_count}</span></div>
            <div>Purged DB Rows: <span className={`font-bold ${isLightMode ? 'text-emerald-950 font-black' : 'text-white'}`}>{lastResult.purged_db_rows}</span></div>
            <div>New Database Size: <span className={`font-bold ${isLightMode ? 'text-emerald-950 font-black' : 'text-white'}`}>{lastResult.new_db_size}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
