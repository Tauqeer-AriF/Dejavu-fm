import React, { useState, useEffect } from "react";
import { fetchAdmin } from "./adminApi";
import { Plus, Trash2, Key, User, Lock, Shield, Check, X, AlertTriangle, Mail, Eye, EyeOff, Edit, Search, ChevronLeft, ChevronRight, Activity, Radio, Circle, Globe, Monitor, Headphones, RefreshCw, Zap, Clock, Layers, Smartphone, LogOut } from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { useLogo } from "../../hooks/useLogo";

interface AdminUser {
  username: string;
  email?: string;
  role: "admin" | "dj";
  dj_profile_id?: string;
  photo_url?: string;
  is_online?: boolean;
  current_page?: string;
  last_seen?: string;
  last_login?: string;
  socket_count?: number;
}

interface ActiveSession {
  username: string;
  email?: string;
  role: string;
  isStaff: boolean;
  currentPage: string;
  lastSeen: number;
  connectedAt: number;
  avatarUrl?: string;
  socketCount: number;
  isOnline: boolean;
  tabs?: {
    socketId: string;
    tabId: string;
    browserId: string;
    currentPage: string;
    connectedAt: number;
    lastSeen: number;
    os: string;
    browser: string;
    ipAddress: string;
  }[];
  browsers?: string[];
  devices?: string[];
  activePages?: string[];
}

interface DJProfile {
  id: string;
  name: string;
}

