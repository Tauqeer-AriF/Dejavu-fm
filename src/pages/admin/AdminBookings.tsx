import React, { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Layers, Check, Ban, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";
import { useLogo } from "../../hooks/useLogo";

export function AdminBookings() {
  const { isLightMode } = useLogo();
  const [activeSubTab, setActiveSubTab] = useState<'bookings' | 'arch421'>('bookings');
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const { showAlert, showConfirm } = useModal();

  // Arch421 CRUD States
  const [selectedReg, setSelectedReg] = useState<any>(null); // For edit
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regFormData, setRegFormData] = useState({ name: '', email: '', status: 'pending' });
  const [regSearch, setRegSearch] = useState('');

  const openCreateRegModal = () => {
    setSelectedReg(null);
    setRegFormData({ name: '', email: '', status: 'pending' });
    setIsRegModalOpen(true);
  };

  const openEditRegModal = (reg: any) => {
    setSelectedReg(reg);
    setRegFormData({ name: reg.name, email: reg.email, status: reg.status || 'pending' });
    setIsRegModalOpen(true);
  };

  const handleSaveRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFormData.name || !regFormData.email) {
      showAlert({ title: "Validation Error", message: "Name and Email are required.", style: "warning" });
      return;
    }

    try {
      if (selectedReg && selectedReg.id) {
        // Edit mode
        const res = await fetchAdmin(`/api/admin/arch421/registrations/${selectedReg.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(regFormData)
        });
        if (res.ok) {
          showAlert({ title: "Updated", message: "VIP registration updated successfully.", style: "success" });
          loadRegistrations();
          setIsRegModalOpen(false);
          setSelectedReg(null);
        } else {
          const data = await res.json();
          showAlert({ title: "Error", message: data.error || "Failed to update registration.", style: "danger" });
        }
      } else {
        // Create mode
        const res = await fetchAdmin(`/api/admin/arch421/registrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(regFormData)
        });
        if (res.ok) {
          showAlert({ title: "Created", message: "New VIP registration added successfully.", style: "success" });
          loadRegistrations();
          setIsRegModalOpen(false);
        } else {
          const data = await res.json();
          showAlert({ title: "Error", message: data.error || "Failed to create registration.", style: "danger" });
        }
      }
    } catch (err) {
      console.error(err);
      showAlert({ title: "Error", message: "Server connection failed.", style: "danger" });
    }
  };

  const filteredRegistrations = useMemo(() => {
    if (!regSearch) return registrations;
    const query = regSearch.toLowerCase();
    return registrations.filter(r => 
      (r.name && r.name.toLowerCase().includes(query)) || 
      (r.email && r.email.toLowerCase().includes(query)) ||
      (r.status && r.status.toLowerCase().includes(query))
    );
  }, [registrations, regSearch]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBookings = () => {
    return fetchAdmin("/api/admin/bookings").then(r => r.json()).then(setBookings).catch(err => console.error(err));
  };

  const loadRegistrations = () => {
    return fetchAdmin("/api/admin/arch421/registrations").then(r => r.json()).then(setRegistrations).catch(err => console.error(err));
  };

  const loadAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadBookings(), loadRegistrations()]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const exportRegistrationsToCSV = () => {
    if (registrations.length === 0) {
      showAlert({ title: "No Data", message: "There are no registrations to export.", style: "warning" });
      return;
    }
    
    const headers = ["ID", "Name", "Email", "Status", "Registered At"];
    const rows = registrations.map(r => [
      r.id,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.status || 'pending').replace(/"/g, '""')}"`,
      `"${new Date(r.created_at).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `arch421_registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert({ title: "Success", message: "Registrations successfully exported to CSV.", style: "success" });
  };

  const updateStatus = async (id: string, status: string) => {
    await fetchAdmin(`/api/admin/bookings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadBookings();
    showAlert({ title: "Updated", message: `Booking status changed to ${status}`, style: "success" });
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: "Delete Booking",
      message: `Are you sure you want to delete the booking from '${name}'? This action cannot be undone.`,
      style: "danger",
      confirmText: "Delete Permanently"
    });

    if (confirmed) {
      try {
        const res = await fetchAdmin(`/api/admin/bookings/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert({ title: "Deleted", message: "Booking has been removed.", style: "success" });
          loadBookings();
        }
      } catch (err) {
        console.error("Failed to delete booking", err);
        showAlert({ title: "Error", message: "Failed to delete booking", style: "danger" });
      }
    }
  };

  // Arch421 specific actions
  const updateRegStatus = async (id: number, status: string) => {
    await fetchAdmin(`/api/admin/arch421/registrations/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadRegistrations();
    showAlert({ title: "Updated", message: `VIP registration status changed to ${status}`, style: "success" });
  };

  const handleDeleteRegistration = async (id: number, name: string) => {
    const confirmed = await showConfirm({
      title: "Delete Registration",
      message: `Are you sure you want to delete the VIP registration for '${name}'? This action cannot be undone.`,
      style: "danger",
      confirmText: "Delete Permanently"
    });

    if (confirmed) {
      try {
        const res = await fetchAdmin(`/api/admin/arch421/registrations/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert({ title: "Deleted", message: "VIP registration has been removed.", style: "success" });
          loadRegistrations();
        }
      } catch (err) {
        console.error("Failed to delete registration", err);
        showAlert({ title: "Error", message: "Failed to delete registration", style: "danger" });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-6 gap-6 sm:gap-0 ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <div className="text-center sm:text-left">
          <h3 className={`text-2xl sm:text-3xl md:text-4xl font-display font-black uppercase tracking-tighter italic leading-none ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Agency <span className="text-neon-blue not-italic">Desk</span></h3>
          <p className={`text-[10px] sm:text-xs mt-2 uppercase tracking-[0.2em] font-black ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Professional Inquiries & Bookings</p>
        </div>
        <div className="flex items-center justify-center sm:justify-end space-x-3">
          <button
            onClick={loadAll}
            disabled={isRefreshing}
            className={`px-4 py-2.5 border rounded-xl transition-all flex items-center justify-center gap-2 hover:scale-105 ${
              isLightMode 
                ? 'bg-white border-black/10 hover:bg-black/5 text-slate-700' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
            } ${isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-neon-blue ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
              {isRefreshing ? "Refreshing..." : "Refresh Desk"}
            </span>
          </button>
          
          <div className={`flex items-center space-x-2 px-4 py-2.5 border rounded-xl ${isLightMode ? 'bg-neon-blue/10 border-neon-blue/20' : 'bg-neon-blue/20 border-neon-blue/30'}`}>
            <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-neon-blue tracking-widest whitespace-nowrap">Agent Active</span>
          </div>
        </div>
      </div>

      {/* Sub-tab selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-2 gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('bookings')}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'bookings'
                ? (isLightMode ? 'bg-black text-white' : 'bg-white text-dark-bg')
                : (isLightMode ? 'text-slate-500 hover:text-black hover:bg-black/5' : 'text-white/50 hover:text-white hover:bg-white/5')
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>DJ Bookings ({bookings.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('arch421')}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'arch421'
                ? (isLightMode ? 'bg-black text-white' : 'bg-white text-dark-bg')
                : (isLightMode ? 'text-slate-500 hover:text-black hover:bg-black/5' : 'text-white/50 hover:text-white hover:bg-white/5')
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Arch421 VIP Registrations ({registrations.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'arch421' && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mt-4">
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-black/40' : 'text-white/40'}`} />
            <input
              type="text"
              placeholder="Search VIP guests by name, email or status..."
              value={regSearch}
              onChange={(e) => setRegSearch(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 text-xs font-bold rounded-2xl outline-none border transition-all ${
                isLightMode 
                  ? 'bg-white border-black/10 text-slate-800 placeholder-black/40 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue' 
                  : 'bg-white/5 border-white/5 text-white placeholder-white/30 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={openCreateRegModal}
              className={`px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 border w-full md:w-auto ${
                isLightMode 
                  ? 'bg-neon-blue text-white hover:bg-opacity-90 border-neon-blue' 
                  : 'bg-neon-blue text-white hover:bg-opacity-90 border-neon-blue'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add VIP Guest</span>
            </button>

            {registrations.length > 0 && (
              <button
                onClick={exportRegistrationsToCSV}
                className={`px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 border w-full md:w-auto ${
                  isLightMode 
                    ? 'bg-black text-white hover:bg-slate-800 border-black/10' 
                    : 'bg-white text-dark-bg hover:bg-slate-100 border-white/10'
                }`}
              >
                <Download className="w-4 h-4 text-neon-blue" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'bookings' ? (
        <>
          {/* Desktop Table View */}
          <div className={`hidden md:block overflow-hidden rounded-[2rem] border ${isLightMode ? 'border-black/10 bg-white shadow-sm' : 'border-white/5 bg-white/5'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b ${isLightMode ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/5'}`}>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Artist</th>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Client</th>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Event Date</th>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Status</th>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest text-right ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLightMode ? 'divide-black/10' : 'divide-white/5'}`}>
                  {bookings.map(b => (
                    <tr key={b.id} className={`transition-colors group ${isLightMode ? 'hover:bg-black/[0.01] text-slate-800' : 'hover:bg-white/5 text-white'}`}>
                      <td className="p-6">
                        <span className="font-black text-neon-purple uppercase text-xs tracking-wider">{b.dj_name || 'Deleted DJ'}</span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{b.client_name}</span>
                          <span className={`text-[10px] font-mono italic ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>{b.client_email}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`text-xs font-mono ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>{b.event_date || 'TBD'}</span>
                      </td>
                      <td className="p-6">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                          b.status === 'confirmed' ? (isLightMode ? 'bg-green-50 text-green-600 border-green-200' : 'bg-green-500/10 text-green-400 border-green-500/20') :
                          b.status === 'rejected' ? (isLightMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20') :
                          (isLightMode ? 'bg-cyan-50 text-cyan-600 border-cyan-200 animate-pulse' : 'bg-neon-blue/10 text-neon-blue border-neon-blue/20 animate-pulse')
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => setSelectedBooking(b)} 
                            className={`p-2.5 border rounded-xl transition-all transform hover:scale-105 ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black/60 hover:text-black' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white'}`}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => updateStatus(b.id, 'confirmed')} 
                            className={`p-2.5 border rounded-xl transition-all transform hover:scale-105 ${isLightMode ? 'bg-green-500/5 hover:bg-green-500/10 border-green-500/10 text-green-600/70 hover:text-green-600' : 'bg-green-500/5 hover:bg-green-500/10 border-green-500/10 text-green-400/60 hover:text-green-400'}`}
                            title="Confirm Booking"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => updateStatus(b.id, 'rejected')} 
                            className={`p-2.5 border rounded-xl transition-all transform hover:scale-105 ${isLightMode ? 'bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/10 text-yellow-600/70 hover:text-yellow-600' : 'bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/10 text-yellow-500/60 hover:text-yellow-500'}`}
                            title="Reject Booking"
                          >
                            <LogOut className="w-4 h-4 rotate-90" />
                          </button>
                          <button 
                            onClick={() => handleDelete(b.id, b.client_name)} 
                            className={`p-2.5 border rounded-xl transition-all transform hover:scale-105 ${isLightMode ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/10 text-red-600/70 hover:text-red-600' : 'bg-red-500/5 hover:bg-red-500/10 border-red-500/10 text-red-500/60 hover:text-red-500'}`}
                            title="Delete Booking"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {bookings.map(b => (
              <motion.div 
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-[2rem] border space-y-4 ${isLightMode ? 'bg-white border-black/10 shadow-sm text-slate-800' : 'glass-panel border-white/5 text-white'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neon-purple block mb-1">Artist</span>
                    <p className={`font-black text-lg tracking-tighter italic ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{b.dj_name || 'Deleted DJ'}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                    b.status === 'confirmed' ? (isLightMode ? 'bg-green-50 text-green-600 border-green-200' : 'bg-green-500/10 text-green-400 border-green-500/20') :
                    b.status === 'rejected' ? (isLightMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20') :
                    (isLightMode ? 'bg-cyan-50 text-cyan-600 border-cyan-200 animate-pulse' : 'bg-neon-blue/10 text-neon-blue border-neon-blue/20 animate-pulse')
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div className={`grid grid-cols-2 gap-4 pt-2 border-t ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>Client</span>
                    <p className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{b.client_name}</p>
                  </div>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>Date</span>
                    <p className={`text-xs font-mono ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>{b.event_date || 'TBD'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setSelectedBooking(b)}
                    className={`flex-1 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-700' : 'bg-white/5 border-white/10 text-white'}`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Details</span>
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateStatus(b.id, 'confirmed')}
                      className={`p-3 border rounded-xl outline-none ${isLightMode ? 'bg-green-50 border-green-200 text-green-600' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(b.id, b.client_name)}
                      className={`p-3 border rounded-xl outline-none ${isLightMode ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {bookings.length === 0 && (
            <div className={`py-20 text-center rounded-[3rem] border border-dashed ${isLightMode ? 'bg-white border-black/15 shadow-sm text-slate-800' : 'glass-panel border-white/5'}`}>
              <Ghost className={`w-12 h-12 mx-auto mb-4 ${isLightMode ? 'text-black/20' : 'text-white/5'}`} />
              <p className={`uppercase font-black tracking-widest text-xs ${isLightMode ? 'text-black/50' : 'text-white/20'}`}>Awaiting new opportunities...</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Desktop Table View for Arch421 registrations */}
          <div className={`hidden md:block overflow-hidden rounded-[2rem] border ${isLightMode ? 'border-black/10 bg-white shadow-sm' : 'border-white/5 bg-white/5'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b ${isLightMode ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/5'}`}>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Name</th>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Email Address</th>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Status</th>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Registered At</th>
                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest text-right ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLightMode ? 'divide-black/10' : 'divide-white/5'}`}>
                  {filteredRegistrations.map(r => (
                    <tr key={r.id} className={`transition-colors group ${isLightMode ? 'hover:bg-black/[0.01] text-slate-800' : 'hover:bg-white/5 text-white'}`}>
                      <td className="p-6">
                        <span className={`text-sm font-black tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{r.name}</span>
                      </td>
                      <td className="p-6">
                        <span className={`text-xs font-mono ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>{r.email}</span>
                      </td>
                      <td className="p-6">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                          r.status === 'approved' ? (isLightMode ? 'bg-green-50 text-green-600 border-green-200' : 'bg-green-500/10 text-green-400 border-green-500/20') :
                          r.status === 'rejected' ? (isLightMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20') :
                          (isLightMode ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'bg-neon-blue/10 text-neon-blue border-neon-blue/20')
                        }`}>
                          {r.status || 'pending'}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className={`text-xs font-mono ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => openEditRegModal(r)} 
                            className={`p-2.5 border rounded-xl transition-all transform hover:scale-105 ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black/60 hover:text-black' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white'}`}
                            title="Edit Guest Details"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => updateRegStatus(r.id, 'approved')} 
                            className={`p-2.5 border rounded-xl transition-all transform hover:scale-105 ${isLightMode ? 'bg-green-500/5 hover:bg-green-500/10 border-green-500/10 text-green-600/70 hover:text-green-600' : 'bg-green-500/5 hover:bg-green-500/10 border-green-500/10 text-green-400/60 hover:text-green-400'}`}
                            title="Approve Guest"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => updateRegStatus(r.id, 'rejected')} 
                            className={`p-2.5 border rounded-xl transition-all transform hover:scale-105 ${isLightMode ? 'bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/10 text-yellow-600/70 hover:text-yellow-600' : 'bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/10 text-yellow-500/60 hover:text-yellow-500'}`}
                            title="Reject Guest"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteRegistration(r.id, r.name)} 
                            className={`p-2.5 border rounded-xl transition-all transform hover:scale-105 ${isLightMode ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/10 text-red-600/70 hover:text-red-600' : 'bg-red-500/5 hover:bg-red-500/10 border-red-500/10 text-red-500/60 hover:text-red-500'}`}
                            title="Delete Guest"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View for Arch421 registrations */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredRegistrations.map(r => (
              <motion.div 
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-[2rem] border space-y-4 ${isLightMode ? 'bg-white border-black/10 shadow-sm text-slate-800' : 'glass-panel border-white/5 text-white'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neon-purple block mb-1">VIP Guest</span>
                    <p className={`font-black text-lg tracking-tighter ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{r.name}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                    r.status === 'approved' ? (isLightMode ? 'bg-green-50 text-green-600 border-green-200' : 'bg-green-500/10 text-green-400 border-green-500/20') :
                    r.status === 'rejected' ? (isLightMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20') :
                    (isLightMode ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'bg-neon-blue/10 text-neon-blue border-neon-blue/20')
                  }`}>
                    {r.status || 'pending'}
                  </span>
                </div>

                <div className={`grid grid-cols-2 gap-4 pt-2 border-t ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>Email</span>
                    <p className="text-xs font-mono truncate">{r.email}</p>
                  </div>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>Registered On</span>
                    <p className="text-xs font-mono">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => openEditRegModal(r)}
                    className={`flex-1 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-700' : 'bg-white/5 border-white/10 text-white'}`}
                  >
                    <Settings className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateRegStatus(r.id, 'approved')}
                      className={`p-3 border rounded-xl outline-none ${isLightMode ? 'bg-green-50 border-green-200 text-green-600' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteRegistration(r.id, r.name)}
                      className={`p-3 border rounded-xl outline-none ${isLightMode ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredRegistrations.length === 0 && (
            <div className={`py-20 text-center rounded-[3rem] border border-dashed ${isLightMode ? 'bg-white border-black/15 shadow-sm text-slate-800' : 'glass-panel border-white/5'}`}>
              <Ghost className={`w-12 h-12 mx-auto mb-4 ${isLightMode ? 'text-black/20' : 'text-white/5'}`} />
              <p className={`uppercase font-black tracking-widest text-xs ${isLightMode ? 'text-black/50' : 'text-white/20'}`}>
                {regSearch ? "No matches found for your search" : "No VIP submissions received yet..."}
              </p>
            </div>
          )}
        </>
      )}

      {/* Booking Details Modal */}
      {createPortal(
        <AnimatePresence>
          {selectedBooking && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedBooking(null)}
                className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={`relative w-full max-w-lg border rounded-3xl shadow-2xl overflow-hidden z-10 ${isLightMode ? 'bg-white border-black/10 text-slate-800' : 'bg-dark-bg border-white/10 text-white'}`}
              >
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-purple block mb-1">Booking Inquiry</span>
                      <h4 className={`text-2xl font-black uppercase tracking-tight italic ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Artist: <span className="text-neon-purple not-italic">{selectedBooking.dj_name || 'Deleted DJ'}</span></h4>
                    </div>
                    <button 
                      onClick={() => setSelectedBooking(null)}
                      className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-black/5 text-black/40' : 'hover:bg-white/5 text-white/40'}`}
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>Client Name</p>
                      <p className={`font-bold text-sm sm:text-base ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{selectedBooking.client_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>Email Address</p>
                      <p className={`font-mono text-xs sm:text-sm break-all ${isLightMode ? 'text-slate-700' : 'text-white/90'}`}>{selectedBooking.client_email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>Event Date</p>
                      <p className={`font-mono text-xs sm:text-sm ${isLightMode ? 'text-slate-700' : 'text-white/90'}`}>{selectedBooking.event_date || 'TBD'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>Booking Status</p>
                      <div>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded inline-block border ${
                          selectedBooking.status === 'confirmed' ? (isLightMode ? 'bg-green-50 text-green-600 border-green-200' : 'bg-green-500/10 text-green-400 border-green-500/20') :
                          selectedBooking.status === 'rejected' ? (isLightMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20') :
                          (isLightMode ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'bg-neon-blue/10 text-neon-blue border-neon-blue/20')
                        }`}>
                          {selectedBooking.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`pt-6 border-t ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isLightMode ? 'text-black/50' : 'text-white/30'}`}>Inquiry Message</p>
                    <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed italic border overflow-y-auto max-h-[200px] ${isLightMode ? 'bg-black/5 border-black/5 text-slate-700' : 'bg-white/5 border-white/5 text-white/70'}`}>
                      "{selectedBooking.message || 'No additional message provided.'}"
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button 
                      onClick={() => { updateStatus(selectedBooking.id, 'confirmed'); setSelectedBooking(null); }}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isLightMode ? 'bg-green-500/5 hover:bg-green-500/10 border-green-500/20 text-green-600' : 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400'}`}
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => { updateStatus(selectedBooking.id, 'rejected'); setSelectedBooking(null); }}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isLightMode ? 'bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/20 text-yellow-600' : 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20 text-yellow-500'}`}
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => { handleDelete(selectedBooking.id, selectedBooking.client_name); setSelectedBooking(null); }}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isLightMode ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/20 text-red-600' : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-500'}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Registration Details/Edit Modal */}
      {createPortal(
        <AnimatePresence>
          {isRegModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsRegModalOpen(false)}
                className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={`relative w-full max-w-md border rounded-3xl shadow-2xl overflow-hidden z-10 ${isLightMode ? 'bg-white border-black/10 text-slate-800' : 'bg-dark-bg border-white/10 text-white'}`}
              >
                <form onSubmit={handleSaveRegistration} className="p-6 sm:p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-blue block mb-1">
                        {selectedReg ? "Modify registration" : "Manual Entry"}
                      </span>
                      <h4 className={`text-2xl font-black uppercase tracking-tight italic ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                        {selectedReg ? "Edit VIP Guest" : "Add VIP Guest"}
                      </h4>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsRegModalOpen(false)}
                      className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-black/5 text-black/40' : 'hover:bg-white/5 text-white/40'}`}
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-black uppercase tracking-widest block ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Guest Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={regFormData.name}
                        onChange={(e) => setRegFormData({ ...regFormData, name: e.target.value })}
                        className={`w-full px-4 py-3 text-xs font-bold rounded-xl outline-none border transition-all ${
                          isLightMode 
                            ? 'bg-slate-50 border-black/10 text-slate-800 focus:bg-white focus:border-neon-blue' 
                            : 'bg-white/5 border-white/5 text-white focus:bg-white/10 focus:border-neon-blue'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-black uppercase tracking-widest block ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. john@example.com"
                        value={regFormData.email}
                        onChange={(e) => setRegFormData({ ...regFormData, email: e.target.value })}
                        className={`w-full px-4 py-3 text-xs font-bold rounded-xl outline-none border transition-all ${
                          isLightMode 
                            ? 'bg-slate-50 border-black/10 text-slate-800 focus:bg-white focus:border-neon-blue' 
                            : 'bg-white/5 border-white/5 text-white focus:bg-white/10 focus:border-neon-blue'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-black uppercase tracking-widest block ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>VIP Status</label>
                      <select
                        value={regFormData.status}
                        onChange={(e) => setRegFormData({ ...regFormData, status: e.target.value })}
                        className={`w-full px-4 py-3 text-xs font-bold rounded-xl outline-none border transition-all ${
                          isLightMode 
                            ? 'bg-slate-50 border-black/10 text-slate-800 focus:bg-white focus:border-neon-blue' 
                            : 'bg-white/5 border-white/5 text-white focus:bg-white/10 focus:border-neon-blue'
                        }`}
                      >
                        <option value="pending" className="bg-dark-bg text-white">Pending Approval</option>
                        <option value="approved" className="bg-dark-bg text-white">Approved / VIP</option>
                        <option value="rejected" className="bg-dark-bg text-white">Rejected / Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsRegModalOpen(false)}
                      className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        isLightMode 
                          ? 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-700' 
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                      }`}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-neon-blue hover:bg-neon-blue-hover text-white shadow-lg shadow-neon-blue/20"
                    >
                      {selectedReg ? "Save Changes" : "Register Guest"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
