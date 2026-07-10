import React, { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Edit2, Plus, ExternalLink, Image as ImageIcon, Layout, Layers } from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";
import { motion, AnimatePresence } from "motion/react";

type SliderLayout = "single" | "triple";

function parseSliderType(sliderType: string) {
  const value = (sliderType || "single").toLowerCase().trim();
  if (value.startsWith("triple:")) {
    return { layout: "triple" as SliderLayout, name: value.replace("triple:", "") };
  }
  if (value.startsWith("single:")) {
    return { layout: "single" as SliderLayout, name: value.replace("single:", "") };
  }
  if (value === "triple") {
    return { layout: "triple" as SliderLayout, name: "" };
  }
  return { layout: "single" as SliderLayout, name: value === "single" ? "" : value };
}

function buildSliderValue(layout: SliderLayout, name: string) {
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return normalizedName ? `${layout}:${normalizedName}` : layout;
}

function getSliderLabel(sliderType: string) {
  const { layout, name } = parseSliderType(sliderType);
  if (name) {
    return name
      .split(/[-_]/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return layout === "triple" ? "Partner Slider" : "Main Slider";
}

export function AdminAds() {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const { showConfirm, showAlert } = useModal();
  const queryClient = useQueryClient();

  const loadAds = async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/ads");
      if (res.ok) {
        const data = await res.json();
        setAds(data);
      }
      
      const settingsRes = await fetch("/api/public/settings");
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setAutoScroll(settings.ad_auto_scroll === '1');
      }
    } catch (err) {
      console.error("Failed to load ads:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoScroll = async () => {
    const newValue = !autoScroll;
    const res = await fetchAdmin("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_auto_scroll: newValue ? '1' : '0' })
    });

    if (res.ok) {
      setAutoScroll(newValue);
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
      showAlert({ title: "Success", message: `Auto-scroll ${newValue ? 'enabled' : 'disabled'}`, style: "success" });
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm({
      title: "Delete Advertisement",
      message: "Are you sure you want to remove this ad? This action cannot be undone.",
      style: "danger",
      confirmText: "Delete"
    });

    if (confirmed) {
      const res = await fetchAdmin(`/api/admin/ads/${id}`, { method: "DELETE" });
      if (res.ok) {
        showAlert({ title: "Success", message: "Ad removed successfully", style: "success" });
        loadAds();
        queryClient.invalidateQueries({ queryKey: ['publicAds'] });
      } else {
        showAlert({ title: "Error", message: "Failed to delete ad", style: "danger" });
      }
    }
  };

  const handleToggleActive = async (ad: any) => {
    const res = await fetchAdmin(`/api/admin/ads/${ad.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ad, is_active: ad.is_active ? 0 : 1 })
    });
    if (res.ok) {
      loadAds();
      queryClient.invalidateQueries({ queryKey: ['publicAds'] });
    }
  };

  const sliderGroups = useMemo(() => {
    const groups = new Map<string, any[]>();
    ads.forEach((ad: any) => {
      const key = ad.slider_type || "single";
      const existing = groups.get(key) || [];
      existing.push(ad);
      groups.set(key, existing);
    });

    return Array.from(groups.entries()).map(([sliderType, groupAds]) => ({
      sliderType,
      layout: parseSliderType(sliderType).layout,
      label: getSliderLabel(sliderType),
      ads: groupAds.sort((a: any, b: any) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0) || Number(a.id) - Number(b.id))
    }));
  }, [ads]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-2xl font-bold">Advertisement Sliders</h3>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Manage promotional banners and partner links</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowBulkForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/10"
          >
            <Layers className="w-4 h-4" /> Bulk Add
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-xl text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Ad
          </button>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
            <Layout className="w-6 h-6 text-neon-blue" />
          </div>
          <div>
            <h4 className="font-bold">Slider Behavior</h4>
            <p className="text-xs text-white/40">Control how the advertisement sliders behave on the homepage</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-widest text-white/40">Auto-Scroll</span>
          <button
            onClick={handleToggleAutoScroll}
            className={`w-14 h-7 rounded-full relative transition-all duration-500 ${autoScroll ? 'bg-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/10'}`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-500 shadow-md ${autoScroll ? 'left-8' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {sliderGroups.map(({ sliderType, layout, label, ads: groupAds }) => (
          <section key={sliderType} className="space-y-4">
            <div className={`flex items-center gap-2 ${layout === 'triple' ? 'text-neon-purple' : 'text-neon-blue'}`}>
              {layout === 'triple' ? <Layers className="w-5 h-5" /> : <Layout className="w-5 h-5" />}
              <div>
                <h4 className="font-bold uppercase tracking-widest text-sm">{label}</h4>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                  {layout === 'triple' ? '3 images per carousel' : '1 image per slide'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupAds.map(ad => (
                <AdCard 
                  key={ad.id} 
                  ad={ad} 
                  onEdit={() => setEditingAd(ad)} 
                  onDelete={() => handleDelete(ad.id)} 
                  onToggle={() => handleToggleActive(ad)}
                />
              ))}
              {groupAds.length === 0 && (
                <div className="col-span-full py-8 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-white/20">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-10" />
                  <span className="text-sm">No ads in this slider yet</span>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <AnimatePresence>
        {showBulkForm && (
          <BulkAdModal 
            onClose={() => setShowBulkForm(false)}
            onSaved={() => {
              setShowBulkForm(false);
              loadAds();
              queryClient.invalidateQueries({ queryKey: ['publicAds'] });
            }}
          />
        )}
        {(showAddForm || editingAd) && (
          <AdModal 
            ad={editingAd} 
            onClose={() => {
              setShowAddForm(false);
              setEditingAd(null);
            }} 
            onSaved={() => {
              setShowAddForm(false);
              setEditingAd(null);
              loadAds();
              queryClient.invalidateQueries({ queryKey: ['publicAds'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BulkAdModal({ onClose, onSaved }: { onClose: () => void, onSaved: () => void }) {
  const [sliderLayout, setSliderLayout] = useState<SliderLayout>('single');
  const [sliderName, setSliderName] = useState('');
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const [targetPages, setTargetPages] = useState<string[]>(['all']);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { showAlert } = useModal();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);

    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);

        // 1. Upload the image
        const uploadRes = await fetchAdmin('/api/admin/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          
          // 2. Create the ad entry
          await fetchAdmin('/api/admin/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slider_type: buildSliderValue(sliderLayout, sliderName),
              image_url: url,
              link_url: '',
              display_order: i,
              is_active: 1,
              target_pages: targetPages.includes('all') ? 'all' : targetPages.join(','),
              position
            })
          });
          successCount++;
        }
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      showAlert({ 
        title: "Bulk Upload Complete", 
        message: `Successfully added ${successCount} ads.`, 
        style: "success" 
      });
      onSaved();
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Some uploads failed", style: "danger" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
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
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-dark-bg border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 md:px-8 md:py-6 flex items-center justify-between border-b border-white/5 flex-shrink-0">
          <h3 className="text-xl font-bold">Bulk Add Advertisements</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6 space-y-6 custom-scrollbar">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Slider Layout</label>
            <div className="grid grid-cols-2 gap-3">
              {(['single', 'triple'] as SliderLayout[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSliderLayout(type)}
                  className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${sliderLayout === type ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Slider Name</label>
            <input
              type="text"
              value={sliderName}
              onChange={(e) => setSliderName(e.target.value)}
              placeholder="hero-banner or footer-strip"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all"
            />
            <p className="text-[10px] text-white/30">Leave blank to use the default slider, or add a unique name to create another dedicated slider.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Ad Position</label>
            <div className="grid grid-cols-2 gap-3">
              {(['top', 'bottom'] as const).map(pos => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosition(pos)}
                  className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${position === pos ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                >
                  {pos === 'top' ? 'Top of page' : 'Bottom of page'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Show On Pages</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'All pages', value: 'all' },
                { label: 'Home', value: '/' },
                { label: 'Watch', value: '/watch' },
                { label: 'Schedule', value: '/schedule' },
                { label: 'DJs', value: '/djs' },
                { label: 'Podcasts', value: '/podcasts' },
                { label: 'Features', value: '/features' },
                { label: 'About', value: '/about' },
                { label: 'Contact', value: '/contact' }
              ].map(page => {
                const checked = targetPages.includes(page.value);
                return (
                  <label key={page.value} className="flex items-center gap-2 text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      className="rounded border-white/10 bg-white/5 text-neon-purple focus:ring-0"
                      onChange={() => {
                        if (page.value === 'all') {
                          setTargetPages(['all']);
                          return;
                        }
                        const next = targetPages.filter(item => item !== 'all');
                        setTargetPages(checked ? next.filter(item => item !== page.value) : [...next, page.value]);
                      }}
                    />
                    <span>{page.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block p-8 border-2 border-dashed border-white/10 rounded-3xl hover:border-neon-purple/50 transition-colors cursor-pointer group text-center">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-neon-purple/20 transition-colors">
                  <Plus className="w-6 h-6 text-white/40 group-hover:text-neon-purple" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/60">Click to select multiple images</p>
                  <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">JPG, PNG, WebP supported</p>
                </div>
              </div>
            </label>

            {files.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-white/5 rounded-xl custom-scrollbar">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs text-white/40 bg-white/5 rounded-lg">
                    <span className="truncate">{f.name}</span>
                    <span>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-neon-purple"
                />
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 md:px-8 md:py-6 border-t border-white/5 flex gap-3 flex-shrink-0 bg-dark-bg/80 backdrop-blur-md">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-sm"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="flex-1 py-3 rounded-xl bg-neon-purple hover:bg-neon-purple/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-neon-purple/20 text-sm"
          >
            {uploading ? 'Processing...' : `Upload ${files.length} Images`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AdCard({ ad, onEdit, onDelete, onToggle }: any) {
  const { layout, name } = parseSliderType(ad.slider_type || 'single');
  const label = name ? name.split(/[-_]/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : (layout === 'triple' ? 'Partner Slider' : 'Main Slider');

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative glass-panel rounded-2xl overflow-hidden border transition-all duration-300 ${ad.is_active ? 'border-white/10' : 'border-white/5 grayscale opacity-60'}`}
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-black/40">
        <img src={ad.image_url} alt="Ad" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${layout === 'triple' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-neon-blue/20 text-neon-blue'}`}>
              {label}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${ad.position === 'top' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {ad.position === 'top' ? 'Top' : 'Bottom'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[9px] text-white/35 max-w-[50%] text-right truncate">
              {ad.target_pages === 'all' || !ad.target_pages ? 'All pages' : ad.target_pages}
            </div>
            <button 
              onClick={onToggle}
              className={`text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded ${ad.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
            >
              {ad.is_active ? 'Active' : 'Hidden'}
            </button>
          </div>
        </div>
        
        {ad.link_url && (
          <div className="flex items-center gap-1.5 text-xs text-white/50 truncate">
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{ad.link_url}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={onDelete} className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AdModal({ ad, onClose, onSaved }: { ad?: any, onClose: () => void, onSaved: () => void }) {
  const parsedSlider = parseSliderType(ad?.slider_type || 'single');
  const [formData, setFormData] = useState({
    slider_type: ad?.slider_type || 'single',
    image_url: ad?.image_url || '',
    link_url: ad?.link_url || '',
    display_order: ad?.display_order || 0,
    is_active: ad ? ad.is_active : 1,
    target_pages: ad?.target_pages || 'all',
    position: ad?.position || 'bottom'
  });
  const [sliderLayout, setSliderLayout] = useState<SliderLayout>(parsedSlider.layout);
  const [sliderName, setSliderName] = useState(parsedSlider.name);
  const [saving, setSaving] = useState(false);
  const { showAlert } = useModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = ad ? `/api/admin/ads/${ad.id}` : "/api/admin/ads";
      const method = ad ? "PUT" : "POST";
      
      const res = await fetchAdmin(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slider_type: buildSliderValue(sliderLayout, sliderName)
        })
      });

      if (res.ok) {
        showAlert({ title: "Success", message: ad ? "Ad updated" : "Ad created", style: "success" });
        onSaved();
      } else {
        showAlert({ title: "Error", message: "Failed to save ad", style: "danger" });
      }
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Network error", style: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
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
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-dark-bg border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 md:px-8 md:py-6 flex items-center justify-between border-b border-white/5 flex-shrink-0">
          <h3 className="text-xl font-bold">{ad ? 'Edit Advertisement' : 'Add New Advertisement'}</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        {/* Scrollable Content inside Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6 space-y-5 custom-scrollbar">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Slider Layout</label>
              <div className="grid grid-cols-2 gap-3">
                {(['single', 'triple'] as SliderLayout[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSliderLayout(type)}
                    className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${sliderLayout === type ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Slider Name</label>
              <input
                type="text"
                value={sliderName}
                onChange={(e) => setSliderName(e.target.value)}
                placeholder="hero-banner or footer-strip"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all"
              />
              <p className="text-[10px] text-white/30">Leave blank to use the default slider, or add a unique name to create another dedicated slider.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Ad Position</label>
              <div className="grid grid-cols-2 gap-3">
                {(['top', 'bottom'] as const).map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setFormData({ ...formData, position: pos })}
                    className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${formData.position === pos ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                  >
                    {pos === 'top' ? 'Top of page' : 'Bottom of page'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Show On Pages</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'All pages', value: 'all' },
                  { label: 'Home', value: '/' },
                  { label: 'Watch', value: '/watch' },
                  { label: 'Schedule', value: '/schedule' },
                  { label: 'DJs', value: '/djs' },
                  { label: 'Podcasts', value: '/podcasts' },
                  { label: 'Features', value: '/features' },
                  { label: 'About', value: '/about' },
                  { label: 'Contact', value: '/contact' }
                ].map(page => {
                  const checked = formData.target_pages === 'all' ? page.value === 'all' : formData.target_pages.split(',').map(item => item.trim()).includes(page.value);
                  return (
                    <label key={page.value} className="flex items-center gap-2 text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        className="rounded border-white/10 bg-white/5 text-neon-purple focus:ring-0"
                        onChange={() => {
                          if (page.value === 'all') {
                            setFormData({ ...formData, target_pages: 'all' });
                            return;
                          }
                          const currentValues = formData.target_pages === 'all' ? [] : formData.target_pages.split(',').map(item => item.trim()).filter(Boolean);
                          const nextValues = checked ? currentValues.filter(item => item !== page.value) : [...currentValues, page.value];
                          setFormData({ ...formData, target_pages: nextValues.length === 0 ? 'all' : nextValues.join(',') });
                        }}
                      />
                      <span>{page.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Banner Image</label>
              <ImageUploadField 
                value={formData.image_url} 
                onChange={(url) => setFormData({ ...formData, image_url: url })} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Link URL (Optional)</label>
              <input 
                type="url"
                value={formData.link_url}
                onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all"
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Order</label>
                <input 
                  type="number"
                  value={formData.display_order}
                  onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: formData.is_active ? 0 : 1 })}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formData.is_active ? 'bg-neon-purple' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${formData.is_active ? 'left-7' : 'left-1'}`} />
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Active</span>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="px-6 py-4 md:px-8 md:py-6 border-t border-white/5 flex gap-3 flex-shrink-0 bg-dark-bg/80 backdrop-blur-md">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving || !formData.image_url}
              className="flex-1 py-3 rounded-xl bg-neon-purple hover:bg-neon-purple/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-neon-purple/20 text-sm"
            >
              {saving ? 'Saving...' : 'Save Advertisement'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
