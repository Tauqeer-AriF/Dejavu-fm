import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Link2 as LinkIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminFeatures() {
  const queryClient = useQueryClient();
  const [features, setFeatures] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showAlert, showConfirm } = useModal();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/features");
      if (res.ok) {
        const data = await res.json();
        setFeatures(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h3 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tighter">
            Features <span className="text-neon-purple">Desk</span>
          </h3>
          <p className="text-white/40 text-xs mt-2 uppercase tracking-[0.2em] font-black">Write, publish, and maintain station features</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-neon-purple/10 border border-neon-purple/20 rounded-xl w-fit">
          <FileText className="w-4 h-4 text-neon-purple" />
          <span className="text-[10px] font-black uppercase tracking-widest text-neon-purple">{features.length} Posts</span>
        </div>
      </div>

      <FeatureForm mode="create" onSaved={refreshFeatures} />

      <div className="space-y-4">
        <h4 className="text-sm font-black uppercase tracking-[0.25em] text-white/40">Existing Posts</h4>
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map(item => (
              <div key={item} className="bg-dark-bg border border-white/10 rounded-2xl p-5 animate-pulse h-40" />
            ))}
          </div>
        ) : features.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {features.map(blog => (
              <div key={blog.id} className={`bg-dark-bg border border-white/10 rounded-2xl p-4 space-y-4 ${editingId === blog.id ? "lg:col-span-2" : ""}`}>
                {editingId === blog.id ? (
                  <FeatureForm mode="edit" blog={blog} onSaved={() => { setEditingId(null); refreshFeatures(); }} onCancel={() => setEditingId(null)} />
                ) : (
                  <>
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        {blog.image_url ? (
                          <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-white/15" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${blog.is_published ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-white/5 text-white/40 border border-white/10"}`}>
                            {blog.is_published ? "Published" : "Draft"}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-white/25">{blog.slug}</span>
                        </div>
                        <h5 className="font-display font-black text-xl leading-tight line-clamp-2">{blog.title}</h5>
                        <p className="text-xs text-white/45 mt-2 line-clamp-2">{blog.excerpt || blog.content}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                      <span className="text-[10px] text-white/30 font-mono">
                        {blog.created_at ? new Date(blog.created_at).toLocaleString() : "Recently created"}
                      </span>
                      <div className="flex gap-2">
                        {blog.is_published ? (
                          <Link to={`/features/${blog.slug}`} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
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
          <div className="py-16 text-center bg-dark-bg/50 border border-white/10 rounded-2xl">
            <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 uppercase tracking-widest text-xs font-black">No features yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureForm({ mode, blog, onSaved, onCancel }: { mode: "create" | "edit"; blog?: any; onSaved: () => void; onCancel?: () => void }) {
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
    <form onSubmit={handleSave} className={`${mode === "create" ? "bg-dark-bg/50 border border-white/10 rounded-2xl p-5 md:p-6" : ""} space-y-5`}>
      {mode === "create" && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-purple/15 border border-neon-purple/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h4 className="font-black uppercase tracking-tight">New Feature Post</h4>
            <p className="text-xs text-white/40">Add a heading, image, and text for a public post.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Heading</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm" placeholder="Post title" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Short Summary</label>
            <input value={excerpt} onChange={e => setExcerpt(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm" placeholder="Optional preview text for the features page" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Optional Link / URL</label>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm" placeholder="Optional external link (e.g., https://example.com)" />
          </div>
          <ImageUploadField label="Image URL" value={imageUrl} onChange={setImageUrl} placeholder="https://..." />
        </div>

        <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 min-h-[220px] flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-3 p-6">
              <ImageIcon className="w-10 h-10 text-white/15 mx-auto" />
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">Image Preview</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Post Text</label>
        <textarea ref={contentRef} required value={content} onChange={e => setContent(e.target.value)} rows={mode === "create" ? 8 : 12} className="w-full bg-panel-bg border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-sm leading-6" placeholder="Write the full feature post here..." />
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
          <div className="flex items-center gap-4 border-b border-white/5 pb-2">
            <button
              type="button"
              onClick={() => setActiveHelper("image")}
              className={`flex items-center gap-2 pb-1 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                activeHelper === "image"
                  ? "border-neon-blue text-white"
                  : "border-transparent text-white/45 hover:text-white"
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
                  : "border-transparent text-white/45 hover:text-white"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 text-neon-purple" />
              Insert Link (Hyperlink)
            </button>
          </div>

          {activeHelper === "image" ? (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(180px,280px)_auto] gap-3 items-end">
              <ImageUploadField value={paragraphImageUrl} onChange={setParagraphImageUrl} placeholder="Image URL" className="!space-y-0" />
              <input value={paragraphImageCaption} onChange={e => setParagraphImageCaption(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-neon-blue" placeholder="Caption / alt text" />
              <button type="button" onClick={insertParagraphImage} className="px-4 py-2.5 rounded-lg bg-neon-blue text-dark-bg text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple hover:text-white transition-colors">
                Insert
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-white/40 mb-1">Link Text</label>
                  <input value={insertLinkText} onChange={e => setInsertLinkText(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neon-purple" placeholder="e.g., Read More" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-white/40 mb-1">Link URL</label>
                  <input value={insertLinkUrl} onChange={e => setInsertLinkUrl(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-neon-purple" placeholder="e.g., https://example.com" />
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1 bg-black/20 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] uppercase tracking-wider font-black text-white/40">Open Behavior:</span>
                  <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                    <button
                      type="button"
                      onClick={() => setInsertLinkTarget("_blank")}
                      className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${
                        insertLinkTarget === "_blank"
                          ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20"
                          : "text-white/40 hover:text-white"
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
                          : "text-white/40 hover:text-white"
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
          <span className="w-12 h-6 bg-white/10 rounded-full relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:bg-neon-purple peer-checked:after:translate-x-6"></span>
          <span className="text-xs font-black uppercase tracking-widest text-white/50">{isPublished ? "Published" : "Draft"}</span>
        </label>

        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
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
