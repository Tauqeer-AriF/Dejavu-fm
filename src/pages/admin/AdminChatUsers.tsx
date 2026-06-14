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
  const { showConfirm, showAlert } = useModal();

  const load = () => fetchAdmin("/api/admin/chat_users").then(r => r.json()).then(setUsers);
  useEffect(() => { load(); }, []);

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

    const headers = ["ID", "Email", "Source", "Joined At"];
    const rows = users.map(u => [
      u.id,
      `"${(u.username || "").replace(/"/g, '""')}"`,
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
    showAlert({ title: "Exported", message: "Chat users list generated.", style: "success" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <h3 className="text-2xl font-bold">Chat Users</h3>
        <button 
          onClick={exportChatUsersToCSV}
          className="px-4 py-2 bg-white/5 hover:bg-neon-blue/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-blue"
        >
          Export CSV
        </button>
      </div>
      
      {isAdminUser && ( // Only show this form if the logged-in user is an 'admin'
        <AddChatUserForm onAdd={load} />
      )}

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-dark-bg/50 border border-white/10 p-4 rounded-xl flex flex-col">
            {editingId === u.id ? (
              <EditChatUserForm user={u} onSave={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/30 uppercase font-black tracking-widest block mb-0.5">Email</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-lg block truncate">{u.username}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-tighter ${
                      u.source === 'shoutout' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      u.source === 'admin' ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/20' :
                      'bg-neon-purple/10 text-neon-purple border-neon-purple/20'
                    }`}>{u.source || 'register'}</span>
                  </div>
                  <span className="text-xs text-white/50 mt-1 block">Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex space-x-4">
                  <button onClick={() => setEditingId(u.id)} className="text-neon-blue hover:text-white transition-colors px-2 py-1.5 text-sm">Edit</button>
                  {isAdminUser && ( // Only allow 'admin' role to delete chat users
                    <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-500 hover:text-red-400 text-sm bg-red-500/10 px-3 py-1.5 rounded transition-colors">Remove</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-white/50 text-center py-8">No chat users registered yet.</p>
        )}
      </div>
    </div>
  );
}

function AddChatUserForm({onAdd}: {onAdd: ()=>void}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showAlert } = useModal();

  const handleAdd = async (e: any) => {
    e.preventDefault();
    if (!email || !password) return;
    const res = await fetchAdmin("/api/admin/chat_users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert({ title: "Success", message: `New chat user '${email}' created!`, style: "success" });
      setEmail("");
      setPassword("");
      onAdd();
    } else {
      showAlert({ title: "Error", message: data.error || "Failed to add chat user", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleAdd} className="bg-dark-bg border border-white/10 p-4 rounded-xl space-y-4">
      <h4 className="font-bold text-lg">Add New Chat Member</h4>
      <div className="flex flex-col sm:flex-row gap-4">
        <input 
          required 
          type="email"
          value={email} 
          onChange={e=>setEmail(e.target.value)} 
          placeholder="Member Email Address" 
          className="flex-1 bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
        />
        <input 
          required 
          type="password"
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
          placeholder="Password" 
          className="flex-1 bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
        />
        <button type="submit" className="bg-neon-purple text-white px-4 py-2 font-bold rounded hover:bg-neon-blue transition-colors">Add</button>
      </div>
    </form>
  )
}

function EditChatUserForm({user, onSave, onCancel}: {user: any, onSave: ()=>void, onCancel: ()=>void}) {
  const [email, setEmail] = useState(user.username);
  const [password, setPassword] = useState("");
  const { showAlert } = useModal();

  const handleSave = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/chat_users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      showAlert({ title: "Success", message: `User '${email}' updated!`, style: "success" });
      onSave();
    } else {
      showAlert({ title: "Error", message: data.error || "Failed to update chat user", style: "danger" });
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 w-full">
      <div className="flex flex-col space-y-3">
        <div>
          <label className="block text-xs uppercase mb-1">Email Address</label>
          <input 
            required 
            type="email"
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            className="w-full bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
          />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1 text-white/70">New Password (leave blank to keep current)</label>
          <input 
            type="password"
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            placeholder="New Password" 
            className="w-full bg-panel-bg border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white" 
          />
        </div>
      </div>
      <div className="flex space-x-2">
        <button type="submit" className="bg-neon-purple text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-neon-blue transition-colors">Save</button>
        <button type="button" onClick={onCancel} className="bg-white/10 text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-white/20 transition-colors">Cancel</button>
      </div>
    </form>
  )
}
