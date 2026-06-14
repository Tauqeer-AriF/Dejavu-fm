import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { showConfirm, showAlert } = useModal();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdmin("/api/admin/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Server responded with ${res.status}`);
      }
    } catch (err) {
      setError("Failed to connect to the security server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return logs;
    return logs.filter(log => 
      (log.username || "").toLowerCase().includes(term) || 
      (log.action || "").toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  if (loading) return (
    <div className="p-16 flex flex-col items-center justify-center space-y-4">
      <div className="w-8 h-8 border-4 border-neon-purple border-t-transparent animate-spin rounded-full shadow-[0_0_15px_rgba(176,38,255,0.3)]" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Retrieving system logs...</p>
    </div>
  );

  if (error) return (
    <div className="p-12 text-center">
      <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] inline-block max-w-md">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h4 className="text-xl font-display font-black uppercase tracking-tight mb-2">Sync Error</h4>
        <p className="text-white/40 text-sm mb-6">{error}</p>
        <button onClick={load} className="px-8 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-400 transition-all shadow-lg shadow-red-500/20">
          Retry Sync
        </button>
      </div>
    </div>
  );

  const handleClearLogs = async () => {
    const confirmed = await showConfirm({
      title: "Clear Audit Logs",
      message: "Are you sure you want to permanently delete all activity logs? This action cannot be undone.",
      style: "danger",
      confirmText: "Clear All"
    });

    if (confirmed) {
      const res = await fetchAdmin("/api/admin/audit-logs", { method: "DELETE" });
      if (res.ok) {
        showAlert({ title: "Success", message: "Audit logs have been cleared.", style: "success" });
        setSearchTerm("");
        load();
      }
    }
  };

  const exportAuditLogsToCSV = () => {
    if (filteredLogs.length === 0) {
      showAlert({ title: "No Data", message: "There are no logs to export.", style: "danger" });
      return;
    }

    const headers = ["ID", "Timestamp", "User", "Role", "Action", "Resource", "Details"];
    const rows = filteredLogs.map(log => [
      log.id,
      log.timestamp ? new Date(log.timestamp).toLocaleString() : "---",
      `"${(log.username || "").replace(/"/g, '""')}"`,
      `"${(log.role || "").replace(/"/g, '""')}"`,
      `"${(log.action || "").replace(/"/g, '""')}"`,
      `"${(log.resource || "").replace(/"/g, '""')}${log.resource_id ? `:${log.resource_id}` : ''}"`,
      `"${(log.details || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dejavu_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Exported", message: "Audit logs CSV generated.", style: "success" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-4">
        <h3 className="text-2xl font-bold">Audit Logs</h3>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={load}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-white/50 hover:text-white"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-neon-purple' : ''}`} />
          </button>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text"
              placeholder="Filter by user or action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-neon-purple/50 transition-all placeholder:text-white/20"
            />
          </div>
          <button 
            onClick={exportAuditLogsToCSV}
            className="px-4 py-2.5 bg-white/5 hover:bg-neon-blue/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-blue"
          >
            Export CSV
          </button>
          <button 
            onClick={handleClearLogs}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-black uppercase text-red-500 tracking-widest rounded-xl transition-all whitespace-nowrap"
          >
            Clear Logs
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-white/40 text-[10px] uppercase font-black tracking-widest">
              <th className="p-4">Time</th>
              <th className="p-4">User</th>
              <th className="p-4">Action</th>
              <th className="p-4">Resource</th>
              <th className="p-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-dark-bg/20">
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map(log => log && (
                <tr key={log.id || Math.random()} className="text-xs hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white/50 font-mono">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "---"}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold">{log.username || "System"}</span>
                      <span className="text-[10px] text-white/30 uppercase tracking-tighter">{log.role || "task"}</span>
                    </div>
                  </td>
                  <td className="p-4"><span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] uppercase font-black">{log.action || "---"}</span></td>
                  <td className="p-4 text-neon-blue font-bold">{log.resource || "---"}{log.resource_id ? `:${log.resource_id}` : ''}</td>
                  <td className="p-4 text-white/40 truncate max-w-xs">{log.details || ""}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center opacity-30">
                  <Shield className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No activity records found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[10px] font-black uppercase tracking-widest"
          >
            Previous
          </button>
          <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">
            Page <span className="text-neon-purple">{currentPage}</span> of {totalPages}
          </div>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[10px] font-black uppercase tracking-widest"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
