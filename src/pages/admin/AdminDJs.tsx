import React, { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles, AlertTriangle, Instagram, Facebook } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { useLogo } from "../../hooks/useLogo";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";
import { toast } from "sonner";

export function AdminDJs() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { showConfirm, showAlert } = useModal();
  const { resolveDjImage } = useLogo();
  
  const queryClient = useQueryClient();

  const { data: djs = [], refetch, isFetching } = useQuery<any[]>({
    queryKey: ['djs'],
    queryFn: () => fetch("/api/public/djs?t=" + Date.now()).then(r => r.json()),
  });

  // Filter DJs based on search query
  const filteredDjs = useMemo(() => {
    if (!searchQuery.trim()) return djs;
    const q = searchQuery.toLowerCase();
    return djs.filter(dj => 
      (dj.name || "").toLowerCase().includes(q) || 
      (dj.bio || "").toLowerCase().includes(q)
    );
  }, [djs, searchQuery]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredDjs.length / ITEMS_PER_PAGE);

  const paginatedDjs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDjs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDjs, currentPage]);

  // Deletion helper states
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; name: string } | null>(null);
  const [associatedStaff, setAssociatedStaff] = useState<string | null>(null);
  const [alsoDeleteStaff, setAlsoDeleteStaff] = useState<boolean>(true);
  const [checkingStaff, setCheckingStaff] = useState<boolean>(false);

  const startDeleteFlow = async (id: string, name: string) => {
    setDeleteCandidate({ id, name });
    setAssociatedStaff(null);
    setAlsoDeleteStaff(true);
    setCheckingStaff(true);
    try {
      const res = await fetchAdmin("/api/admin/users");
      if (res.ok) {
        const staff = await res.json();
        const matched = staff.find((u: any) => u.dj_profile_id === id || u.username.trim().toLowerCase() === name.trim().toLowerCase());
        if (matched && matched.username.toLowerCase() !== 'admin') {
          setAssociatedStaff(matched.username);
        }
      }
    } catch (e) {
      console.error("Failed to check associated staff:", e);
    } finally {
      setCheckingStaff(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    const { id, name } = deleteCandidate;
    
    const url = `/api/admin/djs/${id}?deleteStaff=${associatedStaff && alsoDeleteStaff ? "true" : "false"}`;
    const res = await fetchAdmin(url, { method: "DELETE" });
    if (res.ok) {
      showAlert({ 
        title: "Success", 
        message: associatedStaff && alsoDeleteStaff 
          ? `DJ "${name}" and associated staff account "${associatedStaff}" deleted.` 
          : `DJ "${name}" deleted from the database.`, 
        style: "success" 
      });
      queryClient.invalidateQueries({ queryKey: ['djs'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    } else {
      showAlert({ title: "Error", message: "Failed to delete DJ", style: "danger" });
    }
    setDeleteCandidate(null);
    setAssociatedStaff(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-2xl font-bold">Manage DJs</h3>
          <p className="text-xs text-white/50 mt-1">Add, edit, or remove resident DJ profiles.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search DJ name or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <button 
            onClick={async () => {
              queryClient.invalidateQueries({ queryKey: ['djs'] });
              await refetch();
              toast.success("DJs roster refreshed successfully!");
            }} 
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-xs text-white/70 hover:text-white transition-all shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-neon-purple' : ''}`} />
            {isFetching ? 'Refetching...' : 'Refresh'}
          </button>
        </div>
      </div>

      <AddDJForm onAdd={() => {
        queryClient.invalidateQueries({ queryKey: ['djs'] });
      }} />

      {filteredDjs.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 p-6 space-y-3">
          <p className="text-white/40 text-sm">
            {searchQuery.trim() !== "" 
              ? `No DJs match your search term "${searchQuery}".` 
              : "No resident DJs found in the database."}
          </p>
          {searchQuery.trim() !== "" && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/85 text-white rounded-lg text-xs font-bold uppercase transition-all"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {paginatedDjs.map(dj => (
              <div key={dj.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex flex-col space-y-4 hover:border-white/15 transition-all duration-300 relative group overflow-hidden">
                {editingId === dj.id ? (
                  <EditDJForm 
                    dj={dj} 
                    onSave={() => {
                      setEditingId(null);
                      queryClient.invalidateQueries({ queryKey: ['djs'] });
                      queryClient.invalidateQueries({ queryKey: ['schedule'] });
                    }} 
                    onCancel={() => setEditingId(null)} 
                  />
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full">
                    <img 
                      src={resolveDjImage(dj.image_url)} 
                      className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 bg-white/5 border border-white/10 group-hover:border-neon-purple/40 transition-colors shadow-md" 
                      alt={dj.name}
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <span className="font-bold text-lg text-white group-hover:text-neon-blue transition-colors block truncate">{dj.name}</span>
                        <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-purple/85 px-2 py-0.5 rounded bg-neon-purple/10 border border-neon-purple/20">Resident DJ</span>
                      </div>
                      {dj.bio && (
                        <span className="text-xs text-white/50 block line-clamp-2 leading-snug italic">
                          "{dj.bio}"
                        </span>
                      )}
                      
                      {/* Social Verification Indicators */}
                      <div className="flex items-center gap-2 pt-1">
                        {dj.instagram ? (
                          <a 
                            href={`https://instagram.com/${dj.instagram}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            title={`Instagram: @${dj.instagram}`}
                            className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-[#E1306C]/20 transition-all border border-white/5"
                          >
                            <Instagram className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="w-7 h-7 rounded-lg bg-white/[0.02] flex items-center justify-center text-white/10 border border-transparent" title="No Instagram linked">
                            <Instagram className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}

                        {dj.facebook ? (
                          <a 
                            href={dj.facebook.startsWith('http') ? dj.facebook : `https://facebook.com/${dj.facebook}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            title={`Facebook: ${dj.facebook}`}
                            className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-[#1877F2]/20 transition-all border border-white/5"
                          >
                            <Facebook className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="w-7 h-7 rounded-lg bg-white/[0.02] flex items-center justify-center text-white/10 border border-transparent" title="No Facebook linked">
                            <Facebook className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}

                        {dj.mixcloud ? (
                          <a 
                            href={`https://mixcloud.com/${dj.mixcloud}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            title={`Mixcloud: ${dj.mixcloud}`}
                            className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-[#52AAD8]/20 transition-all border border-white/5"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="w-7 h-7 rounded-lg bg-white/[0.02] flex items-center justify-center text-white/10 border border-transparent" title="No Mixcloud linked">
                            <Globe className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex sm:flex-col items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 justify-end">
                      <button 
                        onClick={() => setEditingId(dj.id)} 
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white/5 hover:bg-neon-blue hover:text-dark-bg text-neon-blue text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-neon-blue/10 hover:border-neon-blue"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => startDeleteFlow(dj.id, dj.name)} 
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white/5 hover:bg-neon-purple hover:text-white text-neon-purple text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-neon-purple/10 hover:border-neon-purple"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-4">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1} 
                className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white/50 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                Page <span className="text-neon-purple">{currentPage}</span> of {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages} 
                className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white/50 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Deletion Overlay Modal */}
      {createPortal(
        <AnimatePresence>
          {deleteCandidate && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteCandidate(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              
              {/* Modal Box */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-white z-10"
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-neon-purple/10 text-neon-purple rounded-xl">
                    <X className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold uppercase tracking-wider">Delete DJ Profile?</h4>
                    <p className="text-sm text-white/60 mt-1">
                      Are you sure you want to delete <span className="font-bold text-white">"{deleteCandidate.name}"</span> and all their schedules?
                    </p>
                  </div>
                </div>

                {checkingStaff ? (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking associated staff accounts...
                  </div>
                ) : associatedStaff ? (
                  <div className="bg-neon-purple/5 border border-neon-purple/20 p-4 rounded-xl space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-neon-purple font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Staff Login Account Linked
                    </div>
                    <p className="text-xs text-white/70">
                      This DJ is linked to the staff login account: <span className="font-mono text-neon-blue font-bold">"{associatedStaff}"</span>.
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer select-none text-white pt-1">
                      <input 
                        type="checkbox" 
                        checked={alsoDeleteStaff} 
                        onChange={(e) => setAlsoDeleteStaff(e.target.checked)} 
                        className="rounded border-white/20 text-neon-purple focus:ring-0 focus:ring-offset-0 bg-transparent w-4 h-4"
                      />
                      <span className="text-xs font-bold text-white/90">Also delete staff login account "{associatedStaff}"</span>
                    </label>
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setDeleteCandidate(null)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-5 py-2.5 bg-neon-purple hover:bg-neon-purple/85 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-neon-purple/20"
                  >
                    {associatedStaff && alsoDeleteStaff ? "Delete DJ & Account" : "Delete DJ Profile Only"}
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

function EditDJForm({dj, onSave, onCancel}: {dj: any, onSave: ()=>void, onCancel: ()=>void}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(dj.name);
  const [bio, setBio] = useState(dj.bio || "");
  const [image, setImage] = useState(dj.image_url || "");
  const [instagram, setInstagram] = useState(dj.instagram || "");
  const [facebook, setFacebook] = useState(dj.facebook || "");
  const [mixcloud, setMixcloud] = useState(dj.mixcloud || "");
  const { showAlert } = useModal();
  
  const handleSave = async (e:any) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/djs/${dj.id}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, bio, image_url: image, instagram, facebook, mixcloud })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: `${name} updated successfully!`, style: "success" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['djs'] });
      onSave();
    } else {
      showAlert({ title: "Error", message: "Failed to update DJ", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 w-full">
      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase mb-1 font-semibold text-white/40">Name</label>
          <input required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm" />
        </div>
        <ImageUploadField label="Image URL" value={image} onChange={setImage} className="!space-y-1" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1 font-semibold text-white/40">Bio</label>
        <textarea value={bio} onChange={e=>setBio(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm" rows={2} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Instagram</label>
          <input value={instagram} onChange={e=>setInstagram(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-[10px]" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Facebook</label>
          <input value={facebook} onChange={e=>setFacebook(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-[10px]" placeholder="username or link" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Mixcloud</label>
          <input value={mixcloud} onChange={e=>setMixcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-[10px]" />
        </div>
      </div>
      <div className="flex space-x-2 pt-2">
        <button type="submit" className="bg-neon-purple text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-neon-blue transition-colors">Save</button>
        <button type="button" onClick={onCancel} className="bg-white/10 text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-white/20 transition-colors">Cancel</button>
      </div>
    </form>
  )
}

function AddDJForm({onAdd}: {onAdd:()=>void}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [mixcloud, setMixcloud] = useState("");
  const { showAlert } = useModal();
  
  const handleAdd = async (e:any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/djs", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, bio, image_url: image, instagram, facebook, mixcloud })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: `${name} added to the roster!`, style: "success" });
      queryClient.invalidateQueries({ queryKey: ['djs'] });
      setName(""); setBio(""); setImage(""); setInstagram(""); setFacebook(""); setMixcloud("");
      onAdd();
    } else {
      showAlert({ title: "Error", message: "Failed to add DJ", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleAdd} className="bg-white/[0.02] p-5 sm:p-6 rounded-2xl border border-white/5 space-y-4 w-full">
      <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
        <Plus className="w-4 h-4 text-neon-purple" />
        <h4 className="font-bold text-white uppercase text-xs tracking-wider">Add Resident DJ</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-1">Name</label>
            <input 
              required 
              value={name} 
              onChange={e=>setName(e.target.value)} 
              className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple" 
              placeholder="e.g. DJ Shadow"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-1">Bio (Short)</label>
            <textarea 
              value={bio} 
              onChange={e=>setBio(e.target.value)} 
              className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple" 
              placeholder="Tell us about their style, genre, or residence..."
              rows={3}
            />
          </div>
        </div>
        
        {/* Right column */}
        <div className="space-y-4">
          <ImageUploadField label="Profile Image" value={image} onChange={setImage} className="!space-y-1" />
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-1">Instagram</label>
              <input 
                value={instagram} 
                onChange={e=>setInstagram(e.target.value)} 
                className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-purple" 
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-1">Facebook</label>
              <input 
                value={facebook} 
                onChange={e=>setFacebook(e.target.value)} 
                className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-purple" 
                placeholder="username or link"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-1">Mixcloud</label>
              <input 
                value={mixcloud} 
                onChange={e=>setMixcloud(e.target.value)} 
                className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-neon-purple" 
                placeholder="username"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end pt-1">
        <button className="bg-neon-blue hover:bg-neon-blue/85 text-dark-bg px-6 py-2.5 font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-neon-blue/10">Add DJ</button>
      </div>
    </form>
  )
}
