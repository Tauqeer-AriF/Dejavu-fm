import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminShoutouts({ isAdminUser }: { isAdminUser?: boolean }) {
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showConfirm, showAlert } = useModal();
  const load = () => {
    fetchAdmin("/api/admin/shoutouts").then(r => r.json()).then(data => {
      setShoutouts(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    const socket = (window as any).socket;
    
    const onNewShoutout = () => load();
    const onCleared = () => {
      setShoutouts([]);
      load();
    };
    
    if (socket) {
      socket.on('new_shoutout', onNewShoutout);
      socket.on('shoutouts_cleared', onCleared);
    }
    
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('new_shoutout', onNewShoutout);
        socket.off('shoutouts_cleared', onCleared);
      }
    };
  }, []);

  if (loading) return (
    <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-neon-purple border-t-transparent animate-spin rounded-full" /></div>
  );

  const deleteShoutout = async (id: number) => {
    try {
      const res = await fetchAdmin(`/api/admin/shoutouts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setShoutouts(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const exportToCSV = () => {
    if (shoutouts.length === 0) {
      showAlert({ title: "No Data", message: "There are no interactions to export.", style: "danger" });
      return;
    }

    const headers = ["ID", "Timestamp", "Email", "Message", "Type"];
    const rows = shoutouts.map(s => [
      s.id,
      new Date(s.timestamp).toISOString(),
      `"${(s.listener_name || "").replace(/"/g, '""')}"`,
      `"${(s.message || "").replace(/"/g, '""')}"`,
      s.type
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dejavu_interactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Exported", message: "CSV file has been generated.", style: "success" });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-6 gap-6 sm:gap-0">
        <div className="text-center sm:text-left">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-black uppercase tracking-tighter italic leading-none">Station <span className="text-neon-purple not-italic">Interactions</span></h3>
          <p className="text-white/40 text-[10px] sm:text-xs mt-2 uppercase tracking-[0.2em] font-black">Live Listener Pulse</p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 mt-2 sm:mt-0">
          <button 
            onClick={exportToCSV}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white/5 hover:bg-neon-blue/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap text-neon-blue"
          >
            Export CSV
          </button>
          {isAdminUser && (
            <button 
              onClick={async () => {
                const confirmed = await showConfirm({
                  title: "Purge All Interactions",
                  message: "Are you sure you want to PERMANENTLY delete ALL shoutouts? This action cannot be undone.",
                  style: "danger",
                  confirmText: "Purge Everything"
                });

                if (confirmed) {
                  setShoutouts([]); // Optimistic update: Clear the list immediately
                  await fetchAdmin("/api/admin/shoutouts/all", { method: 'DELETE' });
                  showAlert({ title: "Purged", message: "All interactions have been cleared.", style: "success" });
                  load();
                }
              }} // Changed to use custom modal
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white/5 hover:bg-red-500/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap"
            >
              Purge Deck
            </button>
          )}
          <div className="flex items-center space-x-2 px-4 py-2.5 bg-neon-purple/20 border border-neon-purple/30 rounded-xl flex-shrink-0">
            <div className="w-2 h-2 bg-neon-purple rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-neon-purple tracking-widest whitespace-nowrap">Streaming Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {shoutouts.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center glass-panel rounded-3xl border-dashed">
            <Ghost className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 uppercase font-black tracking-widest text-xs">No activity yet. Promoting the station might help!</p>
          </div>
        )}
        
        <AnimatePresence>
          {shoutouts.map((s) => (
            <motion.div 
              key={s.id}
              whileHover="hover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className="glass-panel p-4 sm:p-6 rounded-[2rem] border border-white/5 transition-all relative group overflow-hidden hover:border-neon-purple/30"
            >
              <motion.div
                className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-0"
                variants={{ hover: { x: ['-150%', '150%'] } }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                initial={{ x: '-150%' }}
              />
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] pointer-events-none ${s.type === 'reaction' ? 'bg-neon-blue/10' : 'bg-neon-purple/10'}`}></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10 gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white/40" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white truncate tracking-tight">{s.listener_name}</h4>
                    <p className="text-[10px] text-white/30">{new Date(s.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteShoutout(s.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg text-white/20 hover:text-red-500 transition-all"
                  title="Permanent Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative z-10">
                {s.type === 'reaction' ? (
                  <div className="text-4xl text-center py-4 animate-bounce">
                    {s.message}
                  </div>
                ) : (
                  <p className="text-sm text-white/80 leading-relaxed font-medium italic">"{s.message}"</p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between relative z-10">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${s.type === 'reaction' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-neon-purple/20 text-neon-purple'}`}>
                  {s.type}
                </span>
                <span className="text-[8px] text-white/20 font-black uppercase">{s.id}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
