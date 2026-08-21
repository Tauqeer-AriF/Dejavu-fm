import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Link2 as LinkIcon, ChevronDown, ChevronUp, Check, XCircle, Trash2, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";
import { useLogo } from "../../hooks/useLogo";

const AVAILABLE_PAGES = [
  { path: "/", label: "Home / Listen" },
  { path: "/watch", label: "Watch Live" },
  { path: "/schedule", label: "Schedule" },
  { path: "/djs", label: "DJs Page" },
  { path: "/podcasts", label: "Podcasts" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" }
];

export function AdminFeatures() {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();
  const [features, setFeatures] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showAlert, showConfirm } = useModal();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [sliderEnabled, setSliderEnabled] = useState(false);
  const [sliderPages, setSliderPages] = useState<string[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSliderConfigExpanded, setIsSliderConfigExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/features");
      if (res.ok) {
        const data = await res.json();
        setFeatures(Array.isArray(data) ? data : []);
      }

      const settingsRes = await fetch("/api/public/settings");
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setSliderEnabled(settings.features_slider_enabled === "1");
        const pagesStr = settings.features_slider_pages || "";
        setSliderPages(pagesStr.split(",").map((p: string) => p.trim()).filter(Boolean));
      }
    } catch (err) {
      console.error("Failed to load admin features & settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'comments'>('posts');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentFilter, setCommentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/features/comments");
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
    loadComments();
  }, []);

  const handleUpdateCommentStatus = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const res = await fetchAdmin(`/api/admin/features/comments/${id}/status`, {
        method: "PUT",
        body: { status }
      });
      if (res.ok) {
        showAlert({
          title: "Comment Updated",
          message: `Comment status updated to ${status}.`,
          style: "success"
        });
        loadComments();
      } else {
        showAlert({ title: "Error", message: "Failed to update comment status.", style: "danger" });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      showAlert({ title: "Error", message: "Failed to update comment status.", style: "danger" });
    }
  };

  const handleDeleteComment = async (id: number) => {
    const confirmed = await showConfirm({
      title: "Delete Comment",
      message: "Are you sure you want to delete this comment permanently? This action cannot be undone.",
      style: "danger",
      confirmText: "Delete"
    });
    if (!confirmed) return;

    try {
      const res = await fetchAdmin(`/api/admin/features/comments/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showAlert({ title: "Deleted", message: "Comment deleted successfully.", style: "success" });
        loadComments();
      } else {
        showAlert({ title: "Error", message: "Failed to delete comment.", style: "danger" });
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
      showAlert({ title: "Error", message: "Failed to delete comment.", style: "danger" });
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        body: {
          features_slider_enabled: sliderEnabled ? "1" : "0",
          features_slider_pages: sliderPages.join(",")
        }
      });
      if (res.ok) {
        showAlert({ title: "Settings Saved", message: "Features slider configuration updated.", style: "success" });
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      } else {
        showAlert({ title: "Error", message: "Failed to save features slider settings.", style: "danger" });
      }
    } catch (err) {
      console.error("Save settings error:", err);
      showAlert({ title: "Error", message: "Failed to save features slider settings.", style: "danger" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const refreshFeatures = () => {
    queryClient.invalidateQueries({ queryKey: ["features"] });
    load();
  };

  const handleDelete = async (blog: any) => {
    const confirmed = await showConfirm({
      title: "Delete Feature Post",
      message: `Delete "${blog.title}" permanently? This cannot be undone.`,
      style: "danger",
      confirmText: "Delete"
    });

    if (!confirmed) return;

    const res = await fetchAdmin(`/api/admin/features/${blog.id}`, { method: "DELETE" });
    if (res.ok) {
      showAlert({ title: "Deleted", message: "Feature post removed.", style: "success" });
      refreshFeatures();
    } else {
      showAlert({ title: "Error", message: "Failed to delete feature post.", style: "danger" });
    }
  };

  return (
    <div className="space-y-8">
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6 transition-colors ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <div>
          <h3 className={`text-3xl md:text-4xl font-display font-black uppercase tracking-tighter ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            Features <span className="text-neon-purple">Desk</span>
          </h3>
          <p className={`text-xs mt-2 uppercase tracking-[0.2em] font-black transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Write, publish, and maintain features</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl w-fit border transition-colors ${isLightMode ? 'bg-neon-purple/5 border-neon-purple/20' : 'bg-neon-purple/10 border-neon-purple/20'}`}>
            <FileText className="w-4 h-4 text-neon-purple" />
            <span className="text-[10px] font-black uppercase tracking-widest text-neon-purple">{features.length} Posts</span>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-neon-purple border border-neon-purple rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-neon-blue hover:border-neon-blue transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? "Close Form" : "Add New Feature"}
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className={`flex border-b pb-px ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <button
          onClick={() => setActiveSubTab('posts')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'posts'
              ? 'border-neon-purple text-neon-purple font-black'
              : (isLightMode 
                  ? 'border-transparent text-slate-500 hover:text-slate-900' 
                  : 'border-transparent text-white/40 hover:text-white')
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Posts & Slider</span>
        </button>
        <button
          onClick={() => {
            setActiveSubTab('comments');
            loadComments();
          }}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'comments'
              ? 'border-neon-purple text-neon-purple font-black'
              : (isLightMode 
                  ? 'border-transparent text-slate-500 hover:text-slate-900' 
                  : 'border-transparent text-white/40 hover:text-white')
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Comments Moderation</span>
          {comments.filter(c => c.status === 'pending').length > 0 && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'posts' ? (
        <>
          {/* Features Slider Settings Card */}
          <div className={`border rounded-2xl p-6 relative overflow-hidden transition-all duration-300 ${
            isSliderConfigExpanded ? "space-y-6" : "space-y-0"
          } ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10 backdrop-blur-md'}`}>
            <div 
              onClick={() => setIsSliderConfigExpanded(!isSliderConfigExpanded)}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors cursor-pointer select-none group ${
                isSliderConfigExpanded ? "border-b pb-4" : ""
              } ${isLightMode ? 'border-black/5' : 'border-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                  isSliderConfigExpanded 
                    ? 'bg-neon-purple/10 border-neon-purple/30' 
                    : (isLightMode ? 'bg-neon-purple/5 border-neon-purple/10' : 'bg-neon-purple/10 border-neon-purple/20')
                }`}>
                  <Settings className={`w-5 h-5 text-neon-purple transition-transform duration-500 ${isSliderConfigExpanded ? 'rotate-90' : ''}`} />
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-widest transition-colors group-hover:text-neon-purple ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Slider Configuration</h4>
                  <p className={`text-[10px] uppercase tracking-wider mt-0.5 transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Showcase features in a premium 3-column carousel on selected pages</p>
                </div>
              </div>

              <button
                type="button"
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border shadow-sm ${
                  isSliderConfigExpanded
                    ? "bg-neon-purple/10 border-neon-purple/30 text-neon-purple"
                    : (isLightMode
                      ? "bg-black/5 border-black/10 text-slate-700 hover:bg-black/10"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10")
                }`}
              >
                {isSliderConfigExpanded ? (
                  <>
                    Collapse Settings
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Expand Settings
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isSliderConfigExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden space-y-6 pt-2"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Enable Toggle */}
                    <div className="space-y-4">
                      <label className={`block text-xs font-black uppercase tracking-[0.2em] transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>Slider Status</label>
                      <div className={`flex items-center gap-3 p-4 border rounded-xl hover:border-neon-purple/30 transition-all ${isLightMode ? 'bg-black/[0.01] border-black/10' : 'bg-white/5 border-white/10'}`}>
                        <input
                          id="slider-enabled"
                          type="checkbox"
                          checked={sliderEnabled}
                          onChange={(e) => setSliderEnabled(e.target.checked)}
                          className={`w-4 h-4 rounded text-neon-purple focus:ring-neon-purple cursor-pointer ${isLightMode ? 'border-black/20 bg-white' : 'border-white/10 bg-dark-bg'}`}
                        />
                        <label htmlFor="slider-enabled" className={`text-xs font-black uppercase tracking-wider cursor-pointer select-none transition-colors ${isLightMode ? 'text-slate-800' : 'text-white/80'}`}>
                          Enable 3-Column Features Slider
                        </label>
                      </div>
                    </div>

                    {/* Page Target Checklist */}
                    <div className="space-y-4">
                      <label className={`block text-xs font-black uppercase tracking-[0.2em] transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>Display Pages</label>
                      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${!sliderEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                        {AVAILABLE_PAGES.map((page) => {
                          const isChecked = sliderPages.includes(page.path);
                          return (
                            <label
                              key={page.path}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-neon-purple/10 border-neon-purple/30 text-neon-purple"
                                  : (isLightMode
                                    ? "bg-white border-black/10 text-slate-600 hover:bg-black/[0.02] hover:border-black/15"
                                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20")
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!sliderEnabled}
                                onChange={() => {
                                  if (isChecked) {
                                    setSliderPages(sliderPages.filter((p) => p !== page.path));
                                  } else {
                                    setSliderPages([...sliderPages, page.path]);
                                  }
                                }}
                                className={`w-3.5 h-3.5 rounded text-neon-purple focus:ring-neon-purple cursor-pointer ${isLightMode ? 'border-black/20 bg-white' : 'border-white/10 bg-dark-bg'}`}
                              />
                              {page.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="flex items-center gap-2 px-6 py-2.5 bg-neon-purple border border-neon-purple rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-neon-blue hover:border-neon-blue transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg hover:shadow-neon-purple/25"
                    >
                      {isSavingSettings ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Settings className="w-3.5 h-3.5" />
                          Save Slider Settings
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <FeatureForm
                  mode="create"
                  onSaved={() => {
                    refreshFeatures();
                    setShowCreateForm(false);
                  }}
                  onCancel={() => setShowCreateForm(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <h4 className={`text-sm font-black uppercase tracking-[0.25em] transition-colors ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>Existing Posts</h4>
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2].map(item => (
                  <div key={item} className={`border rounded-2xl p-5 animate-pulse h-40 ${isLightMode ? 'bg-white border-black/10' : 'bg-dark-bg border-white/10'}`} />
                ))}
              </div>
            ) : features.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {features.map(blog => (
                  <div key={blog.id} className={`border rounded-2xl p-4 space-y-4 transition-colors ${editingId === blog.id ? "lg:col-span-2" : ""} ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg border-white/10'}`}>
                    {editingId === blog.id ? (
                      <FeatureForm mode="edit" blog={blog} onSaved={() => { setEditingId(null); refreshFeatures(); }} onCancel={() => setEditingId(null)} />
                    ) : (
                      <>
                        <div className="flex gap-4">
                          <div className={`w-24 h-24 rounded-xl overflow-hidden border flex-shrink-0 transition-colors ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                            {blog.image_url ? (
                              <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className={`w-8 h-8 ${isLightMode ? 'text-slate-300' : 'text-white/15'}`} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                                blog.is_published 
                                  ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                                  : (isLightMode 
                                    ? "bg-black/5 text-slate-500 border border-black/10" 
                                    : "bg-white/5 text-white/40 border border-white/10")
                              }`}>
                                {blog.is_published ? "Published" : "Draft"}
                              </span>
                              <span className={`text-[9px] uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'text-white/25'}`}>{blog.slug}</span>
                            </div>
                            <h5 className={`font-display font-black text-xl leading-tight line-clamp-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{blog.title}</h5>
                            <p className={`text-xs mt-2 line-clamp-2 ${isLightMode ? 'text-slate-500' : 'text-white/45'}`}>{blog.excerpt || blog.content}</p>
                          </div>
                        </div>
                        <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                          <span className={`text-[10px] font-mono ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                            {blog.created_at ? new Date(blog.created_at).toLocaleString() : "Recently created"}
                          </span>
                          <div className="flex gap-2">
                            {blog.is_published ? (
                              <Link to={`/features/${blog.slug}`} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${
                                isLightMode 
                                  ? 'bg-black/5 border-black/10 text-slate-700 hover:bg-black/10' 
                                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                              }`}>
                                View
                              </Link>
                            ) : null}
                            <button onClick={() => setEditingId(blog.id)} className="px-3 py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-[10px] font-black uppercase tracking-widest hover:bg-neon-blue/20 transition-colors">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(blog)} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors">
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-16 text-center border rounded-2xl ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <FileText className={`w-12 h-12 mx-auto mb-4 ${isLightMode ? 'text-slate-300' : 'text-white/10'}`} />
                <p className={`uppercase tracking-widest text-xs font-black ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>No features yet.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className={`text-sm font-black uppercase tracking-[0.25em] transition-colors ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>
                Comments Moderation Board
              </h4>
              <p className={`text-[10px] uppercase tracking-wider transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>
                Approve, reject, or delete user comments for all features. Only approved comments are displayed publicly.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className={`flex flex-wrap gap-1 p-1 rounded-xl border transition-colors ${
              isLightMode ? 'bg-black/[0.02] border-black/10' : 'bg-white/5 border-white/5'
            }`}>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => {
                const count = filter === 'all' 
                  ? comments.length 
                  : comments.filter(c => c.status === filter).length;
                
                const isActive = commentFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setCommentFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      isActive
                        ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20 font-black'
                        : (isLightMode 
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' 
                            : 'text-white/40 hover:text-white hover:bg-white/5')
                    }`}
                  >
                    {filter} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {commentsLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map(item => (
                <div key={item} className={`border rounded-2xl p-5 animate-pulse h-24 ${isLightMode ? 'bg-white border-black/10' : 'bg-dark-bg border-white/10'}`} />
              ))}
            </div>
          ) : (() => {
            const filteredComments = comments.filter(c => commentFilter === 'all' || c.status === commentFilter);
            if (filteredComments.length === 0) {
              return (
                <div className={`py-16 text-center border rounded-2xl ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                  <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${isLightMode ? 'text-slate-300' : 'text-white/10'}`} />
                  <p className={`uppercase tracking-widest text-xs font-black ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                    No comments found matching filter "{commentFilter}".
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-4">
                {filteredComments.map(comment => (
                  <div key={comment.id} className={`border rounded-2xl p-5 space-y-4 transition-colors ${
                    isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg border-white/10'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-display font-black text-sm uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                            {comment.author_name}
                          </span>
                          {comment.author_email && (
                            <span className={`text-[10px] lowercase font-sans ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                              ({comment.author_email})
                            </span>
                          )}
                          <span className={`text-[9px] font-mono ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>
                            • {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={`${isLightMode ? 'text-slate-500' : 'text-white/40'} font-bold uppercase tracking-wider`}>On Feature:</span>
                          <Link 
                            to={`/features/${comment.feature_slug}`} 
                            className="text-neon-blue hover:text-neon-purple font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                          >
                            {comment.feature_title}
                            <LinkIcon className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div>
                        <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                          comment.status === 'approved'
                            ? "bg-green-500/10 text-green-500 border border-green-500/20 font-black"
                            : comment.status === 'rejected'
                              ? "bg-red-500/10 text-red-400 border border-red-500/20 font-black"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse font-black"
                        }`}>
                          {comment.status}
                        </span>
                      </div>
                    </div>

                    <p className={`text-xs leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-white/70'}`}>
                      {comment.content}
                    </p>

                    <div className={`flex justify-end gap-2 pt-3 border-t ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                      {comment.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateCommentStatus(comment.id, 'approved')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}
                      {comment.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateCommentStatus(comment.id, 'rejected')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function FeatureForm({ mode, blog, onSaved, onCancel }: { mode: "create" | "edit"; blog?: any; onSaved: () => void; onCancel?: () => void }) {
  const { isLightMode } = useLogo();
  const [title, setTitle] = useState(blog?.title || "");
  const [excerpt, setExcerpt] = useState(blog?.excerpt || "");
  const [imageUrl, setImageUrl] = useState(blog?.image_url || "");
  const [linkUrl, setLinkUrl] = useState(blog?.link_url || "");
  const [content, setContent] = useState(blog?.content || "");
  const [paragraphImageUrl, setParagraphImageUrl] = useState("");
  const [paragraphImageCaption, setParagraphImageCaption] = useState("");
  const [insertLinkText, setInsertLinkText] = useState("");
  const [insertLinkUrl, setInsertLinkUrl] = useState("");
  const [insertLinkTarget, setInsertLinkTarget] = useState<"_blank" | "_self">("_blank");
  const [activeHelper, setActiveHelper] = useState<"image" | "link">("image");
  const [activeHelperMode, setActiveHelperMode] = useState<"image" | "link">("image");
  const [isPublished, setIsPublished] = useState(blog?.is_published !== 0);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const { showAlert } = useModal();

  const reset = () => {
    setTitle("");
    setExcerpt("");
    setImageUrl("");
    setLinkUrl("");
    setContent("");
    setInsertLinkText("");
    setInsertLinkUrl("");
    setInsertLinkTarget("_blank");
    setIsPublished(true);
  };

  const insertParagraphLink = () => {
    const url = insertLinkUrl.trim();
    const text = insertLinkText.trim() || "Link";
    if (!url) {
      showAlert({ title: "Link URL Required", message: "Add a URL before inserting it into the post.", style: "danger" });
      return;
    }

    const marker = insertLinkTarget === "_self" ? `[${text}](${url}|_self)` : `[${text}](${url})`;
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const nextContent = `${content.slice(0, start)}${marker}${content.slice(end)}`;

    setContent(nextContent);
    setInsertLinkText("");
    setInsertLinkUrl("");

    requestAnimationFrame(() => {
      contentRef.current?.focus();
      const cursor = start + marker.length;
      contentRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const insertParagraphImage = () => {
    const url = paragraphImageUrl.trim();
    if (!url) {
      showAlert({ title: "Image URL Required", message: "Add an image URL before inserting it into the post.", style: "danger" });
      return;
    }

    const caption = paragraphImageCaption.trim() || "Feature image";
    const marker = `\n\n![${caption}](${url})\n\n`;
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const nextContent = `${content.slice(0, start)}${marker}${content.slice(end)}`;

    setContent(nextContent);
    setParagraphImageUrl("");
    setParagraphImageCaption("");

    requestAnimationFrame(() => {
      contentRef.current?.focus();
      const cursor = start + marker.length;
      contentRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showAlert({ title: "Missing Content", message: "A feature post needs a heading and post text.", style: "danger" });
      return;
    }

    setSaving(true);
    const endpoint = mode === "edit" ? `/api/admin/features/${blog.id}` : "/api/admin/features";
    const res = await fetchAdmin(endpoint, {
      method: mode === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        excerpt,
        image_url: imageUrl,
        content,
        is_published: isPublished,
        link_url: linkUrl
      })
    });
    setSaving(false);

    if (res.ok) {
      showAlert({ title: "Saved", message: mode === "edit" ? "Feature post updated." : "Feature post created.", style: "success" });
      if (mode === "create") reset();
      onSaved();
    } else {
      const data = await res.json().catch(() => ({ error: "Failed to save feature post." }));
      showAlert({ title: "Error", message: data.error || "Failed to save feature post.", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleSave} className={`${mode === "create" ? (isLightMode ? "bg-white border border-black/10 shadow-sm rounded-2xl p-5 md:p-6" : "bg-dark-bg/50 border border-white/10 rounded-2xl p-5 md:p-6") : ""} space-y-5`}>
      {mode === "create" && (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${isLightMode ? 'bg-neon-purple/5 border-neon-purple/20' : 'bg-neon-purple/15 border-neon-purple/20'}`}>
            <Plus className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h4 className={`font-black uppercase tracking-tight transition-colors ${isLightMode ? 'text-slate-900' : 'text-white'}`}>New Feature Post</h4>
            <p className={`text-xs transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Add a heading, image, and text for a public post.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
        <div className="space-y-4">
          <div>
            <label className={`block text-[10px] uppercase tracking-widest font-black mb-2 transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Heading</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm transition-all ${isLightMode ? 'bg-black/[0.02] border-black/10 text-slate-900 focus:bg-white' : 'bg-panel-bg border-white/10 text-white'}`} placeholder="Post title" />
          </div>
          <div>
            <label className={`block text-[10px] uppercase tracking-widest font-black mb-2 transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Short Summary</label>
            <input value={excerpt} onChange={e => setExcerpt(e.target.value)} className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm transition-all ${isLightMode ? 'bg-black/[0.02] border-black/10 text-slate-900 focus:bg-white' : 'bg-panel-bg border-white/10 text-white'}`} placeholder="Optional preview text for the features page" />
          </div>
          <div>
            <label className={`block text-[10px] uppercase tracking-widest font-black mb-2 transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Optional Link / URL</label>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm transition-all ${isLightMode ? 'bg-black/[0.02] border-black/10 text-slate-900 focus:bg-white' : 'bg-panel-bg border-white/10 text-white'}`} placeholder="Optional external link (e.g., https://example.com)" />
          </div>
          <ImageUploadField label="Image URL" value={imageUrl} onChange={setImageUrl} placeholder="https://..." />
        </div>

        <div className={`rounded-2xl overflow-hidden min-h-[220px] flex items-center justify-center border transition-colors ${isLightMode ? 'bg-black/[0.02] border-black/10' : 'bg-white/5 border-white/10'}`}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-3 p-6">
              <ImageIcon className={`w-10 h-10 mx-auto transition-colors ${isLightMode ? 'text-slate-300' : 'text-white/15'}`} />
              <p className={`text-[10px] uppercase tracking-widest font-black transition-colors ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>Image Preview</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className={`block text-[10px] uppercase tracking-widest font-black mb-2 transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Post Text</label>
        <textarea ref={contentRef} required value={content} onChange={e => setContent(e.target.value)} rows={mode === "create" ? 8 : 12} className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm leading-6 transition-all ${isLightMode ? 'bg-black/[0.02] border-black/10 text-slate-900 focus:bg-white' : 'bg-panel-bg border-white/10 text-white'}`} placeholder="Write the full feature post here..." />
        <div className={`mt-3 rounded-xl border p-3 space-y-3 transition-colors ${isLightMode ? 'bg-black/[0.01] border-black/10' : 'bg-white/5 border-white/10'}`}>
          <div className={`flex items-center gap-4 border-b pb-2 transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <button
              type="button"
              onClick={() => setActiveHelper("image")}
              className={`flex items-center gap-2 pb-1 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                activeHelper === "image"
                  ? "border-neon-blue text-white"
                  : (isLightMode
                    ? "border-transparent text-slate-400 hover:text-slate-900"
                    : "border-transparent text-white/45 hover:text-white")
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-neon-blue" />
              Insert Image
            </button>
            <button
              type="button"
              onClick={() => setActiveHelper("link")}
              className={`flex items-center gap-2 pb-1 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                activeHelper === "link"
                  ? "border-neon-purple text-white"
                  : (isLightMode
                    ? "border-transparent text-slate-400 hover:text-slate-900"
                    : "border-transparent text-white/45 hover:text-white")
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 text-neon-purple" />
              Insert Link (Hyperlink)
            </button>
          </div>

          {activeHelper === "image" ? (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(180px,280px)_auto] gap-3 items-end">
              <ImageUploadField value={paragraphImageUrl} onChange={setParagraphImageUrl} placeholder="Image URL" className="!space-y-0" />
              <input value={paragraphImageCaption} onChange={e => setParagraphImageCaption(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-neon-blue transition-all ${isLightMode ? 'bg-white border-black/10 text-slate-900' : 'bg-panel-bg border-white/10 text-white'}`} placeholder="Caption / alt text" />
              <button type="button" onClick={insertParagraphImage} className="px-4 py-2.5 rounded-lg bg-neon-blue text-dark-bg text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple hover:text-white transition-colors">
                Insert
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[9px] uppercase tracking-wider font-bold mb-1 transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Link Text</label>
                  <input value={insertLinkText} onChange={e => setInsertLinkText(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neon-purple transition-all ${isLightMode ? 'bg-white border-black/10 text-slate-900' : 'bg-panel-bg border-white/10 text-white'}`} placeholder="e.g., Read More" />
                </div>
                <div>
                  <label className={`block text-[9px] uppercase tracking-wider font-bold mb-1 transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Link URL</label>
                  <input value={insertLinkUrl} onChange={e => setInsertLinkUrl(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neon-purple transition-all ${isLightMode ? 'bg-white border-black/10 text-slate-900' : 'bg-panel-bg border-white/10 text-white'}`} placeholder="e.g., https://example.com" />
                </div>
              </div>
              
              <div className={`flex flex-wrap items-center justify-between gap-4 pt-1 p-2 rounded-lg border transition-colors ${isLightMode ? 'bg-black/[0.03] border-black/10' : 'bg-black/20 border-white/5'}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] uppercase tracking-wider font-black transition-colors ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Open Behavior:</span>
                  <div className={`flex rounded-lg p-0.5 border transition-colors ${isLightMode ? 'bg-black/10 border-black/5' : 'bg-black/40 border-white/5'}`}>
                    <button
                      type="button"
                      onClick={() => setInsertLinkTarget("_blank")}
                      className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${
                        insertLinkTarget === "_blank"
                          ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                          : (isLightMode ? "text-slate-600 hover:text-slate-900" : "text-white/40 hover:text-white")
                      }`}
                    >
                      New Tab
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsertLinkTarget("_self")}
                      className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${
                        insertLinkTarget === "_self"
                          ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                          : (isLightMode ? "text-slate-600 hover:text-slate-900" : "text-white/40 hover:text-white")
                      }`}
                    >
                      Current Tab
                    </button>
                  </div>
                </div>
                
                <button type="button" onClick={insertParagraphLink} className="px-4 py-2 rounded-lg bg-neon-purple text-white text-[10px] font-black uppercase tracking-widest hover:bg-neon-blue hover:text-dark-bg transition-colors">
                  Insert Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="sr-only peer" />
          <span className={`w-12 h-6 rounded-full relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:bg-neon-purple peer-checked:after:translate-x-6 ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}></span>
          <span className={`text-xs font-black uppercase tracking-widest transition-colors ${isLightMode ? 'text-slate-600' : 'text-white/50'}`}>{isPublished ? "Published" : "Draft"}</span>
        </label>

        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors ${isLightMode ? 'bg-black/5 border-black/10 text-slate-600 hover:text-slate-900 hover:bg-black/10' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
              Cancel
            </button>
          )}
          <button disabled={saving} className="px-5 py-2.5 rounded-xl bg-neon-purple hover:bg-neon-blue disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-colors">
            {saving ? "Saving..." : mode === "edit" ? "Save Post" : "Create Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
