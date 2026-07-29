import React, { useState, useEffect } from "react";
import { fetchAdmin } from "./adminApi";
import { useModal } from "../../context/ModalContext";
import { useLogo } from "../../hooks/useLogo";
import { ImageUploadField } from "./ImageUploadField";
import { 
  Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save, Edit, 
  Layers, ExternalLink, Globe, Layout, Type, Image as ImageIcon, 
  Link as LinkIcon, Video, AlignLeft, FileText, Sparkles, RefreshCw
} from "lucide-react";

interface PageBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'link' | 'iframe' | 'form';
  title?: string;
  subtitle?: string;
  content?: string; // Markdown text / HTML Content
  imageUrl?: string;
  imageCaption?: string;
  imageAlign?: 'left' | 'center' | 'right';
  align?: 'left' | 'center' | 'right';
  linkUrl?: string;
  linkText?: string;
  linkStyle?: 'fill' | 'outline' | 'minimal';
  iframeUrl?: string;
  iframeHeight?: number;
  formTitle?: string;
  formDescription?: string;
  formSubmitText?: string;
  formFields?: Array<{
    id: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'textarea';
    required: boolean;
    placeholder?: string;
  }>;
}

interface CustomPage {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string; // JSON String of PageBlock[]
  is_published: number;
  created_at: string;
  updated_at: string;
}

