import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminProfile() {
  // This component should ideally fetch its own user's role to display it, but not for editing.
  const [profile, setProfile] = useState<any>(null);
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showAlert } = useModal();

  useEffect(() => {
    fetchAdmin("/api/admin/profile").then(r => r.json()).then(data => {
      setProfile(data);
      setBio(data?.bio || "");
      setPhotoUrl(data?.photo_url || "");
    });
  }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await fetchAdmin("/api/admin/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, photo_url: photoUrl })
    });
    setIsSaving(false);
    if (res.ok) {
      showAlert({ title: "Success", message: "Profile updated!", style: "success" });
    } else {
      showAlert({ title: "Error", message: "Failed to update profile", style: "danger" });
    }
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">My Profile Settings</h3>
      
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
        <div className="relative group">
          <img 
            src={photoUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=200&q=80"} 
            alt="Profile Avatar" 
            className="w-24 h-24 rounded-full object-cover border-2 border-white/10 bg-dark-bg" 
          />
        </div>
        <div className="flex-1">
          <h4 className="text-xl font-bold">{profile.username}</h4>
          <p className="text-white/50 text-sm mb-4">Administrator</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <ImageUploadField label="Profile Photo URL" value={photoUrl} onChange={setPhotoUrl} placeholder="https://..." />
        <div>
          <label className="block text-sm mb-1 text-white/70">Bio</label>
          <textarea 
            value={bio} 
            onChange={e => setBio(e.target.value)} 
            rows={4}
            className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" 
            placeholder="Tell us about yourself..."
          />
        </div>
        <button 
          type="submit" 
          disabled={isSaving}
          className="bg-neon-purple px-6 py-2 rounded font-bold hover:bg-neon-blue transition-colors disabled:opacity-50 text-white"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
