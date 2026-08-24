import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, Download, RefreshCw, Clock, AlertTriangle, ShieldCheck, Upload, Trash2, RotateCcw, Trash, Cloud, CheckCircle, ExternalLink, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { useModal } from '../../context/ModalContext';
import { fetchAdmin } from './adminApi';
import { useLogo } from '../../hooks/useLogo';
import { AudioStorageCleanupCard } from './components/AudioStorageCleanupCard';
import { 
  initAuthListener, 
  googleSignIn, 
  googleSignOut, 
  getCachedToken, 
  uploadBackupToDrive,
  listBackupsInDrive,
  deleteBackupFromDrive,
  downloadFileFromDrive
} from '../../lib/googleDriveService';

export function AdminBackup() {
  const { isLightMode } = useLogo();
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
  const [restoreStatusMsg, setRestoreStatusMsg] = useState("");
  const [nextBackupIn, setNextBackupIn] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const { showConfirm } = useModal();

  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [uploadingToDrive, setUploadingToDrive] = useState<Record<string, boolean>>({});
  
  // Google Drive integration specific states
  const [driveBackups, setDriveBackups] = useState<any[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [autoUploadToDrive, setAutoUploadToDrive] = useState(true);
  const [deletingDriveFileId, setDeletingDriveFileId] = useState<string | null>(null);

  const waitForServer = async (startProgress: number, oldServerId?: string) => {
    let progress = startProgress;
    setRestoreStatusMsg("Restarting Server...");
    
    const interval = setInterval(() => {
      progress += (99 - progress) * 0.15;
      setRestoreProgress(Math.round(progress));
    }, 500);

    // Wait 1.5s before first ping to let server shut down
    await new Promise(r => setTimeout(r, 1500));
    
    let attempts = 0;
    while (attempts < 60) { // Increased to 60s for larger bundles
      try {
        console.log(`[RESTORE] Health check attempt ${attempts + 1}...`);
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          console.log(`[RESTORE] Server is UP. Current ID: ${data.serverId}, Old ID: ${oldServerId}`);
          // Only return true if we have a NEW server ID (confirming full restart)
          if (!oldServerId || (data.serverId && data.serverId !== oldServerId)) {
            console.log(`[RESTORE] New server detected. Proceeding.`);
            clearInterval(interval);
            setRestoreProgress(100);
            return true;
          }
        } else {
          console.log(`[RESTORE] Health check returned ${res.status}`);
        }
      } catch (e) {
        console.log(`[RESTORE] Health check failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        // Expected, server is down
      }
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
    }
    
    clearInterval(interval);
    return false;
  };

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

  const loadDriveBackups = async (token: string) => {
    setLoadingDrive(true);
    try {
      const files = await listBackupsInDrive(token);
      setDriveBackups(files);
    } catch (e) {
      console.error('Failed to load drive backups:', e);
    } finally {
      setLoadingDrive(false);
    }
  };

  useEffect(() => { loadBackups(); }, []);

  useEffect(() => {
    const unsubscribe = initAuthListener((user, token) => {
      setGoogleUser(user);
      setGoogleToken(token);
      if (user && token) {
        loadDriveBackups(token);
      } else {
        setDriveBackups([]);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLinkGoogleDrive = async () => {
    setIsLinking(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        toast.success(`Google Drive connected as ${result.user.email}!`);
        loadDriveBackups(result.accessToken);
      } else {
        toast.info('Sign-in cancelled.');
      }
    } catch (e: any) {
      if (
        e?.code === 'auth/popup-closed-by-user' ||
        e?.code === 'auth/cancelled-popup-request' ||
        e?.code === 'auth/popup-blocked' ||
        e?.message?.includes('closed')
      ) {
        toast.info('Sign-in cancelled.');
      } else {
        console.error(e);
        toast.error(e?.message || 'Failed to connect Google Drive.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkGoogleDrive = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
      setDriveBackups([]);
      toast.success('Google Drive disconnected.');
    } catch (e: any) {
      toast.error('Failed to disconnect Google Drive.');
    }
  };

  const handleSendToDrive = async (filename: string, label?: string) => {
    const activeToken = googleToken || getCachedToken();
    if (!activeToken) {
      toast.error("Google Drive is not connected. Please connect your Google account in the panel below first.");
      return;
    }

    setUploadingToDrive(prev => ({ ...prev, [filename]: true }));
    const toastId = toast.loading(`Preparing cloud transfer for ${filename}...`);

    try {
      // 1. Fetch file from server
      const adminToken = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/database/download-file/${filename}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to retrieve backup file from server.");
      }

      const blob = await res.blob();

      // 2. Upload to Google Drive
      toast.loading(`Uploading to Google Drive...`, { id: toastId });
      const driveResult = await uploadBackupToDrive(filename, blob, activeToken, label);

      toast.success(`Uploaded successfully to Google Drive!`, { id: toastId });
      
      // Refresh the Drive backups list
      loadDriveBackups(activeToken);
    } catch (error: any) {
      console.error("[GDrive Upload Error]", error);
      toast.error(error?.message || "Failed to upload to Google Drive.", { id: toastId });
    } finally {
      setUploadingToDrive(prev => ({ ...prev, [filename]: false }));
    }
  };

  const handleDeleteDriveBackup = async (fileId: string, filename: string) => {
    const activeToken = googleToken || getCachedToken();
    if (!activeToken) {
      toast.error("Google Drive connection lost.");
      return;
    }

    const confirmed = await showConfirm({
      title: "Delete Cloud Backup",
      message: `Are you sure you want to permanently delete "${filename}" from your Google Drive? This action cannot be undone.`,
      style: "danger",
      confirmText: "Delete Cloud File"
    });
    if (!confirmed) return;

    setDeletingDriveFileId(fileId);
    try {
      await deleteBackupFromDrive(fileId, activeToken);
      toast.success("Cloud backup deleted from Google Drive!");
      loadDriveBackups(activeToken);
    } catch (err: any) {
      console.error("Failed to delete drive backup", err);
      toast.error(err?.message || "Failed to delete cloud backup.");
    } finally {
      setDeletingDriveFileId(null);
    }
  };

  const handleRestoreDriveBackup = async (fileId: string, filename: string) => {
    const activeToken = googleToken || getCachedToken();
    if (!activeToken) {
      toast.error("Google Drive connection lost.");
      return;
    }

    const confirmed = await showConfirm({
      title: "Restore Cloud Snapshot",
      message: `CRITICAL WARNING: This will download "${filename}" from Google Drive, replace your entire current database, and RESTART the server. Proceed?`,
      style: "danger",
      confirmText: "Restore & Restart"
    });
    if (!confirmed) return;

    setIsRestoring(true);
    setRestoreProgress(5);
    setRestoreStatusMsg("Downloading snapshot from Google Drive...");

    try {
      // 1. Download file content from Google Drive
      const blob = await downloadFileFromDrive(fileId, activeToken);

      // Get current server ID to detect when it actually restarts
      const healthRes = await fetch('/api/health').then(r => r.json()).catch(() => ({}));
      const oldServerId = healthRes.serverId;

      setRestoreProgress(20);
      setRestoreStatusMsg("Preparing cloud bundle upload...");

      // 2. Perform chunked upload to our local server
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
      const sessionId = `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, blob.size);
        const chunk = blob.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('sessionId', sessionId);
        formData.append('chunkIndex', String(chunkIndex));
        formData.append('totalChunks', String(totalChunks));
        formData.append('filename', filename);

        const percent = Math.round((chunkIndex / totalChunks) * 100);
        setRestoreProgress(Math.round(20 + percent * 0.4)); // Visually up to 60%
        setRestoreStatusMsg(`Uploading Database (${percent}%)...`);

        const res = await fetch('/api/admin/database/restore/upload-chunk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: formData
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`);
        }
      }

      setRestoreProgress(70);
      setRestoreStatusMsg("Finalizing restore & rebooting server...");

      const finalizeRes = await fetchAdmin('/api/admin/database/restore/finalize-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!finalizeRes.ok) {
        const errorData = await finalizeRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Server rejected the finalized backup file.");
      }

      setRestoreProgress(80);
      const isUp = await waitForServer(80, oldServerId);
      if (isUp) {
        toast.success('Database restored successfully from Google Drive! Reconnecting...');
        setTimeout(() => window.location.reload(), 800);
      } else {
        throw new Error('Server reboot timed out. The database might still be restoring. Please refresh manually in a moment.');
      }
    } catch (error: any) {
      console.error("[CLOUD RESTORE ERROR]", error);
      toast.error(error?.message || "Failed to restore backup from Google Drive.");
      setIsRestoring(false);
      setRestoreProgress(0);
      setRestoreStatusMsg("");
    }
  };

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
    const labelToUpload = backupLabel;
    try {
      const res = await fetchAdmin('/api/admin/database/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labelToUpload })
      });

      if (res.ok) {
        toast.success('Snapshot created successfully!');
        setBackupLabel("");
        loadBackups();
        
        const data = await res.json();
        
        // Auto-download the newly created file for the user
        handleDownloadSpecific(data.filename);

        // Auto-upload to Google Drive if selected
        const activeToken = googleToken || getCachedToken();
        if (autoUploadToDrive && activeToken) {
          handleSendToDrive(data.filename, labelToUpload);
        }
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

  const handleDownloadSpecific = async (filename: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/database/download-file/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        toast.error("Failed to download file. Please try again.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      toast.error("Download failed due to a network error.");
    }
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
    setRestoreProgress(0);
    setRestoreStatusMsg("Initiating Database Restoration...");
    
    try {
      // Get current server ID to detect when it actually restarts
      const healthRes = await fetch('/api/health').then(r => r.json()).catch(() => ({}));
      const oldServerId = healthRes.serverId;

      setRestoreProgress(10);
      setRestoreStatusMsg("Requesting Server Swap...");

      const res = await fetchAdmin(`/api/admin/database/restore/finalize-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      
      if (res.ok) {
        setRestoreProgress(50);
        setRestoreStatusMsg("Waiting for Server Reboot...");
        const isUp = await waitForServer(50, oldServerId);
        if (isUp) {
          toast.success('Database restored successfully! Reconnecting...');
          setTimeout(() => window.location.reload(), 800);
        } else {
          throw new Error('Server reboot timed out. The database might still be restoring. Please refresh manually in a moment.');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server rejected the restoration request.');
      }
    } catch (error: any) {
      console.error("[RESTORE ERROR]", error);
      toast.error(error?.message || 'Restore failed. Please check the system logs.');
      // Keep UI state stable but allow retry
      setIsRestoring(false);
      setRestoreProgress(0);
      setRestoreStatusMsg("");
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
    setRestoreStatusMsg("Preparing upload...");

    try {
      // Get current server ID to detect when it actually restarts later
      const healthRes = await fetch('/api/health').then(r => r.json()).catch(() => ({}));
      const oldServerId = healthRes.serverId;

      // Chunked Upload implementation
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const sessionId = `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('sessionId', sessionId);
        formData.append('chunkIndex', String(chunkIndex));
        formData.append('totalChunks', String(totalChunks));
        formData.append('filename', file.name);

        const percent = Math.round((chunkIndex / totalChunks) * 100);
        setRestoreProgress(Math.round(percent * 0.5)); // Visually up to 50%
        setRestoreStatusMsg(`Uploading Database (${percent}%)...`);

        const res = await fetch('/api/admin/database/restore/upload-chunk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: formData
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`);
        }
      }

      setRestoreProgress(50);
      setRestoreStatusMsg("Finalizing Restore & Rebooting...");

      const finalizeRes = await fetchAdmin('/api/admin/database/restore/finalize-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!finalizeRes.ok) {
        const errorData = await finalizeRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Server rejected the finalized backup file.");
      }

      setRestoreProgress(60);
      const isUp = await waitForServer(60, oldServerId);
      if (isUp) {
        toast.success('Database restored successfully! Reconnecting...');
        setTimeout(() => window.location.reload(), 800);
      } else {
        throw new Error('Server reboot timed out. The system might still be processing. Please refresh manually.');
      }
    } catch (error: any) {
      console.error("[UPLOAD RESTORE ERROR]", error);
      toast.error(error?.message || 'Upload & Restore failed.');
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Reset state so user is not stuck
      setIsRestoring(false);
      setRestoreProgress(0);
      setRestoreStatusMsg("");
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
      className="space-y-6 pb-12"
    >
      <div className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl border transition-colors ${isLightMode ? 'bg-[#ffffff] border-black/10 shadow-sm' : 'bg-white/5 border-white/10'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neon-purple/20 rounded-2xl flex items-center justify-center text-neon-purple shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-xl sm:text-2xl font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Database Management</h2>
              <p className={`text-xs sm:text-sm ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Create snapshots and monitor station storage</p>
            </div>
          </div>
        </div>

        {/* Audio Storage & Database Reclaim Component */}
        <div className="mb-8">
          <AudioStorageCleanupCard onCleanupComplete={loadBackups} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`rounded-2xl p-5 sm:p-6 space-y-4 border transition-colors ${isLightMode ? 'bg-[#f8f9fa] border-black/5' : 'bg-black/40 border-white/5'}`}>
            <div className="flex items-center gap-3 text-red-500">
              <Upload className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-sm">Restore Data</h3>
            </div>
            <p className={`text-sm leading-relaxed ${isLightMode ? 'text-black/70' : 'text-white/60'}`}>
              Upload a previously downloaded <code className="text-neon-purple font-bold">.db</code> or <code className="text-neon-purple font-bold">.bundle</code> file to restore the entire station state.
            </p>
            {isRestoring && (
              <div className="space-y-2 py-2">
                <div className={`flex justify-between text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-red-600' : 'text-red-400'}`}>
                  <span className="truncate mr-2">{restoreStatusMsg}</span>
                  <span>{restoreProgress}%</span>
                </div>
                <div className={`h-2 w-full rounded-full overflow-hidden ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}>
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${restoreProgress}%` }}
                     className="h-full bg-red-500"
                   />
                </div>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className={`w-full font-black uppercase tracking-wider py-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 border ${isLightMode ? 'bg-red-600/10 border-red-600/20 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'}`}
            >
              {isRestoring ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isRestoring ? 'Restoring...' : 'Upload & Restore'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleRestore} 
              accept=".db,.bundle" 
              className="hidden" 
            />
          </div>

          <div className={`rounded-2xl p-5 sm:p-6 space-y-4 border transition-colors ${isLightMode ? 'bg-[#f8f9fa] border-black/5' : 'bg-black/40 border-white/5'}`}>
            <div className={`flex items-center gap-3 ${isLightMode ? 'text-cyan-600' : 'text-neon-blue'}`}>
              <Download className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-sm">Manual Export</h3>
            </div>
            <div className="space-y-3">
              <p className={`text-xs leading-relaxed ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                Create a persistent snapshot with a custom label to mark specific milestones (e.g., "Post Christmas Event").
              </p>
              <input 
                type="text"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                placeholder="Label (e.g. Pre-Update V2)"
                className={`w-full rounded-xl px-4 py-3 text-sm focus:border-cyan-500 outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/40' : 'bg-black/40 border-white/10 text-white placeholder:text-white/20'}`}
              />
              {googleUser && googleToken && (
                <div className="flex items-center gap-2 pt-1 select-none">
                  <input
                    type="checkbox"
                    id="autoUploadToDriveCheckbox"
                    checked={autoUploadToDrive}
                    onChange={(e) => setAutoUploadToDrive(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 accent-cyan-500"
                  />
                  <label htmlFor="autoUploadToDriveCheckbox" className={`text-[10px] font-black uppercase tracking-wider cursor-pointer ${isLightMode ? 'text-black/60 hover:text-black' : 'text-white/60 hover:text-white'}`}>
                    Also upload to Google Drive
                  </label>
                </div>
              )}
            </div>
            <button
              onClick={handleCreateSnapshot}
              disabled={isDownloading}
              className={`w-full font-black uppercase tracking-wider py-3.5 rounded-xl text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg ${isLightMode ? 'bg-cyan-600 text-white hover:bg-cyan-700' : 'bg-white text-dark-bg hover:bg-neon-blue hover:text-white'}`}
            >
              {isDownloading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {isDownloading ? 'Snapshotting...' : 'Create Labeled Snapshot'}
            </button>
          </div>

          <div className={`lg:col-span-2 rounded-2xl p-5 sm:p-6 space-y-4 border transition-colors ${isLightMode ? 'bg-[#f8f9fa] border-black/5' : 'bg-black/40 border-white/5'}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center gap-3 ${isLightMode ? 'text-purple-600' : 'text-neon-purple'}`}>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold uppercase tracking-widest text-sm">Auto-Backup Status</h3>
              </div>
              <button 
                onClick={handleTriggerCheck}
                disabled={isChecking}
                className={`sm:ml-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all disabled:opacity-50 border w-fit ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white'}`}
                title="Force run the backup logic now"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Run Check Now'}
              </button>
            </div>
            <div className="space-y-3 pt-2">
              <div className={`flex items-center justify-between text-xs py-2 border-b ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                <span className={`uppercase font-medium ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Auto-Backups Active</span>
                <button 
                  onClick={() => updateBackupEnabled(!backupEnabled)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${backupEnabled ? 'bg-neon-blue' : isLightMode ? 'bg-black/10' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${backupEnabled ? 'left-6' : 'left-1'}`}></div>
                </button>
              </div>
              <div className={`flex items-center justify-between text-xs py-2 border-b ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                <span className={`uppercase font-medium ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Automatic Backups</span>
                <select 
                  value={backupFrequency} 
                  onChange={(e) => updateFrequency(e.target.value)}
                  disabled={!backupEnabled}
                  className={`bg-transparent font-bold uppercase outline-none cursor-pointer transition-colors text-right ${isLightMode ? 'text-cyan-600 hover:text-black' : 'text-neon-blue hover:text-white'}`}
                >
                  <option value="6" className={isLightMode ? 'bg-white text-black' : 'bg-dark-bg text-white'}>Every 6 Hours</option>
                  <option value="12" className={isLightMode ? 'bg-white text-black' : 'bg-dark-bg text-white'}>Every 12 Hours</option>
                  <option value="24" className={isLightMode ? 'bg-white text-black' : 'bg-dark-bg text-white'}>Every 24 Hours</option>
                  <option value="48" className={isLightMode ? 'bg-white text-black' : 'bg-dark-bg text-white'}>Every 48 Hours</option>
                </select>
              </div>
              <div className={`flex items-center justify-between text-xs py-2 border-b ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                <span className={`uppercase font-medium ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Next Backup In</span>
                <span className={`font-bold uppercase ${isLightMode ? 'text-cyan-600' : 'text-neon-blue'}`}>{nextBackupIn || 'N/A'}</span>
              </div>
              <div className={`flex items-center justify-between text-xs py-2 border-b ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                <span className={`uppercase font-medium ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Last Attempt</span>
                <span className={`font-mono text-[10px] ${isLightMode ? 'text-black/80' : 'text-white'}`}>{lastAttempt ? new Date(lastAttempt).toLocaleString() : 'NEVER'}</span>
              </div>
              <div className={`flex items-center justify-between text-xs py-2 border-b ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                <span className={`uppercase font-medium ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Last Status</span>
                <span className={`font-black uppercase text-[10px] ${lastStatus === 'success' ? 'text-green-600' : lastStatus === 'failed' ? 'text-red-600' : isLightMode ? 'text-black/30' : 'text-white/20'}`}>
                  {lastStatus}
                </span>
              </div>
              <div className={`flex items-center justify-between text-xs py-2 border-b ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                <span className={`uppercase font-medium ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Retention Policy</span>
                <select 
                  value={retentionDays} 
                  onChange={(e) => updateRetention(e.target.value)}
                  className={`bg-transparent font-bold uppercase outline-none cursor-pointer transition-colors ${isLightMode ? 'text-cyan-600 hover:text-black' : 'text-neon-blue hover:text-white'}`}
                >
                  <option value="1" className={isLightMode ? 'bg-white text-black' : 'bg-dark-bg text-white'}>24 Hours</option>
                  <option value="7" className={isLightMode ? 'bg-white text-black' : 'bg-dark-bg text-white'}>7 Days</option>
                  <option value="15" className={isLightMode ? 'bg-white text-black' : 'bg-dark-bg text-white'}>15 Days</option>
                  <option value="30" className={isLightMode ? 'bg-white text-black' : 'bg-dark-bg text-white'}>30 Days</option>
                  <option value="90" className={isLightMode ? 'bg-white text-black' : 'bg-dark-bg text-white'}>90 Days</option>
                </select>
              </div>
              <div className="flex items-center justify-between text-xs py-2">
                <span className={`uppercase font-medium ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Journal Mode</span>
                <span className={`font-bold uppercase ${isLightMode ? 'text-black' : 'text-white'}`}>WAL (Concurrent)</span>
              </div>

              <div className={`pt-4 mt-2 border-t space-y-2 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                <div className={`flex justify-between text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  <span>Storage Used</span>
                  <span className={isLightMode ? 'text-cyan-600' : 'text-neon-blue'}>{(storageStats.totalSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}>
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min(100, (storageStats.totalSize / (500 * 1024 * 1024)) * 100)}%` }}
                     className="h-full bg-gradient-to-r from-neon-purple to-neon-blue"
                   />
                </div>
                <p className={`text-[9px] uppercase font-bold text-right italic ${isLightMode ? 'text-black/30' : 'text-white/20'}`}>
                  {storageStats.fileCount} Snapshot{storageStats.fileCount !== 1 ? 's' : ''} active
                </p>
              </div>
            </div>
          </div>

          <div className={`lg:col-span-2 rounded-2xl p-5 sm:p-6 space-y-4 border transition-colors ${isLightMode ? 'bg-[#f8f9fa] border-black/5' : 'bg-black/40 border-white/5'}`}>
            <div className={`flex items-center gap-3 ${isLightMode ? 'text-[#4285F4]' : 'text-neon-blue'}`}>
              <Cloud className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-sm">Google Drive Cloud Sync</h3>
            </div>
            
            <p className={`text-xs leading-relaxed ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
              Establish an offsite backup channel by linking your Google account. This allows you to securely store critical station snapshots directly in your personal Google Drive storage.
            </p>

            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${isLightMode ? 'bg-[#ffffff] border-black/10' : 'bg-white/5 border-white/10'}`}>
              {googleUser && googleToken ? (
                <div className="flex items-center gap-3">
                  {googleUser.photoURL ? (
                    <img 
                      src={googleUser.photoURL} 
                      alt={googleUser.displayName || 'Google User'} 
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-green-500/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-sm">
                      {(googleUser.displayName || googleUser.email || 'G').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>
                        {googleUser.displayName || 'Google Account'}
                      </span>
                      <span className="bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                        Connected
                      </span>
                    </div>
                    <p className={`text-[10px] font-mono ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                      {googleUser.email}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                      Not Connected
                    </span>
                    <p className={`text-[10px] font-medium mt-0.5 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                      Link Google Drive to enable direct cloud transfers.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {googleUser && googleToken ? (
                  <button
                    onClick={handleUnlinkGoogleDrive}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      isLightMode 
                        ? 'bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border-red-600/20' 
                        : 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-red-500/20'
                    }`}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleLinkGoogleDrive}
                    disabled={isLinking}
                    className="flex items-center gap-2.5 px-4 py-2.5 border border-[#dadce0] rounded-xl text-xs font-semibold bg-white text-[#3c4043] hover:bg-[#f8f9fa] shadow-sm hover:shadow active:bg-[#f1f3f4] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isLinking ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    )}
                    <span>Connect Google Drive</span>
                  </button>
                )}
              </div>
            </div>

            {googleUser && googleToken && (
              <div className={`pt-4 mt-4 border-t border-dashed ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-[11px] font-black uppercase tracking-widest ${isLightMode ? 'text-[#4285F4]' : 'text-neon-blue'}`}>
                    Cloud Snapshots in Google Drive
                  </h4>
                  <button
                    onClick={() => loadDriveBackups(googleToken)}
                    disabled={loadingDrive}
                    className={`p-1.5 rounded-lg transition-all border ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white'}`}
                    title="Refresh cloud backups"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingDrive ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingDrive ? (
                  <div className="flex items-center justify-center py-6">
                    <RefreshCw className="w-5 h-5 animate-spin text-neon-blue" />
                  </div>
                ) : driveBackups.length > 0 ? (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {driveBackups.map((dbFile) => (
                      <div 
                        key={dbFile.id} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl transition-all border gap-3 ${
                          isLightMode 
                            ? 'bg-white border-black/5 hover:border-black/10 hover:shadow-sm' 
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="min-w-0 overflow-hidden flex-1">
                          <h5 className={`font-black uppercase tracking-tight text-xs mb-0.5 truncate ${isLightMode ? 'text-cyan-700' : 'text-neon-blue'}`}>
                            {dbFile.name}
                          </h5>
                          <p className={`text-[9px] uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                            {new Date(dbFile.createdTime).toLocaleString()} • {dbFile.size ? `${(parseInt(dbFile.size) / 1024 / 1024).toFixed(2)} MB` : 'Unknown Size'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end shrink-0">
                          {dbFile.webViewLink && (
                            <a 
                              href={dbFile.webViewLink} 
                              target="_blank" 
                              rel="noreferrer"
                              className={`p-2 rounded-lg transition-all ${isLightMode ? 'bg-black/5 hover:bg-gray-100 text-black/50 hover:text-black' : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white'}`}
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button 
                            onClick={() => handleRestoreDriveBackup(dbFile.id, dbFile.name)}
                            disabled={isRestoring}
                            className={`p-2 rounded-lg transition-all disabled:opacity-30 ${isLightMode ? 'bg-black/5 hover:bg-green-100 text-black/50 hover:text-green-700' : 'bg-white/5 hover:bg-green-500/20 text-white/40 hover:text-green-400'}`}
                            title="Restore snapshot directly from Google Drive"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteDriveBackup(dbFile.id, dbFile.name)}
                            disabled={deletingDriveFileId === dbFile.id}
                            className={`p-2 rounded-lg transition-all ${isLightMode ? 'bg-black/5 hover:bg-red-100 text-black/50 hover:text-red-600' : 'bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500'}`}
                            title="Delete snapshot from Google Drive"
                          >
                            {deletingDriveFileId === dbFile.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-center py-6 text-[9px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/30' : 'text-white/20'}`}>
                    No DejavuFM cloud snapshots found in your Drive.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className={`lg:col-span-2 rounded-2xl p-5 sm:p-6 border transition-colors ${isLightMode ? 'bg-[#f8f9fa] border-black/5' : 'bg-black/40 border-white/5'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className={`flex items-center gap-3 ${isLightMode ? 'text-black' : 'text-white'}`}>
                <Clock className="w-5 h-5 text-neon-purple" />
                <h3 className="font-bold uppercase tracking-widest text-sm">Recent Snapshots</h3>
              </div>
              <button 
                onClick={handlePurgeAll}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border w-full sm:w-auto ${isLightMode ? 'bg-red-600/10 hover:bg-red-600/20 text-red-600 border-red-600/20' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'}`}
              >
                <Trash className="w-3 h-3" />
                Purge All
              </button>
            </div>
            
            <div className="space-y-3">
              {recentBackups.length > 0 ? (
                recentBackups.map((b) => (
                  <div key={b.name} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl transition-colors border gap-4 ${isLightMode ? 'bg-[#ffffff] border-black/5 hover:border-black/10 hover:shadow-sm' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                    <div className="min-w-0 overflow-hidden">
                      {b.label ? (
                        <h4 className={`font-black uppercase tracking-tight text-sm mb-0.5 truncate ${isLightMode ? 'text-cyan-700' : 'text-neon-blue'}`}>{b.label}</h4>
                      ) : (
                        <p className={`text-[10px] font-mono truncate ${isLightMode ? 'text-black/80' : 'text-white/80'}`}>{b.name}</p>
                      )}
                      {b.label && <p className={`text-[9px] font-mono truncate ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>{b.name}</p>}
                      <p className={`text-[10px] uppercase tracking-widest mt-1.5 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                        {new Date(b.createdAt).toLocaleString()} • {(b.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button 
                        onClick={() => {
                          if (!googleUser || !googleToken) {
                            toast.info("Please connect your Google account in the Google Drive panel above first.");
                            return;
                          }
                          handleSendToDrive(b.name, b.label);
                        }}
                        disabled={uploadingToDrive[b.name]}
                        className={`p-2.5 rounded-xl transition-all ${
                          !googleUser || !googleToken
                            ? isLightMode ? 'bg-black/5 hover:bg-black/10 text-black/20' : 'bg-white/5 hover:bg-white/10 text-white/10'
                            : isLightMode 
                              ? 'bg-black/5 hover:bg-green-100 text-black/40 hover:text-green-700' 
                              : 'bg-white/5 hover:bg-green-500/20 text-white/30 hover:text-green-400'
                        }`}
                        title={googleUser && googleToken ? "Upload to Google Drive" : "Connect Google Drive to upload"}
                      >
                        {uploadingToDrive[b.name] ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-green-500" />
                        ) : (
                          <CloudUpload className="w-4 h-4" />
                        )}
                      </button>
                      <button 
                        onClick={() => handleDownloadSpecific(b.name)}
                        className={`p-2.5 rounded-xl transition-all ${isLightMode ? 'bg-black/5 hover:bg-purple-100 text-black/40 hover:text-purple-700' : 'bg-white/5 hover:bg-neon-purple/20 text-white/30 hover:text-neon-purple'}`}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleRestoreSpecific(b.name)}
                        disabled={isRestoring}
                        className={`p-2.5 rounded-xl transition-all disabled:opacity-30 ${isLightMode ? 'bg-black/5 hover:bg-cyan-100 text-black/40 hover:text-cyan-700' : 'bg-white/5 hover:bg-neon-blue/20 text-white/30 hover:text-neon-blue'}`}
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSpecific(b.name)}
                        className={`p-2.5 rounded-xl transition-all ${isLightMode ? 'bg-black/5 hover:bg-red-100 text-black/40 hover:text-red-600' : 'bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-500'}`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className={`text-center py-10 text-[10px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/30' : 'text-white/20'}`}>No automated backups found yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className={`mt-8 p-4 rounded-xl flex items-start gap-3 border ${isLightMode ? 'bg-amber-50 border-amber-200' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isLightMode ? 'text-amber-700' : 'text-yellow-500'}`} />
          <div className={`text-xs leading-relaxed ${isLightMode ? 'text-amber-800' : 'text-yellow-500/80'}`}>
            <span className={`font-bold uppercase ${isLightMode ? 'text-amber-900' : 'text-yellow-500'}`}>Warning:</span> Manual backups contain sensitive environment configuration and hashed passwords. Keep downloaded files in a secure, encrypted volume.
          </div>
        </div>
      </div>
    </motion.div>
  );
}