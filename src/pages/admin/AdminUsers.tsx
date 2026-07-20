import React, { useState, useEffect } from "react";
import { fetchAdmin } from "./adminApi";
import { Plus, Trash2, Key, User, Lock, Shield, Check, X, AlertTriangle, Mail, Eye, EyeOff, Edit, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useModal } from "../../context/ModalContext";
import { useLogo } from "../../hooks/useLogo";

interface AdminUser {
  username: string;
  email?: string;
  role: "admin" | "dj";
  dj_profile_id?: string;
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

  // Filter state
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "dj">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Bulk actions state
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);

  const filteredUsers = React.useMemo(() => {
    return users.filter(u => {
      // Role filter check
      if (roleFilter !== "all" && u.role !== roleFilter) {
        return false;
      }
      
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
  }, [users, roleFilter, searchQuery, djs]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsernames([]);
  }, [users, roleFilter, searchQuery]);

  useEffect(() => {
    setSelectedUsernames([]);
  }, [currentPage]);

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
      let successCount = 0;
      let failCount = 0;

      for (const username of deletable) {
        try {
          const res = await fetchAdmin(`/api/admin/users/${username}`, {
            method: "DELETE"
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          failCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully deleted ${successCount} staff account(s).${failCount > 0 ? ` Failed to delete ${failCount} account(s).` : ""}`);
      } else if (failCount > 0) {
        setError(`Failed to delete selected staff accounts.`);
      }
      setSelectedUsernames([]);
      loadUsers();
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
      let successCount = 0;
      let failCount = 0;

      for (const username of selectedUsernames) {
        try {
          const res = await fetchAdmin(`/api/admin/users/${username}`, {
            method: "PUT",
            body: { role }
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          failCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully changed role to ${role === "admin" ? "Administrator" : "DJ / Presenter"} for ${successCount} user(s).${failCount > 0 ? ` Failed for ${failCount} user(s).` : ""}`);
      } else if (failCount > 0) {
        setError(`Failed to update roles for selected users.`);
      }
      setSelectedUsernames([]);
      loadUsers();
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
      let successCount = 0;
      let failCount = 0;

      for (const username of selectedUsernames) {
        try {
          const res = await fetchAdmin(`/api/admin/users/${username}`, {
            method: "PUT",
            body: { dj_profile_id }
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          failCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully updated DJ links for ${successCount} user(s).${failCount > 0 ? ` Failed for ${failCount} user(s).` : ""}`);
      } else if (failCount > 0) {
        setError(`Failed to update DJ links for selected users.`);
      }
      setSelectedUsernames([]);
      loadUsers();
    } catch (err) {
      console.error(err);
      setError("An error occurred during bulk DJ linkage.");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-neon-purple text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-neon-blue transition-all shadow-lg shadow-neon-purple/20 self-start md:self-auto"
            id="btn-add-staff"
          >
            <Plus className="w-4 h-4" /> Add Staff Account
          </button>
        )}
      </div>

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
                checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUsernames.includes(u.username))}
                ref={el => {
                  if (el) {
                    const someSelected = filteredUsers.some(u => selectedUsernames.includes(u.username));
                    const allSelected = filteredUsers.every(u => selectedUsernames.includes(u.username));
                    el.indeterminate = someSelected && !allSelected;
                  }
                }}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedUsernames(filteredUsers.map(u => u.username));
                  } else {
                    setSelectedUsernames([]);
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
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLightMode ? 'bg-black/5 text-black/60' : 'bg-white/5 text-white/60'}`}>
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                            {user.username}
                            {user.username === "admin" && (
                              <span className="text-[10px] uppercase font-black tracking-widest bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded-full">
                                Primary
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
    </div>
  );
}
