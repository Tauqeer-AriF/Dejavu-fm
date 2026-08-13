import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, ThumbsUp, Music, AlertCircle, Sparkles, Check, Play, User, Loader2, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useLogo } from '../hooks/useLogo';
import { playHighFidelitySound } from '../components/GlobalRequestAlerts';

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
  created_at?: string;
}

export default function Booth() {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [requesterName, setRequesterName] = useState(() => localStorage.getItem('booth_requester_name') || '');
  const [curatedTracks, setCuratedTracks] = useState<CuratedTrack[]>([]);
  
  // Real-time flash notification and synthesized sounds states
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    try {
      return localStorage.getItem('booth_sounds_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const soundsEnabledRef = useRef(soundsEnabled);
  useEffect(() => {
    soundsEnabledRef.current = soundsEnabled;
  }, [soundsEnabled]);

  const toggleSounds = () => {
    setSoundsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('booth_sounds_enabled', String(next));
      window.dispatchEvent(new CustomEvent('booth_sounds_changed', { detail: next }));
      toast.success(next ? "Notification SFX enabled! (Chime triggered)" : "Notification SFX muted", { duration: 2500 });
      if (next) {
        setTimeout(() => {
          playHighFidelitySound('approved');
        }, 100);
      }
      return next;
    });

    if (soundsEnabled) {
      toast.info("Testing approved chime sound...", { duration: 1500 });
      playHighFidelitySound('approved');
    }
  };
  
  // Custom request entry states
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);

  // Persistence to restrict duplicate upvoting and recognize own requests
  const [upvotedIds, setUpvotedIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('booth_upvoted_ids') || '[]');
    } catch {
      return [];
    }
  });

  const [myRequestIds, setMyRequestIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('booth_my_requests') || '[]');
    } catch {
      return [];
    }
  });

  // Pagination state for request queue (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const totalPages = Math.max(1, Math.ceil(requests.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [requests.length, totalPages, currentPage]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return requests.slice(start, start + ITEMS_PER_PAGE);
  }, [requests, currentPage]);

  // Keep upvotes and own request lists synchronized in localStorage
  useEffect(() => {
    localStorage.setItem('booth_upvoted_ids', JSON.stringify(upvotedIds));
  }, [upvotedIds]);

  useEffect(() => {
    localStorage.setItem('booth_my_requests', JSON.stringify(myRequestIds));
  }, [myRequestIds]);

  // Handle client-side fetch of active requests
  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/song-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error("Failed to load requests queue", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCuratedTracks = async () => {
    try {
      const res = await fetch('/api/curated-tracks');
      if (res.ok) {
        const data: CuratedTrack[] = await res.json();
        // Ensure sorted descending by ID so newly added tracks are on top
        const sorted = [...data].sort((a, b) => Number(b.id) - Number(a.id));
        setCuratedTracks(sorted);
      }
    } catch (e) {
      console.error("Failed to load curated tracks", e);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchCuratedTracks();

    // Listen to Socket.IO live broadcasts
    const socket = (window as any).socket;
    if (socket) {
      const handleAdd = (newReq: SongRequest) => {
        setRequests(prev => {
          // If already exists, ignore
          if (prev.some(r => r.id === newReq.id)) return prev;
          const updated = [...prev, newReq];
          return sortRequests(updated);
        });
      };

      const handleUpdate = (updatedReq: SongRequest) => {
        setRequests(prev => {
          const updated = prev.map(r => r.id === updatedReq.id ? updatedReq : r);
          return sortRequests(updated);
        });
      };

      const handleStatusUpdate = (payload: { id: number; status: SongRequest['status']; request: SongRequest }) => {
        const { id, request } = payload;
        
        setRequests(prev => {
          const updated = prev.map(r => r.id === id ? request : r);
          return sortRequests(updated);
        });
      };

      const handleDelete = (payload: { id: number }) => {
        setRequests(prev => prev.filter(r => r.id !== payload.id));
      };

      const handleClear = () => {
        setRequests([]);
      };

      // Live socket events for curated suggested tracks
      const handleCuratedAdd = (newTrack: CuratedTrack) => {
        setCuratedTracks(prev => {
          if (prev.some(t => t.id === newTrack.id)) return prev;
          return [newTrack, ...prev];
        });
      };

      const handleCuratedUpdate = (updatedTrack: CuratedTrack) => {
        setCuratedTracks(prev => prev.map(t => t.id === updatedTrack.id ? updatedTrack : t));
      };

      const handleCuratedDelete = (payload: { id: number }) => {
        setCuratedTracks(prev => prev.filter(t => t.id !== payload.id));
      };

      socket.on("songRequestAdded", handleAdd);
      socket.on("songRequestUpdated", handleUpdate);
      socket.on("songRequestStatusUpdated", handleStatusUpdate);
      socket.on("songRequestDeleted", handleDelete);
      socket.on("songRequestsCleared", handleClear);

      socket.on("curatedTrackAdded", handleCuratedAdd);
      socket.on("curatedTrackUpdated", handleCuratedUpdate);
      socket.on("curatedTrackDeleted", handleCuratedDelete);

      return () => {
        socket.off("songRequestAdded", handleAdd);
        socket.off("songRequestUpdated", handleUpdate);
        socket.off("songRequestStatusUpdated", handleStatusUpdate);
        socket.off("songRequestDeleted", handleDelete);
        socket.off("songRequestsCleared", handleClear);

        socket.off("curatedTrackAdded", handleCuratedAdd);
        socket.off("curatedTrackUpdated", handleCuratedUpdate);
        socket.off("curatedTrackDeleted", handleCuratedDelete);
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

  // Curated list filtering logic
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return curatedTracks.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.artist.toLowerCase().includes(query)
    );
  }, [searchQuery, curatedTracks]);

  // Submit a song request handler
  const handleRequestSubmit = async (title: string, artist: string) => {
    if (!title.trim() || !artist.trim()) {
      toast.error("Please fill in both the track title and artist.");
      return;
    }

    const trimmedName = requesterName.trim() || "Anonymous Listener";
    localStorage.setItem('booth_requester_name', trimmedName);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/song-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_title: title.trim(),
          artist: artist.trim(),
          requester_name: trimmedName,
        })
      });

      if (res.ok) {
        const newReq = await res.json();
        // Track as owned request
        setMyRequestIds(prev => [...prev, newReq.id]);
        
        toast.success(`Track Requested Successfully!`, {
          description: `"${title}" has been submitted to the queue. Watch for live approvals!`,
        });

        // Reset forms
        setSearchQuery('');
        setCustomTitle('');
        setCustomArtist('');
        setShowCustomForm(false);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Request failed");
      }
    } catch (e) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upvote song request handler
  const handleUpvote = async (id: number) => {
    if (upvotedIds.includes(id)) {
      toast.error("You've already voted for this track!");
      return;
    }

    try {
      const res = await fetch(`/api/song-requests/${id}/upvote`, {
        method: 'POST'
      });

      if (res.ok) {
        setUpvotedIds(prev => [...prev, id]);
        toast.success("Vote registered!", {
          description: "This track has climbed the broadcast queue."
        });
      } else {
        toast.error("Failed to cast vote");
      }
    } catch (e) {
      toast.error("Network error. Please check your connection.");
    }
  };

  const { isLightMode } = useLogo();

  return (
    <div 
      className={`w-full max-w-5xl mx-auto py-2 sm:py-4 px-3 sm:px-4 select-none relative pb-32 lg:pb-12 ${isLightMode ? 'text-slate-900' : 'text-white'}`}
      style={{ paddingTop: '2px' }}
    >

      {/* Decorative Moving Aura */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-neon-purple/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-neon-blue/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Floating Audio SFX Toggle */}
      <div className="absolute top-2 right-3 sm:top-4 sm:right-4 z-[200]">
        <button
          type="button"
          onClick={toggleSounds}
          className={`booth-sfx-btn shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shadow-xs ${
            isLightMode
              ? 'bg-[#ffffff] border-slate-300 text-slate-900 hover:text-slate-950 hover:bg-slate-100 hover:border-slate-400'
              : 'bg-white/10 border-white/15 text-white/80 hover:text-white hover:bg-white/15'
          }`}
          title={soundsEnabled ? "Mute notification sound effects" : "Enable notification sound effects"}
        >
          {soundsEnabled ? (
            <>
              <Volume2 className={`w-3.5 h-3.5 ${isLightMode ? 'text-purple-600' : 'text-neon-purple'}`} />
              <span className={isLightMode ? 'text-slate-900 font-extrabold' : 'text-white/80'}>SFX On</span>
            </>
          ) : (
            <>
              <VolumeX className={`w-3.5 h-3.5 ${isLightMode ? 'text-red-600' : 'text-red-500'}`} />
              <span className={isLightMode ? 'text-slate-800 font-extrabold' : 'text-white/60'}>SFX Off</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Header Block - Enhanced Spacing between Badge, Heading, and Subheading on Desktop */}
      <div className="mb-6 lg:mb-12 relative pt-2 pb-4 lg:text-center lg:flex lg:flex-col lg:items-center">
        <div className="lg:flex lg:flex-col lg:items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] sm:text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] bg-neon-purple/10 text-neon-purple mb-3 lg:mb-8 border border-neon-purple/20">
            <Sparkles className="w-2.5 h-2.5 animate-spin-slow" /> Virtual DJ Booth
          </span>
          <h2 className={`text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight uppercase leading-none ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            REQUEST THE <span className="text-neon-purple">TRACKS</span>
          </h2>
        </div>

        <p className={`hidden sm:block mt-4 lg:mt-8 text-xs md:text-sm font-sans uppercase tracking-[0.15em] font-medium lg:max-w-2xl lg:mx-auto ${isLightMode ? 'text-slate-600' : 'text-white/50'}`}>
          Request tracks, upvote favourites, and interact live with the broadcasting host.
        </p>
      </div>

      {/* Grid Layout: Left is requesting engine, Right is live queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
        
        {/* Request Side Box */}
        <div className="lg:col-span-5 space-y-4 lg:space-y-6 relative z-[100]">
          <div className={`glass-panel border rounded-2xl p-3.5 sm:p-5 relative backdrop-blur-md ${
            isLightMode 
              ? 'bg-white/90 border-slate-200/90 shadow-lg shadow-slate-200/40' 
              : 'bg-black/40 border-white/10'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent pointer-events-none rounded-2xl" />
            
            <h3 className={`text-xs font-display font-bold uppercase tracking-[0.2em] flex items-center gap-2 mb-3 ${isLightMode ? 'text-slate-900' : 'text-white/80'}`}>
              <Music className="w-3.5 h-3.5 text-neon-purple" /> Request a Track
            </h3>

            <div className="space-y-3 mb-3">
              {/* Requester Profile Name Setting & Track Search inline on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                <div className="space-y-1">
                  <label className={`block text-[9px] font-sans font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-white/50'}`}>Your Listener Alias</label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLightMode ? 'text-slate-400' : 'text-white/30'}`} />
                    <input 
                      type="text" 
                      value={requesterName}
                      onChange={(e) => {
                        setRequesterName(e.target.value);
                        localStorage.setItem('booth_requester_name', e.target.value);
                      }}
                      placeholder="Anonymous Listener"
                      className={`w-full rounded-xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:border-neon-purple/80 transition-all font-sans border ${
                        isLightMode 
                          ? 'bg-slate-100/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white' 
                          : 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10'
                      }`}
                    />
                  </div>
                </div>

                {/* Track Search Box */}
                <div className="space-y-1 relative z-30">
                  <label className={`block text-[9px] font-sans font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-700' : 'text-white/50'}`}>Search Curated Track List</label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter track or artist..."
                      className={`w-full rounded-xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:border-neon-purple/80 transition-all font-sans border ${
                        isLightMode 
                          ? 'bg-slate-100/90 border-slate-200 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-neon-purple/20' 
                          : 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Suggestions Panel */}
              <AnimatePresence>
                {searchQuery.trim() && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`curated-suggestions-panel absolute top-[calc(100%+8px)] left-0 w-full rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto divide-y border backdrop-blur-md ${
                      isLightMode
                        ? 'bg-white border-slate-300 divide-slate-100 shadow-xl text-slate-900'
                        : 'bg-[#0a0a0f]/95 border-white/10 divide-white/5 shadow-black/80 text-white'
                    }`}
                  >
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((track, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleRequestSubmit(track.title, track.artist)}
                          disabled={isSubmitting}
                          className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors font-sans ${
                            isLightMode 
                              ? 'bg-white hover:bg-purple-50 active:bg-purple-100 text-slate-900' 
                              : 'bg-transparent hover:bg-white/5 text-white'
                          }`}
                        >
                          <div>
                            <div className={`curated-suggestion-title text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{track.title}</div>
                            <div className={`curated-suggestion-artist text-[11px] font-sans mt-0.5 ${isLightMode ? 'text-slate-600 font-medium' : 'text-white/50'}`}>{track.artist}</div>
                          </div>
                          <div className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${
                            isLightMode 
                              ? 'bg-purple-50 border-purple-200 text-neon-purple hover:bg-neon-purple hover:text-white' 
                              : 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple'
                          }`}>
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className={`p-4 text-center text-xs font-sans ${isLightMode ? 'bg-white text-slate-600' : 'text-white/40'}`}>
                        No matches found in curated tracks.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Curated Track Suggestions Browse Chips */}
              {curatedTracks.length > 0 && !searchQuery.trim() && (
                <div className="pt-2">
                  <div className={`text-[10px] font-sans font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${
                    isLightMode ? 'text-slate-700' : 'text-white/50'
                  }`}>
                    <span className="flex items-center gap-1.5 mb-[10px] lg:mb-0">
                      <Sparkles className="w-3 h-3 text-neon-purple" />
                      Suggested Tracks
                    </span>
                    <span className={`text-[9px] font-medium ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Quick Pick</span>
                  </div>

                  {/* Dropdown for Mobile Screens */}
                  <div className="block lg:hidden relative z-[150] mb-2">
                    <button
                      type="button"
                      onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                      style={{
                        backgroundColor: isLightMode ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                        color: isLightMode ? '#0f172a' : '#ffffff',
                        borderColor: isLightMode ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)'
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        isLightMode
                          ? 'hover:bg-slate-50 shadow-sm'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-neon-purple" />
                        Choose from Curated Suggestions...
                      </span>
                      <ChevronDown className={`w-4 h-4 text-neon-purple transition-transform duration-200 ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {mobileDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          style={{
                            backgroundColor: isLightMode ? '#ffffff' : '#12121a',
                            borderColor: isLightMode ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'
                          }}
                          className={`absolute top-[105%] left-0 w-full rounded-xl border shadow-2xl z-[200] max-h-56 overflow-y-auto divide-y ${
                            isLightMode
                              ? 'divide-slate-100 text-slate-900'
                              : 'divide-white/5 text-white'
                          }`}
                        >
                          {curatedTracks.slice(0, 10).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                handleRequestSubmit(t.title, t.artist);
                                setMobileDropdownOpen(false);
                              }}
                              disabled={isSubmitting}
                              style={{
                                backgroundColor: isLightMode ? '#ffffff' : 'transparent',
                                color: isLightMode ? '#1e293b' : 'rgba(255, 255, 255, 0.8)'
                              }}
                              className={`w-full text-left px-4 py-3 text-xs transition-colors flex items-center justify-between ${
                                isLightMode
                                  ? 'hover:bg-purple-50 hover:text-purple-900'
                                  : 'hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <div className="truncate pr-4">
                                <span className="font-bold">{t.title}</span>
                                <span className={`text-[10px] ml-1.5 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>by {t.artist}</span>
                              </div>
                              <Plus className={`w-3.5 h-3.5 shrink-0 ${isLightMode ? 'text-neon-purple' : 'text-neon-purple/70'}`} />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Traditional Chips for Large Screens */}
                  <div className="hidden lg:flex flex-wrap gap-1.5 max-h-28 sm:max-h-36 overflow-y-auto pr-1 pb-1">
                    {curatedTracks.slice(0, 10).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleRequestSubmit(t.title, t.artist)}
                        disabled={isSubmitting}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-sans border transition-all flex items-center gap-1.5 group ${
                          isLightMode
                            ? 'bg-slate-100/90 hover:bg-purple-50 text-slate-900 hover:text-purple-900 border-slate-200 hover:border-purple-300 shadow-xs'
                            : 'bg-white/5 hover:bg-neon-purple/20 text-white/80 hover:text-white border-white/10 hover:border-neon-purple/40'
                        }`}
                        title={`Request "${t.title}" by ${t.artist}`}
                      >
                        <span className="font-bold truncate max-w-[130px]">{t.title}</span>
                        <span className={`text-[10px] truncate max-w-[90px] ${isLightMode ? 'text-slate-500 font-medium' : 'text-white/40'}`}>• {t.artist}</span>
                        <Plus className="w-3 h-3 text-neon-purple opacity-60 group-hover:opacity-100 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          {/* Guidelines Box */}
          <div className={`hidden lg:block border rounded-2xl p-5 text-xs space-y-2 font-sans ${
            isLightMode 
              ? 'bg-slate-100/70 border-slate-200/90 text-slate-600' 
              : 'bg-white/5 border-white/10 text-white/60'
          }`}>
            <h4 className={`font-display font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
              <AlertCircle className="w-4 h-4 text-neon-blue" /> DJ Request Code
            </h4>
            <p>1. Ensure requested tracks fit the DejavuFM station format (Grime, Garage, Dubstep, Bass, House, Underground).</p>
            <p>2. Keep it civilised. Spamming or offensive submissions will result in instant IP bans.</p>
            <p>3. Support other listeners! Check out their track proposals and upvote those you wish to hear.</p>
          </div>
        </div>

        {/* Requests Queue View */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-display font-bold uppercase tracking-[0.2em] flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white/80'}`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live requests queue
            </h3>
            <span className={`text-[10px] font-sans font-semibold ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>
              {requests.length} Proposals {totalPages > 1 && `(Page ${currentPage} of ${totalPages})`}
            </span>
          </div>

          <div className="space-y-2.5 sm:space-y-3 pr-1">
            {loading ? (
              <div className={`flex flex-col items-center justify-center py-20 gap-3 ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>
                <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
                <span className="text-xs font-sans font-bold uppercase tracking-wider">Syncing queue...</span>
              </div>
            ) : paginatedRequests.length > 0 ? (
              <AnimatePresence mode="popLayout" initial={false}>
                {paginatedRequests.map((req) => {
                  const isUpvoted = upvotedIds.includes(req.id);
                  const isMine = myRequestIds.includes(req.id);
                  
                  return (
                    <motion.div
                      key={req.id}
                      layoutId={`request-${req.id}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className={`booth-request-card relative border rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all duration-300 font-sans ${
                        req.status === 'on_deck'
                          ? (isLightMode ? 'bg-sky-50 border-sky-300 text-slate-900 shadow-sm' : 'bg-neon-blue/10 border-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.1)]')
                          : req.status === 'approved'
                          ? (isLightMode ? 'bg-purple-50 border-purple-300 text-slate-900 shadow-sm' : 'bg-neon-purple/10 border-neon-purple/50')
                          : req.status === 'played'
                          ? (isLightMode ? 'bg-slate-100/50 border-slate-200/80 opacity-60' : 'bg-white/[0.02] border-white/5 opacity-50')
                          : isMine
                          ? (isLightMode ? 'bg-purple-50/60 border-purple-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/20')
                          : (isLightMode ? 'bg-slate-50/90 border-slate-200/90 text-slate-900 shadow-sm' : 'bg-white/[0.03] border-white/5')
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold truncate max-w-[180px] sm:max-w-[260px] ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                            {req.track_title}
                          </span>
                          {isMine && (
                            <span className="yours-badge px-1.5 py-0.5 rounded text-[8px] font-sans uppercase font-black tracking-widest shrink-0 bg-neon-purple text-white border-0">
                              Yours
                            </span>
                          )}
                          {/* Inline Status Badges - Never overlaps vote button */}
                          {req.status === 'on_deck' && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-display font-black uppercase tracking-widest border shrink-0 ${
                              isLightMode 
                                ? 'bg-sky-100 text-sky-800 border-sky-300' 
                                : 'bg-neon-blue/20 text-neon-blue border-neon-blue/30'
                            }`}>
                              <Play className="w-2.5 h-2.5 animate-pulse fill-current" /> On Deck
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-display font-black uppercase tracking-widest border shrink-0 ${
                              isLightMode 
                                ? 'bg-purple-100 text-purple-800 border-purple-300' 
                                : 'bg-neon-purple/20 text-neon-purple border-neon-purple/30'
                            }`}>
                              <Check className="w-2.5 h-2.5" /> Approved
                            </span>
                          )}
                          {(!req.status || req.status === 'pending') && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-display font-bold uppercase tracking-widest border shrink-0 ${
                              isLightMode 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              Queued
                            </span>
                          )}
                          {req.status === 'played' && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-display font-bold uppercase tracking-widest border shrink-0 ${
                              isLightMode 
                                ? 'bg-slate-200 text-slate-600 border-slate-300' 
                                : 'bg-white/10 text-white/40 border-white/10'
                            }`}>
                              Played
                            </span>
                          )}
                        </div>
                        <div className={`text-xs font-medium mt-1 truncate ${isLightMode ? 'text-slate-600' : 'text-white/50'}`}>
                          {req.artist}
                        </div>
                        <div className={`text-[10px] font-sans mt-2 flex items-center gap-1.5 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                          <User className={`w-3 h-3 ${isLightMode ? 'text-slate-400' : 'text-white/20'}`} /> Submitted by <span className={`font-semibold truncate max-w-[120px] ${isLightMode ? 'text-slate-800' : 'text-white/70'}`}>{req.requester_name}</span>
                        </div>
                      </div>

                      {/* Vote Action Area */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleUpvote(req.id)}
                          disabled={isUpvoted || req.status === 'played' || req.status === 'rejected'}
                          className={`vote-btn-elem w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                            isUpvoted
                              ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/30'
                              : req.status === 'played'
                              ? 'border-white/10 bg-slate-900/40 text-slate-500 cursor-not-allowed'
                              : 'border-slate-700/80 bg-slate-900 text-slate-200 hover:text-neon-purple hover:border-neon-purple/50 hover:bg-neon-purple/20'
                          }`}
                          title="Upvote track proposal"
                        >
                          <ThumbsUp className={`w-4 h-4 ${isUpvoted ? 'fill-current text-white' : ''}`} />
                        </button>
                        <span className={`text-[10px] font-sans font-bold tracking-tight ${isLightMode ? 'text-slate-700' : 'text-white/80'}`}>
                          {req.votes} {req.votes === 1 ? 'vote' : 'votes'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            ) : (
              <div className={`text-center py-24 border border-dashed rounded-2xl flex flex-col items-center gap-3 font-sans ${
                isLightMode 
                  ? 'bg-slate-50 border-slate-200/90 text-slate-400' 
                  : 'bg-white/[0.02] border-white/10 text-white/30'
              }`}>
                <Music className={`w-8 h-8 animate-pulse ${isLightMode ? 'text-slate-300' : 'text-white/10'}`} />
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-white/50'}`}>No active requests</div>
                  <div className={`text-[10px] font-sans mt-1 ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>Submit the first track and start the queue!</div>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between pt-4 mt-2 border-t font-sans text-xs ${
                isLightMode ? 'border-slate-200 text-slate-700' : 'border-white/10 text-white/70'
              }`}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`booth-pagination-btn px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentPage === 1
                      ? isLightMode
                        ? 'bg-slate-100/70 border-slate-200 text-slate-300 cursor-not-allowed'
                        : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                      : isLightMode
                      ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs hover:border-slate-400'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white hover:border-white/20'
                  }`}
                >
                  Previous
                </button>

                <div className="flex items-center gap-1.5 overflow-x-auto px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    const isActive = currentPage === page;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`booth-pagination-btn w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center border ${
                          isActive
                            ? 'active-page-btn bg-neon-purple text-white! border-neon-purple shadow-md shadow-neon-purple/30 font-black'
                            : isLightMode
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950 hover:border-slate-300 shadow-xs'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`booth-pagination-btn px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentPage === totalPages
                      ? isLightMode
                        ? 'bg-slate-100/70 border-slate-200 text-slate-300 cursor-not-allowed'
                        : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                      : isLightMode
                      ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs hover:border-slate-400'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white hover:border-white/20'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Guidelines Box - Mobile Only */}
          <div className={`block lg:hidden border rounded-2xl p-5 text-xs space-y-2 font-sans mt-6 ${
            isLightMode 
              ? 'bg-slate-100/70 border-slate-200/90 text-slate-600' 
              : 'bg-white/5 border-white/10 text-white/60'
          }`}>
            <h4 className={`font-display font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
              <AlertCircle className="w-4 h-4 text-neon-blue" /> DJ Request Code
            </h4>
            <p>1. Ensure requested tracks fit the DejavuFM station format (Grime, Garage, Dubstep, Bass, House, Underground).</p>
            <p>2. Keep it civilised. Spamming or offensive submissions will result in instant IP bans.</p>
            <p>3. Support other listeners! Check out their track proposals and upvote those you wish to hear.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
