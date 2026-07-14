import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
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

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: "Delete DJ",
      message: "Are you sure you want to delete this DJ and all their schedules?",
      style: "danger",
      confirmText: "Delete"
    });
    if (confirmed) {
      const res = await fetchAdmin(`/api/admin/djs/${id}`, { method: "DELETE" });
      if (res.ok) {
        showAlert({ title: "Success", message: "DJ deleted from the database.", style: "success" });
        queryClient.invalidateQueries({ queryKey: ['djs'] });
        queryClient.invalidateQueries({ queryKey: ['schedule'] });
      } else {
        showAlert({ title: "Error", message: "Failed to delete DJ", style: "danger" });
      }
    }
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
                  <button onClick={() => handleDelete(dj.id)} className="text-red-500 hover:text-red-400 text-sm px-2 py-1">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <AddDJForm onAdd={() => {
        queryClient.invalidateQueries({ queryKey: ['djs'] });
      }} />
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
