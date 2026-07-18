import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Video, Music, Trash2, Search, Loader2, Upload, Plus, CheckSquare, Square, ChevronLeft, ChevronRight, X, Clipboard, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const itemsPerPage = 18;

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

  // Reset to first page when search changes
  useState(() => {
    setCurrentPage(1);
  });

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
          <div className={`relative overflow-hidden rounded-xl aspect-video ${isLightMode ? 'bg-slate-100' : 'bg-slate-950'}`}>
            <img src={item.url} alt={item.filename} className="h-full w-full object-cover" />
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
