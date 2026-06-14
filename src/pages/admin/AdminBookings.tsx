import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const { showAlert, showConfirm } = useModal();

  const load = () => {
    fetchAdmin("/api/admin/bookings").then(r => r.json()).then(setBookings);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetchAdmin(`/api/admin/bookings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    load();
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
          load();
        }
      } catch (err) {
        console.error("Failed to delete booking", err);
        showAlert({ title: "Error", message: "Failed to delete booking", style: "danger" });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-6 gap-6 sm:gap-0">
        <div className="text-center sm:text-left">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-black uppercase tracking-tighter italic leading-none">Agency <span className="text-neon-blue not-italic">Desk</span></h3>
          <p className="text-white/40 text-[10px] sm:text-xs mt-2 uppercase tracking-[0.2em] font-black">Professional Inquiries & Bookings</p>
        </div>
        <div className="flex items-center justify-center sm:justify-end">
          <div className="flex items-center space-x-2 px-4 py-2.5 bg-neon-blue/20 border border-neon-blue/30 rounded-xl">
            <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase text-neon-blue tracking-widest whitespace-nowrap">Agent Active</span>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-[2rem] border border-white/5 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Artist</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Client</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Event Date</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-6">
                    <span className="font-black text-neon-purple uppercase text-xs tracking-wider">{b.dj_name}</span>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold tracking-tight">{b.client_name}</span>
                      <span className="text-[10px] text-white/40 font-mono italic">{b.client_email}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-xs font-mono text-white/60">{b.event_date || 'TBD'}</span>
                  </td>
                  <td className="p-6">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                      b.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      b.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-neon-blue/10 text-neon-blue border-neon-blue/20 animate-pulse'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => setSelectedBooking(b)} 
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all transform hover:scale-105"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(b.id, 'confirmed')} 
                        className="p-2.5 bg-green-500/5 hover:bg-green-500/10 border border-green-500/10 rounded-xl text-green-400/60 hover:text-green-400 transition-all transform hover:scale-105"
                        title="Confirm Booking"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(b.id, 'rejected')} 
                        className="p-2.5 bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10 rounded-xl text-yellow-500/60 hover:text-yellow-500 transition-all transform hover:scale-105"
                        title="Reject Booking"
                      >
                        <LogOut className="w-4 h-4 rotate-90" />
                      </button>
                      <button 
                        onClick={() => handleDelete(b.id, b.client_name)} 
                        className="p-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-red-500/60 hover:text-red-500 transition-all transform hover:scale-105"
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
            className="glass-panel p-5 rounded-[2rem] border border-white/5 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neon-purple block mb-1">Artist</span>
                <p className="font-black text-lg text-white tracking-tighter italic">{b.dj_name}</p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                b.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                b.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                'bg-neon-blue/10 text-neon-blue border-neon-blue/20 animate-pulse'
              }`}>
                {b.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Client</span>
                <p className="text-xs font-bold truncate">{b.client_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Date</span>
                <p className="text-xs font-mono text-white/60">{b.event_date || 'TBD'}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setSelectedBooking(b)}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2"
              >
                <Eye className="w-3 h-3" />
                <span>Details</span>
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => updateStatus(b.id, 'confirmed')}
                  className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 outline-none"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(b.id, b.client_name)}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {bookings.length === 0 && (
        <div className="py-20 text-center glass-panel rounded-[3rem] border-dashed border-white/5">
          <Ghost className="w-12 h-12 text-white/5 mx-auto mb-4" />
          <p className="text-white/20 uppercase font-black tracking-widest text-xs">Awaiting new opportunities...</p>
        </div>
      )}


      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-dark-bg border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-purple block mb-1">Booking Inquiry</span>
                    <h4 className="text-2xl font-black uppercase tracking-tight italic">Artist: <span className="text-neon-purple not-italic">{selectedBooking.dj_name}</span></h4>
                  </div>
                  <button 
                    onClick={() => setSelectedBooking(null)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-white/40" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Client Name</p>
                    <p className="font-bold text-sm sm:text-base">{selectedBooking.client_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Email Address</p>
                    <p className="font-mono text-xs sm:text-sm break-all">{selectedBooking.client_email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Event Date</p>
                    <p className="font-mono text-xs sm:text-sm">{selectedBooking.event_date || 'TBD'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Booking Status</p>
                    <div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded inline-block border ${
                        selectedBooking.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        selectedBooking.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-neon-blue/10 text-neon-blue border-neon-blue/20'
                      }`}>
                        {selectedBooking.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3">Inquiry Message</p>
                  <div className="bg-white/5 p-4 rounded-2xl text-xs sm:text-sm text-white/70 leading-relaxed italic border border-white/5 overflow-y-auto max-h-[200px]">
                    "{selectedBooking.message || 'No additional message provided.'}"
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button 
                    onClick={() => { updateStatus(selectedBooking.id, 'confirmed'); setSelectedBooking(null); }}
                    className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 py-3 rounded-xl text-green-400 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => { updateStatus(selectedBooking.id, 'rejected'); setSelectedBooking(null); }}
                    className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 py-3 rounded-xl text-yellow-500 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => { handleDelete(selectedBooking.id, selectedBooking.client_name); setSelectedBooking(null); }}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 py-3 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