export function AdminUsers({ isAdminUser }: { isAdminUser: boolean }) {
  const { isLightMode } = useLogo();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [djs, setDjs] = useState<DJProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { showConfirm, showAlert } = useModal();

  // Create User state
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "dj">("dj");
  const [newDjProfileId, setNewDjProfileId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit Password state
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Edit Staff State
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffRole, setEditStaffRole] = useState<"admin" | "dj">("dj");
  const [editStaffDjProfileId, setEditStaffDjProfileId] = useState("");
  const [editStaffPass, setEditStaffPass] = useState("");
  const [showEditStaffPass, setShowEditStaffPass] = useState(false);

  // Active Presence State
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [presenceFilter, setPresenceFilter] = useState<"all" | "online" | "studio" | "dashboard">("all");
  const [activeSubTab, setActiveSubTab] = useState<"accounts" | "diagnostics">("accounts");
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);

  // Filter state
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "dj">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Bulk actions state
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);

  const filteredUsers = React.useMemo(() => {
    return users.filter(u => {
      // Role filter check
      if (roleFilter !== "all" && u.role !== roleFilter) {
        return false;
      }

      // Presence filter check
      if (presenceFilter === "online" && !u.is_online) return false;
      if (presenceFilter === "studio" && (!u.is_online || !u.current_page?.toLowerCase().includes("studio"))) return false;
      if (presenceFilter === "dashboard" && (!u.is_online || u.current_page?.toLowerCase().includes("studio"))) return false;
      
      // Search filter check
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const usernameMatch = u.username.toLowerCase().includes(query);
        const emailMatch = u.email ? u.email.toLowerCase().includes(query) : false;
        
        // Match linked DJ Profile name if exists
        const djName = u.dj_profile_id ? djs.find(d => d.id === u.dj_profile_id)?.name : "";
        const djNameMatch = djName ? djName.toLowerCase().includes(query) : false;
        
        return usernameMatch || emailMatch || djNameMatch;
      }
      
      return true;
    });
  }, [users, roleFilter, presenceFilter, searchQuery, djs]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const allOnPageSelected = React.useMemo(() => {
    return paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsernames.includes(u.username));
  }, [paginatedUsers, selectedUsernames]);

  const allFilteredSelected = React.useMemo(() => {
    return filteredUsers.length > 0 && filteredUsers.every(u => selectedUsernames.includes(u.username));
  }, [filteredUsers, selectedUsernames]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsernames([]);
  }, [users, roleFilter, searchQuery]);

  const handleBulkDelete = async () => {
    const deletable = selectedUsernames.filter(username => username.toLowerCase() !== "admin");
    if (deletable.length === 0) {
      showAlert({ title: "Operation Denied", message: "No deletable staff members selected.", style: "danger" });
      return;
    }

    const confirmed = await showConfirm({
      title: "Bulk Delete Staff Accounts?",
      message: `Are you sure you want to delete the ${deletable.length} selected staff account(s)? This action is irreversible and they will lose all booth access immediately.`,
      style: "danger",
      confirmText: "Delete All",
      cancelText: "Cancel"
    });

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetchAdmin("/api/admin/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: deletable })
      });
      if (res.ok) {
        setSuccess(`Successfully deleted ${deletable.length} staff account(s).`);
        setSelectedUsernames([]);
        loadUsers();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to delete selected staff accounts.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to complete bulk delete operation.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRoleChange = async (role: "admin" | "dj") => {
    if (selectedUsernames.length === 0) return;

    const confirmed = await showConfirm({
      title: "Bulk Change Role?",
      message: `Are you sure you want to change the role of ${selectedUsernames.length} selected user(s) to ${role === "admin" ? "Administrator" : "DJ / Presenter"}?`,
      style: "warning",
      confirmText: "Change Roles",
      cancelText: "Cancel"
    });

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetchAdmin("/api/admin/users/bulk-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: selectedUsernames, role })
      });
      if (res.ok) {
        setSuccess(`Successfully changed role to ${role === "admin" ? "Administrator" : "DJ / Presenter"} for ${selectedUsernames.length} user(s).`);
        setSelectedUsernames([]);
        loadUsers();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to update roles for selected users.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during bulk role change.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkLinkDJ = async (dj_profile_id: string | null) => {
    if (selectedUsernames.length === 0) return;

    const djName = dj_profile_id ? djs.find(d => d.id === dj_profile_id)?.name || "Selected DJ" : "None";
    const confirmed = await showConfirm({
      title: "Bulk Link DJ Profile?",
      message: `Are you sure you want to set the linked DJ profile of ${selectedUsernames.length} user(s) to '${djName}'?`,
      style: "warning",
      confirmText: "Update Links",
      cancelText: "Cancel"
    });

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetchAdmin("/api/admin/users/bulk-dj-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: selectedUsernames, dj_profile_id })
      });
      if (res.ok) {
        setSuccess(`Successfully updated DJ links for ${selectedUsernames.length} user(s).`);
        setSelectedUsernames([]);
        loadUsers();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to update DJ links for selected users.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during bulk DJ linkage.");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError("");
      const res = await fetchAdmin("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError("Failed to load staff accounts");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while loading staff accounts");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadActiveSessions = async () => {
    try {
      const res = await fetchAdmin("/api/admin/active-sessions");
      if (res.ok) {
        const data = await res.json();
        setActiveSessions(data);
      }
    } catch (e) {
      console.error("Failed to load active sessions:", e);
    }
  };

  const handleForceRefresh = async () => {
    setIsRefreshingSessions(true);
    setError("");
    setSuccess("");
    try {
      await Promise.all([
        loadActiveSessions(),
        loadUsers(true)
      ]);
      setSuccess("Session telemetry and staff listings refreshed successfully.");
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      console.error("Failed to force refresh sessions:", err);
      setError("Failed to reload session data.");
    } finally {
      setIsRefreshingSessions(false);
    }
  };

  const loadDjs = async () => {
    try {
      const res = await fetch("/api/public/djs");
      if (res.ok) {
        const data = await res.json();
        setDjs(data);
      }
    } catch (e) {
      console.error("Failed to load DJs for linkage:", e);
    }
  };

  useEffect(() => {
    loadUsers();
    loadDjs();
    loadActiveSessions();

    const socket = (window as any).socket;
    if (socket) {
      const handlePresence = (list: ActiveSession[]) => {
        if (Array.isArray(list)) {
          setActiveSessions(list);
          loadUsers(true);
        }
      };
      socket.on('presence_update', handlePresence);
      return () => {
        socket.off('presence_update', handlePresence);
      };
    }

    const interval = setInterval(() => {
      loadActiveSessions();
      loadUsers(true);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedUsername = newUsername.trim();
    const trimmedEmail = newEmail.trim();

    if (!trimmedUsername || !newPassword) {
      setError("Username and password are required");
      return;
    }

    try {
      const res = await fetchAdmin("/api/admin/users", {
        method: "POST",
        body: {
          username: trimmedUsername,
          email: trimmedEmail,
          password: newPassword,
          role: newRole,
          dj_profile_id: newDjProfileId || null,
        },
      });

      if (res.ok) {
        setSuccess(`User ${trimmedUsername} created successfully`);
        setNewUsername("");
        setNewEmail("");
        setNewPassword("");
        setNewRole("dj");
        setNewDjProfileId("");
        setIsCreating(false);
        loadUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create user");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to create user due to network or server issue");
    }
  };

  const handleUpdatePassword = async (username: string) => {
    setError("");
    setSuccess("");

    if (!editPassword) {
      setError("Password cannot be empty");
      return;
    }

    try {
      const res = await fetchAdmin(`/api/admin/users/${username}`, {
        method: "PUT",
        body: { password: editPassword },
      });

      if (res.ok) {
        setSuccess(`Password for ${username} updated successfully`);
        setEditingUsername(null);
        setEditPassword("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update password");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update password");
    }
  };

  const startEditingStaff = (user: AdminUser) => {
    setEditingStaff(user.username);
    setEditStaffEmail(user.email || "");
    setEditStaffRole(user.role);
    setEditStaffDjProfileId(user.dj_profile_id || "");
    setEditStaffPass("");
    setShowEditStaffPass(false);
  };

  const handleSaveStaffEdit = async (username: string) => {
    setError("");
    setSuccess("");

    try {
      const body: any = {
        email: editStaffEmail ? editStaffEmail.trim() : null,
        role: editStaffRole,
        dj_profile_id: editStaffDjProfileId || null,
      };
      if (editStaffPass) {
        body.password = editStaffPass;
      }

      const res = await fetchAdmin(`/api/admin/users/${username}`, {
        method: "PUT",
        body,
      });

      if (res.ok) {
        setSuccess(`Successfully updated ${username}'s staff account`);
        setEditingStaff(null);
        loadUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update staff member");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while updating staff member");
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === "admin") {
      showAlert({ title: "Operation Denied", message: "Cannot delete the primary admin account.", style: "danger" });
      return;
    }

    const confirmed = await showConfirm({
      title: "Delete Staff Member?",
      message: `Are you sure you want to delete ${username}? This action is irreversible and they will lose all booth access immediately.`,
      style: "danger",
      confirmText: "Delete Account",
      cancelText: "Keep User"
    });

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const res = await fetchAdmin(`/api/admin/users/${username}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccess(`User ${username} deleted successfully`);
        loadUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete user");
    }
  };

  const formatRelativeTime = (isoString: string | null | undefined) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Filter active sessions to ONLY include staff users (role admin or dj, i.e. isStaff is true)
  const staffSessions = activeSessions.filter(s => s.isStaff);
  const onlineStaff = staffSessions;
  const onlineStaffCount = staffSessions.length;

  // Real-time precise counts across all active staff sessions
  const totalTabsCount = staffSessions.reduce((acc, s) => acc + (s.tabs?.length || s.socketCount || 1), 0);
  
  const allBrowserIds = new Set<string>();
  const allDevices = new Set<string>();
  
  staffSessions.forEach(s => {
    if (s.browsers && s.browsers.length > 0) {
      s.browsers.forEach(b => allBrowserIds.add(b));
    } else if (s.tabs && s.tabs.length > 0) {
      s.tabs.forEach(t => allBrowserIds.add(t.browserId));
    } else {
      allBrowserIds.add('browser_' + s.username);
    }
    
    if (s.devices && s.devices.length > 0) {
      s.devices.forEach(d => d && d !== 'Unknown OS' && allDevices.add(d));
    } else if (s.tabs && s.tabs.length > 0) {
      s.tabs.forEach(t => t.os && t.os !== 'Unknown OS' && allDevices.add(t.os));
    } else {
      allDevices.add('Desktop');
    }
  });

  const totalBrowsersCount = allBrowserIds.size || staffSessions.length;
  const totalDevicesCount = allDevices.size || 1;
  const totalSessionsCount = staffSessions.length;

  const inStudioCount = staffSessions.filter(s => 
    s.currentPage.toLowerCase().includes("studio") || 
    s.activePages?.some(p => p.toLowerCase().includes("studio"))
  ).length;

  const inDashboardCount = onlineStaffCount - inStudioCount;

  const handleKillSession = async (socketId: string, username: string) => {
    const confirmed = await showConfirm({
      title: "Terminate Remote Connection?",
      message: `Are you sure you want to forcefully disconnect this specific browser tab session for @${username}? The client tab will be disconnected instantly.`,
      style: "danger",
      confirmText: "Kill Session",
      cancelText: "Cancel"
    });

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const res = await fetchAdmin("/api/admin/kill-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socketId })
      });

      if (res.ok) {
        setSuccess(`Successfully terminated connection session ${socketId} for @${username}`);
        loadActiveSessions();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to terminate connection session");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while terminating session");
    }
  };

  const toggleUserExpanded = (username: string) => {
    setExpandedUsers(prev => 
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  return (
    <div className="space-y-8" id="admin-users-panel">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-display font-black tracking-tight uppercase ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            Staff & <span className="text-neon-purple">Admin Accounts</span>
          </h2>
          <p className={`text-sm mt-1 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Manage permissions, credentials, and access roles for DJ booth and Admin panel.
          </p>
        </div>

        {activeSubTab === "accounts" && !isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-neon-purple text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-neon-blue transition-all shadow-lg shadow-neon-purple/20 self-start md:self-auto"
            id="btn-add-staff"
          >
            <Plus className="w-4 h-4" /> Add Staff Account
          </button>
        )}
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex border-b border-black/10 dark:border-white/10 pb-px">
        <button
          onClick={() => setActiveSubTab("accounts")}
          className={`px-6 py-3 font-bold uppercase tracking-widest text-xs border-b-2 transition-all ${
            activeSubTab === "accounts"
              ? "border-neon-purple text-neon-purple font-black"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          Staff Accounts List
        </button>
        <button
          onClick={() => setActiveSubTab("diagnostics")}
          className={`px-6 py-3 font-bold uppercase tracking-widest text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "diagnostics"
              ? "border-neon-purple text-neon-purple font-black"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5 animate-pulse" /> Active Sessions Diagnostics
        </button>
      </div>

      {/* Live Presence Dashboard Overview */}
      {activeSubTab === "accounts" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Online Staff */}
          <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all ${
            isLightMode ? 'bg-white border-black/15 shadow-sm' : 'glass-panel border-white/10'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center relative">
              <Radio className="w-6 h-6 animate-pulse" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
            </div>
            <div>
              <div className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Staff Online Now</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{onlineStaffCount}</span>
                <span className={`text-[10px] font-bold ${isLightMode ? 'text-emerald-600' : 'text-emerald-400'}`}>Active Sessions</span>
              </div>
            </div>
          </div>

          {/* Currently in Live Studio */}
          <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all ${
            isLightMode ? 'bg-white border-black/15 shadow-sm' : 'glass-panel border-white/10'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-neon-purple/10 text-neon-purple flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>In Live Studio</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{inStudioCount}</span>
                <span className={`text-[10px] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Broadcasting/Chatting</span>
              </div>
            </div>
          </div>

          {/* Currently in Dashboard */}
          <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all ${
            isLightMode ? 'bg-white border-black/15 shadow-sm' : 'glass-panel border-white/10'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-neon-blue/10 text-neon-blue flex items-center justify-center">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>In Other Panels</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{inDashboardCount}</span>
                <span className={`text-[10px] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Managing Settings</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Online Users Activity Ticker */}
      {activeSubTab === "accounts" && onlineStaffCount > 0 && (
        <div className={`p-4 rounded-2xl border transition-all ${
          isLightMode ? 'bg-emerald-50/40 border-emerald-200/50' : 'bg-emerald-500/[0.02] border-emerald-500/10'
        }`}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-800' : 'text-white/80'}`}>Active Workspace Feeds</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {onlineStaff.map(session => (
              <div 
                key={session.username}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  isLightMode 
                    ? 'bg-white border-black/10 text-slate-800 shadow-xs' 
                    : 'bg-black/30 border-white/5 text-white/90'
                }`}
              >
                <img 
                  src={session.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.username}`} 
                  alt={session.username} 
                  className="w-5 h-5 rounded-lg bg-neon-purple/20"
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col">
                  <span className="font-bold flex items-center gap-1">
                    @{session.username}
                    <span className="text-[9px] px-1 bg-neon-blue/15 text-neon-blue rounded font-black uppercase">
                      {session.role}
                    </span>
                  </span>
                  <span className={`text-[9px] font-medium leading-none mt-0.5 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                    {session.currentPage} {session.socketCount > 1 ? `(${session.socketCount} tabs)` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Banners */}
      {error && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm border ${isLightMode ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm border ${isLightMode ? 'bg-green-50 border-green-200 text-green-600' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {activeSubTab === "accounts" ? (
        <>
          {/* Creation Form */}
      {isCreating && (
        <div className={`p-6 md:p-8 rounded-3xl border space-y-6 ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'glass-panel border-white/10'}`}>
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
              Create New Staff Member
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className={`transition-colors ${isLightMode ? 'text-black/40 hover:text-black' : 'text-white/40 hover:text-white'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  Username / Call Sign
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:border-neon-purple focus:outline-none transition-all ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900 placeholder-black/40' : 'bg-black/40 border-white/10 text-white placeholder-white/30'}`}
                    placeholder="e.g. djsarah"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:border-neon-purple focus:outline-none transition-all ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900 placeholder-black/40' : 'bg-black/40 border-white/10 text-white placeholder-white/30'}`}
                    placeholder="admin@dejavufm.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  Initial Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full border rounded-xl pl-10 pr-12 py-3 focus:border-neon-purple focus:outline-none transition-all ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900 placeholder-black/40' : 'bg-black/40 border-white/10 text-white placeholder-white/30'}`}
                    placeholder="Min 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${isLightMode ? 'text-black/40 hover:text-black' : 'text-white/30 hover:text-white'}`}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  System Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "dj")}
                  className={`w-full border rounded-xl px-4 py-3 focus:border-neon-purple focus:outline-none transition-all ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'}`}
                >
                  <option value="dj" className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>DJ / Presenter</option>
                  <option value="admin" className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>Administrator</option>
                </select>
              </div>

              <div>
                <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                  Linked Public DJ Profile
                </label>
                <select
                  value={newDjProfileId}
                  onChange={(e) => setNewDjProfileId(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 focus:border-neon-purple focus:outline-none transition-all ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'}`}
                >
                  <option value="" className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>-- None / Not a DJ --</option>
                  {djs.map((dj) => (
                    <option key={dj.id} value={dj.id} className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>
                      {dj.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="w-full md:w-auto px-8 py-3 bg-neon-purple hover:bg-neon-blue text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-neon-purple/20"
              >
                Create Staff Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Staff List */}
      <div className={`overflow-hidden rounded-3xl border ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'glass-panel border-white/10'}`}>
        <div className={`px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${isLightMode ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/[0.02]'}`}>
          <h3 className={`text-xs uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Active Staff List ({filteredUsers.length})
          </h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Real-time Search Input */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
              <input 
                type="text"
                placeholder="Search name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`text-xs border rounded-xl pl-9 pr-8 py-1.5 outline-none focus:border-neon-purple focus:outline-none transition-all ${
                  isLightMode ? 'bg-black/5 border-black/15 text-slate-900 placeholder-black/40' : 'bg-black/40 border-white/10 text-white placeholder-white/30'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
                    isLightMode ? 'text-black/40 hover:text-black' : 'text-white/30 hover:text-white'
                  }`}
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "all" | "admin" | "dj")}
                className={`text-xs border rounded-xl px-3 py-1.5 outline-none transition-all ${
                  isLightMode ? 'bg-white border-black/15 text-slate-900' : 'bg-[#121212] border-white/10 text-white'
                }`}
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrators</option>
                <option value="dj">DJs / Presenters</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Status:</span>
              <select
                value={presenceFilter}
                onChange={(e) => setPresenceFilter(e.target.value as any)}
                className={`text-xs border rounded-xl px-3 py-1.5 outline-none transition-all ${
                  isLightMode ? 'bg-white border-black/15 text-slate-900' : 'bg-[#121212] border-white/10 text-white'
                }`}
              >
                <option value="all">All Statuses</option>
                <option value="online">Online Now</option>
                <option value="studio">In Live Studio</option>
                <option value="dashboard">In Other Panels</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Control Bar */}
        {!loading && users.length > 0 && (
          <div className={`px-6 py-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs ${
            isLightMode ? 'bg-black/[0.01] border-black/10' : 'bg-white/[0.01] border-white/10'
          }`}>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsernames.includes(u.username))}
                ref={el => {
                  if (el) {
                    const someSelected = paginatedUsers.some(u => selectedUsernames.includes(u.username));
                    const allSelected = paginatedUsers.every(u => selectedUsernames.includes(u.username));
                    el.indeterminate = someSelected && !allSelected;
                  }
                }}
                onChange={(e) => {
                  if (e.target.checked) {
                    const newSelected = Array.from(new Set([...selectedUsernames, ...paginatedUsers.map(u => u.username)]));
                    setSelectedUsernames(newSelected);
                  } else {
                    const paginatedUsernames = paginatedUsers.map(u => u.username);
                    setSelectedUsernames(selectedUsernames.filter(un => !paginatedUsernames.includes(un)));
                  }
                }}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-neon-purple focus:ring-neon-purple cursor-pointer accent-neon-purple"
              />
              <span className={`font-semibold ${isLightMode ? 'text-slate-700' : 'text-white/70'}`}>
                {selectedUsernames.length > 0 
                  ? `${selectedUsernames.length} staff member(s) selected` 
                  : "Select staff members for bulk actions"
                }
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedUsernames.length > 0 ? (
                <>
                  {/* Bulk Role Change */}
                  <div className="flex items-center gap-1.5">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkRoleChange(e.target.value as "admin" | "dj");
                          e.target.value = ""; // Reset
                        }
                      }}
                      defaultValue=""
                      className={`text-xs border rounded-xl px-3 py-1.5 outline-none transition-all ${
                        isLightMode ? 'bg-white border-black/15 text-slate-900' : 'bg-[#121212] border-white/10 text-white'
                      }`}
                    >
                      <option value="">-- Change Role --</option>
                      <option value="admin">Administrator</option>
                      <option value="dj">DJ / Presenter</option>
                    </select>
                  </div>

                  {/* Bulk Link DJ Profile */}
                  <div className="flex items-center gap-1.5">
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "UNLINK") {
                          handleBulkLinkDJ(null);
                          e.target.value = ""; // Reset
                        } else if (val) {
                          handleBulkLinkDJ(val);
                          e.target.value = ""; // Reset
                        }
                      }}
                      defaultValue=""
                      className={`text-xs border rounded-xl px-3 py-1.5 outline-none transition-all ${
                        isLightMode ? 'bg-white border-black/15 text-slate-900' : 'bg-[#121212] border-white/10 text-white'
                      }`}
                    >
                      <option value="">-- Link DJ Profile --</option>
                      <option value="UNLINK">-- Unlink DJ --</option>
                      {djs.map((dj) => (
                        <option key={dj.id} value={dj.id}>
                          {dj.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bulk Delete Button */}
                  {isAdminUser && (
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Bulk Delete
                    </button>
                  )}

                  {/* Clear Selection */}
                  <button
                    onClick={() => setSelectedUsernames([])}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                      isLightMode ? 'bg-black/5 hover:bg-black/10 text-black/50' : 'bg-white/5 hover:bg-white/10 text-white/50'
                    }`}
                  >
                    Clear
                  </button>
                </>
              ) : (
                <span className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>
                  Select checkboxes below to act on multiple staff members
                </span>
              )}
            </div>
          </div>
        )}

        {/* Dynamic select-all-pages banner */}
        {!loading && allOnPageSelected && filteredUsers.length > paginatedUsers.length && (
          <div 
            className={`px-6 py-3 border-b text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
              isLightMode 
                ? 'bg-neon-purple/5 border-black/10 text-slate-800' 
                : 'bg-neon-purple/10 border-white/10 text-white/80'
            }`}
          >
            <span>
              {allFilteredSelected ? (
                <>All <strong>{filteredUsers.length}</strong> staff members across all pages are selected.</>
              ) : (
                <>All <strong>{paginatedUsers.length}</strong> staff members on this page are selected.</>
              )}
            </span>
            {allFilteredSelected ? (
              <button 
                onClick={() => {
                  const paginatedUsernames = paginatedUsers.map(u => u.username);
                  setSelectedUsernames(paginatedUsernames);
                }}
                className="text-neon-purple hover:underline font-bold uppercase tracking-wider text-[10px] transition-colors"
              >
                Select only current page
              </button>
            ) : (
              <button 
                onClick={() => {
                  setSelectedUsernames(filteredUsers.map(u => u.username));
                }}
                className="text-neon-purple hover:underline font-bold uppercase tracking-wider text-[10px] transition-colors"
              >
                Select all {filteredUsers.length} staff members across all pages
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className={`p-12 text-center ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
            <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading accounts...
          </div>
        ) : users.length === 0 ? (
          <div className={`p-12 text-center ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>No staff accounts found.</div>
        ) : filteredUsers.length === 0 ? (
          <div className={`p-12 text-center ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>No staff accounts matching this filter.</div>
        ) : (
          <div className={`divide-y ${isLightMode ? 'divide-black/10' : 'divide-white/10'}`}>
            {paginatedUsers.map((user) => (
              <div
                key={user.username}
                className={`p-6 flex flex-col transition-all ${isLightMode ? 'hover:bg-black/[0.01]' : 'hover:bg-white/[0.01]'}`}
              >
                {editingStaff === user.username ? (
                  <div className="space-y-4 w-full" id={`edit-staff-${user.username}`}>
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                        <Edit className="w-4 h-4 text-neon-purple" /> Editing Staff Member: <span className="text-neon-purple">{user.username}</span>
                      </h4>
                      <button
                        onClick={() => setEditingStaff(null)}
                        className={`p-1.5 rounded-lg transition-colors ${isLightMode ? 'text-black/40 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Email Field */}
                      <div>
                        <label className={`block text-[10px] uppercase font-black tracking-widest mb-1.5 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                          <input
                            type="email"
                            value={editStaffEmail}
                            onChange={(e) => setEditStaffEmail(e.target.value)}
                            className={`w-full text-xs border rounded-xl pl-9 pr-3 py-2.5 focus:border-neon-purple focus:outline-none transition-all ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900 placeholder-black/40' : 'bg-black/40 border-white/10 text-white placeholder-white/30'}`}
                            placeholder="Email Address"
                          />
                        </div>
                      </div>

                      {/* Role Field */}
                      <div>
                        <label className={`block text-[10px] uppercase font-black tracking-widest mb-1.5 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                          System Role
                        </label>
                        <select
                          value={editStaffRole}
                          onChange={(e) => setEditStaffRole(e.target.value as "admin" | "dj")}
                          disabled={user.username === "admin"}
                          className={`w-full text-xs border rounded-xl px-3 py-2.5 focus:border-neon-purple focus:outline-none transition-all disabled:opacity-50 ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'}`}
                        >
                          <option value="dj" className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>DJ / Presenter</option>
                          <option value="admin" className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>Administrator</option>
                        </select>
                      </div>

                      {/* Linked DJ Profile Field */}
                      <div>
                        <label className={`block text-[10px] uppercase font-black tracking-widest mb-1.5 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                          Linked DJ Profile
                        </label>
                        <select
                          value={editStaffDjProfileId}
                          onChange={(e) => setEditStaffDjProfileId(e.target.value)}
                          className={`w-full text-xs border rounded-xl px-3 py-2.5 focus:border-neon-purple focus:outline-none transition-all ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'}`}
                        >
                          <option value="" className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>-- None / Not a DJ --</option>
                          {djs.map((dj) => (
                            <option key={dj.id} value={dj.id} className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>
                              {dj.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Password Field */}
                      <div>
                        <label className={`block text-[10px] uppercase font-black tracking-widest mb-1.5 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>
                          New Password (Optional)
                        </label>
                        <div className="relative">
                          <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLightMode ? 'text-black/40' : 'text-white/30'}`} />
                          <input
                            type={showEditStaffPass ? "text" : "password"}
                            value={editStaffPass}
                            onChange={(e) => setEditStaffPass(e.target.value)}
                            placeholder="Leave blank to keep current"
                            className={`w-full text-xs border rounded-xl pl-9 pr-8 py-2.5 focus:border-neon-purple focus:outline-none transition-all ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900 placeholder-black/40' : 'bg-black/40 border-white/10 text-white placeholder-white/30'}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditStaffPass(!showEditStaffPass)}
                            className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${isLightMode ? 'text-black/40 hover:text-black' : 'text-white/30 hover:text-white'}`}
                          >
                            {showEditStaffPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => setEditingStaff(null)}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isLightMode ? 'bg-black/5 hover:bg-black/10 text-slate-800' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveStaffEdit(user.username)}
                        className="px-4 py-2 bg-neon-purple hover:bg-neon-blue text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                    {/* Checkbox + User Info Container */}
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedUsernames.includes(user.username)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsernames([...selectedUsernames, user.username]);
                          } else {
                            setSelectedUsernames(selectedUsernames.filter(username => username !== user.username));
                          }
                        }}
                        className={`w-4 h-4 rounded text-neon-purple focus:ring-neon-purple cursor-pointer accent-neon-purple ${
                          isLightMode ? 'border-black/20 bg-black/5' : 'border-white/20 bg-white/5'
                        }`}
                      />

                      <div className="flex items-center gap-4 flex-1">
                        <div className="relative">
                          {user.photo_url ? (
                            <img 
                              src={user.photo_url} 
                              alt={user.username} 
                              className="w-12 h-12 rounded-2xl object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLightMode ? 'bg-black/5 text-black/60' : 'bg-white/5 text-white/60'}`}>
                              <User className="w-6 h-6" />
                            </div>
                          )}
                          {user.is_online ? (
                            <span className={`absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 ${
                              isLightMode ? 'border-white bg-slate-100' : 'border-[#1e1e1e] bg-[#121212]'
                            }`}>
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping absolute" />
                              <span className="h-2 w-2 rounded-full bg-emerald-500 relative" />
                            </span>
                          ) : (
                            <span className={`absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 ${
                              isLightMode ? 'border-white bg-slate-100' : 'border-[#1e1e1e] bg-[#121212]'
                            }`}>
                              <span className="h-2 w-2 rounded-full bg-slate-500 relative" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold flex flex-wrap items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                            {user.username}
                            {user.username === "admin" && (
                              <span className="text-[10px] uppercase font-black tracking-widest bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded-full">
                                Primary
                              </span>
                            )}
                            {user.is_online ? (
                              <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                Online
                              </span>
                            ) : (
                              <span className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                isLightMode ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-white/40'
                              }`}>
                                Offline
                              </span>
                            )}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-xs inline-flex items-center gap-1.5 capitalize px-2.5 py-0.5 rounded-full ${isLightMode ? 'bg-black/5 text-black/60' : 'bg-white/5 text-white/60'}`}>
                              <Shield className="w-3 h-3 text-neon-blue" />
                              {user.role === "admin" ? "Administrator" : "DJ / Presenter"}
                            </span>
                            {user.email && (
                              <span className={`text-xs inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${isLightMode ? 'bg-black/5 text-black/60' : 'bg-white/5 text-white/60'}`}>
                                <Mail className="w-3 h-3 text-neon-purple" />
                                {user.email}
                              </span>
                            )}
                            {user.dj_profile_id && (
                              <span className={`text-xs inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${isLightMode ? 'bg-black/5 text-black/60' : 'bg-white/5 text-white/60'}`}>
                                <User className="w-3 h-3 text-neon-blue" />
                                Linked DJ: {djs.find(d => d.id === user.dj_profile_id)?.name || "Unknown DJ"}
                              </span>
                            )}
                          </div>

                          {/* Presence Details row */}
                          <div className="flex flex-wrap items-center gap-4 mt-2.5 pt-2 border-t border-dashed border-white/5">
                            {user.is_online ? (
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-bold text-emerald-400 flex items-center gap-1">
                                  <Monitor className="w-3.5 h-3.5 animate-pulse" /> Active Location:
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${
                                  isLightMode ? 'bg-neon-purple/5 text-neon-purple' : 'bg-neon-purple/15 text-neon-purple'
                                }`}>
                                  {user.current_page || "Dashboard Overview"}
                                </span>
                                {user.socket_count > 1 && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    isLightMode ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-white/40'
                                  }`}>
                                    {user.socket_count} active tabs
                                  </span>
                                )}
                              </div>
                            ) : (
                              user.last_seen && (
                                <div className={`text-xs flex items-center gap-1.5 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Last seen {formatRelativeTime(user.last_seen)}</span>
                                  {user.current_page && user.current_page !== 'Offline' && (
                                    <span className="opacity-80">on {user.current_page}</span>
                                  )}
                                </div>
                              )
                            )}

                            {user.last_login && (
                              <div className={`text-xs flex items-center gap-1.5 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>
                                <Globe className="w-3.5 h-3.5" />
                                <span>Last login: {new Date(user.last_login).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => startEditingStaff(user)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${isLightMode ? 'bg-black/5 hover:bg-black/10 text-slate-800' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                      >
                        <Edit className="w-3.5 h-3.5 text-neon-blue" /> Edit Account
                      </button>

                      {editingUsername === user.username ? (
                        <div className={`flex items-center gap-2 border p-1.5 rounded-xl ${isLightMode ? 'bg-black/5 border-black/15' : 'bg-black/40 border-white/10'}`}>
                          <div className="relative w-44">
                            <input
                              type={showEditPassword ? "text" : "password"}
                              placeholder="New Password"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              className={`bg-transparent text-sm pl-3 pr-8 py-1.5 outline-none focus:outline-none w-full ${isLightMode ? 'text-slate-900 placeholder-black/40' : 'text-white placeholder-white/30'}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPassword(!showEditPassword)}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${isLightMode ? 'text-black/40 hover:text-black' : 'text-white/30 hover:text-white'}`}
                            >
                              {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <button
                            onClick={() => handleUpdatePassword(user.username)}
                            className={`p-2 rounded-lg transition-all ${isLightMode ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                            title="Save Password"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUsername(null);
                              setEditPassword("");
                              setShowEditPassword(false);
                            }}
                            className={`p-2 rounded-lg transition-all ${isLightMode ? 'bg-black/5 text-black/40 hover:bg-black/10' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingUsername(user.username)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${isLightMode ? 'bg-black/5 hover:bg-black/10 text-slate-800' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                        >
                          <Key className={`w-3.5 h-3.5 ${isLightMode ? 'text-black/40' : 'text-white/40'}`} /> Reset Password
                        </button>
                      )}

                      {user.username !== "admin" && (
                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
                          title="Delete Staff Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-xl border disabled:opacity-30 disabled:cursor-not-allowed transition-all ${
              isLightMode
                ? "border-black/10 bg-black/5 hover:bg-black/10 text-slate-800"
                : "border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? "text-slate-600" : "text-white/40"}`}>
            Page <span className="text-neon-purple">{currentPage}</span> of {totalPages}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-xl border disabled:opacity-30 disabled:cursor-not-allowed transition-all ${
              isLightMode
                ? "border-black/10 bg-black/5 hover:bg-black/10 text-slate-800"
                : "border-white/10 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
        </>
      ) : (
        <div className="space-y-6" id="session-diagnostics-panel">
          {/* Diagnostics Analytics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Active Tabs */}
            <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all ${
              isLightMode ? 'bg-white border-black/15 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center relative">
                <Layers className="w-6 h-6 animate-pulse" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full" />
              </div>
              <div>
                <div className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Active Tabs</div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{totalTabsCount}</span>
                  <span className={`text-[9px] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Tabs Open</span>
                </div>
              </div>
            </div>

            {/* Browsers Connected */}
            <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all ${
              isLightMode ? 'bg-white border-black/15 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Open Browsers</div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{totalBrowsersCount}</span>
                  <span className={`text-[9px] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Clients</span>
                </div>
              </div>
            </div>

            {/* Online Devices */}
            <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all ${
              isLightMode ? 'bg-white border-black/15 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Devices Online</div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{totalDevicesCount}</span>
                  <span className={`text-[9px] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Platforms</span>
                </div>
              </div>
            </div>

            {/* Active Sessions/Accounts */}
            <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-all ${
              isLightMode ? 'bg-white border-black/15 shadow-sm' : 'glass-panel border-white/10'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Online Users</div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{totalSessionsCount}</span>
                  <span className={`text-[9px] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Accounts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sessions Diagnostic Details Container */}
          <div className={`p-6 md:p-8 rounded-3xl border space-y-6 ${
            isLightMode ? 'bg-white border-black/10 shadow-sm' : 'glass-panel border-white/10'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className={`text-lg font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  Real-Time Session Telemetry
                </h3>
                <p className={`text-xs mt-0.5 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                  Trace browser tabs, devices, active locations, and disconnect connections in real-time.
                </p>
              </div>
              <button
                onClick={handleForceRefresh}
                disabled={isRefreshingSessions}
                className={`inline-flex items-center gap-1.5 px-4 py-2 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSessions ? "animate-spin text-neon-blue" : ""}`} />
                {isRefreshingSessions ? "Refreshing..." : "Force Refresh"}
              </button>
            </div>

            {staffSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-500/5 flex items-center justify-center text-slate-400">
                  <Activity className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">No Active Staff Remote Connections</h4>
                  <p className="text-xs text-slate-500 dark:text-white/40 max-w-md mt-1">
                    No staff members (Admins or DJs) are currently connected via real-time session sockets to the workspace.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {staffSessions.map((session) => {
                  const isExpanded = expandedUsers.includes(session.username);
                  const isUserInStudio = session.currentPage.toLowerCase().includes("studio") || session.activePages?.some(p => p.toLowerCase().includes("studio"));
                  const isUserStaff = session.isStaff;

                  return (
                    <div 
                      key={session.username}
                      className={`border rounded-2xl transition-all overflow-hidden ${
                        isLightMode 
                          ? 'bg-slate-50/50 border-black/10 hover:border-black/20' 
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                    >
                      {/* Connection Header Row */}
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={session.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.username}`} 
                            alt={session.username} 
                            className="w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/20"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                                @{session.username}
                              </span>
                              {isUserStaff && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-neon-purple/15 text-neon-purple border border-neon-purple/20 rounded font-black uppercase">
                                  {session.role}
                                </span>
                              )}
                              {!isUserStaff && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-neon-blue/15 text-neon-blue border border-neon-blue/20 rounded font-black uppercase">
                                  Listener
                                </span>
                              )}
                              {isUserInStudio && (
                                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-red-500/15 text-red-500 border border-red-500/20 rounded font-black uppercase animate-pulse">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                  Broadcasting
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] mt-0.5">
                              <span className={isLightMode ? 'text-black/50' : 'text-white/40'}>
                                Active on: <span className="font-semibold text-neon-blue">{session.currentPage}</span>
                              </span>
                              <span className={`w-1 h-1 rounded-full ${isLightMode ? 'bg-black/15' : 'bg-white/10'}`} />
                              <span className={isLightMode ? 'text-black/50' : 'text-white/40'}>
                                {session.tabs?.length || session.socketCount || 1} Open {session.socketCount === 1 ? 'Tab' : 'Tabs'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Connection Header Action */}
                        <div className="flex items-center gap-3 self-end md:self-auto">
                          <div className="text-right hidden sm:block">
                            <div className={`text-[9px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Session Created</div>
                            <div className={`text-xs font-semibold ${isLightMode ? 'text-slate-800' : 'text-white/80'}`}>
                              {new Date(session.connectedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => toggleUserExpanded(session.username)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                              isExpanded 
                                ? (isLightMode ? 'bg-black/10 text-slate-800' : 'bg-white/10 text-white')
                                : 'bg-neon-purple text-white shadow-sm hover:bg-neon-blue'
                            }`}
                          >
                            {isExpanded ? 'Hide Tabs' : 'Inspect Tabs'}
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Tabs breakdown */}
                      {isExpanded && (
                        <div className={`border-t p-4 space-y-3 ${
                          isLightMode ? 'bg-slate-100/40 border-black/5' : 'bg-black/20 border-white/5'
                        }`}>
                          <div className={`text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/30'} px-1 mb-2`}>
                            Active Tabs / Remote Connection Sockets
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {(session.tabs || []).map((tab, idx) => {
                              const tabDurationFormatted = formatRelativeTime(new Date(tab.connectedAt).toISOString());
                              
                              return (
                                <div 
                                  key={tab.socketId || idx}
                                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                    isLightMode 
                                      ? 'bg-white border-black/10 shadow-xs' 
                                      : 'bg-black/40 border-white/5 hover:border-white/10'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-neon-blue/10 text-neon-blue flex items-center justify-center mt-0.5 flex-shrink-0">
                                      <Layers className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${isLightMode ? 'text-slate-800' : 'text-white'}`}>
                                          {tab.currentPage}
                                        </span>
                                        <span className={`text-[9px] px-1.5 py-0.2 bg-black/5 dark:bg-white/5 rounded text-slate-500 dark:text-white/40 font-semibold`}>
                                          {tab.browser} on {tab.os}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-3 text-[11px] text-slate-400 dark:text-white/40 flex-wrap">
                                        <span className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-white/50">
                                          <Globe className="w-3 h-3" /> {tab.ipAddress}
                                        </span>
                                        <span className={`w-1 h-1 rounded-full bg-slate-500/20`} />
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="w-3 h-3" /> Connected {tabDurationFormatted}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleKillSession(tab.socketId, session.username)}
                                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all self-end sm:self-auto"
                                    title="Force Close Connection Socket"
                                  >
                                    <LogOut className="w-3.5 h-3.5" /> Close Tab
                                  </button>
                                </div>
                              );
                            })}
                            
                            {(!session.tabs || session.tabs.length === 0) && (
                              <div className={`p-3 rounded-xl text-xs text-center ${isLightMode ? 'bg-white border text-black/50' : 'bg-black/30 border-white/5 text-white/40'}`}>
                                No tab telemetry available for this legacy session. Open a new tab to see full diagnostics.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
