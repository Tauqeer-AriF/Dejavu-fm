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

export function AdminSchedule() {
  const { isLightMode } = useLogo();
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
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 ${isLightMode ? "border-black/10" : "border-white/10"}`}>
        <div>
          <h3 className={`text-2xl font-bold ${isLightMode ? "text-black" : "text-white"}`}>Manage Schedule</h3>
          <p className={`text-xs mt-1 ${isLightMode ? "text-black/50" : "text-white/50"}`}>Organize and edit weekly live slots by day.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? "text-black/40" : "text-white/40"}`} />
          <input
            type="text"
            placeholder="Search slot, DJ, or show..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-8 py-2 border rounded-xl text-sm focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/20 transition-all ${isLightMode ? "bg-black/5 border-black/10 text-black placeholder-black/30" : "bg-white/5 border-white/10 text-white placeholder-white/30"}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isLightMode ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white"}`}
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
            <div key={dayName} className={`border rounded-2xl p-5 space-y-4 ${isLightMode ? "bg-white border-black/5 shadow-sm" : "bg-white/[0.02] border-white/5"}`}>
              <div className={`flex items-center justify-between border-b pb-2 ${isLightMode ? "border-black/5" : "border-white/5"}`}>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-neon-purple" />
                  <h4 className={`font-bold tracking-wide uppercase text-sm ${isLightMode ? "text-black" : "text-white"}`}>{dayName}</h4>
                </div>
                <span className={`text-xs font-mono ${isLightMode ? "text-black/40" : "text-white/40"}`}>{daySlots.length} slot{daySlots.length === 1 ? "" : "s"}</span>
              </div>

              {daySlots.length === 0 ? (
                <p className={`text-xs italic py-2 ${isLightMode ? "text-black/40" : "text-white/30"}`}>No scheduled shows for this day.</p>
              ) : (
                <div className="space-y-3">
                  {daySlots.map(s => (
                    <div key={s.id} className={`border p-4 rounded-xl flex flex-col transition-colors ${isLightMode ? "bg-black/5 border-black/10 hover:border-black/20" : "bg-dark-bg/60 border-white/10 hover:border-white/20"}`}>
                      {editingId === s.id ? (
                        <EditScheduleForm schedule={s} djs={djs} onSave={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                            <span className={`font-mono text-xs font-semibold px-2.5 py-1 rounded border shrink-0 inline-block text-center sm:w-28 ${isLightMode ? "bg-white text-neon-blue border-black/10 shadow-sm" : "bg-white/5 text-neon-blue border-white/5"}`}>
                              {s.start_time} - {s.end_time}
                            </span>
                            <div className="flex items-center gap-3">
                              {s.image_url && (
                                <img
                                  src={s.image_url}
                                  alt={s.show_name}
                                  className={`w-10 h-10 object-cover rounded-lg border shrink-0 ${isLightMode ? "border-black/10" : "border-white/10"}`}
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div>
                                <span className={`font-bold text-sm ${isLightMode ? "text-black" : "text-white"}`}>{s.dj_name}</span> 
                                <span className={`text-xs ml-2 ${isLightMode ? "text-black/50" : "text-white/50"}`}>({s.show_name})</span>
                              </div>
                            </div>
                          </div>
                          <div className={`flex items-center space-x-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 justify-end ${isLightMode ? "border-black/5" : "border-white/5"}`}>
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
          <div className={`text-center py-12 rounded-2xl border p-6 space-y-3 ${isLightMode ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"}`}>
            <p className={`text-sm ${isLightMode ? "text-black/40" : "text-white/40"}`}>No schedule slots matched your search term "{searchQuery}".</p>
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
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();
  const [selectedDjIds, setSelectedDjIds] = useState<string[]>(() => {
    if (schedule.dj_ids && Array.isArray(schedule.dj_ids)) {
      return schedule.dj_ids.map((id: any) => id.toString());
    }
    if (schedule.dj_id) {
      return schedule.dj_id.toString().split(',').map((id: string) => id.trim()).filter(Boolean);
    }
    return [];
  });
  const [day, setDay] = useState(schedule.day_of_week.toString());
  const [start, setStart] = useState(schedule.start_time);
  const [end, setEnd] = useState(schedule.end_time);
  const [show, setShow] = useState(schedule.show_name);
  const [imageUrl, setImageUrl] = useState(schedule.image_url || "");
  const { showAlert } = useModal();

  const handleSave = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin(`/api/admin/schedule/${schedule.id}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({dj_id: selectedDjIds, day_of_week: parseInt(day), start_time: start, end_time: end, show_name: show, image_url: imageUrl || null})
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={`block text-xs uppercase mb-1 ${isLightMode ? "text-black/60" : "text-white/60"}`}>Day</label>
          <select required value={day} onChange={e=>setDay(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple ${isLightMode ? "bg-white border-black/10 text-black" : "bg-[#0d0d0f] border-white/10 text-white"}`}>
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={`block text-xs uppercase mb-1 ${isLightMode ? "text-black/60" : "text-white/60"}`}>Start (HH:mm)</label>
          <input required type="time" value={start} onChange={e=>setStart(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple ${isLightMode ? "bg-white border-black/10 text-black" : "bg-[#0d0d0f] border-white/10 text-white"}`} />
        </div>
        <div>
          <label className={`block text-xs uppercase mb-1 ${isLightMode ? "text-black/60" : "text-white/60"}`}>End (HH:mm)</label>
          <input required type="time" value={end} onChange={e=>setEnd(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple ${isLightMode ? "bg-white border-black/10 text-black" : "bg-[#0d0d0f] border-white/10 text-white"}`} />
        </div>
        <div>
          <label className={`block text-xs uppercase mb-1 ${isLightMode ? "text-black/60" : "text-white/60"}`}>Show Name</label>
          <input required value={show} onChange={e=>setShow(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple ${isLightMode ? "bg-white border-black/10 text-black" : "bg-[#0d0d0f] border-white/10 text-white"}`} />
        </div>
        <div className="col-span-1 sm:col-span-2 md:col-span-4">
          <label className={`block text-xs uppercase mb-1.5 font-bold ${isLightMode ? "text-black/60" : "text-white/60"}`}>DJs (Leave all unchecked for "Resident DJ")</label>
          <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 border rounded-xl p-3 max-h-32 overflow-y-auto ${isLightMode ? "bg-black/5 border-black/10" : "bg-[#0d0d0f]/50 border-white/10"}`}>
            {djs.map(dj => {
              const isChecked = selectedDjIds.includes(dj.id.toString());
              return (
                <label key={dj.id} className={`flex items-center space-x-2 text-xs cursor-pointer transition-colors ${isLightMode ? "text-black/80 hover:text-black" : "text-white/80 hover:text-white"}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedDjIds(selectedDjIds.filter(id => id !== dj.id.toString()));
                      } else {
                        setSelectedDjIds([...selectedDjIds, dj.id.toString()]);
                      }
                    }}
                    className={`rounded text-neon-purple focus:ring-neon-purple/50 focus:ring-offset-0 ${isLightMode ? "bg-white border-black/20" : "bg-[#0d0d0f] border-white/10"}`}
                  />
                  <span>{dj.name}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="col-span-1 sm:col-span-2 md:col-span-4">
          <ImageUploadField
            label="Schedule Artwork / Banner (Optional)"
            value={imageUrl}
            onChange={setImageUrl}
            placeholder="Enter artwork image URL or upload..."
          />
        </div>
      </div>
      <div className="flex space-x-2">
        <button type="submit" className="bg-neon-purple text-white px-4 py-1.5 font-bold rounded text-sm hover:bg-neon-blue transition-colors">Save</button>
        <button type="button" onClick={onCancel} className={`px-4 py-1.5 font-bold rounded text-sm transition-colors ${isLightMode ? "bg-black/10 text-black hover:bg-black/20" : "bg-white/10 text-white hover:bg-white/20"}`}>Cancel</button>
      </div>
    </form>
  )
}

function AddScheduleForm({djs, onAdd}: {djs: any[], onAdd: ()=>void}) {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();
  const [selectedDjIds, setSelectedDjIds] = useState<string[]>([]);
  const [day, setDay] = useState("0");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [show, setShow] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const { showAlert } = useModal();

  const handleAdd = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/schedule", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({dj_id: selectedDjIds, day_of_week: parseInt(day), start_time: start, end_time: end, show_name: show, image_url: imageUrl || null})
    });
    if (res.ok) {
      showAlert({ title: "Success", message: "Show added to the schedule!", style: "success" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setSelectedDjIds([]); setDay("0"); setStart(""); setEnd(""); setShow(""); setImageUrl("");
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
    <form onSubmit={handleAdd} className={`p-5 sm:p-6 rounded-2xl border space-y-4 w-full ${isLightMode ? "bg-white border-black/5 shadow-sm" : "bg-white/[0.02] border-white/5"}`}>
      <div className={`flex items-center space-x-2 border-b pb-2 ${isLightMode ? "border-black/5" : "border-white/5"}`}>
        <Plus className="w-4 h-4 text-neon-purple" />
        <h4 className={`font-bold uppercase text-xs tracking-wider ${isLightMode ? "text-black" : "text-white"}`}>Add Schedule Slot</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={`block text-[10px] uppercase font-black tracking-widest mb-1 ${isLightMode ? "text-black/40" : "text-white/40"}`}>Day</label>
          <select required value={day} onChange={e=>setDay(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple ${isLightMode ? "bg-white border-black/10 text-black" : "bg-[#0d0d0f] border-white/10 text-white"}`}>
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={`block text-[10px] uppercase font-black tracking-widest mb-1 ${isLightMode ? "text-black/40" : "text-white/40"}`}>Start (HH:mm)</label>
          <input required type="time" value={start} onChange={e=>setStart(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple ${isLightMode ? "bg-white border-black/10 text-black" : "bg-[#0d0d0f] border-white/10 text-white"}`} />
        </div>
        <div>
          <label className={`block text-[10px] uppercase font-black tracking-widest mb-1 ${isLightMode ? "text-black/40" : "text-white/40"}`}>End (HH:mm)</label>
          <input required type="time" value={end} onChange={e=>setEnd(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple ${isLightMode ? "bg-white border-black/10 text-black" : "bg-[#0d0d0f] border-white/10 text-white"}`} />
        </div>
        <div>
          <label className={`block text-[10px] uppercase font-black tracking-widest mb-1 ${isLightMode ? "text-black/40" : "text-white/40"}`}>Show Name</label>
          <input required value={show} onChange={e=>setShow(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neon-purple ${isLightMode ? "bg-white border-black/10 text-black" : "bg-[#0d0d0f] border-white/10 text-white"}`} />
        </div>
        <div className="col-span-1 sm:col-span-2 md:col-span-4">
          <label className={`block text-[10px] uppercase font-black tracking-widest mb-1.5 ${isLightMode ? "text-black/40" : "text-white/40"}`}>DJs (Leave all unchecked for "Resident DJ")</label>
          <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 border rounded-xl p-3 max-h-32 overflow-y-auto ${isLightMode ? "bg-black/5 border-black/10" : "bg-[#0d0d0f]/50 border-white/10"}`}>
            {djs.map(dj => {
              const isChecked = selectedDjIds.includes(dj.id.toString());
              return (
                <label key={dj.id} className={`flex items-center space-x-2 text-xs cursor-pointer transition-colors ${isLightMode ? "text-black/80 hover:text-black" : "text-white/80 hover:text-white"}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedDjIds(selectedDjIds.filter(id => id !== dj.id.toString()));
                      } else {
                        setSelectedDjIds([...selectedDjIds, dj.id.toString()]);
                      }
                    }}
                    className={`rounded text-neon-purple focus:ring-neon-purple/50 focus:ring-offset-0 ${isLightMode ? "bg-white border-black/20" : "bg-[#0d0d0f] border-white/10"}`}
                  />
                  <span>{dj.name}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="col-span-1 sm:col-span-2 md:col-span-4">
          <ImageUploadField
            label="Schedule Artwork / Banner (Optional)"
            value={imageUrl}
            onChange={setImageUrl}
            placeholder="Enter artwork image URL or upload..."
          />
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <button className="bg-neon-blue hover:bg-neon-blue/85 text-dark-bg px-6 py-2.5 font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-neon-blue/10">Add Slot</button>
      </div>
    </form>
  )
}
