import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Check, Trash2, Music, Sparkles, AlertCircle, RefreshCw, Star, Ban, Flame, Plus, Edit2, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdmin } from './adminApi';
import { useLogo } from '../../hooks/useLogo';

interface SongRequest {
  id: number;
  track_title: string;
  artist: string;
  requester_name: string;
  votes: number;
  status: 'pending' | 'approved' | 'on_deck' | 'played' | 'rejected';
  created_at: string;
}

interface CuratedTrack {
  id: number;
  title: string;
  artist: string;
}

const ITEMS_PER_PAGE = 10;

export function AdminSongRequests() {
  const { isLightMode } = useLogo();
  const [activeSection, setActiveSection] = useState<'queue' | 'curated'>('queue');
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<number | null>(null);

  // Pagination states
  const [queuePage, setQueuePage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [curatedPage, setCuratedPage] = useState(1);

  // Curated Suggested Tracks states
  const [curatedTracks, setCuratedTracks] = useState<CuratedTrack[]>([]);
  const [curatedLoading, setCuratedLoading] = useState(false);
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('');
  const [editingTrack, setEditingTrack] = useState<CuratedTrack | null>(null);
  const [editTrackTitle, setEditTrackTitle] = useState('');
  const [editTrackArtist, setEditTrackArtist] = useState('');

  // Reset pagination on section or filter changes
  useEffect(() => {
    setQueuePage(1);
    setRequestPage(1);
  }, [filter, activeSection]);

  useEffect(() => {
    setCuratedPage(1);
  }, [activeSection]);

  // Load Admin Token for authorized requests
  const adminToken = localStorage.getItem("admin_token") || localStorage.getItem("chat_user_token");

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/song-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      toast.error("Failed to fetch requests queue");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurated = async () => {
    setCuratedLoading(true);
    try {
      const res = await fetch('/api/curated-tracks');
      if (res.ok) {
        const data = await res.json();
        setCuratedTracks(data);
      }
    } catch (e) {
      toast.error("Failed to fetch suggested tracks");
    } finally {
      setCuratedLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeSection === 'queue') {
      await fetchQueue();
    } else {
      await fetchCurated();
    }
    // Artificial small delay for high-quality feedback feel
    await new Promise(resolve => setTimeout(resolve, 600));
    setIsRefreshing(false);
    toast.success("List updated from database");
  };

  useEffect(() => {
    fetchQueue();
    fetchCurated();

    // Listen to live WebSocket event updates for the host view
    const socket = (window as any).socket;
    if (socket) {
      const handleAdd = (newReq: SongRequest) => {
        setRequests(prev => {
          if (prev.some(r => r.id === newReq.id)) return prev;
          const updated = [...prev, newReq];
          return sortRequests(updated);
        });
        toast.info(`New Song Request!`, {
          description: `"${newReq.track_title}" requested by ${newReq.requester_name}.`,
        });
      };

      const handleUpdate = (updatedReq: SongRequest) => {
        setRequests(prev => {
          const updated = prev.map(r => r.id === updatedReq.id ? updatedReq : r);
          return sortRequests(updated);
        });
      };

      const handleStatusUpdate = (payload: { id: number; status: SongRequest['status']; request: SongRequest }) => {
        setRequests(prev => {
          const updated = prev.map(r => r.id === payload.id ? payload.request : r);
          return sortRequests(updated);
        });
      };

      const handleDelete = (payload: { id: number }) => {
        setRequests(prev => prev.filter(r => r.id !== payload.id));
      };

      const handleClear = () => {
        setRequests([]);
      };

      socket.on("songRequestAdded", handleAdd);
      socket.on("songRequestUpdated", handleUpdate);
      socket.on("songRequestStatusUpdated", handleStatusUpdate);
      socket.on("songRequestDeleted", handleDelete);
      socket.on("songRequestsCleared", handleClear);

      return () => {
        socket.off("songRequestAdded", handleAdd);
        socket.off("songRequestUpdated", handleUpdate);
        socket.off("songRequestStatusUpdated", handleStatusUpdate);
        socket.off("songRequestDeleted", handleDelete);
        socket.off("songRequestsCleared", handleClear);
      };
    }
  }, []);

  const sortRequests = (list: SongRequest[]) => {
    return [...list].sort((a, b) => {
      const statusOrder = { on_deck: 1, approved: 2, pending: 3, played: 4, rejected: 5 };
      const aVal = statusOrder[a.status] || 3;
      const bVal = statusOrder[b.status] || 3;
      
      if (aVal !== bVal) return aVal - bVal;
      if (b.votes !== a.votes) return b.votes - a.votes;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // Status transition hander
  const updateStatus = async (id: number, status: SongRequest['status']) => {
    try {
      const res = await fetchAdmin(`/api/admin/song-requests/${id}/status`, {
        method: 'PUT',
        body: { status }
      });

      if (res.ok) {
        toast.success(`Track marked as ${status.replace('_', ' ')}`);
        fetchQueue();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update status");
      }
    } catch (e) {
      toast.error("Network error. Please try again.");
    }
  };

  // Delete individual song request
  const deleteRequest = async (id: number) => {
    try {
      const res = await fetchAdmin(`/api/admin/song-requests/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success("Request deleted successfully");
        setRequests(prev => prev.filter(r => r.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete request");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  // Trigger Clear Queue Modal
  const clearQueue = () => {
    setShowClearConfirmModal(true);
  };

  // Execute Clear entire queue completely
  const executeClearQueue = async () => {
    setIsClearing(true);
    setShowClearConfirmModal(false);
    try {
      const res = await fetchAdmin('/api/admin/song-requests', {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success("Song requests queue cleared successfully");
        setRequests([]);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to clear song queue");
      }
    } catch (e) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  // Curated Tracks CRUD operations
  const handleAddCurated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackTitle.trim() || !newTrackArtist.trim()) {
      toast.error("Please fill in both the track title and artist.");
      return;
    }
    try {
      const res = await fetchAdmin('/api/admin/curated-tracks', {
        method: 'POST',
        body: { title: newTrackTitle.trim(), artist: newTrackArtist.trim() }
      });
      if (res.ok) {
        toast.success("Suggested track added successfully!");
        setNewTrackTitle('');
        setNewTrackArtist('');
        fetchCurated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to add track");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const handleUpdateCurated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack) return;
    if (!editTrackTitle.trim() || !editTrackArtist.trim()) {
      toast.error("Please fill in both the track title and artist.");
      return;
    }
    try {
      const res = await fetchAdmin(`/api/admin/curated-tracks/${editingTrack.id}`, {
        method: 'PUT',
        body: { title: editTrackTitle.trim(), artist: editTrackArtist.trim() }
      });
      if (res.ok) {
        toast.success("Suggested track updated successfully!");
        setEditingTrack(null);
        fetchCurated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update track");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const handleDeleteCurated = (id: number) => {
    setTrackToDelete(id);
  };

  const executeDeleteCurated = async (id: number) => {
    setTrackToDelete(null);
    try {
      const res = await fetchAdmin(`/api/admin/curated-tracks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Suggested track deleted successfully");
        fetchCurated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete track");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  // Active requests filter (removes played/rejected ones for clean live viewing)
  const displayedRequests = requests.filter(r => {
    if (filter === 'active') {
      return r.status !== 'played' && r.status !== 'rejected';
    }
    return true;
  });

  // Calculate pagination
  const currentPageVal = filter === 'active' ? queuePage : requestPage;
  const setCurrentPageVal = filter === 'active' ? setQueuePage : setRequestPage;
  const totalPagesVal = Math.max(1, Math.ceil(displayedRequests.length / ITEMS_PER_PAGE));
  const paginatedRequests = displayedRequests.slice((currentPageVal - 1) * ITEMS_PER_PAGE, currentPageVal * ITEMS_PER_PAGE);

  const curatedTotalPages = Math.max(1, Math.ceil(curatedTracks.length / ITEMS_PER_PAGE));
  const paginatedCuratedTracks = curatedTracks.slice((curatedPage - 1) * ITEMS_PER_PAGE, curatedPage * ITEMS_PER_PAGE);

  return (
    <div className="w-full space-y-6">
      
      {/* Header Panel */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
        isLightMode ? 'border-slate-200' : 'border-white/5'
      }`}>
        <div>
          <h2 className={`text-2xl font-display font-black uppercase tracking-tight flex items-center gap-2 ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            <Music className="w-6 h-6 text-neon-purple" />
            VIRTUAL DJ BOOTH <span className="text-neon-purple">HOST QUEUE</span>
          </h2>
          <p className={`text-xs font-sans uppercase tracking-[0.2em] mt-1.5 font-medium ${
            isLightMode ? 'text-slate-500' : 'text-white/50'
          }`}>
            Prioritized stream of hot song proposals from live listeners.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-3 border rounded-xl transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
              isLightMode 
                ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-neon-purple" : ""}`} />
          </button>

          {activeSection === 'queue' && (
            <button 
              onClick={clearQueue}
              disabled={requests.length === 0 || isClearing}
              className={`px-5 py-3 font-bold uppercase text-xs tracking-wider rounded-xl transition-all border flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${
                isLightMode
                  ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
              }`}
              title={requests.length === 0 ? "The song queue is already empty" : "Clear all song requests from the database"}
            >
              {isClearing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              )}
              {isClearing ? "Clearing..." : "Clear Queue"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className={`flex items-center gap-1 border-b pb-0.5 ${
        isLightMode ? 'border-slate-200' : 'border-white/5'
      }`}>
        <button
          onClick={() => setActiveSection('queue')}
          className={`px-5 py-3 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
            activeSection === 'queue'
              ? isLightMode
                ? 'border-neon-purple text-slate-900 bg-slate-100/80'
                : 'border-neon-purple text-white bg-white/5'
              : isLightMode
              ? 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
              : 'border-transparent text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          Request Queue ({requests.length})
        </button>
        <button
          onClick={() => setActiveSection('curated')}
          className={`px-5 py-3 rounded-t-xl font-bold text-xs uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
            activeSection === 'curated'
              ? isLightMode
                ? 'border-neon-purple text-slate-900 bg-slate-100/80'
                : 'border-neon-purple text-white bg-white/5'
              : isLightMode
              ? 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
              : 'border-transparent text-white/40 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          Manage Suggested Tracks ({curatedTracks.length})
        </button>
      </div>

      {activeSection === 'queue' ? (
        <>
          {/* Control Filters Row */}
          <div className={`flex items-center justify-between border-b pb-4 ${
            isLightMode ? 'border-slate-200' : 'border-white/5'
          }`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                  filter === 'active'
                    ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20'
                    : isLightMode
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                Active Requests
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                  filter === 'all'
                    ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20'
                    : isLightMode
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                All History
              </button>
            </div>

            <span className={`text-xs font-sans font-medium ${
              isLightMode ? 'text-slate-500' : 'text-white/50'
            }`}>{displayedRequests.length} tracks listed</span>
          </div>

          {/* Host Queue Grid/List */}
          <div className="space-y-3">
            {loading ? (
              <div className={`flex flex-col items-center justify-center py-20 gap-3 ${
                isLightMode ? 'text-slate-400' : 'text-white/40'
              }`}>
                <RefreshCw className="w-8 h-8 animate-spin text-neon-purple" />
                <span className="text-xs font-sans font-bold uppercase tracking-wider">Syncing live queue...</span>
              </div>
            ) : paginatedRequests.length > 0 ? (
              <AnimatePresence initial={false}>
                {paginatedRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    layoutId={`admin-request-${req.id}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className={`border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 font-sans ${
                      req.status === 'on_deck'
                        ? (isLightMode ? 'bg-sky-50 border-sky-300 text-slate-900 shadow-sm' : 'bg-neon-blue/10 border-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.08)]')
                        : req.status === 'approved'
                        ? (isLightMode ? 'bg-purple-50 border-purple-300 text-slate-900 shadow-sm' : 'bg-neon-purple/10 border-neon-purple/40')
                        : req.status === 'played'
                        ? isLightMode
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white/[0.01] border-white/5 opacity-50'
                        : req.status === 'rejected'
                        ? isLightMode
                          ? 'bg-red-50 border-red-200 text-slate-900 opacity-75'
                          : 'bg-red-500/5 border-red-500/20 opacity-65'
                        : isLightMode
                        ? 'bg-white border-slate-200 text-slate-900 shadow-xs'
                        : 'bg-white/[0.03] border-white/5'
                    }`}
                  >
                    
                    {/* Track details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-base font-bold truncate max-w-[300px] md:max-w-[400px] ${
                          isLightMode ? 'text-slate-900' : 'text-white'
                        }`}>
                          {req.track_title}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-display font-black uppercase tracking-widest ${
                          req.status === 'on_deck'
                            ? (isLightMode ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-neon-blue text-dark-bg')
                            : req.status === 'approved'
                            ? (isLightMode ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-neon-purple text-white')
                            : req.status === 'played'
                            ? (isLightMode ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-white/40')
                            : req.status === 'rejected'
                            ? (isLightMode ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-red-500/20 text-red-500')
                            : (isLightMode ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20')
                        }`}>
                          {req.status.replace('_', ' ')}
                        </span>
                        
                        {req.votes >= 5 && (
                          <span className="flex items-center gap-1 text-xs text-yellow-500 font-sans font-bold bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 animate-pulse">
                            <Flame className="w-3.5 h-3.5 fill-current" /> Hot Track
                          </span>
                        )}
                      </div>
                      <div className={`text-sm mt-1 font-medium ${
                        isLightMode ? 'text-slate-600' : 'text-white/50'
                      }`}>{req.artist}</div>
                      
                      <div className={`flex items-center gap-4 mt-3 text-[10px] font-sans ${
                        isLightMode ? 'text-slate-500' : 'text-white/40'
                      }`}>
                        <div>Requester: <span className={`font-semibold ${isLightMode ? 'text-slate-800' : 'text-white/70'}`}>{req.requester_name}</span></div>
                        <div>•</div>
                        <div>Votes: <span className={`font-semibold ${isLightMode ? 'text-slate-800' : 'text-white/70'}`}>{req.votes}</span></div>
                        <div>•</div>
                        <div>Time: <span className={`font-semibold ${isLightMode ? 'text-slate-800' : 'text-white/70'}`}>{new Date(req.created_at).toLocaleTimeString([], { hour12: true, hour: 'numeric', minute: '2-digit' })}</span></div>
                      </div>
                    </div>

                    {/* DJ Control actions */}
                    <div className={`flex items-center gap-2 self-end md:self-auto border-t md:border-t-0 pt-3 md:pt-0 ${
                      isLightMode ? 'border-slate-200' : 'border-white/5'
                    }`}>
                      {req.status !== 'on_deck' && req.status !== 'played' && (
                        <button
                          onClick={() => updateStatus(req.id, 'on_deck')}
                          className="p-3 bg-neon-blue/10 border border-neon-blue/30 text-neon-blue rounded-xl hover:bg-neon-blue hover:text-dark-bg transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                          title="Set track as playing next (On Deck)"
                        >
                          <Flame className="w-4 h-4" />
                          <span>On Deck</span>
                        </button>
                      )}

                      {req.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(req.id, 'approved')}
                          className="p-3 bg-neon-purple/10 border border-neon-purple/30 text-neon-purple rounded-xl hover:bg-neon-purple hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                          title="Approve request"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                      )}

                      {req.status !== 'played' && (
                        <button
                          onClick={() => updateStatus(req.id, 'played')}
                          className={`p-3 border rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                            isLightMode
                              ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                              : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                          }`}
                          title="Mark request as played"
                        >
                          <Play className="w-4 h-4" />
                          <span>Played</span>
                        </button>
                      )}

                      {req.status !== 'rejected' && req.status !== 'played' && (
                        <button
                          onClick={() => updateStatus(req.id, 'rejected')}
                          className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                          title="Reject request"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => deleteRequest(req.id)}
                        className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                        title="Delete request entry from DB"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className={`text-center py-24 border border-dashed rounded-2xl flex flex-col items-center gap-3 font-sans ${
                isLightMode 
                  ? 'bg-slate-50 border-slate-200 text-slate-400' 
                  : 'bg-white/[0.01] border-white/5 text-white/30'
              }`}>
                <Music className="w-8 h-8 opacity-40 animate-pulse" />
                <div>
                  <div className="text-sm font-bold uppercase tracking-wider">No requests listed</div>
                  <div className="text-xs font-sans opacity-60 mt-1">Listeners haven't submitted any tracks recently.</div>
                </div>
              </div>
            )}
          </div>

          {/* Queue Pagination Bar */}
          {totalPagesVal > 1 && (
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t font-sans ${
              isLightMode ? 'border-slate-200' : 'border-white/5'
            }`}>
              <div className={`text-xs font-medium ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>
                Showing <span className={`font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{Math.min((currentPageVal - 1) * ITEMS_PER_PAGE + 1, displayedRequests.length)}</span> to <span className={`font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{Math.min(currentPageVal * ITEMS_PER_PAGE, displayedRequests.length)}</span> of <span className={`font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{displayedRequests.length}</span> requests
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPageVal(p => Math.max(1, p - 1))}
                  disabled={currentPageVal === 1}
                  aria-label="Previous Page"
                  className={`app-pagination-btn p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                    currentPageVal === 1
                      ? isLightMode
                        ? 'border-slate-200 bg-slate-100/70 text-slate-300 cursor-not-allowed'
                        : 'border-white/5 bg-white/5 text-white/20 cursor-not-allowed'
                      : isLightMode
                      ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs'
                      : 'border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPagesVal }, (_, i) => i + 1).map(pageNum => {
                  const isActive = pageNum === currentPageVal;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPageVal(pageNum)}
                      className={`app-pagination-btn min-w-[36px] h-9 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center border ${
                        isActive
                          ? "active-page-btn bg-neon-purple text-white border-neon-purple shadow-md shadow-neon-purple/20"
                          : isLightMode
                          ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-950 shadow-xs"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPageVal(p => Math.min(totalPagesVal, p + 1))}
                  disabled={currentPageVal === totalPagesVal}
                  aria-label="Next Page"
                  className={`app-pagination-btn p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                    currentPageVal === totalPagesVal
                      ? isLightMode
                        ? 'border-slate-200 bg-slate-100/70 text-slate-300 cursor-not-allowed'
                        : 'border-white/5 bg-white/5 text-white/20 cursor-not-allowed'
                      : isLightMode
                      ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs'
                      : 'border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6 font-sans">
          {/* Add curated track form */}
          <form onSubmit={handleAddCurated} className={`p-6 rounded-2xl border space-y-4 ${
            isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/5'
          }`}>
            <div className={`text-sm font-display font-bold uppercase tracking-wider flex items-center gap-2 ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              <Plus className="w-4 h-4 text-neon-purple" />
              Add Curated Suggested Track
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] font-sans font-bold uppercase mb-1 ${
                  isLightMode ? 'text-slate-500' : 'text-white/50'
                }`}>Track Title</label>
                <input
                  type="text"
                  value={newTrackTitle}
                  onChange={(e) => setNewTrackTitle(e.target.value)}
                  placeholder="e.g. Re-Rewind"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all font-sans ${
                    isLightMode 
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white' 
                      : 'bg-dark-bg border-white/10 text-white placeholder:text-white/20'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-sans font-bold uppercase mb-1 ${
                  isLightMode ? 'text-slate-500' : 'text-white/50'
                }`}>Artist Name</label>
                <input
                  type="text"
                  value={newTrackArtist}
                  onChange={(e) => setNewTrackArtist(e.target.value)}
                  placeholder="e.g. Artful Dodger"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all font-sans ${
                    isLightMode 
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white' 
                      : 'bg-dark-bg border-white/10 text-white placeholder:text-white/20'
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-3 bg-neon-purple text-white font-display font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-opacity-80 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add to suggested list
              </button>
            </div>
          </form>

          {/* Edit form inline */}
          <AnimatePresence>
            {editingTrack && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-6 rounded-2xl border space-y-4 overflow-hidden ${
                  isLightMode
                    ? 'bg-purple-50/60 border-purple-200'
                    : 'bg-neon-purple/5 border-neon-purple/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-display font-bold uppercase tracking-wider text-neon-purple flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Edit Track Settings
                  </div>
                  <button onClick={() => setEditingTrack(null)} className={isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white'}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleUpdateCurated} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[10px] font-sans font-bold uppercase mb-1 ${
                        isLightMode ? 'text-slate-500' : 'text-white/50'
                      }`}>Track Title</label>
                      <input
                        type="text"
                        value={editTrackTitle}
                        onChange={(e) => setEditTrackTitle(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all font-sans ${
                          isLightMode
                            ? 'bg-white border-slate-300 text-slate-900'
                            : 'bg-dark-bg border-neon-purple/30 text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-sans font-bold uppercase mb-1 ${
                        isLightMode ? 'text-slate-500' : 'text-white/50'
                      }`}>Artist Name</label>
                      <input
                        type="text"
                        value={editTrackArtist}
                        onChange={(e) => setEditTrackArtist(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all font-sans ${
                          isLightMode
                            ? 'bg-white border-slate-300 text-slate-900'
                            : 'bg-dark-bg border-neon-purple/30 text-white'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingTrack(null)}
                      className={`px-4 py-2.5 border rounded-xl text-xs font-bold uppercase tracking-widest transition-all font-sans ${
                        isLightMode
                          ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-700'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-neon-purple text-white font-display font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-opacity-80 transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggested List */}
          <div className="space-y-3">
            {curatedLoading ? (
              <div className={`flex flex-col items-center justify-center py-20 gap-3 ${
                isLightMode ? 'text-slate-400' : 'text-white/40'
              }`}>
                <RefreshCw className="w-8 h-8 animate-spin text-neon-purple" />
                <span className="text-xs font-sans font-bold uppercase tracking-wider">Syncing suggested list...</span>
              </div>
            ) : paginatedCuratedTracks.length > 0 ? (
              paginatedCuratedTracks.map((track) => (
                <div
                  key={track.id}
                  className={`border rounded-2xl p-5 flex items-center justify-between gap-4 transition-all duration-300 font-sans ${
                    isLightMode 
                      ? 'border-slate-200 bg-white hover:border-slate-300 shadow-xs' 
                      : 'border-white/5 bg-white/[0.01] hover:border-white/10'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-base font-bold truncate ${
                      isLightMode ? 'text-slate-900' : 'text-white'
                    }`}>{track.title}</div>
                    <div className={`text-sm mt-1 font-medium ${
                      isLightMode ? 'text-slate-500' : 'text-white/50'
                    }`}>{track.artist}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTrack(track);
                        setEditTrackTitle(track.title);
                        setEditTrackArtist(track.artist);
                      }}
                      className={`px-4 py-2 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        isLightMode
                          ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCurated(track.id)}
                      className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      title="Delete suggested track"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={`text-center py-24 border border-dashed rounded-2xl flex flex-col items-center gap-3 font-sans ${
                isLightMode 
                  ? 'bg-slate-50 border-slate-200 text-slate-400' 
                  : 'bg-white/[0.01] border-white/5 text-white/30'
              }`}>
                <Music className="w-8 h-8 opacity-40" />
                <div>
                  <div className="text-sm font-bold uppercase tracking-wider">No curated tracks found</div>
                  <div className="text-xs font-sans opacity-60 mt-1">Add suggestions to help listeners select faster.</div>
                </div>
              </div>
            )}
          </div>

          {/* Curated Pagination Bar */}
          {curatedTotalPages > 1 && (
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t font-sans ${
              isLightMode ? 'border-slate-200' : 'border-white/5'
            }`}>
              <div className={`text-xs font-medium ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>
                Showing <span className={`font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{Math.min((curatedPage - 1) * ITEMS_PER_PAGE + 1, curatedTracks.length)}</span> to <span className={`font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{Math.min(curatedPage * ITEMS_PER_PAGE, curatedTracks.length)}</span> of <span className={`font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{curatedTracks.length}</span> suggested tracks
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCuratedPage(p => Math.max(1, p - 1))}
                  disabled={curatedPage === 1}
                  aria-label="Previous Page"
                  className={`app-pagination-btn p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                    curatedPage === 1
                      ? isLightMode
                        ? 'border-slate-200 bg-slate-100/70 text-slate-300 cursor-not-allowed'
                        : 'border-white/5 bg-white/5 text-white/20 cursor-not-allowed'
                      : isLightMode
                      ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs'
                      : 'border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: curatedTotalPages }, (_, i) => i + 1).map(pageNum => {
                  const isActive = pageNum === curatedPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCuratedPage(pageNum)}
                      className={`app-pagination-btn min-w-[36px] h-9 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center border ${
                        isActive
                          ? "active-page-btn bg-neon-purple text-white border-neon-purple shadow-md shadow-neon-purple/20"
                          : isLightMode
                          ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-950 shadow-xs"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCuratedPage(p => Math.min(curatedTotalPages, p + 1))}
                  disabled={curatedPage === curatedTotalPages}
                  aria-label="Next Page"
                  className={`app-pagination-btn p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                    curatedPage === curatedTotalPages
                      ? isLightMode
                        ? 'border-slate-200 bg-slate-100/70 text-slate-300 cursor-not-allowed'
                        : 'border-white/5 bg-white/5 text-white/20 cursor-not-allowed'
                      : isLightMode
                      ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs'
                      : 'border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clear Queue Confirmation Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showClearConfirmModal && (
            <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                key="clear-queue-confirm-modal"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden border ${
                  isLightMode
                    ? 'bg-white border-slate-200 text-slate-900'
                    : 'bg-[#0f1117] border-red-500/20 text-white'
                }`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                    isLightMode
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-display font-black uppercase tracking-tight ${
                      isLightMode ? 'text-slate-900' : 'text-white'
                    }`}>
                      Clear Song Queue?
                    </h3>
                    <p className={`text-xs font-sans uppercase tracking-wider mt-0.5 ${
                      isLightMode ? 'text-slate-500' : 'text-white/50'
                    }`}>
                      Permanent Database Action
                    </p>
                  </div>
                </div>

                <p className={`text-sm leading-relaxed font-sans mb-6 ${
                  isLightMode ? 'text-slate-600' : 'text-white/70'
                }`}>
                  Are you sure you want to clear the entire song requests queue? This will remove all listener proposals from the database and reset the live host view.
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirmModal(false)}
                    className={`px-5 py-2.5 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      isLightMode
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeClearQueue}
                    disabled={isClearing}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                      isLightMode
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20'
                        : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                    }`}
                  >
                    {isClearing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {isClearing ? "Clearing..." : "Yes, Clear Queue"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete Suggested Track Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {trackToDelete !== null && (
            <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                key="delete-suggested-track-modal"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden border ${
                  isLightMode
                    ? 'bg-white border-slate-200 text-slate-900'
                    : 'bg-[#0f1117] border-white/10 text-white'
                }`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                    isLightMode
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-display font-black uppercase tracking-tight ${
                      isLightMode ? 'text-slate-900' : 'text-white'
                    }`}>
                      Delete Suggested Track?
                    </h3>
                    <p className={`text-xs font-sans uppercase tracking-wider mt-0.5 ${
                      isLightMode ? 'text-slate-500' : 'text-white/50'
                    }`}>
                      Remove from Curated List
                    </p>
                  </div>
                </div>

                <p className={`text-sm leading-relaxed font-sans mb-6 ${
                  isLightMode ? 'text-slate-600' : 'text-white/70'
                }`}>
                  Are you sure you want to remove this track from the suggested tracks list? Listeners will no longer see this quick recommendation option.
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTrackToDelete(null)}
                    className={`px-5 py-2.5 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      isLightMode
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeleteCurated(trackToDelete)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                      isLightMode
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20'
                        : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Track
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}

export default AdminSongRequests;
