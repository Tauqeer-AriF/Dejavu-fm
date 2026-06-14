import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminUsers({ isAdminUser }: { isAdminUser: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("dj"); // Default to 'dj'
  const [changePasswordUser, setChangePasswordUser] = useState("");
  const [changePasswordVal, setChangePasswordVal] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const { showConfirm, showAlert } = useModal();

  const load = () => {
    fetchAdmin("/api/admin/users").then(r=>r.json()).then(setUsers);
    fetchAdmin("/api/admin/settings/secret").then(r=>r.json()).then(d => {
      setAdminSecret(d.secret || "waynee");
    });
  };

  useEffect(() => { load(); }, []);

  const handleUpdateSecret = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/settings/secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: adminSecret })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: "Secret door answer updated!", style: "success" });
    } else {
      showAlert({ title: "Error", message: "Failed to update secret", style: "danger" });
    }
  };

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newUserRole })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: `Admin user '${newUsername}' created!`, style: "success" });
      setNewUsername(""); setNewPassword(""); load();
    } else {
      const data = await res.json();
      showAlert({ title: "Error", message: data.error, style: "danger" });
    }
  };

  const handleChangePassword = async (e: any, username: string) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/users/${username}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({password: changePasswordVal})
    });
    if (res.ok) {
      setChangePasswordUser(""); setChangePasswordVal(""); 
      showAlert({ title: "Success", message: "Password changed!", style: "success" });
    } else {
      const data = await res.json();
      showAlert({ title: "Error", message: data.error, style: "danger" });
    }
  };

  const handleDeleteUser = async (username: string) => {
    const confirmed = await showConfirm({
      title: "Delete User",
      message: `Are you sure you want to delete user ${username}?`,
      style: "danger",
      confirmText: "Delete"
    });
    if (confirmed) {
      const res = await fetchAdmin(`/api/admin/users/${username}`, { method: "DELETE" });
      if (res.ok) {
        showAlert({ title: "Success", message: `User '${username}' deleted.`, style: "success" });
        load();
      } else {
        const data = await res.json();
        showAlert({ title: "Error", message: data.error, style: "danger" });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <h3 className="text-2xl font-bold">Manage Users</h3>
        <div className="bg-neon-purple/10 border border-neon-purple/20 px-4 py-2 rounded-xl flex items-center space-x-3">
          <Shield className="w-4 h-4 text-neon-purple" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-tighter text-neon-purple">Security Door</span>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Active Shield</span>
          </div>
        </div>
      </div>

      <div className="bg-dark-bg/50 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <h4 className="text-lg font-bold flex items-center space-x-2">
            <Ghost className="w-5 h-5 text-neon-purple" />
            <span>Secret Door Challenge</span>
          </h4>
          <p className="text-sm text-white/40">This sets the required answer to the question "What's your name?" when clicking the settings icon in the header.</p>
        </div>
        
        <form onSubmit={handleUpdateSecret} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-2 ml-1">Answer Key</label>
            <input 
              value={adminSecret} 
              onChange={e => setAdminSecret(e.target.value)} 
              className="w-full bg-panel-bg border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-neon-purple text-white font-medium" 
              placeholder="e.g. waynee or your name"
            />
          </div>
          <button className="bg-white text-dark-bg px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform shrink-0">
            Update Secret
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {users.map(u => (
          <div key={u.username} className="bg-dark-bg border border-white/10 p-4 rounded-xl flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{u.username}</span>
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">{u.role}</span>
              </div>
              <div className="flex space-x-4">
                <button onClick={() => setChangePasswordUser(changePasswordUser === u.username ? "" : u.username)} className="text-neon-blue hover:text-white transition-colors text-sm px-2 py-1">Change Password</button>
                {u.username !== "admin" && (
                  <button onClick={() => handleDeleteUser(u.username)} className="text-red-500 hover:text-red-400 text-sm px-2 py-1">Delete</button>
                )}
              </div>
            </div>
            {changePasswordUser === u.username && (
              <form onSubmit={e => handleChangePassword(e, u.username)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mt-2">
                <input type="password" placeholder="New Password" value={changePasswordVal} onChange={e => setChangePasswordVal(e.target.value)} required className="flex-1 bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-neon-purple" />
                <button className="bg-neon-purple text-white px-4 py-1.5 rounded text-sm hover:bg-neon-blue transition-colors">Update</button>
              </form>
            )}
          </div>
        ))}
      </div>

      {isAdminUser && ( // Only show this form if the logged-in user is an 'admin'
        <form onSubmit={handleAddUser} className="bg-dark-bg/50 p-6 rounded-xl border border-white/5 space-y-4 max-w-xl">
          <h4 className="font-bold">Add New Admin User</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-1">Username</label>
              <input required value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple" />
            </div>
            <div>
              <label className="block text-xs uppercase mb-1">Password</label>
              <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple" />
            </div>
            <div className="col-span-full">
              <label className="block text-xs uppercase mb-1">Role</label>
              <select
                required
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value)}
                className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple"
              >
                <option value="dj">DJ</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button className="bg-neon-blue text-dark-bg px-4 py-2 font-bold rounded mt-4">Add User</button>
        </form>
      )}
      {!isAdminUser && (
        <div className="py-16 text-center bg-dark-bg/50 border border-white/10 rounded-2xl">
          <Shield className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 uppercase tracking-widest text-xs font-black">Only 'admin' role users can manage admin accounts.</p>
        </div>
      )}
    </div>
  );
}
