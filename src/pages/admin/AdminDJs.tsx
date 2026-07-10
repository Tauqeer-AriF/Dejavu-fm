import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminDJs() {
  const [djs, setDJs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { showConfirm, showAlert } = useModal();
  
  const queryClient = useQueryClient();
  const load = () => {
    fetch("/api/public/djs").then(r=>r.json()).then(setDJs);
    queryClient.invalidateQueries({ queryKey: ['schedule'] });
    queryClient.invalidateQueries({ queryKey: ['djs'] });
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm({
      title: "Delete DJ",
      message: "Are you sure you want to delete this DJ and all their schedules?",
      style: "danger",
      confirmText: "Delete"
    });
    if(confirmed) {
      const res = await fetchAdmin(`/api/admin/djs/${id}`, { method: "DELETE" });
      if (res.ok) {
        showAlert({ title: "Success", message: "DJ deleted from the database.", style: "success" });
        load();
      }
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">Manage DJs</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {djs.map(dj => (
          <div key={dj.id} className="bg-dark-bg border border-white/10 p-4 rounded-xl flex flex-col space-y-4">
            {editingId === dj.id ? (
              <EditDJForm dj={dj} onSave={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <img src={dj.image_url || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=200&q=80"} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
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
      <AddDJForm onAdd={load} />
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
          <label className="block text-xs uppercase mb-1">Name</label>
          <input required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm" />
        </div>
        <ImageUploadField label="Image URL" value={image} onChange={setImage} className="!space-y-1" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1">Bio</label>
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
      <div className="flex space-x-2">
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
      <h4 className="font-bold">Add New DJ</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase mb-1">Name</label>
          <input required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
        </div>
        <ImageUploadField label="Image URL" value={image} onChange={setImage} className="!space-y-1" />
      </div>
      <div>
        <label className="block text-xs uppercase mb-1">Bio (Short)</label>
        <input value={bio} onChange={e=>setBio(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Instagram</label>
          <input value={instagram} onChange={e=>setInstagram(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Soundcloud</label>
          <input value={soundcloud} onChange={e=>setSoundcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/50 text-[10px]">Mixcloud</label>
          <input value={mixcloud} onChange={e=>setMixcloud(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-xs" />
        </div>
      </div>
      <button className="bg-neon-blue text-dark-bg px-4 py-2 font-bold rounded">Add DJ</button>
    </form>
  )
}
