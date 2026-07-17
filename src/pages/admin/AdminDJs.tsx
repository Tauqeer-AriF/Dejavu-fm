import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { useLogo } from "../../hooks/useLogo";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminDJs() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showConfirm, showAlert } = useModal();
  const { resolveDjImage } = useLogo();
  
  const queryClient = useQueryClient();

  const { data: djs = [], refetch } = useQuery<any[]>({
    queryKey: ['djs'],
    queryFn: () => fetch("/api/public/djs?t=" + Date.now()).then(r => r.json()),
  });

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
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <h3 className="text-2xl font-bold">Manage DJs</h3>
        <button 
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['djs'] });
            refetch();
          }} 
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/[0.1] text-xs text-white/70 hover:text-white transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {djs.map(dj => (
          <div key={dj.id} className="bg-dark-bg border border-white/10 p-4 rounded-xl flex flex-col space-y-4">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <img 
                  src={resolveDjImage(dj.image_url)} 
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-white/5" 
                  alt={dj.name}
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <span className="font-bold block">{dj.name}</span>
                  {dj.bio && <span className="text-xs text-white/50 block mt-1 line-clamp-1">{dj.bio}</span>}
                </div>
                <div className="flex space-x-4 mt-2 sm:mt-0">
                  <button onClick={() => setEditingId(dj.id)} className="text-neon-blue hover:text-white transition-colors text-sm px-2 py-1">Edit</button>
                  <button onClick={() => startDeleteFlow(dj.id, dj.name)} className="text-red-500 hover:text-red-400 text-sm px-2 py-1">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <AddDJForm onAdd={() => {
        queryClient.invalidateQueries({ queryKey: ['djs'] });
      }} />

      {/* Deletion Overlay Modal */}
      <AnimatePresence>
        {deleteCandidate && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
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
                <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
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
                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl space-y-3 mt-4">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
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
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-red-600/20"
                >
                  {associatedStaff && alsoDeleteStaff ? "Delete DJ & Account" : "Delete DJ Profile Only"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditDJForm({dj, onSave, onCancel}: {dj: any, onSave: ()=>void, onCancel: ()=>void}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(dj.name);
  const [bio, setBio] = useState(dj.bio || "");
  const [image, setImage] = useState(dj.image_url || "");
  const [instagram, setInstagram] = useState(dj.instagram || "");
  const [soundcloud, setSoundcloud] = useState(dj.soundcloud || "");
  const [mixcloud, setMixcloud] = useState(dj.mixcloud || "");
  const { showAlert } = useModal();
  
  const handleSave = async (e:any) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/djs/${dj.id}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, bio, image_url: image, instagram, soundcloud, mixcloud })
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
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Soundcloud</label>
          <input value={soundcloud} onChange={e=>setSoundcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-[10px]" />
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
  const [soundcloud, setSoundcloud] = useState("");
  const [mixcloud, setMixcloud] = useState("");
  const { showAlert } = useModal();
  
  const handleAdd = async (e:any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/djs", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, bio, image_url: image, instagram, soundcloud, mixcloud })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: `${name} added to the roster!`, style: "success" });
      queryClient.invalidateQueries({ queryKey: ['djs'] });
      setName(""); setBio(""); setImage(""); setInstagram(""); setSoundcloud(""); setMixcloud("");
      onAdd();
    } else {
      showAlert({ title: "Error", message: "Failed to add DJ", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleAdd} className="mt-8 bg-dark-bg/50 p-6 rounded-xl border border-white/5 space-y-4 max-w-2xl">
      <h4 className="font-bold text-lg">Add New DJ</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase mb-1 font-semibold text-white/40">Name</label>
          <input required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm" />
        </div>
        <ImageUploadField label="Image URL" value={image} onChange={setImage} className="!space-y-1" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1 font-semibold text-white/40">Bio (Short)</label>
        <input value={bio} onChange={e=>setBio(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Instagram</label>
          <input value={instagram} onChange={e=>setInstagram(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-neon-purple" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Soundcloud</label>
          <input value={soundcloud} onChange={e=>setSoundcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-neon-purple" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Mixcloud</label>
          <input value={mixcloud} onChange={e=>setMixcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-neon-purple" />
        </div>
      </div>
      <div className="pt-2">
        <button className="bg-neon-blue text-dark-bg px-5 py-2 font-black uppercase text-xs tracking-widest rounded hover:bg-white transition-colors duration-300">Add DJ</button>
      </div>
    </form>
  )
}
