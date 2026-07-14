import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

import { useLogo } from "../../hooks/useLogo";

export function AdminAuditLogs() {
  const { isLightMode } = useLogo();
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
    <div className={`space-y-8 pb-12 animate-in fade-in duration-500 ${isLightMode ? 'text-black' : 'text-white'}`}>
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-8 transition-colors gap-6 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <div>
          <h3 className={`text-2xl sm:text-3xl font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Audit <span className="text-neon-purple">Vault</span></h3>
          <p className={`text-[10px] mt-1 uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Cryptographic activity & security records</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={load}
            className={`p-3 rounded-xl transition-all border ${
              isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
            }`}
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-neon-purple' : ''}`} />
          </button>
          
          <button 
            onClick={exportAuditLogsToCSV}
            className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              isLightMode ? 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue hover:bg-neon-blue hover:text-white' : 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue hover:bg-neon-blue hover:text-dark-bg'
            }`}
          >
            Export
          </button>
          <button 
            onClick={handleClearLogs}
            className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              isLightMode ? 'bg-red-50 border-red-100 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
            }`}
          >
            Purge All
          </button>
        </div>
      </div>

      <div className="relative group">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isLightMode ? 'text-black/30 group-focus-within:text-neon-purple' : 'text-white/30 group-focus-within:text-neon-purple'}`} />
        <input 
          type="text"
          placeholder="Filter logs by user, action, or resource..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full rounded-2xl py-4 pl-11 pr-4 text-xs focus:outline-none transition-all border ${
            isLightMode 
              ? 'bg-white border-black/10 text-black placeholder:text-black/30 shadow-sm focus:border-neon-purple' 
              : 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
          }`}
        />
      </div>

      <div className={`overflow-x-auto rounded-[1.5rem] border transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'border-white/10 bg-dark-bg/20'}`}>
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className={`transition-colors ${isLightMode ? 'bg-black/[0.03] text-black/40' : 'bg-white/5 text-white/40'}`}>
              <th className="p-5 text-[10px] uppercase font-black tracking-widest border-b border-white/5 whitespace-nowrap">Timestamp</th>
              <th className="p-5 text-[10px] uppercase font-black tracking-widest border-b border-white/5 whitespace-nowrap">Operator</th>
              <th className="p-5 text-[10px] uppercase font-black tracking-widest border-b border-white/5 whitespace-nowrap text-center">Action</th>
              <th className="p-5 text-[10px] uppercase font-black tracking-widest border-b border-white/5 whitespace-nowrap">Target</th>
              <th className="p-5 text-[10px] uppercase font-black tracking-widest border-b border-white/5 whitespace-nowrap">Meta</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLightMode ? 'divide-black/5' : 'divide-white/5'}`}>
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map(log => log && (
                <tr key={log.id || Math.random()} className={`text-xs transition-colors hover:bg-black/[0.02]`}>
                  <td className={`p-5 font-mono whitespace-nowrap ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "---"}
                  </td>
                  <td className="p-5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className={`font-black tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{log.username || "System"}</span>
                      <span className={`text-[9px] uppercase tracking-widest font-bold ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>{log.role || "process"}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${
                      isLightMode 
                        ? 'bg-black/[0.03] border-black/5 text-black/60' 
                        : 'bg-white/5 border-white/10 text-white/60'
                    }`}>
                      {log.action || "---"}
                    </span>
                  </td>
                  <td className="p-5 whitespace-nowrap">
                    <span className="text-neon-blue font-black tracking-tight uppercase text-[10px]">
                      {log.resource || "---"}{log.resource_id ? `:${log.resource_id}` : ''}
                    </span>
                  </td>
                  <td className="p-5">
                    <p className={`text-[10px] font-medium leading-relaxed max-w-[200px] truncate sm:max-w-xs ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                      {log.details || "N/A"}
                    </p>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-20 text-center">
                  <div className={`inline-flex flex-col items-center ${isLightMode ? 'opacity-20' : 'opacity-20'}`}>
                    <Shield className="w-12 h-12 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Vault is Silent</p>
                    <p className="text-[9px] mt-2 font-bold">No activity matching your search criteria</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-4 border-t border-dashed border-neon-purple/20">
          <div className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
            Audit Records: <span className="text-neon-purple">{filteredLogs.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-6 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 ${
                isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
              }`}
            >
              Back
            </button>
            <div className={`text-[10px] font-black uppercase tracking-widest px-4 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
              <span className="text-neon-purple">{currentPage}</span> / {totalPages}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-6 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 ${
                isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
