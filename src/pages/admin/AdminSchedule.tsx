import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminSchedule() {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [djs, setDJs] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { showConfirm, showAlert } = useModal();
  
  const load = () => {
    fetch("/api/public/schedule").then(r=>r.json()).then(setSchedule);
    fetch("/api/public/djs").then(r=>r.json()).then(setDJs);
    queryClient.invalidateQueries({ queryKey: ['schedule'] });
  };
  useEffect(() => { load(); }, []);

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Filter schedule based on search query
  const filteredSchedule = useMemo(() => {
    if (!searchQuery.trim()) return schedule;
    const q = searchQuery.toLowerCase();
    return schedule.filter(s => 
      (s.dj_name || "").toLowerCase().includes(q) || 
      (s.show_name || "").toLowerCase().includes(q)
    );
  }, [schedule, searchQuery]);

  // Group schedules by day of week
  const groupedSchedule = useMemo(() => {
    const groups: { [key: number]: any[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    filteredSchedule.forEach(s => {
      const day = s.day_of_week;
      if (groups[day] !== undefined) {
        groups[day].push(s);
      }
    });
    // Sort each day's schedules by start_time
    Object.keys(groups).forEach(day => {
      groups[parseInt(day)].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    });
    return groups;
  }, [filteredSchedule]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-2xl font-bold">Manage Schedule</h3>
          <p className="text-xs text-white/50 mt-1">Organize and edit weekly live slots by day.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search slot, DJ, or show..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <AddScheduleForm djs={djs} onAdd={load} />
      
      {/* Grouped Day-by-day Layout */}
      <div className="space-y-8">
        {DAYS_OF_WEEK.map((dayName, dayIndex) => {
          const daySlots = groupedSchedule[dayIndex] || [];
          
          // If we have a search query and this day has no matches, skip rendering it for a cleaner search result
          if (searchQuery.trim() !== "" && daySlots.length === 0) return null;

          return (
            <div key={dayName} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-neon-purple" />
                  <h4 className="font-bold text-white tracking-wide uppercase text-sm">{dayName}</h4>
                </div>
                <span className="text-xs font-mono text-white/40">{daySlots.length} slot{daySlots.length === 1 ? "" : "s"}</span>
              </div>

              {daySlots.length === 0 ? (
                <p className="text-xs text-white/30 italic py-2">No scheduled shows for this day.</p>
              ) : (
                <div className="space-y-3">
                  {daySlots.map(s => (
                    <div key={s.id} className="bg-dark-bg/60 border border-white/10 p-4 rounded-xl flex flex-col transition-colors hover:border-white/20">
                      {editingId === s.id ? (
                        <EditScheduleForm schedule={s} djs={djs} onSave={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-white/5 text-neon-blue border border-white/5 shrink-0 inline-block text-center sm:w-28">
                              {s.start_time} - {s.end_time}
                            </span>
                            <div>
                              <span className="font-bold text-white text-sm">{s.dj_name}</span> 
                              <span className="text-xs text-white/50 ml-2">({s.show_name})</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0 justify-end">
                            <button onClick={() => setEditingId(s.id)} className="text-neon-blue hover:text-white transition-colors text-xs font-bold uppercase tracking-wider px-2 py-1">Edit</button>
                            <button onClick={async () => {
                              const confirmed = await showConfirm({
                                title: "Remove Schedule",
                                message: "Are you sure you want to remove this schedule entry?",
                                style: "danger",
                                confirmText: "Remove"
                              });
                              if (confirmed) {
                                const res = await fetchAdmin(`/api/admin/schedule/${s.id}`, { method: 'DELETE'});
                                if (res.ok) {
                                  showAlert({ title: "Success", message: "Schedule entry removed.", style: "success" });
                                  load();
                                }
                              }
                            }} className="text-red-500 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-wider px-2 py-1">Remove</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Search no results check */}
        {searchQuery.trim() !== "" && filteredSchedule.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 p-6 space-y-3">
            <p className="text-white/40 text-sm">No schedule slots matched your search term "{searchQuery}".</p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/85 text-white rounded-lg text-xs font-bold uppercase transition-all"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditScheduleForm({schedule, djs, onSave, onCancel}: {schedule: any, djs: any[], onSave: ()=>void, onCancel: ()=>void}) {
  const queryClient = useQueryClient();
  const [djId, setDjId] = useState(schedule.dj_id.toString());
  const [day, setDay] = useState(schedule.day_of_week.toString());
  const [start, setStart] = useState(schedule.start_time);
  const [end, setEnd] = useState(schedule.end_time);
  const [show, setShow] = useState(schedule.show_name);
  const { showAlert } = useModal();

  const handleSave = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/schedule/${schedule.id}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({dj_id: djId, day_of_week: parseInt(day), start_time: start, end_time: end, show_name: show})
    });
    if (res.ok) {
      showAlert({ title: "Success", message: "Schedule entry updated!", style: "success" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      onSave();
    } else {
      let errMsg = "Failed to update schedule";
      try {
        const data = await res.json();
        if (data && data.error) errMsg = data.error;
      } catch (err) {}
      showAlert({ title: "Error", message: errMsg, style: "danger" });
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1">Day</label>
          <select required value={day} onChange={e=>setDay(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm">
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">Start (HH:mm)</label>
          <input required type="time" value={start} onChange={e=>setStart(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">End (HH:mm)</label>
          <input required type="time" value={end} onChange={e=>setEnd(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">DJ</label>
          <select required value={djId} onChange={e=>setDjId(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple text-sm">
            <option value="">Select DJ...</option>
            {djs.map(dj => <option key={dj.id} value={dj.id}>{dj.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">Show Name</label>
          <input required value={show} onChange={e=>setShow(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 text-sm" />
        </div>
      </div>
      <div className="flex space-x-2">
        <button type="submit" className="bg-neon-purple text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-neon-blue transition-colors">Save</button>
        <button type="button" onClick={onCancel} className="bg-white/10 text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-white/20 transition-colors">Cancel</button>
      </div>
    </form>
  )
}

function AddScheduleForm({djs, onAdd}: {djs: any[], onAdd: ()=>void}) {
  const queryClient = useQueryClient();
  const [djId, setDjId] = useState("");
  const [day, setDay] = useState("0");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [show, setShow] = useState("");
  const { showAlert } = useModal();

  const handleAdd = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/schedule", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({dj_id: djId, day_of_week: parseInt(day), start_time: start, end_time: end, show_name: show})
    });
    if (res.ok) {
      showAlert({ title: "Success", message: "Show added to the schedule!", style: "success" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setDjId(""); setDay("0"); setStart(""); setEnd(""); setShow("");
      onAdd();
    } else {
      let errMsg = "Failed to add show";
      try {
        const data = await res.json();
        if (data && data.error) errMsg = data.error;
      } catch (err) {}
      showAlert({ title: "Error", message: errMsg, style: "danger" });
    }
  }

  return (
    <form onSubmit={handleAdd} className="bg-white/[0.02] p-5 sm:p-6 rounded-2xl border border-white/5 space-y-4 w-full">
      <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
        <Plus className="w-4 h-4 text-neon-purple" />
        <h4 className="font-bold text-white uppercase text-xs tracking-wider">Add Schedule Slot</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-1">DJ</label>
          <select required value={djId} onChange={e=>setDjId(e.target.value)} className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white">
            <option value="">Select DJ...</option>
            {djs.map(dj => <option key={dj.id} value={dj.id}>{dj.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-1">Day</label>
          <select required value={day} onChange={e=>setDay(e.target.value)} className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple text-white">
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-1">Start (HH:mm)</label>
          <input required type="time" value={start} onChange={e=>setStart(e.target.value)} className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple" />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-1">End (HH:mm)</label>
          <input required type="time" value={end} onChange={e=>setEnd(e.target.value)} className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple" />
        </div>
        <div className="sm:col-span-2 md:col-span-1 lg:col-span-1">
          <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-1">Show Name</label>
          <input required value={show} onChange={e=>setShow(e.target.value)} className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-purple" />
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <button className="bg-neon-blue hover:bg-neon-blue/85 text-dark-bg px-6 py-2.5 font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-neon-blue/10">Add Slot</button>
      </div>
    </form>
  )
}
