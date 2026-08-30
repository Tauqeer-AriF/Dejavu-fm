import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Mail, Lock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPublic, setIsSavingPublic] = useState(false);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const { showAlert } = useModal();

  useEffect(() => {
    fetchAdmin("/api/admin/profile")
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setUsername(data?.username || "");
        setBio(data?.bio || "");
        setPhotoUrl(data?.photo_url || "");
        setEmail(data?.email || "");
      })
      .catch(err => {
        console.error("Failed to load profile details", err);
      });
  }, []);

  const handleSavePublicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPublic(true);
    try {
      const res = await fetchAdmin("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, photo_url: photoUrl })
      });
      setIsSavingPublic(false);
      if (res.ok) {
        const data = await res.json();
        showAlert({ title: "Success", message: "Public Information updated successfully!", style: "success" });
        if (data.profile) {
          setBio(data.profile.bio);
          setPhotoUrl(data.profile.photo_url);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showAlert({ title: "Error", message: errData.error || "Failed to update public information", style: "danger" });
      }
    } catch (err: any) {
      setIsSavingPublic(false);
      showAlert({ title: "Error", message: err.message || "An unexpected error occurred.", style: "danger" });
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      showAlert({ title: "Error", message: "Username cannot be empty!", style: "danger" });
      return;
    }
    if (trimmedUsername.length < 2) {
      showAlert({ title: "Error", message: "Username must be at least 2 characters long!", style: "danger" });
      return;
    }

    if (password && password !== confirmPassword) {
      showAlert({ title: "Error", message: "Passwords do not match!", style: "danger" });
      return;
    }
    if (password && password.length < 6) {
      showAlert({ title: "Error", message: "Password must be at least 6 characters long!", style: "danger" });
      return;
    }

    setIsSavingCredentials(true);
    try {
      const payload: any = { 
        username: trimmedUsername,
        email: email.trim() 
      };
      if (password) {
        payload.password = password;
      }
      const res = await fetchAdmin("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setIsSavingCredentials(false);
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
        }
        showAlert({ title: "Success", message: "Account Credentials updated successfully!", style: "success" });
        setPassword("");
        setConfirmPassword("");
        if (data.profile?.username) {
          setUsername(data.profile.username);
          setProfile((prev: any) => ({ ...prev, ...data.profile }));
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showAlert({ title: "Error", message: errData.error || "Failed to update credentials", style: "danger" });
      }
    } catch (err: any) {
      setIsSavingCredentials(false);
      showAlert({ title: "Error", message: err.message || "An unexpected error occurred.", style: "danger" });
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-neon-purple" />
      </div>
    );
  }

  const userRoleDisplay = profile.role === 'admin' ? 'Station Administrator' : 'Station DJ / Host';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tighter italic">
            My <span className="text-neon-purple not-italic">Profile Settings</span>
          </h3>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-mono">
            Manage your personal bio, credentials, and avatar
          </p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left bg-white/5 p-6 rounded-2xl border border-white/10">
        <div className="relative group">
          <img 
            src={photoUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=200&q=80"} 
            alt="Profile Avatar" 
            className="w-24 h-24 rounded-full object-cover border-2 border-neon-purple/50 bg-dark-bg shadow-[0_0_20px_rgba(157,78,221,0.2)]" 
          />
        </div>
        <div className="flex-1">
          <h4 className="text-2xl font-bold tracking-tight text-white mb-1">{profile.username}</h4>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neon-purple/10 text-neon-purple border border-neon-purple/20">
            {userRoleDisplay}
          </span>
          <p className="text-white/40 text-xs mt-3 font-mono">
            Staff Account ID: @{profile.username.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Public Information */}
        <form onSubmit={handleSavePublicInfo} className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h5 className="text-sm font-bold uppercase tracking-wider text-neon-purple">
              Public Information
            </h5>
            <span className="text-[10px] text-white/40 font-mono">Visible on public schedule & DJ profiles</span>
          </div>
          <ImageUploadField label="Profile Photo URL" value={photoUrl} onChange={setPhotoUrl} placeholder="https://..." />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Bio</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              rows={4}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all text-white placeholder:text-white/20" 
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={isSavingPublic}
              className="bg-neon-purple px-6 py-2.5 rounded-xl font-bold hover:bg-neon-blue transition-colors disabled:opacity-50 text-white shadow-lg shadow-neon-purple/20 flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              {isSavingPublic ? "Saving..." : "Save Public Info"}
            </button>
          </div>
        </form>

        {/* Section 2: Account Credentials */}
        <form onSubmit={handleSaveCredentials} className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h5 className="text-sm font-bold uppercase tracking-wider text-neon-purple">
              Account Credentials
            </h5>
            <span className="text-[10px] text-white/40 font-mono">Private login details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                  <User className="w-4 h-4" />
                </span>
                <input 
                  type="text"
                  required
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  className="w-full bg-dark-bg border border-white/10 rounded-xl pl-10 pr-4 py-2.5 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all text-white text-sm" 
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                Email Address <span className="text-[10px] text-white/40 normal-case">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="text"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full bg-dark-bg border border-white/10 rounded-xl pl-10 pr-4 py-2.5 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all text-white text-sm" 
                  placeholder="you@dejavufm.com (optional)"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full bg-dark-bg border border-white/10 rounded-xl pl-10 pr-10 py-2.5 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all text-white placeholder:text-white/20 text-sm" 
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Confirm New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="w-full bg-dark-bg border border-white/10 rounded-xl pl-10 pr-10 py-2.5 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all text-white placeholder:text-white/20 text-sm" 
                  placeholder="Repeat new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-white/30 mt-1 font-mono leading-relaxed">
            Leave password fields blank if you do not wish to update your password.
          </p>
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={isSavingCredentials}
              className="bg-neon-purple px-6 py-2.5 rounded-xl font-bold hover:bg-neon-blue transition-colors disabled:opacity-50 text-white shadow-lg shadow-neon-purple/20 flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              {isSavingCredentials ? "Saving..." : "Save Credentials"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
