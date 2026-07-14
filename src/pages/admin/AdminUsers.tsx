import React, { useState, useEffect } from "react";
import { fetchAdmin } from "./adminApi";
import { Plus, Trash2, Key, User, Lock, Shield, Check, X, AlertTriangle, Mail, Eye, EyeOff } from "lucide-react";
import { useModal } from "../../context/ModalContext";

interface AdminUser {
  username: string;
  email?: string;
  role: "admin" | "dj";
}

export function AdminUsers({ isAdminUser }: { isAdminUser: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { showConfirm, showAlert } = useModal();

  // Create User state
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "dj">("dj");
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

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newUsername || !newPassword) {
      setError("Username and password are required");
      return;
    }

    try {
      const res = await fetchAdmin("/api/admin/users", {
        method: "POST",
        body: {
          username: newUsername,
          email: newEmail,
          password: newPassword,
          role: newRole,
        },
      });

      if (res.ok) {
        setSuccess(`User ${newUsername} created successfully`);
        setNewUsername("");
        setNewEmail("");
        setNewPassword("");
        setNewRole("dj");
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
          <h2 className="text-3xl font-display font-black tracking-tight text-white uppercase">
            Staff & <span className="text-neon-purple">Admin Accounts</span>
          </h2>
          <p className="text-white/40 text-sm mt-1">
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
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl flex items-center gap-3 text-sm">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Creation Form */}
      {isCreating && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              Create New Staff Member
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-2">
                  Username / Call Sign
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-all"
                    placeholder="e.g. djsarah"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-all"
                    placeholder="admin@dejavufm.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-2">
                  Initial Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white focus:border-neon-purple focus:outline-none transition-all"
                    placeholder="Min 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-2">
                  System Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "dj")}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-all"
                >
                  <option value="dj" className="bg-[#121212]">DJ / Presenter</option>
                  <option value="admin" className="bg-[#121212]">Administrator</option>
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
      <div className="glass-panel overflow-hidden rounded-3xl border border-white/10">
        <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <h3 className="text-xs uppercase font-black tracking-widest text-white/40">
            Active Staff List ({users.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-white/40">
            <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-white/40">No staff accounts found.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {users.map((user) => (
              <div
                key={user.username}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all"
              >
                {/* User Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/60">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      {user.username}
                      {user.username === "admin" && (
                        <span className="text-[10px] uppercase font-black tracking-widest bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs inline-flex items-center gap-1.5 capitalize px-2.5 py-0.5 bg-white/5 text-white/60 rounded-full">
                        <Shield className="w-3 h-3 text-neon-blue" />
                        {user.role === "admin" ? "Administrator" : "DJ / Presenter"}
                      </span>
                      {user.email && (
                        <span className="text-xs inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/5 text-white/60 rounded-full">
                          <Mail className="w-3 h-3 text-neon-purple" />
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {editingUsername === user.username ? (
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1.5 rounded-xl">
                      <div className="relative w-44">
                        <input
                          type={showEditPassword ? "text" : "password"}
                          placeholder="New Password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="bg-transparent text-sm text-white pl-3 pr-8 py-1.5 outline-none focus:outline-none w-full"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors focus:outline-none"
                        >
                          {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleUpdatePassword(user.username)}
                        className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all"
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
                        className="p-2 bg-white/5 text-white/40 hover:bg-white/10 rounded-lg transition-all"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingUsername(user.username)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                    >
                      <Key className="w-3.5 h-3.5 text-white/40" /> Reset Password
                    </button>
                  )}

                  {user.username !== "admin" && (
                    <button
                      onClick={() => handleDeleteUser(user.username)}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
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
