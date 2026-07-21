import React, { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { 
  LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, 
  MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, 
  Shield, FileText, Image as ImageIcon, Plus, Search, Upload, Download, ChevronLeft, ChevronRight, 
  RefreshCw, Sparkles, UserX, ShieldAlert, ArrowRight, Ban, CheckCircle, AlertTriangle, Filter, Lock, Unlock
} from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminChatUsers({ isAdminUser }: { isAdminUser: boolean }) {
  const [activeTab, setActiveTab] = useState<'users' | 'blocks'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showBannedOnly, setShowBannedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [blockSearchTerm, setBlockSearchTerm] = useState("");
  const [blockFilterUser, setBlockFilterUser] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [blockPage, setBlockPage] = useState(1);
  const itemsPerPage = 10;
  const { showConfirm, showAlert } = useModal();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);

  const loadUsers = () => fetchAdmin("/api/admin/chat_users").then(r => r.json()).then(data => setUsers(Array.isArray(data) ? data : []));
  const loadBlocks = () => fetchAdmin("/api/admin/user_blocks").then(r => r.json()).then(data => setBlocks(Array.isArray(data) ? data : []));

  const loadAll = () => {
    loadUsers();
    loadBlocks();
  };

  useEffect(() => {
    loadAll();

    const socket = (window as any).socket;
    if (socket) {
      const handleBlockUpdate = () => {
        loadAll();
      };
      socket.on('user_blocked_update', handleBlockUpdate);
      return () => {
        socket.off('user_blocked_update', handleBlockUpdate);
      };
    }
  }, []);

  // Filter Users
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

  const allOnPageSelected = useMemo(() => {
    return paginatedUsers.length > 0 && paginatedUsers.every(u => selectedIds.includes(u.id));
  }, [paginatedUsers, selectedIds]);

  const allFilteredSelected = useMemo(() => {
    return filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.includes(u.id));
  }, [filteredUsers, selectedIds]);

  // Filter Blocks
  const filteredBlocks = useMemo(() => {
    let result = blocks;
    if (blockFilterUser) {
      const target = blockFilterUser.toLowerCase().trim();
      result = result.filter(b => 
        (b.blocker || "").toLowerCase() === target ||
        (b.blocked || "").toLowerCase() === target
      );
    }
    if (blockSearchTerm.trim()) {
      const term = blockSearchTerm.toLowerCase().trim();
      result = result.filter(b => 
        (b.blocker || "").toLowerCase().includes(term) ||
        (b.blocked || "").toLowerCase().includes(term) ||
        (b.reason || "").toLowerCase().includes(term) ||
        (b.blocker_email || "").toLowerCase().includes(term) ||
        (b.blocked_email || "").toLowerCase().includes(term)
      );
    }
    return result;
  }, [blocks, blockFilterUser, blockSearchTerm]);

  const totalBlockPages = Math.ceil(filteredBlocks.length / itemsPerPage);
  const paginatedBlocks = useMemo(() => {
    const start = (blockPage - 1) * itemsPerPage;
    return filteredBlocks.slice(start, start + itemsPerPage);
  }, [filteredBlocks, blockPage]);

  // Block Stats
  const totalBlockedRelationships = blocks.length;
  const mostBlockedUser = useMemo(() => {
    if (!blocks.length) return null;
    const counts: Record<string, number> = {};
    blocks.forEach(b => {
      counts[b.blocked] = (counts[b.blocked] || 0) + 1;
    });
    let topUser = "";
    let max = 0;
    Object.entries(counts).forEach(([user, count]) => {
      if (count > max) {
        max = count;
        topUser = user;
      }
    });
    return topUser ? { username: topUser, count: max } : null;
  }, [blocks]);

  useEffect(() => { 
    setCurrentPage(1); 
    setSelectedIds([]);
  }, [searchTerm, showBannedOnly]);

  useEffect(() => {
    setBlockPage(1);
    setSelectedBlockIds([]);
  }, [blockSearchTerm, blockFilterUser]);

  const handleDeleteUser = async (id: number, username: string) => {
    const confirmed = await showConfirm({
      title: "Remove Chat User",
      message: `Are you sure you want to remove the chat user '@${username}'?`,
      style: "danger",
      confirmText: "Remove"
    });
    if (confirmed) {
      await fetchAdmin(`/api/admin/chat_users/${id}`, { method: "DELETE" });
      setSelectedIds(prev => prev.filter(item => item !== id));
      loadAll();
    }
  };

  const handleToggleBan = async (user: any, ban: boolean) => {
    try {
      const endpoint = ban ? "/api/admin/chat_users/ban" : "/api/admin/chat_users/unban";
      const res = await fetchAdmin(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.username })
      });
      if (res.ok) {
        showAlert({
          title: ban ? "User Banned" : "User Unbanned",
          message: `Successfully ${ban ? 'banned' : 'unbanned'} '@${user.username}'.`,
          style: "success"
        });
        loadAll();
      } else {
        const err = await res.json();
        showAlert({ title: "Error", message: err.error || "Action failed", style: "danger" });
      }
    } catch (e) {
      showAlert({ title: "Error", message: "Network error occurred", style: "danger" });
    }
  };

  const handleUnblock = async (id: number, blocker: string, blocked: string) => {
    const confirmed = await showConfirm({
      title: "Unblock User Relationship",
      message: `Are you sure you want to unblock '@${blocked}' for blocker '@${blocker}'? Both users will be able to message each other again.`,
      style: "warning",
      confirmText: "Unblock User"
    });
    if (!confirmed) return;

    try {
      const res = await fetchAdmin("/api/admin/user_blocks/unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, blocker, blocked })
      });
      if (res.ok) {
        showAlert({
          title: "User Unblocked",
          message: `Successfully unblocked '@${blocked}' for '@${blocker}'.`,
          style: "success"
        });
        loadAll();
      } else {
        const err = await res.json();
        showAlert({ title: "Error", message: err.error || "Unblock failed", style: "danger" });
      }
    } catch (e) {
      showAlert({ title: "Error", message: "Network error during unblock", style: "danger" });
    }
  };

  const handleBulkUnblock = async () => {
    if (selectedBlockIds.length === 0) return;
    const confirmed = await showConfirm({
      title: "Bulk Unblock Selected Relationships",
      message: `Are you sure you want to unblock the ${selectedBlockIds.length} selected user block relationship(s)?`,
      style: "warning",
      confirmText: "Unblock All Selected"
    });
    if (!confirmed) return;

    try {
      const res = await fetchAdmin("/api/admin/user_blocks/bulk-unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedBlockIds })
      });
      if (res.ok) {
        showAlert({
          title: "Bulk Unblock Complete",
          message: `${selectedBlockIds.length} block relationship(s) removed successfully.`,
          style: "success"
        });
        setSelectedBlockIds([]);
        loadAll();
      } else {
        const err = await res.json();
        showAlert({ title: "Error", message: err.error || "Bulk unblock failed", style: "danger" });
      }
    } catch (e) {
      showAlert({ title: "Error", message: "Failed to perform bulk unblock", style: "danger" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await showConfirm({
      title: "Bulk Delete Users",
      message: `Are you sure you want to permanently delete the ${selectedIds.length} selected chat users?`,
      style: "danger",
      confirmText: "Delete All"
    });
    if (!confirmed) return;

    try {
      const res = await fetchAdmin("/api/admin/chat_users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        showAlert({ title: "Deleted", message: `${selectedIds.length} users removed successfully.`, style: "success" });
        setSelectedIds([]);
        loadAll();
      } else {
        const err = await res.json();
        showAlert({ title: "Error", message: err.error || "Deletions failed.", style: "danger" });
      }
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to perform bulk deletion.", style: "danger" });
    }
  };

  const handleBulkBan = async (ban: boolean) => {
    if (selectedIds.length === 0) return;
    const actionText = ban ? "ban" : "unban";
    const confirmed = await showConfirm({
      title: `Bulk ${ban ? 'Ban' : 'Unban'} Users`,
      message: `Are you sure you want to ${actionText} the ${selectedIds.length} selected chat users?`,
      style: "warning",
      confirmText: ban ? "Ban All" : "Unban All"
    });
    if (!confirmed) return;

    try {
      const usersToActOn = users.filter(u => selectedIds.includes(u.id));
      const usernames = usersToActOn.map(u => u.username);

      const res = await fetchAdmin("/api/admin/chat_users/bulk-ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames, ban })
      });
      if (res.ok) {
        showAlert({ title: "Success", message: `${selectedIds.length} users ${ban ? 'banned' : 'unbanned'} successfully.`, style: "success" });
        setSelectedIds([]);
        loadAll();
      } else {
        const err = await res.json();
        showAlert({ title: "Error", message: err.error || "Status updates failed.", style: "danger" });
      }
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to perform bulk status updates.", style: "danger" });
    }
  };

  const exportChatUsersToCSV = () => {
    if (users.length === 0) {
      showAlert({ title: "No Data", message: "There are no chat users to export.", style: "danger" });
      return;
    }

    const headers = ["ID", "Username", "Email", "Password", "Source", "Is Banned", "Blocked Count", "Blocked By Count", "Joined At"];
    const rows = users.map(u => [
      u.id,
      `"${(u.username || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"${(u.password_plain || "").replace(/"/g, '""')}"`,
      u.source || 'register',
      u.is_banned ? "Yes" : "No",
      u.blocked_count || 0,
      u.blocked_by_count || 0,
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
    showAlert({ title: "Exported", message: "Chat users list generated with complete credentials and block metrics.", style: "success" });
  };

  const inspectUserBlocks = (username: string) => {
    setActiveTab('blocks');
    setBlockFilterUser(username);
    setBlockSearchTerm("");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Bar */}
      <div className="border-b border-white/10 pb-4 space-y-3">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-neon-purple" />
            Chat Users & Moderation
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Manage registered chat members, user credentials, ban status, and user-to-user blocks.
          </p>
        </div>

        <div className="flex items-center justify-end flex-wrap gap-2.5">
          <button 
            onClick={() => setShowAddBlockModal(true)}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-red-400 flex items-center gap-2"
          >
            <UserX className="w-3.5 h-3.5" />
            Block Pair
          </button>

          <button 
            onClick={exportChatUsersToCSV} 
            className="px-4 py-2 bg-white/5 hover:bg-neon-blue/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-blue flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <div className="relative group/import">
            <input 
              type="file" 
              accept=".csv" 
              className={`absolute inset-0 opacity-0 ${importing ? "pointer-events-none cursor-not-allowed" : "cursor-pointer"} z-10`}
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                setImporting(true);
                setImportProgress(0);
                const formData = new FormData();
                formData.append('csv', file);
                
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/api/admin/chat_users/import");
                
                const token = localStorage.getItem("admin_token");
                if (token) {
                  xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                }
                
                xhr.upload.addEventListener("progress", (event) => {
                  if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    setImportProgress(percent);
                  }
                });
                
                xhr.addEventListener("load", () => {
                  setImporting(false);
                  setImportProgress(0);
                  try {
                    const responseData = JSON.parse(xhr.responseText);
                    if (xhr.status >= 200 && xhr.status < 300) {
                      showAlert({ title: "Import Successful", message: `Imported ${responseData.count || 0} users successfully.`, style: "success" });
                      loadAll();
                    } else {
                      showAlert({ title: "Import Failed", message: responseData.error || "Failed to import users.", style: "danger" });
                    }
                  } catch (err) {
                    showAlert({ title: "Import Failed", message: "Failed to parse import response.", style: "danger" });
                  }
                });
                
                xhr.addEventListener("error", () => {
                  setImporting(false);
                  setImportProgress(0);
                  showAlert({ title: "Import Failed", message: "Network error during import.", style: "danger" });
                });
                
                xhr.send(formData);
                e.target.value = '';
              }}
            />
            <button 
              disabled={importing}
              className={`px-4 py-2 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-purple flex items-center gap-2 ${
                importing ? "opacity-50 cursor-not-allowed" : "hover:bg-neon-purple/20"
              }`}
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-neon-purple" />
                  {importProgress < 100 ? `Uploading (${importProgress}%)` : "Processing..."}
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3" />
                  Import CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Total Members</span>
            <span className="text-2xl font-black text-white">{users.length}</span>
          </div>
          <div className="p-2.5 bg-neon-purple/10 border border-neon-purple/20 rounded-xl text-neon-purple">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Banned Accounts</span>
            <span className="text-2xl font-black text-red-400">{users.filter(u => u.is_banned === 1).length}</span>
          </div>
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <Ban className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Blocked Pairs</span>
            <span className="text-2xl font-black text-amber-400">{totalBlockedRelationships}</span>
          </div>
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block truncate">Most Blocked</span>
            <span className="text-sm font-bold text-white block truncate">
              {mostBlockedUser ? `@${mostBlockedUser.username}` : 'None'}
            </span>
            {mostBlockedUser && (
              <span className="text-[9px] text-amber-400/80 font-mono block">({mostBlockedUser.count} blocks)</span>
            )}
          </div>
          <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-neon-purple text-white bg-white/5 rounded-t-xl'
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <Users className="w-4 h-4" />
          Chat Users Directory
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white font-mono">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('blocks')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'blocks'
              ? 'border-red-500 text-white bg-white/5 rounded-t-xl'
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
        >
          <UserX className="w-4 h-4 text-red-400" />
          Who Blocked Whom
          {totalBlockedRelationships > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400 font-mono border border-red-500/30">
              {totalBlockedRelationships}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: USER DIRECTORY VIEW */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {isAdminUser && (
            <AddChatUserForm onAdd={loadAll} />
          )}

          {/* Bulk Actions Control Bar */}
          <div className="space-y-2">
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedIds.includes(u.id))}
                    ref={el => {
                      if (el) {
                        const someSelected = paginatedUsers.some(u => selectedIds.includes(u.id));
                        const allSelected = paginatedUsers.every(u => selectedIds.includes(u.id));
                        el.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newSelected = Array.from(new Set([...selectedIds, ...paginatedUsers.map(u => u.id)]));
                        setSelectedIds(newSelected);
                      } else {
                        const paginatedIds = paginatedUsers.map(u => u.id);
                        setSelectedIds(selectedIds.filter(id => !paginatedIds.includes(id)));
                      }
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-neon-purple focus:ring-neon-purple cursor-pointer accent-neon-purple"
                  />
                  <span className="font-semibold text-white/70">
                    {selectedIds.length > 0 
                      ? `${selectedIds.length} user(s) selected` 
                      : "Select users for bulk actions"
                    }
                  </span>
                </div>

                <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={showBannedOnly} onChange={e => setShowBannedOnly(e.target.checked)} className="sr-only peer" />
                    <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:bg-red-500/50 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white/40 rounded-full peer-checked:left-6 peer-checked:bg-red-500 transition-all"></div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">Banned Only</span>
                </label>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.length > 0 ? (
                  <>
                    <button
                      onClick={() => handleBulkBan(true)}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                    >
                      Bulk Ban
                    </button>
                    <button
                      onClick={() => handleBulkBan(false)}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                    >
                      Bulk Unban
                    </button>
                    {isAdminUser && (
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                      >
                        Bulk Delete
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedIds([])}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Select user checkboxes below</span>
                )}
              </div>
            </div>

            <AnimatePresence>
              {allOnPageSelected && filteredUsers.length > paginatedUsers.length && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-neon-purple/10 border border-neon-purple/20 p-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 overflow-hidden"
                >
                  <span className="text-white/80">
                    {allFilteredSelected ? (
                      <>All <strong>{filteredUsers.length}</strong> users across all pages are selected.</>
                    ) : (
                      <>All <strong>{paginatedUsers.length}</strong> users on this page are selected.</>
                    )}
                  </span>
                  {allFilteredSelected ? (
                    <button 
                      onClick={() => {
                        const paginatedIds = paginatedUsers.map(u => u.id);
                        setSelectedIds(paginatedIds);
                      }}
                      className="text-neon-blue hover:text-neon-blue/80 font-bold uppercase tracking-wider text-[10px] transition-colors"
                    >
                      Select only current page
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setSelectedIds(filteredUsers.map(u => u.id));
                      }}
                      className="text-neon-blue hover:text-neon-blue/80 font-bold uppercase tracking-wider text-[10px] transition-colors"
                    >
                      Select all {filteredUsers.length} users across all pages
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text"
              placeholder="Search chat users by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-xs focus:outline-none focus:border-neon-purple/50 transition-all placeholder:text-white/20 text-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User Cards List */}
          <div className="space-y-3">
            {paginatedUsers.map(u => (
              <div key={u.id} className="bg-dark-bg/50 border border-white/10 p-4 rounded-xl flex flex-col transition-all hover:border-white/20">
                {editingId === u.id ? (
                  <EditChatUserForm user={u} onSave={() => { setEditingId(null); loadAll(); }} onCancel={() => setEditingId(null)} />
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="pt-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, u.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== u.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-neon-purple focus:ring-neon-purple cursor-pointer accent-neon-purple"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
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
                            <span className="text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-tighter bg-red-500/10 text-red-500 border-red-500/20 flex items-center gap-1">
                              <Ban className="w-2.5 h-2.5" />
                              Banned
                            </span>
                          )}

                          {/* Block Badges */}
                          {u.blocked_count > 0 && (
                            <button
                              type="button"
                              onClick={() => inspectUserBlocks(u.username)}
                              className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-tighter bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/30 transition-all flex items-center gap-1"
                              title={`Click to view the ${u.blocked_count} users @${u.username} blocked`}
                            >
                              <UserX className="w-2.5 h-2.5" />
                              Blocked {u.blocked_count} user{u.blocked_count > 1 ? 's' : ''}
                            </button>
                          )}

                          {u.blocked_by_count > 0 && (
                            <button
                              type="button"
                              onClick={() => inspectUserBlocks(u.username)}
                              className="text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-tighter bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/30 transition-all flex items-center gap-1"
                              title={`Click to view the ${u.blocked_by_count} users who blocked @${u.username}`}
                            >
                              <ShieldAlert className="w-2.5 h-2.5" />
                              Blocked by {u.blocked_by_count} user{u.blocked_by_count > 1 ? 's' : ''}
                            </button>
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

                      <div className="flex space-x-2 items-center self-end sm:self-start shrink-0">
                        {u.is_banned === 1 ? (
                          <button onClick={() => handleToggleBan(u, false)} className="text-emerald-500 hover:text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors">Unban</button>
                        ) : (
                          <button onClick={() => handleToggleBan(u, true)} className="text-amber-500 hover:text-amber-400 text-xs font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-colors">Ban</button>
                        )}
                        <button onClick={() => setEditingId(u.id)} className="text-neon-blue hover:text-white transition-colors px-3 py-1.5 text-xs font-bold bg-white/5 rounded-lg border border-white/10">Edit</button>
                        {isAdminUser && (
                          <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-500 hover:text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors">Remove</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                <Users className="w-8 h-8 text-white/20 mx-auto" />
                <p className="text-white/50 text-sm">
                  {searchTerm ? `No users matching "${searchTerm}" found.` : (showBannedOnly ? "No banned users found." : "No chat users registered yet.")}
                </p>
              </div>
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
      )}

      {/* TAB 2: BLOCK MATRIX VIEW (WHO BLOCKED WHOM & UNBLOCK) */}
      {activeTab === 'blocks' && (
        <div className="space-y-6">
          {/* Active Filter Pill */}
          {blockFilterUser && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Filter className="w-4 h-4" />
                <span>Showing block relationships involving <strong>@{blockFilterUser}</strong></span>
              </div>
              <button
                onClick={() => setBlockFilterUser(null)}
                className="text-amber-400 hover:text-white text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear Filter
              </button>
            </div>
          )}

          {/* Search & Bulk Control Bar for Blocks */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                type="text"
                placeholder="Search by blocker, blocked user, or reason..."
                value={blockSearchTerm}
                onChange={(e) => setBlockSearchTerm(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2 pl-9 pr-9 text-xs focus:outline-none focus:border-red-500/50 transition-all placeholder:text-white/20 text-white"
              />
              {blockSearchTerm && (
                <button
                  type="button"
                  onClick={() => setBlockSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedBlockIds.length > 0 ? (
                <>
                  <button
                    onClick={handleBulkUnblock}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Unblock ({selectedBlockIds.length}) Selected
                  </button>
                  <button
                    onClick={() => setSelectedBlockIds([])}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">
                  Select rows to bulk unblock
                </span>
              )}
            </div>
          </div>

          {/* Block Matrix Table / Cards */}
          <div className="space-y-3">
            {paginatedBlocks.map(b => (
              <div 
                key={b.id}
                className="bg-dark-bg/60 border border-white/10 hover:border-red-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedBlockIds.includes(b.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBlockIds([...selectedBlockIds, b.id]);
                      } else {
                        setSelectedBlockIds(selectedBlockIds.filter(id => id !== b.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-red-500 focus:ring-red-500 cursor-pointer accent-red-500"
                  />

                  {/* Blocker User Card */}
                  <div className="min-w-0 flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0">
                      {b.blocker ? b.blocker.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-amber-400 font-black uppercase tracking-widest block">Blocker (Who Blocked)</span>
                      <span className="font-bold text-sm text-white block truncate">@{b.blocker}</span>
                      {b.blocker_email && (
                        <span className="text-[10px] text-white/40 font-mono block truncate">{b.blocker_email}</span>
                      )}
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex flex-col items-center justify-center px-1 text-red-400/80 shrink-0">
                    <span className="text-[8px] font-black uppercase tracking-tighter text-red-400/80 block">BLOCKED</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  {/* Blocked User Card */}
                  <div className="min-w-0 flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-300 font-bold text-xs shrink-0">
                      {b.blocked ? b.blocked.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-red-400 font-black uppercase tracking-widest block">Blocked User</span>
                      <span className="font-bold text-sm text-white block truncate">@{b.blocked}</span>
                      {b.blocked_email && (
                        <span className="text-[10px] text-white/40 font-mono block truncate">{b.blocked_email}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason & Date + Action */}
                <div className="flex flex-wrap sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 min-w-[180px] border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0 w-full sm:w-auto">
                  <div className="text-left sm:text-right space-y-0.5">
                    <span className="text-[9px] text-white/40 font-mono block">
                      Reason: <strong className="text-white/80">{b.reason || 'User initiated block'}</strong>
                    </span>
                    <span className="text-[9px] text-white/30 font-mono block">
                      Date: {new Date(b.created_at).toLocaleDateString()} {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <button
                    onClick={() => handleUnblock(b.id, b.blocker, b.blocked)}
                    className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Unblock Pair
                  </button>
                </div>
              </div>
            ))}

            {filteredBlocks.length === 0 && (
              <div className="text-center py-12 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400/40 mx-auto" />
                <p className="text-white/60 font-semibold text-sm">No Active User Blocks Found</p>
                <p className="text-white/40 text-xs max-w-sm mx-auto">
                  {blockSearchTerm || blockFilterUser
                    ? "No block records match your current search filters."
                    : "All chat users can currently message each other freely."}
                </p>
              </div>
            )}
          </div>

          {totalBlockPages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-4">
              <button onClick={() => setBlockPage(prev => Math.max(prev - 1, 1))} disabled={blockPage === 1} className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white/50 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
              <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">Page <span className="text-red-400">{blockPage}</span> of {totalBlockPages}</div>
              <button onClick={() => setBlockPage(prev => Math.min(prev + 1, totalBlockPages))} disabled={blockPage === totalBlockPages} className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white/50 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADMIN MANUAL CREATE BLOCK */}
      {showAddBlockModal && (
        <AddBlockModal 
          users={users}
          onClose={() => setShowAddBlockModal(false)}
          onSuccess={() => {
            setShowAddBlockModal(false);
            loadAll();
          }}
        />
      )}
    </div>
  );
}

function AddBlockModal({ users, onClose, onSuccess }: { users: any[], onClose: () => void, onSuccess: () => void }) {
  const [blocker, setBlocker] = useState("");
  const [blocked, setBlocked] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { showAlert } = useModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blocker || !blocked) {
      showAlert({ title: "Validation Error", message: "Please specify both blocker and blocked usernames.", style: "danger" });
      return;
    }
    if (blocker.trim().toLowerCase() === blocked.trim().toLowerCase()) {
      showAlert({ title: "Validation Error", message: "A user cannot block themselves.", style: "danger" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/user_blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocker, blocked, reason })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        showAlert({ title: "Block Recorded", message: `Block created: '@${blocker}' ➔ '@${blocked}'.`, style: "success" });
        onSuccess();
      } else {
        showAlert({ title: "Error", message: data.error || "Failed to create block record", style: "danger" });
      }
    } catch (err) {
      setLoading(false);
      showAlert({ title: "Error", message: "Network failure while creating block record", style: "danger" });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-dark-bg border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <UserX className="w-5 h-5 text-red-400" />
            <h4 className="font-bold text-lg text-white">Add Manual User Block</h4>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
              Blocker Username (Who is blocking)
            </label>
            <div className="space-y-1">
              {users.length > 0 && (
                <select
                  value={users.some(u => u.username === blocker) ? blocker : ""}
                  onChange={e => { if (e.target.value) setBlocker(e.target.value); }}
                  className="w-full bg-panel-bg border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 text-white font-mono"
                >
                  <option value="" className="bg-dark-bg text-white/50">-- Select Registered User ({users.length}) --</option>
                  {users.map(u => (
                    <option key={u.id || u.username} value={u.username} className="bg-dark-bg text-white">
                      @{u.username} ({u.email})
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                required
                value={blocker}
                onChange={e => setBlocker(e.target.value)}
                placeholder="Or type username directly..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-red-500 text-white placeholder:text-white/20 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
              Blocked Username (Target user being blocked)
            </label>
            <div className="space-y-1">
              {users.length > 0 && (
                <select
                  value={users.some(u => u.username === blocked) ? blocked : ""}
                  onChange={e => { if (e.target.value) setBlocked(e.target.value); }}
                  className="w-full bg-panel-bg border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 text-white font-mono"
                >
                  <option value="" className="bg-dark-bg text-white/50">-- Select Registered User ({users.length}) --</option>
                  {users.map(u => (
                    <option key={u.id || u.username} value={u.username} className="bg-dark-bg text-white">
                      @{u.username} ({u.email})
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                required
                value={blocked}
                onChange={e => setBlocked(e.target.value)}
                placeholder="Or type username directly..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-red-500 text-white placeholder:text-white/20 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
              Block Reason / Administrative Note
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Offensive messages in private chat / User safety request"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500 text-white placeholder:text-white/20 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
              Create Block Pair
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
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
