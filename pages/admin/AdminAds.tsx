import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Edit2, Plus, ExternalLink, Image as ImageIcon, Layout, Layers, UploadCloud, X, Library, Power } from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";
import { MediaPickerModal } from "./MediaPickerModal";
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

import { useLogo } from "../../hooks/useLogo";

export function AdminAds() {
  const { isLightMode } = useLogo();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<any | null>(null);
  const [editingSliderGroup, setEditingSliderGroup] = useState<any | null>(null);
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

  const handleToggleSliderActive = async (groupAds: any[], label: string) => {
    const allActive = groupAds.every(ad => ad.is_active === 1 || ad.is_active === true);
    const targetStatus = allActive ? 0 : 1;
    const actionName = targetStatus === 0 ? "Suspend" : "Activate";

    const confirmed = await showConfirm({
      title: `${actionName} Entire Slider`,
      message: `Are you sure you want to ${actionName.toLowerCase()} all ${groupAds.length} advertisement(s) in "${label}"?`,
      style: targetStatus === 0 ? "danger" : "info",
      confirmText: `${actionName} All`
    });

    if (confirmed) {
      setLoading(true);
      try {
        await Promise.all(
          groupAds.map(ad =>
            fetchAdmin(`/api/admin/ads/${ad.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...ad, is_active: targetStatus })
            })
          )
        );
        showAlert({
          title: "Success",
          message: `All ads in "${label}" have been ${targetStatus === 0 ? 'suspended' : 'activated'}.`,
          style: "success"
        });
      } catch {
        showAlert({ title: "Error", message: "Failed to update slider status.", style: "danger" });
      } finally {
        loadAds();
        queryClient.invalidateQueries({ queryKey: ['publicAds'] });
      }
    }
  };

  const handleDeleteSlider = async (groupAds: any[], label: string) => {
    const confirmed = await showConfirm({
      title: "Delete Entire Slider",
      message: `Are you sure you want to delete the whole "${label}" slider and all its ${groupAds.length} advertisement(s)? This action cannot be undone.`,
      style: "danger",
      confirmText: "Delete Slider"
    });

    if (confirmed) {
      setLoading(true);
      try {
        await Promise.all(
          groupAds.map(ad =>
            fetchAdmin(`/api/admin/ads/${ad.id}`, { method: "DELETE" })
          )
        );
        showAlert({ title: "Success", message: `Slider "${label}" deleted successfully.`, style: "success" });
      } catch {
        showAlert({ title: "Error", message: "Failed to delete slider.", style: "danger" });
      } finally {
        loadAds();
        queryClient.invalidateQueries({ queryKey: ['publicAds'] });
      }
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
    <div className={`space-y-8 pb-12 transition-colors ${isLightMode ? 'text-black' : 'text-white'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b pb-6 transition-colors ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <div>
          <h3 className={`text-2xl sm:text-3xl font-display font-black uppercase tracking-wider ${isLightMode ? 'text-black' : 'text-white'}`}>Campaign <span className="text-neon-purple">Sliders</span></h3>
          <p className={`text-[10px] mt-1 uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Manage promotional banners and partner links</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowBulkForm(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-neon-purple text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-neon-purple/20 hover:bg-neon-blue"
          >
            <Layers className="w-4 h-4" /> Upload Ads
          </button>
        </div>
      </div>

      <div className={`border rounded-[1.5rem] sm:rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-colors ${
        isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}>
            <Layout className="w-6 h-6 text-neon-blue" />
          </div>
          <div>
            <h4 className="font-bold text-base">Slider Behavior</h4>
            <p className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Global animation settings</p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto p-4 rounded-2xl border border-dashed border-neon-purple/20 sm:border-none sm:p-0">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Auto-Scroll</span>
          <button
            onClick={handleToggleAutoScroll}
            className={`w-14 h-7 rounded-full relative transition-all duration-500 ${autoScroll ? 'bg-neon-purple shadow-lg shadow-neon-purple/30' : (isLightMode ? 'bg-black/20' : 'bg-white/10')}`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-500 shadow-md ${autoScroll ? 'left-8' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {sliderGroups.map(({ sliderType, layout, label, ads: groupAds }) => (
          <section key={sliderType} className="space-y-6">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
              isLightMode ? 'border-slate-200' : 'border-white/10'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${layout === 'triple' ? 'bg-neon-purple/10 text-neon-purple' : 'bg-neon-blue/10 text-neon-blue'}`}>
                  {layout === 'triple' ? <Layers className="w-5 h-5" /> : <Layout className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={`font-black uppercase tracking-widest text-sm ${isLightMode ? 'text-black' : 'text-white'}`}>{label}</h4>
                  <p className={`text-[9px] uppercase tracking-[0.2em] font-black ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>
                    {layout === 'triple' ? 'Triple Matrix Layout' : 'Standard Carousel'} • {groupAds.length} {groupAds.length === 1 ? 'Ad' : 'Ads'}
                  </p>
                </div>
              </div>

              {groupAds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSliderActive(groupAds, label)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      groupAds.every(ad => ad.is_active === 1 || ad.is_active === true)
                        ? (isLightMode ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20')
                        : (isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20')
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{groupAds.every(ad => ad.is_active === 1 || ad.is_active === true) ? 'Suspend Slider' : 'Activate Slider'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingSliderGroup({ sliderType, layout, label, ads: groupAds })}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isLightMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Slider</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSlider(groupAds, label)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isLightMode ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Slider</span>
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupAds.map(ad => (
                <AdCard 
                  key={ad.id} 
                  ad={ad} 
                  isLightMode={isLightMode}
                  onEdit={() => setEditingAd(ad)} 
                  onDelete={() => handleDelete(ad.id)} 
                  onToggle={() => handleToggleActive(ad)}
                />
              ))}
              {groupAds.length === 0 && (
                <div className={`col-span-full py-16 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-colors ${
                  isLightMode ? 'border-black/5 text-black/20' : 'border-white/5 text-white/20'
                }`}>
                  <ImageIcon className="w-10 h-10 mb-3 opacity-20" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">No Active Campaigns</span>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {typeof document !== "undefined" && createPortal(
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
          {editingSliderGroup && (
            <SliderEditModal 
              sliderGroup={editingSliderGroup}
              onClose={() => setEditingSliderGroup(null)}
              onSaved={() => {
                setEditingSliderGroup(null);
                loadAds();
                queryClient.invalidateQueries({ queryKey: ['publicAds'] });
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function BulkAdModal({ onClose, onSaved }: { onClose: () => void, onSaved: () => void }) {
  const { isLightMode } = useLogo();
  const [sliderLayout, setSliderLayout] = useState<SliderLayout>('single');
  const [sliderName, setSliderName] = useState('');
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const [targetPages, setTargetPages] = useState<string[]>(['all']);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { showAlert } = useModal();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleUpload = async () => {
    const totalItems = files.length + selectedMediaUrls.length;
    if (totalItems === 0) return;
    setUploading(true);
    setProgress(0);

    let successCount = 0;
    let processed = 0;

    try {
      // 1. Process uploaded files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);

        const uploadRes = await fetchAdmin('/api/admin/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          await fetchAdmin('/api/admin/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slider_type: buildSliderValue(sliderLayout, sliderName),
              image_url: url,
              link_url: '',
              display_order: processed,
              is_active: 1,
              target_pages: targetPages.includes('all') ? 'all' : targetPages.join(','),
              position
            })
          });
          successCount++;
        }
        processed++;
        setProgress(Math.round((processed / totalItems) * 100));
      }

      // 2. Process media library URLs
      for (let i = 0; i < selectedMediaUrls.length; i++) {
        const url = selectedMediaUrls[i];
        await fetchAdmin('/api/admin/ads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slider_type: buildSliderValue(sliderLayout, sliderName),
            image_url: url,
            link_url: '',
            display_order: processed,
            is_active: 1,
            target_pages: targetPages.includes('all') ? 'all' : targetPages.join(','),
            position
          })
        });
        successCount++;
        processed++;
        setProgress(Math.round((processed / totalItems) * 100));
      }

      showAlert({ 
        title: "Upload Complete", 
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
        className={`relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border transition-colors ${
          isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-dark-bg border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 md:px-8 md:py-6 flex items-center justify-between border-b flex-shrink-0 ${
          isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-white/[0.02]'
        }`}>
          <h3 className={`text-xl font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Upload Advertisements</h3>
          <button type="button" onClick={onClose} className={`p-2 rounded-full transition-colors ${
            isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-white/10 text-white/40'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6 space-y-6 custom-scrollbar">
          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Slider Layout</label>
            <div className="grid grid-cols-2 gap-3">
              {(['single', 'triple'] as SliderLayout[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSliderLayout(type)}
                  className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                    sliderLayout === type 
                      ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' 
                      : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Slider Name</label>
            <input
              type="text"
              value={sliderName}
              onChange={(e) => setSliderName(e.target.value)}
              placeholder="hero-banner or footer-strip"
              className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all border ${
                isLightMode ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-white/5 border-white/10 text-white placeholder-white/30'
              }`}
            />
            <p className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>Leave blank to use the default slider, or add a unique name to create another dedicated slider.</p>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Ad Position</label>
            <div className="grid grid-cols-2 gap-3">
              {(['top', 'bottom'] as const).map(pos => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosition(pos)}
                  className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                    position === pos 
                      ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' 
                      : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')
                  }`}
                >
                  {pos === 'top' ? 'Top of page' : 'Bottom of page'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Show On Pages</label>
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
                  <label key={page.value} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 cursor-pointer select-none transition-colors ${
                    isLightMode ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      className={`rounded text-neon-purple focus:ring-0 ${isLightMode ? 'border-slate-300 bg-white' : 'border-white/10 bg-white/5'}`}
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

          <div className="space-y-3">
            <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Select Banner Images</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* File Upload Trigger */}
              <label className={`flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-colors group text-center ${
                isLightMode ? 'border-slate-300 bg-slate-50 hover:border-neon-purple hover:bg-slate-100/80' : 'border-white/10 bg-white/[0.02] hover:border-neon-purple/60 hover:bg-white/5'
              }`}>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${
                  isLightMode ? 'bg-slate-200 group-hover:bg-neon-purple/10 text-slate-600 group-hover:text-neon-purple' : 'bg-white/5 group-hover:bg-neon-purple/20 text-white/40 group-hover:text-neon-purple'
                }`}>
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className={`text-xs font-bold ${isLightMode ? 'text-slate-800' : 'text-white/80'}`}>Upload Local Files</p>
                <p className={`text-[9px] uppercase tracking-wider mt-0.5 ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>JPG, PNG, WebP</p>
              </label>

              {/* Select from Media Library Trigger */}
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className={`flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-colors group text-center ${
                  isLightMode ? 'border-slate-300 bg-slate-50 hover:border-neon-purple hover:bg-slate-100/80' : 'border-white/10 bg-white/[0.02] hover:border-neon-purple/60 hover:bg-white/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${
                  isLightMode ? 'bg-slate-200 group-hover:bg-neon-purple/10 text-slate-600 group-hover:text-neon-purple' : 'bg-white/5 group-hover:bg-neon-purple/20 text-white/40 group-hover:text-neon-purple'
                }`}>
                  <Library className="w-5 h-5" />
                </div>
                <p className={`text-xs font-bold ${isLightMode ? 'text-slate-800' : 'text-white/80'}`}>Select from Media</p>
                <p className={`text-[9px] uppercase tracking-wider mt-0.5 ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>Media Library</p>
              </button>
            </div>

            {/* Selected Images Preview List */}
            {(files.length > 0 || selectedMediaUrls.length > 0) && (
              <div className={`max-h-48 overflow-y-auto space-y-2 p-2.5 rounded-2xl border custom-scrollbar ${
                isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                {files.map((f, i) => (
                  <div key={`file-${i}`} className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl border ${
                    isLightMode ? 'bg-white text-slate-800 border-slate-200/80 shadow-sm' : 'bg-white/5 text-white/80 border-white/5'
                  }`}>
                    <div className="flex items-center gap-2.5 truncate">
                      <UploadCloud className="w-4 h-4 text-neon-purple shrink-0" />
                      <span className="truncate font-medium">{f.name}</span>
                      <span className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>
                        ({(f.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles(prev => prev.filter((_, index) => index !== i))}
                      className={`p-1 transition-colors rounded-md ${isLightMode ? 'text-slate-400 hover:text-red-500 hover:bg-slate-100' : 'text-white/40 hover:text-red-400 hover:bg-white/10'}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {selectedMediaUrls.map((url, i) => (
                  <div key={`media-${i}`} className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl border ${
                    isLightMode ? 'bg-white text-slate-800 border-slate-200/80 shadow-sm' : 'bg-white/5 text-white/80 border-white/5'
                  }`}>
                    <div className="flex items-center gap-2.5 truncate">
                      <img src={url} alt="Media thumbnail" className="w-7 h-7 rounded-lg object-cover shrink-0 border border-slate-200" />
                      <span className="truncate font-medium">{url.split('/').pop() || 'Media Image'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-purple/10 text-neon-purple font-bold uppercase tracking-wider shrink-0">
                        Media
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMediaUrls(prev => prev.filter((_, index) => index !== i))}
                      className={`p-1 transition-colors rounded-md ${isLightMode ? 'text-slate-400 hover:text-red-500 hover:bg-slate-100' : 'text-white/40 hover:text-red-400 hover:bg-white/10'}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className={`flex justify-between text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLightMode ? 'bg-slate-200' : 'bg-white/5'}`}>
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
        <div className={`px-6 py-4 md:px-8 md:py-6 border-t flex gap-3 flex-shrink-0 backdrop-blur-md ${
          isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-dark-bg/80'
        }`}>
          <button 
            type="button"
            onClick={onClose}
            className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm border ${
              isLightMode ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white'
            }`}
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleUpload}
            disabled={uploading || (files.length === 0 && selectedMediaUrls.length === 0)}
            className="flex-1 py-3 rounded-xl bg-neon-purple hover:bg-neon-purple/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-neon-purple/20 text-sm"
          >
            {uploading ? 'Processing...' : `Upload ${files.length + selectedMediaUrls.length} Images`}
          </button>
        </div>
      </motion.div>

      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          setSelectedMediaUrls(prev => [...prev, url]);
        }}
      />
    </div>
  );
}

function AdCard({ ad, onEdit, onDelete, onToggle, isLightMode }: any) {
  const { layout, name } = parseSliderType(ad.slider_type || 'single');
  const label = name ? name.split(/[-_]/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : (layout === 'triple' ? 'Partner Slider' : 'Main Slider');

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative rounded-[1.5rem] overflow-hidden border transition-all duration-300 ${
        ad.is_active 
          ? (isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10') 
          : (isLightMode ? 'bg-black/[0.03] border-black/5 grayscale opacity-50' : 'bg-white/5 border-white/5 grayscale opacity-40')
      }`}
    >
      <div className={`aspect-[16/9] w-full overflow-hidden ${isLightMode ? 'bg-black/5' : 'bg-black/40'}`}>
        <img src={ad.image_url} alt="Ad" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      </div>
      <div className="p-4 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
              layout === 'triple' 
                ? (isLightMode ? 'bg-neon-purple/10 text-neon-purple' : 'bg-neon-purple/20 text-neon-purple') 
                : (isLightMode ? 'bg-neon-blue/10 text-neon-blue' : 'bg-neon-blue/20 text-neon-blue')
            }`}>
              {label}
            </span>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
              ad.position === 'top' 
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              {ad.position === 'top' ? 'Header' : 'Footer'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${ad.is_active ? 'text-green-500' : (isLightMode ? 'text-black/30' : 'text-white/20')}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${ad.is_active ? 'bg-green-500 animate-pulse' : 'bg-current'}`} />
              {ad.is_active ? 'Active' : 'Draft'}
            </div>
            <div className={`text-[9px] font-bold tracking-widest opacity-40 truncate max-w-[120px]`}>
              {ad.target_pages === 'all' || !ad.target_pages ? 'ALL PAGES' : ad.target_pages.toUpperCase()}
            </div>
          </div>
        </div>
        
        {ad.link_url && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-medium transition-colors ${isLightMode ? 'bg-black/5 text-black/40' : 'bg-white/5 text-white/30'}`}>
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{ad.link_url}</span>
          </div>
        )}

        <div className={`flex items-center gap-2 pt-4 border-t ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
          <button 
            onClick={onToggle}
            className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
              isLightMode 
                ? 'bg-black/5 border-black/5 text-black/60 hover:bg-black/10' 
                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {ad.is_active ? 'Suspend' : 'Resume'}
          </button>
          <button 
            onClick={onEdit} 
            className={`px-4 py-2.5 rounded-xl transition-all border ${
              isLightMode ? 'bg-black/5 border-black/5 text-black/60 hover:bg-black/10' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onDelete} 
            className={`px-4 py-2.5 rounded-xl transition-all border ${
              isLightMode ? 'bg-red-50 border-red-100 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AdModal({ ad, onClose, onSaved }: { ad?: any, onClose: () => void, onSaved: () => void }) {
  const { isLightMode } = useLogo();
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
        className={`relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border transition-colors ${
          isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-dark-bg border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 md:px-8 md:py-6 flex items-center justify-between border-b flex-shrink-0 ${
          isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-white/[0.02]'
        }`}>
          <h3 className={`text-xl font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{ad ? 'Edit Advertisement' : 'Add New Advertisement'}</h3>
          <button type="button" onClick={onClose} className={`p-2 rounded-full transition-colors ${
            isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-white/10 text-white/40'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content inside Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6 space-y-5 custom-scrollbar">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Slider Layout</label>
              <div className="grid grid-cols-2 gap-3">
                {(['single', 'triple'] as SliderLayout[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSliderLayout(type)}
                    className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                      sliderLayout === type 
                        ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' 
                        : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Slider Name</label>
              <input
                type="text"
                value={sliderName}
                onChange={(e) => setSliderName(e.target.value)}
                placeholder="hero-banner or footer-strip"
                className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all border ${
                  isLightMode ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                }`}
              />
              <p className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>Leave blank to use the default slider, or add a unique name to create another dedicated slider.</p>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Ad Position</label>
              <div className="grid grid-cols-2 gap-3">
                {(['top', 'bottom'] as const).map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setFormData({ ...formData, position: pos })}
                    className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                      formData.position === pos 
                        ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' 
                        : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')
                    }`}
                  >
                    {pos === 'top' ? 'Top of page' : 'Bottom of page'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Show On Pages</label>
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
                    <label key={page.value} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 cursor-pointer select-none transition-colors ${
                      isLightMode ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        className={`rounded text-neon-purple focus:ring-0 ${isLightMode ? 'border-slate-300 bg-white' : 'border-white/10 bg-white/5'}`}
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
              <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Banner Image</label>
              <ImageUploadField 
                value={formData.image_url} 
                onChange={(url) => setFormData({ ...formData, image_url: url })} 
              />
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Link URL (Optional)</label>
              <input 
                type="url"
                value={formData.link_url}
                onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://example.com"
                className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple transition-all border ${
                  isLightMode ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                }`}
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex-1 space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Order</label>
                <input 
                  type="number"
                  value={formData.display_order}
                  onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-purple border ${
                    isLightMode ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'
                  }`}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: formData.is_active ? 0 : 1 })}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formData.is_active ? 'bg-neon-purple' : (isLightMode ? 'bg-slate-300' : 'bg-white/10')}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${formData.is_active ? 'left-7' : 'left-1'}`} />
                </button>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Active</span>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className={`px-6 py-4 md:px-8 md:py-6 border-t flex gap-3 flex-shrink-0 backdrop-blur-md ${
            isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-dark-bg/80'
          }`}>
            <button 
              type="button" 
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm border ${
                isLightMode ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white'
              }`}
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

function SliderEditModal({ sliderGroup, onClose, onSaved }: { sliderGroup: any, onClose: () => void, onSaved: () => void }) {
  const { isLightMode } = useLogo();
  const parsedSlider = parseSliderType(sliderGroup.sliderType);
  const [sliderLayout, setSliderLayout] = useState<SliderLayout>(parsedSlider.layout);
  const [sliderName, setSliderName] = useState(parsedSlider.name);
  const [position, setPosition] = useState<'top' | 'bottom'>(sliderGroup.ads[0]?.position || 'bottom');
  const [targetPages, setTargetPages] = useState<string[]>(
    sliderGroup.ads[0]?.target_pages === 'all' || !sliderGroup.ads[0]?.target_pages
      ? ['all']
      : sliderGroup.ads[0].target_pages.split(',').map((s: string) => s.trim()).filter(Boolean)
  );

  // Track the ads in this slider locally (including any newly added ones)
  const [localAds, setLocalAds] = useState<any[]>(() => {
    return sliderGroup.ads.map((ad: any) => ({
      ...ad,
      is_active: ad.is_active === 1 || ad.is_active === true ? 1 : 0
    }));
  });

  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  // State for adding a new advertisement inside the slider
  const [newAdImageUrl, setNewAdImageUrl] = useState("");
  const [newAdLinkUrl, setNewAdLinkUrl] = useState("");
  const [newAdIsActive, setNewAdIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const { showAlert, showConfirm } = useModal();

  const handleAddNewAd = () => {
    if (!newAdImageUrl) {
      showAlert({ 
        title: "Required", 
        message: "Please select or upload an image before adding to the slider.", 
        style: "danger" 
      });
      return;
    }

    const tempAd = {
      tempId: Date.now() + Math.random(),
      image_url: newAdImageUrl,
      link_url: newAdLinkUrl,
      is_active: newAdIsActive ? 1 : 0,
      display_order: localAds.length,
    };

    setLocalAds([...localAds, tempAd]);
    
    // Reset inputs
    setNewAdImageUrl("");
    setNewAdLinkUrl("");
    setNewAdIsActive(true);

    showAlert({
      title: "Added",
      message: "Image added to the list. Click 'Apply to All Ads' below to save changes.",
      style: "success"
    });
  };

  const handleDeleteAd = async (ad: any) => {
    const confirmed = await showConfirm({
      title: "Remove Image",
      message: "Are you sure you want to remove this image? This action will take effect once you save the slider.",
      style: "danger",
      confirmText: "Remove Image"
    });

    if (confirmed) {
      if (ad.id) {
        setDeletedIds(prev => [...prev, ad.id]);
      }
      setLocalAds(prev => prev.filter(item => {
        if (ad.id) return item.id !== ad.id;
        return item.tempId !== ad.tempId;
      }));
    }
  };

  const handleUpdateAdField = (index: number, field: string, value: any) => {
    setLocalAds(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newSliderType = buildSliderValue(sliderLayout, sliderName);
      const formattedPages = targetPages.includes('all') ? 'all' : targetPages.join(',');

      // 1. Delete removed ads
      if (deletedIds.length > 0) {
        await Promise.all(
          deletedIds.map(id =>
            fetchAdmin(`/api/admin/ads/${id}`, { method: "DELETE" })
          )
        );
      }

      // 2. Save remaining/updated existing ads, and insert new ads
      await Promise.all(
        localAds.map((ad: any, index: number) => {
          const payload = {
            slider_type: newSliderType,
            image_url: ad.image_url,
            link_url: ad.link_url || '',
            display_order: index, // automatic continuous order
            is_active: ad.is_active ? 1 : 0,
            target_pages: formattedPages,
            position
          };

          if (ad.id) {
            // Update existing ad
            return fetchAdmin(`/api/admin/ads/${ad.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
          } else {
            // Create new ad
            return fetchAdmin('/api/admin/ads', {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
          }
        })
      );

      showAlert({ 
        title: "Success", 
        message: `Successfully saved slider "${sliderName || 'default'}" configurations.`, 
        style: "success" 
      });
      onSaved();
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Failed to save slider configurations", style: "danger" });
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
        className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border transition-colors ${
          isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-dark-bg border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 md:px-8 md:py-6 flex items-center justify-between border-b flex-shrink-0 ${
          isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-white/[0.02]'
        }`}>
          <h3 className={`text-xl font-bold flex flex-col ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            <span>Edit Entire Slider</span>
            <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>
              Configuring {localAds.length} {localAds.length === 1 ? 'ad' : 'ads'} in "{sliderGroup.label}"
            </span>
          </h3>
          <button type="button" onClick={onClose} className={`p-2 rounded-full transition-colors ${
            isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-white/10 text-white/40'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6 space-y-6 custom-scrollbar">
            
            {/* 2-Column Desktop Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Left Column: Global Config */}
              <div className="space-y-6">
                <div className="p-5 rounded-2xl border bg-black/[0.01] space-y-5 border-dashed border-neon-purple/20">
                  <h4 className={`text-xs font-black uppercase tracking-wider border-b pb-2 ${isLightMode ? 'text-slate-800' : 'text-white'}`}>
                    Slider Configuration
                  </h4>

                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Slider Layout</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['single', 'triple'] as SliderLayout[]).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSliderLayout(type)}
                          className={`py-2.5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                            sliderLayout === type 
                              ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' 
                              : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Slider Name</label>
                    <input
                      type="text"
                      value={sliderName}
                      onChange={(e) => setSliderName(e.target.value)}
                      placeholder="hero-banner or footer-strip"
                      className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-neon-purple transition-all border ${
                        isLightMode ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-white/5 border-white/10 text-white placeholder-white/30'
                      }`}
                    />
                    <p className={`text-[9px] leading-relaxed ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                      Renaming this will update and shift all images/advertisements into this new slider group.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Ad Position</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['top', 'bottom'] as const).map(pos => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setPosition(pos)}
                          className={`py-2.5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${
                            position === pos 
                              ? 'bg-neon-purple border-neon-purple text-white shadow-lg shadow-neon-purple/20' 
                              : (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')
                          }`}
                        >
                          {pos === 'top' ? 'Top of page' : 'Bottom of page'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Show On Pages</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-1 border rounded-xl custom-scrollbar bg-black/[0.05]">
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
                          <label key={page.value} className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 cursor-pointer select-none transition-colors ${
                            isLightMode ? 'bg-white hover:bg-slate-50 border border-slate-100' : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              className={`rounded text-neon-purple focus:ring-0 ${isLightMode ? 'border-slate-300 bg-white' : 'border-white/10 bg-white/5'}`}
                              onChange={() => {
                                if (page.value === 'all') {
                                  setTargetPages(['all']);
                                  return;
                                }
                                const next = targetPages.filter(item => item !== 'all');
                                setTargetPages(checked ? next.filter(item => item !== page.value) : [...next, page.value]);
                              }}
                            />
                            <span className="truncate">{page.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Manage Images/Ads */}
              <div className="space-y-6">
                
                {/* Section A: Add New Image */}
                <div className="p-5 rounded-2xl border bg-black/[0.01] border-dashed border-neon-blue/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neon-blue">
                      Add New Image to Slider
                    </h4>
                    <span className="text-[9px] bg-neon-blue/10 text-neon-blue px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                      Upload Zone
                    </span>
                  </div>

                  <div className="space-y-3">
                    <ImageUploadField 
                      value={newAdImageUrl} 
                      onChange={(url) => setNewAdImageUrl(url)} 
                      placeholder="Upload file or paste image URL..."
                    />

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="url"
                          value={newAdLinkUrl}
                          onChange={(e) => setNewAdLinkUrl(e.target.value)}
                          placeholder="Link URL (optional)"
                          className={`w-full rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-neon-purple transition-all border ${
                            isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-white/5 border-white/10 text-white'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNewAdIsActive(!newAdIsActive)}
                          className={`w-10 h-5 rounded-full relative transition-all duration-300 ${newAdIsActive ? 'bg-neon-purple' : (isLightMode ? 'bg-slate-300' : 'bg-white/10')}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${newAdIsActive ? 'left-5' : 'left-1'}`} />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddNewAd}
                      className="w-full py-2.5 bg-neon-blue hover:bg-neon-blue/90 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Image to Slider</span>
                    </button>
                  </div>
                </div>

                {/* Section B: Current Images List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-white'}`}>
                      Images in this Slider ({localAds.length})
                    </h4>
                    <span className="text-[9px] font-bold opacity-50">Drag order is top-to-bottom</span>
                  </div>

                  {localAds.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-black/5 rounded-2xl">
                      <ImageIcon className="w-8 h-8 mx-auto opacity-20 mb-2" />
                      <p className="text-[10px] uppercase tracking-wider opacity-40 font-black">No images in this slider yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                      {localAds.map((ad, index) => (
                        <div 
                          key={ad.id || ad.tempId} 
                          className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
                            ad.is_active 
                              ? (isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10')
                              : (isLightMode ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white/[0.02] border-white/5 opacity-50')
                          }`}
                        >
                          {/* Left: Thumbnail Preview */}
                          <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-black/20 border border-black/5">
                            <img 
                              src={ad.image_url} 
                              alt="Ad thumbnail" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* Center: Details & Link */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                                Image #{index + 1} {ad.tempId && <span className="text-neon-blue font-black">(NEW)</span>}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAdField(index, 'is_active', ad.is_active ? 0 : 1)}
                                  className={`w-8 h-4 rounded-full relative transition-all duration-300 ${ad.is_active ? 'bg-green-500' : (isLightMode ? 'bg-slate-300' : 'bg-white/10')}`}
                                >
                                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 ${ad.is_active ? 'left-4.5' : 'left-0.5'}`} />
                                </button>
                                <span className="text-[8px] font-black uppercase tracking-wider">{ad.is_active ? 'Active' : 'Draft'}</span>
                              </div>
                            </div>

                            <input 
                              type="url"
                              value={ad.link_url || ""}
                              onChange={(e) => handleUpdateAdField(index, 'link_url', e.target.value)}
                              placeholder="Destination Link (optional)"
                              className={`w-full rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-neon-purple border transition-all ${
                                isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/30 border-white/5 text-white'
                              }`}
                            />
                          </div>

                          {/* Right: Actions */}
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDeleteAd(ad)}
                              className={`p-2 rounded-lg border transition-all ${
                                isLightMode 
                                  ? 'bg-red-50 hover:bg-red-500 hover:text-white border-red-100 text-red-500' 
                                  : 'bg-red-500/10 hover:bg-red-500 border-red-500/20 text-red-400 hover:text-white'
                              }`}
                              title="Delete from slider"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* Fixed Footer */}
          <div className={`px-6 py-4 md:px-8 md:py-6 border-t flex gap-3 flex-shrink-0 backdrop-blur-md ${
            isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-dark-bg/80'
          }`}>
            <button 
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm border ${
                isLightMode ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white'
              }`}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-neon-purple hover:bg-neon-purple/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-neon-purple/20 text-sm"
            >
              {saving ? 'Saving...' : 'Apply to All Ads'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