export function AdminPages() {
  const { isLightMode } = useLogo();
  const { showAlert, showConfirm } = useModal();
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const loadPages = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/pages");
      if (res.ok) {
        const data = await res.json();
        setPages(Array.isArray(data) ? data : []);
      } else {
        showAlert({ title: "Error", message: "Failed to load custom pages.", style: "danger" });
      }
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Could not fetch pages due to a network error.", style: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (!currentId && title) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setSlug(generated);
    }
  }, [title, currentId]);

  const handleCreateNew = () => {
    setCurrentId(null);
    setTitle("");
    setSlug("");
    setDescription("");
    setIsPublished(true);
    setBlocks([
      {
        id: `block_${Date.now()}`,
        type: 'header',
        title: "Welcome to My Page",
        subtitle: "A highly customizable dynamic sub-page",
      }
    ]);
    setIsEditing(true);
    setActiveTab('editor');
  };

  const handleEdit = (page: CustomPage) => {
    let parsedBlocks: PageBlock[] = [];
    try {
      parsedBlocks = JSON.parse(page.content);
    } catch (e) {
      parsedBlocks = [
        {
          id: `block_${Date.now()}`,
          type: 'text',
          content: page.content || "No content yet."
        }
      ];
    }

    setCurrentId(page.id);
    setTitle(page.title);
    setSlug(page.slug);
    setDescription(page.description || "");
    setIsPublished(page.is_published === 1);
    setBlocks(parsedBlocks);
    setIsEditing(true);
    setActiveTab('editor');
  };

  const handleDelete = async (page: CustomPage) => {
    const confirm = await showConfirm({
      title: "Delete Custom Page",
      message: `Are you sure you want to permanently delete "${page.title}"?`,
      style: "danger",
      confirmText: "Delete",
    });

    if (!confirm) return;

    try {
      const res = await fetchAdmin(`/api/admin/pages/${page.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showAlert({ title: "Deleted", message: "Page removed successfully.", style: "success" });
        loadPages();
      } else {
        showAlert({ title: "Error", message: "Failed to delete page.", style: "danger" });
      }
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Failed to delete page due to network error.", style: "danger" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      showAlert({ title: "Validation Error", message: "Title and URL Slug are required.", style: "danger" });
      return;
    }

    // Clean slug
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    setIsSaving(true);
    const payload = {
      title: title.trim(),
      slug: cleanSlug,
      description: description.trim(),
      is_published: isPublished ? 1 : 0,
      content: JSON.stringify(blocks),
    };

    try {
      const url = currentId ? `/api/admin/pages/${currentId}` : "/api/admin/pages";
      const method = currentId ? "PUT" : "POST";

      const res = await fetchAdmin(url, {
        method,
        body: payload,
      });

      if (res.ok) {
        showAlert({ 
          title: "Success", 
          message: currentId ? "Page updated successfully." : "Page created successfully.", 
          style: "success" 
        });
        setIsEditing(false);
        loadPages();
      } else {
        const errData = await res.json().catch(() => ({}));
        showAlert({ 
          title: "Error Saving", 
          message: errData.error || "Failed to save dynamic page details.", 
          style: "danger" 
        });
      }
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Network connection failure.", style: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  // Block Builder Helpers
  const addBlock = (type: 'header' | 'text' | 'image' | 'link' | 'iframe' | 'form') => {
    const newBlock: PageBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
    };

    if (type === 'header') {
      newBlock.title = "New Heading Section";
      newBlock.subtitle = "Add optional sub-heading here";
      newBlock.align = 'center';
    } else if (type === 'text') {
      newBlock.content = "Enter your custom page text here. Markdown formatting is supported.";
      newBlock.align = 'left';
    } else if (type === 'image') {
      newBlock.imageUrl = "";
      newBlock.imageCaption = "";
      newBlock.imageAlign = 'center';
      newBlock.align = 'center';
    } else if (type === 'link') {
      newBlock.linkText = "Learn More";
      newBlock.linkUrl = "/";
      newBlock.linkStyle = 'fill';
      newBlock.align = 'center';
    } else if (type === 'iframe') {
      newBlock.iframeUrl = "";
      newBlock.iframeHeight = 450;
    } else if (type === 'form') {
      newBlock.formTitle = "General Inquiry Form";
      newBlock.formDescription = "We would love to hear from you. Please fill out the form below.";
      newBlock.formSubmitText = "Submit Details";
      newBlock.align = 'center';
      newBlock.formFields = [
        { id: 'field_name', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. Wayne Smith' },
        { id: 'field_email', label: 'Email Address', type: 'email', required: true, placeholder: 'e.g. wayne@example.com' },
        { id: 'field_message', label: 'Your Message', type: 'textarea', required: true, placeholder: 'Write details here...' }
      ];
    }

    setBlocks(prev => [...prev, newBlock]);
  };

  const addFormField = (blockId: string) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        const fields = b.formFields || [];
        return {
          ...b,
          formFields: [
            ...fields,
            {
              id: `field_${Date.now()}`,
              label: 'Custom Field',
              type: 'text',
              required: false,
              placeholder: 'Enter response...'
            }
          ]
        };
      }
      return b;
    }));
  };

  const removeFormField = (blockId: string, fieldId: string) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        const fields = b.formFields || [];
        return {
          ...b,
          formFields: fields.filter(f => f.id !== fieldId)
        };
      }
      return b;
    }));
  };

  const updateFormField = (blockId: string, fieldId: string, updates: Partial<any>) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        const fields = b.formFields || [];
        return {
          ...b,
          formFields: fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        };
      }
      return b;
    }));
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setBlocks(updated);
  };

  const updateBlock = (id: string, updates: Partial<PageBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest text-neon-purple flex items-center gap-2">
            <Layers className="w-6 h-6" /> Dynamic Pages Builder
          </h2>
          <p className={`text-xs mt-1 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
            Create and edit fully customized pages with images, embedded maps/video players, links, and headers.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleCreateNew}
            className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border bg-neon-purple/15 border-neon-purple/30 text-neon-purple hover:bg-neon-purple hover:text-white"
          >
            <Plus className="w-4 h-4" /> Create New Page
          </button>
        )}
      </div>

      {loading && !isEditing ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-neon-purple" />
          <span className={`text-xs font-semibold ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
            Loading custom station pages...
          </span>
        </div>
      ) : !isEditing ? (
        /* PAGES LIST VIEW */
        <div className="space-y-4">
          {pages.length === 0 ? (
            <div className={`text-center py-16 rounded-2xl border border-dashed p-6 ${isLightMode ? 'bg-black/[0.01] border-slate-200' : 'bg-white/[0.01] border-white/10'}`}>
              <Layers className={`w-12 h-12 mx-auto mb-3 opacity-30 ${isLightMode ? 'text-slate-600' : 'text-white'}`} />
              <h4 className="text-sm font-bold uppercase tracking-wider">No Custom Pages</h4>
              <p className={`text-xs mt-1 max-w-sm mx-auto mb-6 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                You haven't created any dynamic custom pages yet. Create one to display rich brand info, archives, galleries, or booking forms.
              </p>
              <button
                type="button"
                onClick={handleCreateNew}
                className="inline-flex h-10 px-5 rounded-lg text-xs font-black uppercase tracking-widest transition-all border bg-neon-purple/15 border-neon-purple/30 text-neon-purple hover:bg-neon-purple hover:text-white items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Your First Page
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pages.map(page => (
                <div 
                  key={page.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all ${
                    isLightMode 
                      ? 'bg-white border-black/10 hover:border-black/20 shadow-sm' 
                      : 'bg-[#12131C] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-1 max-w-lg mb-4 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm tracking-wider">{page.title}</h3>
                      {page.is_published === 1 ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          Published
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-white/40'}`}>
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-50">
                      <span className="font-bold">Slug:</span>
                      <code className="px-1.5 py-0.5 bg-black/20 rounded text-neon-blue">/{page.slug}</code>
                    </div>
                    {page.description && (
                      <p className={`text-[11px] line-clamp-1 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                        {page.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                        isLightMode 
                          ? 'border-slate-200 hover:bg-slate-50 text-slate-600' 
                          : 'border-white/5 hover:bg-white/5 text-white/60'
                      }`}
                      title="Preview Page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleEdit(page)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                        isLightMode 
                          ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700' 
                          : 'bg-white/5 border-white/5 text-white/80 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(page)}
                      className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all flex items-center justify-center"
                      title="Delete Page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* PAGE EDITOR VIEW */
        <form onSubmit={handleSave} className="space-y-6">
          {/* EDITOR HEADER */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                  isLightMode 
                    ? 'border-slate-200 hover:bg-slate-50 text-slate-600' 
                    : 'border-white/10 hover:bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                Back to List
              </button>
              <div className="h-4 w-px bg-white/10 mx-1" />
              <span className="text-xs font-mono text-neon-blue">
                {currentId ? "Editing Dynamic Page" : "New Dynamic Page"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* SAVING STATE */}
              <button
                type="submit"
                disabled={isSaving}
                className="h-10 px-5 rounded-xl text-xs font-black uppercase tracking-widest bg-neon-purple text-white shadow-lg shadow-neon-purple/20 hover:shadow-neon-purple/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Saving..." : "Save Page"}
              </button>
            </div>
          </div>

          {/* BASIC PAGE SETTINGS CARD */}
          <div className={`p-6 rounded-2xl border ${isLightMode ? 'bg-white border-black/10' : 'bg-[#12131C] border-white/5'}`}>
            <h3 className="text-xs font-black uppercase tracking-widest text-neon-blue mb-4 flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> Page URL & Meta Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                  Page Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. DJ Application"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                    isLightMode 
                      ? 'bg-black/[0.02] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                      : 'bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                  }`}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                  URL Slug / Route Path
                </label>
                <div className="relative flex items-center">
                  <span className={`absolute left-4 text-xs font-mono font-bold ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>
                    /
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. dj-application"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className={`w-full rounded-xl pl-8 pr-4 py-2.5 text-xs font-mono font-semibold outline-none transition-all border ${
                      isLightMode 
                        ? 'bg-black/[0.02] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                        : 'bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                  SEO / Short Page Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="A short description summarizing this page for search engines."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                    isLightMode 
                      ? 'bg-black/[0.02] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                      : 'bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    isPublished
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : isLightMode ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-white/40'
                  }`}
                >
                  {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {isPublished ? "Page Status: Published & Public" : "Page Status: Save as Draft"}
                </button>
              </div>
            </div>
          </div>

          {/* EDITOR VS PREVIEW TABS */}
          <div className="flex border-b border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'editor'
                  ? 'border-neon-purple text-neon-purple'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <Layout className="w-4 h-4" /> Content Block Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'preview'
                  ? 'border-neon-purple text-neon-purple'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <Eye className="w-4 h-4" /> Live Interactive Preview
            </button>
          </div>

          {activeTab === 'editor' ? (
            /* CONTENT BLOCK EDITOR PANEL */
            <div className="space-y-6">
              {/* ADD BLOCKS TOOLBAR */}
              <div className={`p-4 rounded-2xl border flex flex-wrap items-center gap-3 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                <span className={`text-[10px] uppercase font-black tracking-widest mr-2 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                  Insert Page Block:
                </span>
                <button
                  type="button"
                  onClick={() => addBlock('header')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                    isLightMode 
                      ? 'bg-white border-black/10 hover:border-black/20 hover:bg-slate-50 text-slate-800' 
                      : 'bg-[#1b1d28] border-white/5 hover:border-white/10 hover:bg-white/5 text-white/80'
                  }`}
                >
                  <Type className="w-3.5 h-3.5 text-neon-blue" /> Title Header
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('text')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                    isLightMode 
                      ? 'bg-white border-black/10 hover:border-black/20 hover:bg-slate-50 text-slate-800' 
                      : 'bg-[#1b1d28] border-white/5 hover:border-white/10 hover:bg-white/5 text-white/80'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> Text / Content
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('image')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                    isLightMode 
                      ? 'bg-white border-black/10 hover:border-black/20 hover:bg-slate-50 text-slate-800' 
                      : 'bg-[#1b1d28] border-white/5 hover:border-white/10 hover:bg-white/5 text-white/80'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Image
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('link')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                    isLightMode 
                      ? 'bg-white border-black/10 hover:border-black/20 hover:bg-slate-50 text-slate-800' 
                      : 'bg-[#1b1d28] border-white/5 hover:border-white/10 hover:bg-white/5 text-white/80'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 text-neon-purple" /> Link Button
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('iframe')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                    isLightMode 
                      ? 'bg-white border-black/10 hover:border-black/20 hover:bg-slate-50 text-slate-800' 
                      : 'bg-[#1b1d28] border-white/5 hover:border-white/10 hover:bg-white/5 text-white/80'
                  }`}
                >
                  <Video className="w-3.5 h-3.5 text-cyan-400" /> Embed Frame
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('form')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                    isLightMode 
                      ? 'bg-white border-black/10 hover:border-black/20 hover:bg-slate-50 text-slate-800' 
                      : 'bg-[#1b1d28] border-white/5 hover:border-white/10 hover:bg-white/5 text-white/80'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-pink-500" /> Interactive Form
                </button>
              </div>

              {/* LIST OF BLOCKS */}
              <div className="space-y-4">
                {blocks.length === 0 ? (
                  <div className={`text-center py-12 rounded-2xl border border-dashed ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
                    <Layout className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                      Your page has no blocks yet. Click one of the buttons above to insert content blocks.
                    </p>
                  </div>
                ) : (
                  blocks.map((block, index) => {
                    return (
                      <div 
                        key={block.id} 
                        className={`p-5 rounded-2xl border transition-all ${
                          isLightMode 
                            ? 'bg-white border-black/10 shadow-sm' 
                            : 'bg-[#12131C] border-white/5'
                        }`}
                      >
                        {/* BLOCK CONTROLS */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-neon-purple/10 text-neon-purple text-[10px] font-black flex items-center justify-center font-mono">
                              {index + 1}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest font-mono text-neon-blue flex items-center gap-1.5">
                              {block.type === 'header' && <Type className="w-3.5 h-3.5" />}
                              {block.type === 'text' && <FileText className="w-3.5 h-3.5" />}
                              {block.type === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
                              {block.type === 'link' && <LinkIcon className="w-3.5 h-3.5" />}
                              {block.type === 'iframe' && <Video className="w-3.5 h-3.5" />}
                              {block.type} Block
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => moveBlock(index, 'up')}
                              disabled={index === 0}
                              className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 ${
                                isLightMode ? 'border-slate-200 hover:bg-slate-50' : 'border-white/5 hover:bg-white/5'
                              }`}
                              title="Move Block Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlock(index, 'down')}
                              disabled={index === blocks.length - 1}
                              className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 ${
                                isLightMode ? 'border-slate-200 hover:bg-slate-50' : 'border-white/5 hover:bg-white/5'
                              }`}
                              title="Move Block Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBlock(block.id)}
                              className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                              title="Delete Block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* BLOCK-SPECIFIC EDITORS */}
                        {block.type === 'header' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Header Heading / Title
                              </label>
                              <input
                                type="text"
                                value={block.title || ""}
                                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                  isLightMode 
                                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                }`}
                                placeholder="Main Title on the Hero Block"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Header Sub-heading / Subtitle
                              </label>
                              <input
                                type="text"
                                value={block.subtitle || ""}
                                onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                  isLightMode 
                                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                }`}
                                placeholder="Optional subtitle or tagline"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Header Alignment
                              </label>
                              <select
                                value={block.align || "center"}
                                onChange={(e: any) => updateBlock(block.id, { align: e.target.value })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border ${
                                  isLightMode 
                                    ? 'bg-white border-black/10 text-black' 
                                    : 'bg-[#1b1d28] border-white/10 text-white'
                                }`}
                              >
                                <option value="left">Left Aligned</option>
                                <option value="center">Centered</option>
                                <option value="right">Right Aligned</option>
                              </select>
                            </div>
                            <div className="md:col-span-3 space-y-2">
                              <ImageUploadField
                                label="Background Hero Image (Optional URL)"
                                value={block.imageUrl || ""}
                                onChange={(val) => updateBlock(block.id, { imageUrl: val })}
                                placeholder="Upload or enter URL of an elegant header background cover image..."
                              />
                            </div>
                          </div>
                        )}

                        {block.type === 'text' && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Text Body (Supports Markdown for lists, bolding, italics, headings)
                              </label>
                              <textarea
                                rows={6}
                                value={block.content || ""}
                                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                                className={`w-full rounded-xl px-4 py-3 text-xs font-semibold outline-none transition-all border font-sans leading-relaxed ${
                                  isLightMode 
                                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                }`}
                                placeholder="Write your custom text content here..."
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                  Text Alignment
                                </label>
                                <select
                                  value={block.align || "left"}
                                  onChange={(e: any) => updateBlock(block.id, { align: e.target.value })}
                                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border ${
                                    isLightMode 
                                      ? 'bg-white border-black/10 text-black' 
                                      : 'bg-[#1b1d28] border-white/10 text-white'
                                  }`}
                                >
                                  <option value="left">Left Aligned</option>
                                  <option value="center">Centered</option>
                                  <option value="right">Right Aligned</option>
                                </select>
                              </div>
                            </div>
                            <div className={`text-[10px] ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                              Pro tip: Use standard Markdown, e.g. <code># Title</code>, <code>**bold**</code>, or <code>- bullet list</code>.
                            </div>
                          </div>
                        )}

                        {block.type === 'image' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <ImageUploadField
                                label="Upload or Select Image"
                                value={block.imageUrl || ""}
                                onChange={(val) => updateBlock(block.id, { imageUrl: val })}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Image Caption / Hover Text
                              </label>
                              <input
                                type="text"
                                value={block.imageCaption || ""}
                                onChange={(e) => updateBlock(block.id, { imageCaption: e.target.value })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                  isLightMode 
                                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                }`}
                                placeholder="Caption shown underneath the image"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Image Alignment
                              </label>
                              <select
                                value={block.imageAlign || "center"}
                                onChange={(e: any) => updateBlock(block.id, { imageAlign: e.target.value as any, align: e.target.value as any })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border ${
                                  isLightMode 
                                    ? 'bg-white border-black/10 text-black' 
                                    : 'bg-[#1b1d28] border-white/10 text-white'
                                }`}
                              >
                                <option value="left">Left Aligned</option>
                                <option value="center">Centered</option>
                                <option value="right">Right Aligned</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {block.type === 'link' && (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Button / Link Text
                              </label>
                              <input
                                type="text"
                                value={block.linkText || ""}
                                onChange={(e) => updateBlock(block.id, { linkText: e.target.value })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                  isLightMode 
                                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                }`}
                                placeholder="e.g. View Instagram Feed"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Target Path or Web Address (URL)
                              </label>
                              <input
                                type="text"
                                value={block.linkUrl || ""}
                                onChange={(e) => updateBlock(block.id, { linkUrl: e.target.value })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                  isLightMode 
                                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                }`}
                                placeholder="e.g. https://... or /watch"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Button Visual Style
                              </label>
                              <select
                                value={block.linkStyle || "fill"}
                                onChange={(e: any) => updateBlock(block.id, { linkStyle: e.target.value })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border ${
                                  isLightMode 
                                    ? 'bg-white border-black/10 text-black' 
                                    : 'bg-[#1b1d28] border-white/10 text-white'
                                }`}
                              >
                                <option value="fill">Solid Neon Purple</option>
                                <option value="outline">Border Outline (Neon Blue)</option>
                                <option value="minimal">Minimal Link Underline</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Button Alignment
                              </label>
                              <select
                                value={block.align || "center"}
                                onChange={(e: any) => updateBlock(block.id, { align: e.target.value })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border ${
                                  isLightMode 
                                    ? 'bg-white border-black/10 text-black' 
                                    : 'bg-[#1b1d28] border-white/10 text-white'
                                }`}
                              >
                                <option value="left">Left Aligned</option>
                                <option value="center">Centered</option>
                                <option value="right">Right Aligned</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {block.type === 'iframe' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Frame Source URL (or full IFrame Embed script code)
                              </label>
                              <input
                                type="text"
                                value={block.iframeUrl || ""}
                                onChange={(e) => {
                                  let value = e.target.value;
                                  // Auto-extract src from complete HTML iframe tags if pasted!
                                  if (value.includes("<iframe") && value.includes("src=")) {
                                    const match = value.match(/src="([^"]+)"/);
                                    if (match && match[1]) {
                                      value = match[1];
                                    }
                                  }
                                  updateBlock(block.id, { iframeUrl: value });
                                }}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                  isLightMode 
                                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                }`}
                                placeholder="Paste Twitch player, Google Form, maps URL, or standard IFrame script code..."
                              />
                            </div>
                            <div className="space-y-2">
                              <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                Custom Frame Height (pixels)
                              </label>
                              <input
                                type="number"
                                value={block.iframeHeight || 450}
                                onChange={(e) => updateBlock(block.id, { iframeHeight: parseInt(e.target.value) || 450 })}
                                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                  isLightMode 
                                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                }`}
                                min={100}
                                max={1500}
                              />
                            </div>
                          </div>
                        )}

                        {block.type === 'form' && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                  Form Header Title
                                </label>
                                <input
                                  type="text"
                                  value={block.formTitle || ""}
                                  onChange={(e) => updateBlock(block.id, { formTitle: e.target.value })}
                                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                    isLightMode 
                                      ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                      : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                  }`}
                                  placeholder="e.g. Contact Us"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                  Form Sub-description
                                </label>
                                <input
                                  type="text"
                                  value={block.formDescription || ""}
                                  onChange={(e) => updateBlock(block.id, { formDescription: e.target.value })}
                                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                    isLightMode 
                                      ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                      : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                  }`}
                                  placeholder="e.g. Leave a message and we'll reply shortly."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                  Submit Button Label
                                </label>
                                <input
                                  type="text"
                                  value={block.formSubmitText || "Submit"}
                                  onChange={(e) => updateBlock(block.id, { formSubmitText: e.target.value })}
                                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all border ${
                                    isLightMode 
                                      ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple' 
                                      : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                                  }`}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className={`block text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                                  Form Header Alignment
                                </label>
                                <select
                                  value={block.align || "center"}
                                  onChange={(e: any) => updateBlock(block.id, { align: e.target.value })}
                                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border ${
                                    isLightMode 
                                      ? 'bg-white border-black/10 text-black' 
                                      : 'bg-[#1b1d28] border-white/10 text-white'
                                  }`}
                                >
                                  <option value="left">Left Aligned</option>
                                  <option value="center">Centered</option>
                                  <option value="right">Right Aligned</option>
                                </select>
                              </div>
                            </div>

                            {/* Form Fields Settings */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-slate-600' : 'text-white/40'}`}>
                                  Form Input Fields Layout
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addFormField(block.id)}
                                  className="text-[10px] font-black uppercase tracking-widest text-neon-blue hover:underline flex items-center gap-1"
                                >
                                  + Add Form Input
                                </button>
                              </div>

                              <div className="space-y-3">
                                {(block.formFields || []).map((field, index) => (
                                  <div 
                                    key={field.id} 
                                    className={`p-3 rounded-xl border flex flex-wrap md:flex-nowrap items-center gap-3 ${
                                      isLightMode ? 'bg-black/[0.01] border-black/5' : 'bg-black/30 border-white/5'
                                    }`}
                                  >
                                    <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-black/20 text-[10px] font-mono font-bold text-white/40">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                      <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateFormField(block.id, field.id, { label: e.target.value })}
                                        placeholder="Input Label"
                                        className={`w-full rounded-lg px-2.5 py-1.5 text-[11px] font-semibold outline-none border ${
                                          isLightMode 
                                            ? 'bg-white border-black/10 text-black focus:border-neon-purple' 
                                            : 'bg-[#1b1d28] border-white/10 text-white focus:border-neon-purple'
                                        }`}
                                      />
                                    </div>
                                    <div className="w-32">
                                      <select
                                        value={field.type}
                                        onChange={(e) => updateFormField(block.id, field.id, { type: e.target.value as any })}
                                        className={`w-full rounded-lg px-2.5 py-1.5 text-[11px] font-semibold outline-none border ${
                                          isLightMode 
                                            ? 'bg-white border-black/10 text-black' 
                                            : 'bg-[#1b1d28] border-white/10 text-white'
                                        }`}
                                      >
                                        <option value="text">Short Text</option>
                                        <option value="email">Email</option>
                                        <option value="tel">Phone</option>
                                        <option value="textarea">Paragraph Box</option>
                                      </select>
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                      <input
                                        type="text"
                                        value={field.placeholder || ""}
                                        onChange={(e) => updateFormField(block.id, field.id, { placeholder: e.target.value })}
                                        placeholder="Placeholder/Hint"
                                        className={`w-full rounded-lg px-2.5 py-1.5 text-[11px] font-semibold outline-none border ${
                                          isLightMode 
                                            ? 'bg-white border-black/10 text-black focus:border-neon-purple' 
                                            : 'bg-[#1b1d28] border-white/10 text-white focus:border-neon-purple'
                                        }`}
                                      />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="checkbox"
                                        id={`req_${field.id}`}
                                        checked={field.required}
                                        onChange={(e) => updateFormField(block.id, field.id, { required: e.target.checked })}
                                        className="rounded border-white/10 accent-neon-purple"
                                      />
                                      <label htmlFor={`req_${field.id}`} className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-white/50'}`}>
                                        Required
                                      </label>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeFormField(block.id, field.id)}
                                      className="p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-auto"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                                {(block.formFields || []).length === 0 && (
                                  <div className={`text-center py-6 text-xs italic ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                                    No inputs configured. Click "+ Add Form Input" to begin adding fields.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* VISUAL LIVE PREVIEW PANEL */
            <div className={`p-6 rounded-2xl border min-h-[500px] ${isLightMode ? 'bg-slate-50 border-slate-200 text-black' : 'bg-black/60 border-white/5 text-white'}`}>
              <div className="max-w-4xl mx-auto space-y-12 py-6">
                {blocks.length === 0 ? (
                  <div className="text-center opacity-40 py-16">
                    No custom blocks configured yet. Add them in the editor tab!
                  </div>
                ) : (
                  blocks.map((block) => {
                    return (
                      <div key={block.id} className="transition-all animate-fade-in">
                        {block.type === 'header' && (
                          <div 
                            className={`relative rounded-3xl overflow-hidden py-16 px-8 flex flex-col justify-center shadow-lg bg-cover bg-center ${
                              block.align === 'left' ? 'items-start text-left' : block.align === 'right' ? 'items-end text-right' : 'items-center text-center'
                            }`}
                            style={{ 
                              backgroundImage: block.imageUrl ? `url(${block.imageUrl})` : 'none',
                              backgroundColor: block.imageUrl ? 'transparent' : isLightMode ? '#f1f5f9' : '#1A1C28',
                              minHeight: '220px'
                            }}
                          >
                            {block.imageUrl && (
                              <div className="absolute inset-0 bg-black/60 z-0" />
                            )}
                            <div className="relative z-10 space-y-2 w-full">
                              <h1 className={`text-3xl md:text-4xl font-black uppercase tracking-wider ${block.imageUrl ? 'text-white' : isLightMode ? 'text-black' : 'text-white'}`}>
                                {block.title || "Untitled Heading"}
                              </h1>
                              {block.subtitle && (
                                <p className={`text-sm tracking-wide max-w-xl ${
                                  block.align === 'left' ? '' : block.align === 'right' ? 'ml-auto' : 'mx-auto'
                                } ${block.imageUrl ? 'text-white/80' : isLightMode ? 'text-slate-600' : 'text-white/60'}`}>
                                  {block.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {block.type === 'text' && (
                          <div className={`prose max-w-none text-sm leading-relaxed whitespace-pre-wrap ${
                            block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'
                          } ${isLightMode ? 'text-slate-800' : 'text-white/80'}`}>
                            {block.content || "Write some text content..."}
                          </div>
                        )}

                        {block.type === 'image' && block.imageUrl && (
                          <div className={`flex flex-col ${
                            (block.align || block.imageAlign) === 'left' ? 'items-start' : (block.align || block.imageAlign) === 'right' ? 'items-end' : 'items-center'
                          }`}>
                            <img 
                              src={block.imageUrl} 
                              alt={block.imageCaption || "Custom uploaded"} 
                              referrerPolicy="no-referrer"
                              className="max-w-full rounded-2xl max-h-[500px] object-cover shadow-md"
                            />
                            {block.imageCaption && (
                              <p className={`text-[11px] mt-2 italic ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                                {block.imageCaption}
                              </p>
                            )}
                          </div>
                        )}

                        {block.type === 'link' && block.linkUrl && (
                          <div className={`flex my-4 ${
                            block.align === 'left' ? 'justify-start' : block.align === 'right' ? 'justify-end' : 'justify-center'
                          }`}>
                            {block.linkStyle === 'fill' ? (
                              <button
                                type="button"
                                className="px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest text-white bg-neon-purple shadow-lg shadow-neon-purple/20"
                              >
                                {block.linkText || "Learn More"}
                              </button>
                            ) : block.linkStyle === 'outline' ? (
                              <button
                                type="button"
                                className="px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest text-neon-blue border border-neon-blue/45 bg-transparent"
                              >
                                {block.linkText || "Learn More"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="text-xs font-black uppercase tracking-widest border-b border-neon-purple pb-0.5 text-neon-purple"
                              >
                                {block.linkText || "Learn More"}
                              </button>
                            )}
                          </div>
                        )}

                        {block.type === 'iframe' && block.iframeUrl && (
                          <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-black/40">
                            <iframe 
                              src={block.iframeUrl} 
                              width="100%" 
                              height={block.iframeHeight || 450}
                              style={{ border: 0 }}
                              allowFullScreen 
                              referrerPolicy="no-referrer"
                              title="Dynamic custom embed"
                            />
                          </div>
                        )}

                        {block.type === 'form' && (
                          <div className={`p-6 rounded-3xl border ${
                            isLightMode 
                              ? 'bg-white border-black/5 text-black' 
                              : 'bg-[#12131C] border-white/5 text-white'
                          } shadow-xl max-w-xl mx-auto space-y-6`}>
                            <div className={`space-y-1.5 ${
                              block.align === 'left' ? 'text-left' : block.align === 'right' ? 'text-right' : 'text-center'
                            }`}>
                              <h2 className="text-xl font-bold uppercase tracking-wide">
                                {block.formTitle || "Contact Form"}
                              </h2>
                              {block.formDescription && (
                                <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-white/55'}`}>
                                  {block.formDescription}
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-4">
                              {(block.formFields || []).map((field) => (
                                <div key={field.id} className="space-y-1.5 text-left">
                                  <label className="block text-[10px] font-black uppercase tracking-wider opacity-60">
                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                  </label>
                                  {field.type === 'textarea' ? (
                                    <textarea
                                      rows={3}
                                      placeholder={field.placeholder || "Enter details..."}
                                      disabled
                                      className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border cursor-not-allowed ${
                                        isLightMode 
                                          ? 'bg-black/[0.02] border-black/10 text-black' 
                                          : 'bg-black/40 border-white/10 text-white'
                                      }`}
                                    />
                                  ) : (
                                    <input
                                      type={field.type}
                                      placeholder={field.placeholder || ""}
                                      disabled
                                      className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border cursor-not-allowed ${
                                        isLightMode 
                                          ? 'bg-black/[0.02] border-black/10 text-black' 
                                          : 'bg-black/40 border-white/10 text-white'
                                      }`}
                                    />
                                  )}
                                </div>
                              ))}
                              {(block.formFields || []).length === 0 && (
                                <p className="text-center text-xs opacity-40 italic py-4">No fields added yet</p>
                              )}
                            </div>
                            
                            <div className="pt-2">
                              <button
                                type="button"
                                className="w-full py-3 rounded-full text-xs font-black uppercase tracking-widest text-white bg-neon-purple shadow-lg shadow-neon-purple/20"
                              >
                                {block.formSubmitText || "Submit"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
