import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminChatUsers({ isAdminUser }: { isAdminUser: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showBannedOnly, setShowBannedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { showConfirm, showAlert } = useModal();

  const load = () => fetchAdmin("/api/admin/chat_users").then(r => r.json()).then(setUsers);
  useEffect(() => { load(); }, []);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (showBannedOnly) result = result.filter(u => u.is_banned === 1);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(u => 
        (u.username || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term)
      );
    }
    return result;
  }, [users, showBannedOnly, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, showBannedOnly]);

  const handleDeleteUser = async (id: number, username: string) => {
    const confirmed = await showConfirm({
      title: "Remove Chat User",
      message: `Are you sure you want to remove the chat user '@${username}'?`,
      style: "danger",
      confirmText: "Remove"
    });
    if (confirmed) {
      await fetchAdmin(`/api/admin/chat_users/${id}`, { method: "DELETE" });
      load();
    }
  };

  const exportChatUsersToCSV = () => {
    if (users.length === 0) {
      showAlert({ title: "No Data", message: "There are no chat users to export.", style: "danger" });
      return;
    }

    const headers = ["ID", "Username", "Email", "Password", "Source", "Joined At"];
    const rows = users.map(u => [
      u.id,
      `"${(u.username || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"${(u.password_plain || "").replace(/"/g, '""')}"`,
      u.source || 'register',
      new Date(u.created_at).toISOString()
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dejavu_chat_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Exported", message: "Chat users list generated with complete credentials.", style: "success" });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <h3 className="text-2xl font-bold">Chat Users</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[10px] focus:outline-none focus:border-neon-purple/50 transition-all placeholder:text-white/20 text-white"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input type="checkbox" checked={showBannedOnly} onChange={e => setShowBannedOnly(e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:bg-red-500/50 transition-colors"></div>
              <div className="absolute left-1 top-1 w-3 h-3 bg-white/40 rounded-full peer-checked:left-6 peer-checked:bg-red-500 transition-all"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Banned Only</span>
          </label>
          <button onClick={exportChatUsersToCSV} className="px-4 py-2 bg-white/5 hover:bg-neon-blue/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-blue">Export CSV</button>
        </div>
      </div>
      
      {isAdminUser && ( // Only show this form if the logged-in user is an 'admin'
        <AddChatUserForm onAdd={load} />
      )}

      <div className="space-y-2">
        {paginatedUsers.map(u => (
          <div key={u.id} className="bg-dark-bg/50 border border-white/10 p-4 rounded-xl flex flex-col">
            {editingId === u.id ? (
              <EditChatUserForm user={u} onSave={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Username:</span>
                    <span className="font-bold text-lg text-white block truncate">@{u.username}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-tighter ${
                      u.source === 'shoutout' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      u.source === 'admin' ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/20' :
                      'bg-neon-purple/10 text-neon-purple border-neon-purple/20'
                    }`}>{u.source || 'register'}</span>
                    {u.is_banned === 1 && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-tighter bg-red-500/10 text-red-500 border-red-500/20">
                        Banned
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/30 uppercase font-black tracking-widest block">Email Address</span>
                      <span className="text-white/80 font-mono text-sm break-all bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 block">{u.email || 'N/A'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/30 uppercase font-black tracking-widest block">Password</span>
                      <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 block min-h-[38px]">
                        <UserPasswordDisplay password={u.password_plain} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-white/30 uppercase font-black tracking-widest pt-1">
                    <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                    <span>ID: {u.id}</span>
                  </div>
                </div>
                <div className="flex space-x-2 items-center self-end sm:self-start">
                  <button onClick={() => setEditingId(u.id)} className="text-neon-blue hover:text-white transition-colors px-3 py-1.5 text-sm bg-white/5 rounded-lg border border-white/10">Edit</button>
                  {isAdminUser && ( // Only allow 'admin' role to delete chat users
                    <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-500 hover:text-red-400 text-sm bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/10 transition-colors">Remove</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <p className="text-white/50 text-center py-8">
            {searchTerm ? `No users matching "${searchTerm}" found.` : (showBannedOnly ? "No banned users found." : "No chat users registered yet.")}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white/50 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
          <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">Page <span className="text-neon-purple">{currentPage}</span> of {totalPages}</div>
          <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white/50 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

function UserPasswordDisplay({ password }: { password?: string }) {
  const [show, setShow] = useState(false);
  if (!password) return <span className="text-white/40 italic text-xs">Not set / encrypted</span>;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/90 font-mono text-sm tracking-wide">
        {show ? password : "••••••••"}
      </span>
      <button 
        type="button" 
        onClick={() => setShow(!show)} 
        className="text-white/40 hover:text-white p-0.5 focus:outline-none transition-colors"
        title={show ? "Hide Password" : "Show Password"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function AddChatUserForm({onAdd}: {onAdd: ()=>void}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { showAlert } = useModal();

  const handleAdd = async (e: any) => {
    e.preventDefault();
    if (!email || !password) return;
    const res = await fetchAdmin("/api/admin/chat_users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username || undefined, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert({ title: "Success", message: `New chat user '${username || email}' created!`, style: "success" });
      setUsername("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      onAdd();
    } else {
      showAlert({ title: "Error", message: data.error || "Failed to add chat user", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleAdd} className="bg-dark-bg border border-white/10 p-5 rounded-xl space-y-4">
      <h4 className="font-bold text-lg text-white">Add New Chat Member</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Username</label>
          <input 
            type="text"
            value={username} 
            onChange={e=>setUsername(e.target.value)} 
            placeholder="Username (optional)" 
            className="w-full bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white placeholder:text-white/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Email Address</label>
          <input 
            required 
            type="email"
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            placeholder="Member Email Address" 
            className="w-full bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white placeholder:text-white/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Password</label>
          <div className="relative">
            <input 
              required 
              type={showPassword ? "text" : "password"}
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              placeholder="Password" 
              className="w-full bg-panel-bg border border-white/10 rounded pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-neon-purple text-white placeholder:text-white/20" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" className="bg-neon-purple text-white px-5 py-2 font-bold rounded hover:bg-neon-blue transition-colors text-xs uppercase tracking-widest font-black">Add User</button>
      </div>
    </form>
  );
}

function EditChatUserForm({user, onSave, onCancel}: {user: any, onSave: ()=>void, onCancel: ()=>void}) {
  const [username, setUsername] = useState(user.username || "");
  const [email, setEmail] = useState(user.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { showAlert } = useModal();

  const handleSave = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/chat_users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert({ title: "Success", message: `User '${username || email}' updated!`, style: "success" });
      onSave();
    } else {
      showAlert({ title: "Error", message: data.error || "Failed to update chat user", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 w-full text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1 text-white/60 font-semibold">Username</label>
          <input 
            required 
            type="text"
            value={username} 
            onChange={e=>setUsername(e.target.value)} 
            className="w-full bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
          />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/60 font-semibold">Email Address</label>
          <input 
            required 
            type="email"
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            className="w-full bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
          />
        </div>
      </div>
      <div>
        <label className="block text-xs uppercase mb-1 text-white/60 font-semibold">New Password (leave blank to keep current)</label>
        <div className="relative">
          <input 
            type={showPassword ? "text" : "password"}
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            placeholder="New Password" 
            className="w-full bg-panel-bg border border-white/10 rounded pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-neon-purple text-white placeholder:text-white/20" 
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white focus:outline-none"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="flex space-x-2 pt-2">
        <button type="submit" className="bg-neon-purple text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-neon-blue transition-colors">Save</button>
        <button type="button" onClick={onCancel} className="bg-white/10 text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-white/20 transition-colors">Cancel</button>
      </div>
    </form>
  );
}
