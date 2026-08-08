import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Send, Heart, ThumbsUp, Smile, Paperclip } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";
import { convertToLocalTime, getLondonTime } from "../../lib/timeUtils";
import { useLogo } from "../../hooks/useLogo";


export function AdminShoutouts({ isAdminUser }: { isAdminUser?: boolean }) {
  const { isLightMode } = useLogo();
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showConfirm, showAlert } = useModal();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const { data: scheduleData = [] } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetch("/api/public/schedule").then(res => res.json()),
    refetchInterval: 30000,
  });

  const currentShow = useMemo(() => {
    const schedule = Array.isArray(scheduleData) ? scheduleData : [];
    const now = getLondonTime();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return schedule.find((show: any) => {
      const start = convertToLocalTime(show.day_of_week, show.start_time);
      const end = convertToLocalTime(show.day_of_week, show.end_time);

      const crossesMidnight = start.timeStr > end.timeStr;
      if (!crossesMidnight) {
        if (start.dayOfWeek !== currentDay) return false;
        return start.timeStr <= currentTime && end.timeStr > currentTime;
      }

      return (
        (start.dayOfWeek === currentDay && currentTime >= start.timeStr) ||
        (end.dayOfWeek === currentDay && currentTime < end.timeStr)
      );
    });
  }, [scheduleData]);

  const load = () => {
    fetchAdmin("/api/admin/shoutouts")
      .then(r => r.json())
      .then(data => {
        setShoutouts(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error("Failed to load shoutouts:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    const socket = (window as any).socket;
    
    const onNewShoutout = () => load();
    const onCleared = () => {
      setShoutouts([]);
      load();
    };
    
    if (socket) {
      socket.on('new_shoutout', onNewShoutout);
      socket.on('shoutouts_cleared', onCleared);
    }
    
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('new_shoutout', onNewShoutout);
        socket.off('shoutouts_cleared', onCleared);
      }
    };
  }, []);

  if (loading) return (
    <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-neon-purple border-t-transparent animate-spin rounded-full" /></div>
  );

  const deleteShoutout = async (id: number) => {
    try {
      const res = await fetchAdmin(`/api/admin/shoutouts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setShoutouts(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const exportToCSV = () => {
    if (shoutouts.length === 0) {
      showAlert({ title: "No Data", message: "There are no interactions to export.", style: "danger" });
      return;
    }

    const headers = ["ID", "Timestamp", "Email", "DJ", "Show", "Message", "Type"];
    const rows = shoutouts.map(s => [
      s.id,
      new Date(s.timestamp).toISOString(),
      `"${(s.listener_name || "").replace(/"/g, '""')}"`,
      `"${(s.dj_name || "Unassigned").replace(/"/g, '""')}"`,
      `"${(s.show_name || "").replace(/"/g, '""')}"`,
      `"${(s.message || "").replace(/"/g, '""')}"`,
      s.type
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dejavu_interactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Exported", message: "CSV file has been generated.", style: "success" });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-6 gap-6 sm:gap-0 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <div className="text-center sm:text-left">
          <h3 className={`text-2xl sm:text-3xl md:text-4xl font-display font-black uppercase tracking-tighter italic leading-none ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Station <span className="text-neon-purple not-italic">Interactions</span></h3>
          <p className={`text-[10px] sm:text-xs mt-2 uppercase tracking-[0.2em] font-black ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Live Listener Pulse</p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 mt-2 sm:mt-0">
          <button 
            onClick={exportToCSV}
            className={`flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-blue border ${isLightMode ? 'bg-black/5 hover:bg-neon-blue/10 border-black/10' : 'bg-white/5 hover:bg-neon-blue/20 border-white/10'}`}
          >
            Export CSV
          </button>
          {isAdminUser && (
            <button 
              onClick={async () => {
                const confirmed = await showConfirm({
                  title: "Purge All Interactions",
                  message: "Are you sure you want to PERMANENTLY delete ALL shoutouts? This action cannot be undone.",
                  style: "danger",
                  confirmText: "Purge Everything"
                });

                if (confirmed) {
                  setShoutouts([]); // Optimistic update: Clear the list immediately
                  await fetchAdmin("/api/admin/shoutouts/all", { method: 'DELETE' });
                  showAlert({ title: "Purged", message: "All interactions have been cleared.", style: "success" });
                  load();
                }
              }} // Changed to use custom modal
              className={`flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap border ${isLightMode ? 'bg-black/5 hover:bg-red-500/10 border-black/10 text-red-600' : 'bg-white/5 hover:bg-red-500/20 border-white/10 text-white'}`}
            >
              Purge Deck
            </button>
          )}
          <div className="flex items-center space-x-2 px-4 py-2.5 bg-neon-purple/20 border border-neon-purple/30 rounded-xl flex-shrink-0">
            <div className="w-2 h-2 bg-neon-purple rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-neon-purple tracking-widest whitespace-nowrap">Streaming Live</span>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'glass-panel border-neon-purple/20 bg-neon-purple/10'}`}>
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 text-neon-purple" />
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>DJ playing right now</p>
            <h4 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-neon-purple truncate">
              {currentShow?.dj_name || "No scheduled DJ"}
            </h4>
          </div>
        </div>
        <div className="sm:text-right min-w-0">
          <p className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-800' : 'text-white/70'}`}>{currentShow?.show_name || "Schedule is clear"}</p>
          {currentShow && (
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>
              {currentShow.start_time} - {currentShow.end_time}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {shoutouts.length === 0 && !loading && (
          <div className={`col-span-full py-20 text-center rounded-3xl border border-dashed ${isLightMode ? 'bg-white border-black/15 shadow-sm text-slate-800' : 'glass-panel border-white/10'}`}>
            <Ghost className={`w-12 h-12 mx-auto mb-4 ${isLightMode ? 'text-black/20' : 'text-white/10'}`} />
            <p className={`uppercase font-black tracking-widest text-xs ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>No activity yet. Promoting the station might help!</p>
          </div>
        )}
        
        <AnimatePresence>
          {shoutouts.map((s) => (
            <motion.div 
              key={s.id}
              whileHover="hover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              layout
              className={`p-4 sm:p-6 rounded-[2rem] border transition-all relative group overflow-hidden ${isLightMode ? 'bg-white border-black/10 shadow-sm hover:border-neon-purple/40' : 'glass-panel border-white/5 hover:border-neon-purple/30'}`}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-0"
                variants={{ hover: { x: ['-150%', '150%'] } }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                initial={{ x: '-150%' }}
              />
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] pointer-events-none ${s.type === 'reaction' ? 'bg-neon-blue/10' : 'bg-neon-purple/10'}`}></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10 gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}>
                    <User className={`w-5 h-5 ${isLightMode ? 'text-black/40' : 'text-white/40'}`} />
                  </div>
                  <div className="min-w-0">
                    <h4 className={`font-bold text-xs truncate tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{s.listener_name}</h4>
                    <p className={`text-[10px] ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>{new Date(s.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteShoutout(s.id)}
                  className={`p-2 hover:bg-red-500/20 rounded-lg transition-all ${isLightMode ? 'text-black/20 hover:text-red-600' : 'text-white/20 hover:text-red-500'}`}
                  title="Permanent Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`relative z-10 mb-4 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${isLightMode ? 'border-neon-purple/20 bg-neon-purple/5' : 'border-neon-purple/20 bg-neon-purple/10'}`}>
                <div className="min-w-0">
                  <p className={`text-[8px] font-black uppercase tracking-[0.22em] ${isLightMode ? 'text-slate-900/40' : 'text-white/35'}`}>For DJ</p>
                  <p className="text-xs font-black uppercase tracking-tight text-neon-purple truncate">{s.dj_name || 'Unassigned'}</p>
                </div>
                {s.show_name && (
                  <span className={`text-[8px] font-black uppercase tracking-widest truncate max-w-[45%] ${isLightMode ? 'text-slate-900/40' : 'text-white/35'}`}>
                    {s.show_name}
                  </span>
                )}
              </div>

              <div className="relative z-10">
                {s.type === 'reaction' ? (
                  <div className="text-4xl text-center py-4 animate-bounce">
                    {s.message}
                  </div>
                ) : (
                  <p className={`text-sm leading-relaxed font-medium italic ${isLightMode ? 'text-slate-800' : 'text-white/80'}`}>"{s.message}"</p>
                )}

                {/* Media Previews */}
                {s.imageUrl && (
                  <div className={`relative mt-3 max-w-full rounded-lg overflow-hidden border ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-black/40'}`}>
                    <img 
                      src={s.imageUrl} 
                      alt="Attached Image" 
                      className="max-h-48 object-contain mx-auto w-full cursor-pointer hover:opacity-95 transition-opacity" 
                    />
                  </div>
                )}
                {s.videoUrl && (
                  <div className={`relative mt-3 max-w-full rounded-lg overflow-hidden border ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-black/40'}`}>
                    <video 
                      src={s.videoUrl} 
                      controls
                      preload="metadata"
                      playsInline
                      className="max-h-48 w-full object-contain mx-auto bg-black" 
                    />
                  </div>
                )}
                {s.audioUrl && (
                  <div className={`mt-3 w-full p-2 rounded-xl flex flex-col gap-1 border ${isLightMode ? 'bg-black/5 border-black/5' : 'bg-black/30 border-white/5'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-wider truncate mb-1 ${isLightMode ? 'text-black/60' : 'text-white/50'}`}>
                      🎵 Attached Audio
                    </p>
                    <audio 
                      src={s.audioUrl} 
                      controls 
                      className="w-full h-8 accent-neon-purple rounded" 
                    />
                  </div>
                )}
              </div>

              {s.reply_text ? (
                <div className={`relative z-10 mt-4 p-3 border rounded-xl text-xs italic ${isLightMode ? 'bg-neon-blue/5 border-neon-blue/20' : 'bg-neon-blue/10 border-neon-blue/20'}`}>
                  <p className={isLightMode ? 'text-slate-800' : 'text-white/80'}>"{s.reply_text}"</p>
                  
                  {/* Reply Media Previews */}
                  {s.replyImageUrl && (
                    <div className={`relative mt-2 max-w-full rounded-lg overflow-hidden border ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-black/40'}`}>
                      <img 
                        src={s.replyImageUrl} 
                        alt="Reply Image Attachment" 
                        className="max-h-32 object-contain mx-auto w-full cursor-pointer hover:opacity-95 transition-opacity" 
                      />
                    </div>
                  )}
                  {s.replyVideoUrl && (
                    <div className={`relative mt-2 max-w-full rounded-lg overflow-hidden border ${isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-black/40'}`}>
                      <video 
                        src={s.replyVideoUrl} 
                        className="max-h-32 w-full object-contain mx-auto bg-black" 
                        controls
                        preload="metadata"
                        playsInline
                      />
                    </div>
                  )}
                  {s.replyAudioUrl && (
                    <div className={`mt-2 w-full p-1.5 rounded-lg flex flex-col gap-1 border ${isLightMode ? 'bg-black/5 border-black/5' : 'bg-black/30 border-white/5'}`}>
                      <audio 
                        src={s.replyAudioUrl} 
                        controls 
                        className="w-full h-8 accent-neon-blue rounded" 
                      />
                    </div>
                  )}

                  <p className={`text-right text-[10px] font-bold uppercase tracking-widest mt-2 ${isLightMode ? 'text-cyan-600' : 'text-neon-blue/60'}`}>
                    - Replied by {s.replied_by}
                  </p>
                </div>
              ) : replyingTo === s.id ? (
                <ReplyForm shoutoutId={s.id} onReplied={() => { setReplyingTo(null); load(); }} onCancel={() => setReplyingTo(null)} isLightMode={isLightMode} />
              ) : (
                <div className="relative z-10 mt-4 animate-in fade-in">
                  <button
                    onClick={() => setReplyingTo(s.id)}
                    className={`w-full flex items-center justify-center gap-2 py-2 border rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isLightMode ? 'bg-black/5 hover:bg-neon-purple/10 border-black/10 hover:border-neon-purple/20 text-black/60 hover:text-neon-purple' : 'bg-white/5 hover:bg-neon-purple/20 border-white/10 hover:border-neon-purple/30 text-white/60 hover:text-white'}`}
                  >
                    <Send className="w-3 h-3" />
                    Reply to Shoutout
                  </button>
                </div>
              )
              }


              <div className="mt-6 flex items-center justify-between relative z-10">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${s.type === 'reaction' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-neon-purple/20 text-neon-purple'}`}>
                  {s.type}
                </span>
                <span className={`text-[8px] font-black uppercase ${isLightMode ? 'text-black/30' : 'text-white/20'}`}>{s.id}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReplyForm({ shoutoutId, onReplied, onCancel, isLightMode }: { shoutoutId: number, onReplied: () => void, onCancel: () => void, isLightMode: boolean }) {
  const [replyText, setReplyText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useModal();

  useEffect(() => {
    if (!attachment) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(attachment);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !attachment) return;

    setIsSaving(true);
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        const uploadRes = await fetchAdmin('/api/public/chat/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
        mediaUrl = uploadData.url;
        mediaType = uploadData.type;
      }

      const res = await fetchAdmin(`/api/admin/shoutouts/${shoutoutId}/reply`, {
        method: 'POST',
        body: { 
          reply_text: replyText,
          replyImageUrl: mediaType === 'image' ? mediaUrl : null,
          replyAudioUrl: mediaType === 'audio' ? mediaUrl : null,
          replyVideoUrl: mediaType === 'video' ? mediaUrl : null
        }
      });
      if (res.ok) {
        onReplied();
      } else {
        showAlert({ title: "Error", message: "Failed to send reply.", style: "danger" });
      }
    } catch (err: any) {
      showAlert({ title: "Error", message: err.message || "Network error.", style: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const fileType = attachment?.type.split('/')[0];

  return (
    <form onSubmit={handleSubmit} className="relative z-10 mt-4 space-y-3 animate-in fade-in">
      <div className="relative">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Write a reply with an option to attach media..."
          rows={2}
          className={`w-full rounded-xl p-3 pr-10 text-xs focus:outline-none focus:border-neon-purple transition-colors border ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900 placeholder-black/30' : 'bg-black/40 border-white/10 text-white placeholder-white/30'}`}
          autoFocus
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`absolute right-3 top-3 p-1.5 rounded-lg transition-colors ${isLightMode ? 'hover:bg-black/5 text-black/40 hover:text-black' : 'hover:bg-white/5 text-white/40 hover:text-white'}`}
          title="Attach media (Image, Audio, Video)"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setAttachment(file);
          }} 
          accept="image/*,audio/*,video/*" 
          className="hidden" 
        />
      </div>

      {/* Attachment Preview Panel */}
      {attachment && (
        <div className={`relative group p-2 rounded-xl border flex items-center justify-between gap-3 ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-black/30 border-white/10'}`}>
          <div className="flex items-center gap-3 min-w-0">
            {previewUrl && fileType === 'image' && (
              <img src={previewUrl} alt="Preview" className={`w-10 h-10 object-cover rounded-lg shrink-0 border ${isLightMode ? 'border-black/10' : 'border-white/10'}`} />
            )}
            {previewUrl && fileType === 'video' && (
              <div className={`w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0 border ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
                <video src={previewUrl} className="w-full h-full object-cover rounded-lg" />
              </div>
            )}
            {previewUrl && fileType === 'audio' && (
              <div className="w-10 h-10 bg-neon-purple/10 border border-neon-purple/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-xs">🎵</span>
              </div>
            )}
            <div className="min-w-0">
              <p className={`text-[10px] font-bold truncate ${isLightMode ? 'text-slate-800' : 'text-white/80'}`}>{attachment.name}</p>
              <p className={`text-[9px] ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setAttachment(null)} 
            className={`p-1 rounded-md transition-colors shrink-0 ${isLightMode ? 'hover:bg-red-500/10 text-black/40 hover:text-red-600' : 'hover:bg-red-500/20 text-white/40 hover:text-red-400'}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors ${isLightMode ? 'bg-black/5 text-slate-600 hover:bg-black/10' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>Cancel</button>
        <button 
          type="submit" 
          disabled={isSaving || (!replyText.trim() && !attachment)} 
          className="px-4 py-1.5 bg-neon-purple hover:bg-neon-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40 disabled:hover:bg-neon-purple flex items-center gap-1.5 transition-colors"
        >
          <Send className="w-3 h-3" />
          {isSaving ? 'Sending...' : 'Reply'}
        </button>
      </div>
    </form>
  );
}
