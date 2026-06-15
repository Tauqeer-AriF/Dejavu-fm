import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, Download, RefreshCw, Clock, AlertTriangle, ShieldCheck, Upload, Trash2, RotateCcw, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { useModal } from '../../context/ModalContext';
import { fetchAdmin } from './adminApi';

export function AdminBackup() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentBackups, setRecentBackups] = useState<any[]>([]);
  const [retentionDays, setRetentionDays] = useState("30");
  const [backupFrequency, setBackupFrequency] = useState("24");
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [lastAttempt, setLastAttempt] = useState("");
  const [lastStatus, setLastStatus] = useState("");
  const [backupLabel, setBackupLabel] = useState("");
  const [storageStats, setStorageStats] = useState({ totalSize: 0, fileCount: 0 });
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [nextBackupIn, setNextBackupIn] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const { showConfirm } = useModal();

  const loadBackups = async () => {
    try {
      const res = await fetchAdmin('/api/admin/database/list-backups');
      if (res.ok) {
        const data = await res.json();
        setRecentBackups(data);
      }

      const statsRes = await fetchAdmin('/api/admin/database/stats');
      if (statsRes.ok) {
        setStorageStats(await statsRes.json());
      }

      const settingsRes = await fetch('/api/public/settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        if (settings.backup_retention_days) setRetentionDays(settings.backup_retention_days);
        if (settings.backup_frequency_hours) setBackupFrequency(settings.backup_frequency_hours);
        setBackupEnabled(settings.backup_enabled !== '0');
        setLastAttempt(settings.backup_last_attempt || "");
        setLastStatus(settings.backup_last_status || "never");
      }
    } catch (err) {
      console.error('Failed to load backups', err);
    }
  };

  useEffect(() => { loadBackups(); }, []);

  useEffect(() => {
    if (!backupEnabled || !lastAttempt || lastStatus === 'never') {
      setNextBackupIn("");
      return;
    }

    const calculateTimeLeft = () => {
      const last = new Date(lastAttempt).getTime();
      const freqMs = parseInt(backupFrequency) * 60 * 60 * 1000;
      const next = last + freqMs;
      const diff = next - Date.now();

      if (diff <= 0) {
        setNextBackupIn("Due shortly...");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setNextBackupIn(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [lastAttempt, backupFrequency, backupEnabled, lastStatus]);

  const handleCreateSnapshot = async () => {
    setIsDownloading(true);
    try {
      const res = await fetchAdmin('/api/admin/database/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: backupLabel })
      });

      if (res.ok) {
        toast.success('Snapshot created successfully!');
        setBackupLabel("");
        loadBackups();
        
        // Auto-download the newly created file for the user
        const data = await res.json();
        handleDownloadSpecific(data.filename);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to create snapshot.');
      }
    } catch (error) {
      toast.error('Network error during snapshot creation.');
      console.error('[Backup] Error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSpecific = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/admin/database/download-file/${filename}`;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreSpecific = async (filename: string) => {
    const confirmed = await showConfirm({
      title: "Restore Snapshot",
      message: `CRITICAL WARNING: This will replace the entire database with the snapshot "${filename}" and RESTART the server. Proceed?`,
      style: "danger",
      confirmText: "Restore & Restart"
    });
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const res = await fetchAdmin(`/api/admin/database/restore-file/${filename}`, {
        method: 'POST'
      });
      
      if (res.ok) {
        toast.success('Database restored successfully! Reconnecting...');
        setTimeout(() => window.location.reload(), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Restore failed.');
      }
    } catch (error) {
      toast.error('Network error during restore.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSpecific = async (filename: string) => {
    const confirmed = await showConfirm({
      title: "Delete Backup",
      message: `Are you sure you want to permanently delete the backup "${filename}"?`,
      style: "danger",
      confirmText: "Delete Permanently"
    });
    if (!confirmed) return;

    try {
      const res = await fetchAdmin(`/api/admin/database/delete-backup/${filename}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Backup deleted successfully');
        loadBackups();
      } else {
        toast.error('Failed to delete backup');
      }
    } catch (err) {
      toast.error('Network error during deletion');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = await showConfirm({
      title: "System Restore",
      message: "CRITICAL WARNING: This will replace the entire database and RESTART the server. All current session data, recent shoutouts, and unsaved changes will be lost. Proceed?",
      style: "danger",
      confirmText: "Upload & Restore"
    });
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsRestoring(true);
    setRestoreProgress(0);
    const formData = new FormData();
    formData.append('database', file);

    const uploadWithProgress = () => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const token = localStorage.getItem('admin_token');
        
        xhr.open('POST', '/api/admin/database/restore');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setRestoreProgress(percent);
          }
        };

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(data);
          } catch (e) {
            if (xhr.status >= 200 && xhr.status < 300) resolve({ success: true });
            else reject({ error: `Server error: ${xhr.status}` });
          }
        };

        xhr.onerror = () => reject({ error: 'Network error during restore.' });
        xhr.send(formData);
      });
    };

    try {
      await uploadWithProgress();
      toast.success('Database restored successfully! Reconnecting to server...');
      setTimeout(() => window.location.reload(), 3000);
    } catch (error) {
      toast.error(error?.error || 'Restore failed. Check server logs.');
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsRestoring(false);
      setRestoreProgress(0);
    }
  };

  const handleTriggerCheck = async () => {
    setIsChecking(true);
    try {
      const res = await fetchAdmin('/api/admin/database/trigger-check', { method: 'POST' });
      if (res.ok) {
        toast.success('Backup system check completed!');
        loadBackups();
      }
    } catch (e) {
      toast.error('Failed to trigger backup check');
    } finally {
      setIsChecking(false);
    }
  };

  const updateRetention = async (days: string) => {
    setRetentionDays(days);
    try {
      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_retention_days: days })
      });
      if (res.ok) {
        toast.success(`Retention policy updated to ${days} days.`);
        // Run prune immediately to apply new policy
        await fetchAdmin('/api/admin/database/prune', { method: 'POST' });
        loadBackups();
      }
    } catch (e) {
      toast.error('Failed to update policy');
    }
  };

  const updateFrequency = async (hours: string) => {
    setBackupFrequency(hours);
    try {
      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_frequency_hours: hours })
      });
      if (res.ok) {
        toast.success(`Backup frequency updated to every ${hours} hours.`);
      }
    } catch (e) {
      toast.error('Failed to update frequency');
    }
  };

  const updateBackupEnabled = async (enabled: boolean) => {
    setBackupEnabled(enabled);
    try {
      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_enabled: enabled ? '1' : '0' })
      });
      if (res.ok) {
        toast.success(`Automatic backups ${enabled ? 'enabled' : 'disabled'}.`);
      }
    } catch (e) {
      toast.error('Failed to update backup status');
    }
  };

  const handlePurgeAll = async () => {
    const confirmed = await showConfirm({
      title: "Purge All Backups",
      message: "DANGER: This will delete ALL stored backup files permanently. This cannot be undone. Proceed?",
      style: "danger",
      confirmText: "Purge Everything"
    });
    if (!confirmed) return;
    
    try {
      const res = await fetchAdmin('/api/admin/database/backups/all', { method: 'DELETE' });
      if (res.ok) {
        toast.success('All backup files have been purged.');
        loadBackups();
      } else {
        toast.error('Purge failed.');
      }
    } catch (e) {
      toast.error('Network error during purge.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neon-purple/20 rounded-2xl flex items-center justify-center text-neon-purple">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-black uppercase tracking-tight">Database Management</h2>
              <p className="text-white/40 text-sm">Create snapshots and monitor system storage</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <Upload className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-sm">Restore Data</h3>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Upload a previously downloaded <code className="text-neon-purple">.db</code> file to restore the entire station state.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase tracking-wider py-4 rounded-xl text-xs hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              {isRestoring ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isRestoring ? 'Restoring System...' : 'Upload & Restore'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleRestore} 
              accept=".db" 
              className="hidden" 
            />
          </div>

          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-neon-blue">
              <Download className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-sm">Manual Export</h3>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-white/40 leading-relaxed">
                Create a persistent snapshot with a custom label. Use this to mark specific milestones (e.g., "Post Christmas Event").
              </p>
              <input 
                type="text"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                placeholder="Describe this backup (e.g. Pre-Update V2)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-blue outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleCreateSnapshot}
              disabled={isDownloading}
              className="w-full bg-white text-dark-bg font-black uppercase tracking-wider py-3.5 rounded-xl text-[10px] hover:bg-neon-blue hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl whitespace-nowrap"
            >
              {isDownloading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {isDownloading ? 'Processing...' : 'Create Labeled Snapshot'}
            </button>
          </div>

          <div className="lg:col-span-2 bg-black/40 border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-neon-purple">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-sm">Auto-Backup Status</h3>
              <button 
                onClick={handleTriggerCheck}
                disabled={isChecking}
                className="ml-auto flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all disabled:opacity-50"
                title="Force run the backup logic now"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Run Check Now'}
              </button>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                <span className="text-white/40 uppercase font-medium">Auto-Backups Active</span>
                <button 
                  onClick={() => updateBackupEnabled(!backupEnabled)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${backupEnabled ? 'bg-neon-blue' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${backupEnabled ? 'left-6' : 'left-1'}`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                <span className="text-white/40 uppercase font-medium">Automatic Backups</span>
                <select 
                  value={backupFrequency} 
                  onChange={(e) => updateFrequency(e.target.value)}
                  disabled={!backupEnabled}
                  className="bg-transparent text-neon-blue font-bold uppercase outline-none cursor-pointer hover:text-white transition-colors text-right"
                >
                  <option value="6" className="bg-dark-bg text-white">Every 6 Hours</option>
                  <option value="12" className="bg-dark-bg text-white">Every 12 Hours</option>
                  <option value="24" className="bg-dark-bg text-white">Every 24 Hours</option>
                  <option value="48" className="bg-dark-bg text-white">Every 48 Hours</option>
                </select>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                <span className="text-white/40 uppercase font-medium">Next Backup In</span>
                <span className="text-neon-blue font-bold uppercase">{nextBackupIn || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                <span className="text-white/40 uppercase font-medium">Last Attempt</span>
                <span className="text-white font-mono text-[10px]">{lastAttempt ? new Date(lastAttempt).toLocaleString() : 'NEVER'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                <span className="text-white/40 uppercase font-medium">Last Status</span>
                <span className={`font-black uppercase text-[10px] ${lastStatus === 'success' ? 'text-green-500' : lastStatus === 'failed' ? 'text-red-500' : 'text-white/20'}`}>
                  {lastStatus}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                <span className="text-white/40 uppercase font-medium">Retention Policy</span>
                <select 
                  value={retentionDays} 
                  onChange={(e) => updateRetention(e.target.value)}
                  className="bg-transparent text-neon-blue font-bold uppercase outline-none cursor-pointer hover:text-white transition-colors"
                >
                  <option value="1" className="bg-dark-bg text-white">24 Hours</option>
                  <option value="7" className="bg-dark-bg text-white">7 Days</option>
                  <option value="15" className="bg-dark-bg text-white">15 Days</option>
                  <option value="30" className="bg-dark-bg text-white">30 Days</option>
                  <option value="90" className="bg-dark-bg text-white">90 Days</option>
                </select>
              </div>
              <div className="flex items-center justify-between text-xs py-2">
                <span className="text-white/40 uppercase font-medium">Journal Mode</span>
                <span className="text-white font-bold uppercase">WAL (Concurrent)</span>
              </div>

              <div className="pt-4 mt-2 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-white/40">
                  <span>Storage Used</span>
                  <span className="text-neon-blue">{(storageStats.totalSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min(100, (storageStats.totalSize / (500 * 1024 * 1024)) * 100)}%` }}
                     className="h-full bg-gradient-to-r from-neon-purple to-neon-blue"
                   />
                </div>
                <p className="text-[9px] text-white/20 uppercase font-bold text-right italic">
                  {storageStats.fileCount} Snapshot{storageStats.fileCount !== 1 ? 's' : ''} active
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-black/40 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 text-white">
                <Clock className="w-5 h-5 text-neon-purple" />
                <h3 className="font-bold uppercase tracking-widest text-sm">Recent Snapshots</h3>
              </div>
              <button 
                onClick={handlePurgeAll}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Trash className="w-3 h-3" />
                Purge All
              </button>
            </div>
            
            <div className="space-y-2">
              {recentBackups.length > 0 ? (
                recentBackups.map((b) => (
                  <div key={b.name} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                    <div className="min-w-0">
                      {b.label ? (
                        <h4 className="text-neon-blue font-black uppercase tracking-tight text-sm mb-0.5">{b.label}</h4>
                      ) : (
                        <p className="text-xs font-mono text-white/80 truncate">{b.name}</p>
                      )}
                      {b.label && <p className="text-[10px] font-mono text-white/30 truncate">{b.name}</p>}
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                        {new Date(b.createdAt).toLocaleString()} • {(b.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDownloadSpecific(b.name)}
                        className="p-2 hover:bg-neon-purple/20 text-white/30 hover:text-neon-purple rounded-lg transition-all"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleRestoreSpecific(b.name)}
                        disabled={isRestoring}
                        className="p-2 hover:bg-neon-blue/20 text-white/30 hover:text-neon-blue rounded-lg transition-all disabled:opacity-30"
                        title="Restore this version"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSpecific(b.name)}
                        className="p-2 hover:bg-red-500/20 text-white/30 hover:text-red-500 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-white/20 text-xs uppercase tracking-widest font-black">No automated backups found yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-500/80 leading-relaxed">
            <span className="font-bold text-yellow-500 uppercase">Warning:</span> Manual backups contain sensitive environment configuration and hashed passwords. Keep downloaded files in a secure, encrypted volume.
          </div>
        </div>
      </div>
    </motion.div>
  );
}