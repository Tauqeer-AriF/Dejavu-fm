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
  const { showConfirm, showAlert } = useModal();
  
  const load = () => {
    fetch("/api/public/schedule").then(r=>r.json()).then(setSchedule);
    fetch("/api/public/djs").then(r=>r.json()).then(setDJs);
    queryClient.invalidateQueries({ queryKey: ['schedule'] });
  };
  useEffect(() => { load(); }, []);

  const d = (day: number) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">Manage Schedule</h3>
      
      <div className="space-y-2">
        {schedule.map(s => (
          <div key={s.id} className="bg-dark-bg border border-white/10 p-3 rounded-lg flex flex-col">
            {editingId === s.id ? (
              <EditScheduleForm schedule={s} djs={djs} onSave={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-center">
                  <span className="inline-block w-full md:w-12 font-bold text-neon-blue mb-1 md:mb-0">{d(s.day_of_week)}</span>
                  <span className="font-mono text-sm text-white/50 md:mx-4 mb-1 md:mb-0 block md:inline-block">{s.start_time} - {s.end_time}</span>
                  <div>
                    <span className="font-bold">{s.dj_name}</span> <span className="text-sm text-white/50 ml-2">({s.show_name})</span>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button onClick={() => setEditingId(s.id)} className="text-neon-blue hover:text-white text-sm px-2 py-1">Edit</button>
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
                  }} className="text-red-500 hover:text-red-400 text-sm px-2 py-1">Remove</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <AddScheduleForm djs={djs} onAdd={load} />
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
      body: JSON.stringify({dj_id: parseInt(djId), day_of_week: parseInt(day), start_time: start, end_time: end, show_name: show})
    });
    if (res.ok) {
      showAlert({ title: "Success", message: "Schedule entry updated!", style: "success" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      onSave();
    } else {
      showAlert({ title: "Error", message: "Failed to update schedule", style: "danger" });
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
      body: JSON.stringify({dj_id: parseInt(djId), day_of_week: parseInt(day), start_time: start, end_time: end, show_name: show})
    });
    if (res.ok) {
      showAlert({ title: "Success", message: "Show added to the schedule!", style: "success" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setDjId(""); setDay("0"); setStart(""); setEnd(""); setShow("");
      onAdd();
    } else {
      showAlert({ title: "Error", message: "Failed to add show", style: "danger" });
    }
  }

  return (
    <form onSubmit={handleAdd} className="mt-8 bg-dark-bg/50 p-6 rounded-xl border border-white/5 space-y-4 max-w-xl">
      <h4 className="font-bold">Add Schedule Slot</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase mb-1">DJ</label>
          <select required value={djId} onChange={e=>setDjId(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple">
            <option value="">Select DJ...</option>
            {djs.map(dj => <option key={dj.id} value={dj.id}>{dj.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">Day</label>
          <select required value={day} onChange={e=>setDay(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-neon-purple">
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">Start Time (HH:mm)</label>
          <input required type="time" value={start} onChange={e=>setStart(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
        </div>
        <div>
          <label className="block text-xs uppercase mb-1">End Time (HH:mm)</label>
          <input required type="time" value={end} onChange={e=>setEnd(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs uppercase mb-1">Show Name</label>
          <input required value={show} onChange={e=>setShow(e.target.value)} className="w-full bg-panel-bg border border-white/10 rounded px-3 py-1.5" />
        </div>
      </div>
      <button className="bg-neon-blue text-dark-bg px-4 py-2 font-bold rounded mt-4">Add Slot</button>
    </form>
  )
}
