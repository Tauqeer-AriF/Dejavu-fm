import React, { useState, useEffect } from "react";
import { fetchAdmin } from "./adminApi";
import { Plus, Trash2, Key, User, Lock, Shield, Check, X, AlertTriangle, Mail, Eye, EyeOff } from "lucide-react";
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
        <div className={`px-6 py-4 border-b ${isLightMode ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/[0.02]'}`}>
          <h3 className={`text-xs uppercase font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Active Staff List ({users.length})
          </h3>
        </div>

        {loading ? (
          <div className={`p-12 text-center ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
            <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading accounts...
          </div>
        ) : users.length === 0 ? (
          <div className={`p-12 text-center ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>No staff accounts found.</div>
        ) : (
          <div className={`divide-y ${isLightMode ? 'divide-black/10' : 'divide-white/10'}`}>
            {users.map((user) => (
              <div
                key={user.username}
                className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${isLightMode ? 'hover:bg-black/[0.01]' : 'hover:bg-white/[0.01]'}`}
              >
                {/* User Info */}
                <div className="flex items-center gap-4">
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

                {/* Account Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 mr-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Link DJ:</span>
                    <select
                      value={user.dj_profile_id || ""}
                      onChange={async (e) => {
                        const newId = e.target.value || null;
                        try {
                          setError("");
                          setSuccess("");
                          const res = await fetchAdmin(`/api/admin/users/${user.username}`, {
                            method: "PUT",
                            body: { dj_profile_id: newId }
                          });
                          if (res.ok) {
                            setSuccess(`Successfully updated DJ profile link for ${user.username}`);
                            loadUsers();
                          } else {
                            setError("Failed to update DJ profile link");
                          }
                        } catch (err) {
                          setError("Failed to update link");
                        }
                      }}
                      className={`text-xs border rounded-xl px-3 py-1.5 outline-none transition-all ${isLightMode ? 'bg-black/5 border-black/15 text-slate-900' : 'bg-black/40 border-white/10 text-white'}`}
                    >
                      <option value="" className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>-- None --</option>
                      {djs.map((dj) => (
                        <option key={dj.id} value={dj.id} className={isLightMode ? "bg-white text-slate-900" : "bg-[#121212] text-white"}>
                          {dj.name}
                        </option>
                      ))}
                    </select>
                  </div>

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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
