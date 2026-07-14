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

export function AdminPopup() {
  const { isLightMode } = useLogo();
  const [popups, setPopups] = useState<any[]>([]);
  const [heading, setHeading] = useState("");
  const [text, setText] = useState("");
  const [btnText, setBtnText] = useState("");
  const [btnLink, setBtnLink] = useState("");
  const [isPermanent, setIsPermanent] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [popupDelay, setPopupDelay] = useState(10000);
  const [isSavingDelay, setIsSavingDelay] = useState(false);
  const { showAlert } = useModal();

  useEffect(() => {
    loadPopups();
    loadSettings();
  }, []);

  const loadPopups = () => {
    fetchAdmin("/api/admin/site-alerts").then(r => r.json()).then(setPopups);
  };

  const loadSettings = () => {
    fetch("/api/public/settings").then(r => r.json()).then(s => {
      if (s.popup_delay) setPopupDelay(parseInt(s.popup_delay));
    });
  };

  const saveDelay = async () => {
    setIsSavingDelay(true);
    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ popup_delay: popupDelay.toString() })
      });
      if (res.ok) {
        showAlert({ title: "Updated", message: "Pop-up timing saved!", style: "success" });
      }
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to save timing.", style: "danger" });
    } finally {
      setIsSavingDelay(false);
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetchAdmin("/api/admin/site-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heading,
          text,
          btn_text: btnText,
          btn_link: btnLink,
          type: isPermanent ? 'permanent' : 'immediate',
          is_active: isActive
        })
      });
      if (res.ok) {
        showAlert({ title: "Success", message: "Pop-up created!", style: "success" });
        setHeading(""); setText(""); setBtnText(""); setBtnLink("");
        loadPopups();
      } else {
        showAlert({ title: "Error", message: "Failed to create pop-up.", style: "danger" });
      }
    } catch (err) {
      showAlert({ title: "Error", message: "Failed to connect to server.", style: "danger" });
    }
  };

  const handlePushImmediate = async (popup: any) => {
     try {
       const res = await fetchAdmin("/api/admin/push-popup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            heading: popup.heading, 
            text: popup.text, 
            btnText: popup.btn_text, 
            btnLink: popup.btn_link 
          })
       });
       if (res.ok) {
          showAlert({ title: "Pushed", message: "Immediate popup sent to all users!", style: "success" });
       } else {
          showAlert({ title: "Error", message: "Failed to broadcast popup.", style: "danger" });
       }
     } catch (err) {
       showAlert({ title: "Error", message: "Network error occurred.", style: "danger" });
     }
  };

  const handleDelete = async (id: string) => {
    const res = await fetchAdmin(`/api/admin/site-alerts/${id}`, { method: "DELETE" });
    if (res.ok) {
      showAlert({ title: "Deleted", message: "Pop-up removed.", style: "success" });
      loadPopups();
    }
  };

  return (
    <div className={`space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl ${isLightMode ? 'text-black' : 'text-white'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b pb-8 transition-colors ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
        <div>
          <h2 className={`text-2xl sm:text-3xl font-display font-black uppercase tracking-wider flex items-center ${isLightMode ? 'text-black' : 'text-white'}`}>
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 mr-3 text-neon-purple" /> Pop-up <span className="text-neon-purple ml-2">Manager</span>
          </h2>
          <p className={`text-[10px] mt-2 uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Announcements & Alerts</p>
        </div>
      </div>

      <div className={`border rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 space-y-6 sm:space-y-8 shadow-2xl transition-colors max-w-2xl ${isLightMode ? 'bg-white border-black/10' : 'bg-dark-bg/50 border-white/10'}`}>
        <h3 className="text-xl font-bold uppercase tracking-tight">Global Config</h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-[10px] uppercase font-black tracking-widest mb-3 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Permanent Popup Delay (MS)</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="number" 
                value={popupDelay} 
                onChange={e => setPopupDelay(parseInt(e.target.value))} 
                className={`flex-1 rounded-2xl px-5 py-4 focus:border-neon-purple outline-none text-sm transition-all border ${
                  isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'
                }`} 
                placeholder="10000"
              />
              <button 
                onClick={saveDelay}
                disabled={isSavingDelay}
                className="px-8 h-[52px] bg-neon-purple text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-neon-blue transition-all disabled:opacity-50 shadow-lg shadow-neon-purple/20"
              >
                {isSavingDelay ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Timing'}
              </button>
            </div>
            <p className={`text-[10px] mt-3 italic font-medium ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Defines how long to wait before showing the popup. 1000ms = 1 second.</p>
          </div>
        </div>
      </div>

      <div className={`border rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 space-y-8 shadow-2xl transition-colors max-w-2xl ${isLightMode ? 'bg-white border-black/10' : 'bg-dark-bg/50 border-white/10'}`}>
        <h3 className="text-xl font-bold uppercase tracking-tight">Create New Pop-up</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => setIsPermanent(true)} className={`p-6 rounded-2xl border transition-all text-left ${
            isPermanent 
              ? 'bg-neon-purple text-white border-neon-purple shadow-lg shadow-neon-purple/20' 
              : (isLightMode ? 'bg-black/[0.03] border-black/5 text-black/40' : 'bg-white/5 border-white/10 text-white/40')
          }`}>
            <div className="font-black uppercase tracking-tight text-lg mb-1">Permanent</div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Wait {popupDelay/1000}s then display.</p>
          </button>
          <button onClick={() => setIsPermanent(false)} className={`p-6 rounded-2xl border transition-all text-left ${
            !isPermanent 
              ? 'bg-neon-blue text-white border-neon-blue shadow-lg shadow-neon-blue/20' 
              : (isLightMode ? 'bg-black/[0.03] border-black/5 text-black/40' : 'bg-white/5 border-white/10 text-white/40')
          }`}>
            <div className="font-black uppercase tracking-tight text-lg mb-1">Immediate</div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Direct push to all clients.</p>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            {isPermanent && (
              <div className={`flex items-center justify-between p-5 rounded-2xl border transition-colors ${isLightMode ? 'bg-black/[0.02] border-black/5' : 'bg-white/5 border-white/10'}`}>
                <span className="text-xs font-black uppercase tracking-widest">Visibility Status</span>
                <button type="button" onClick={() => setIsActive(!isActive)} className={`w-12 h-6 rounded-full relative transition-colors ${isActive ? 'bg-neon-purple' : (isLightMode ? 'bg-black/10' : 'bg-white/10')}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isActive ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
            )}
            <div>
              <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Popup Heading</label>
              <input 
                value={heading} 
                onChange={e => setHeading(e.target.value)} 
                className={`w-full rounded-2xl px-5 py-4 focus:border-neon-purple outline-none text-sm transition-all border ${
                  isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'
                }`} 
                placeholder="e.g. STATION ANNOUNCEMENT" 
              />
            </div>
            <div>
              <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Message Body</label>
              <textarea 
                value={text} 
                onChange={e => setText(e.target.value)} 
                rows={4} 
                className={`w-full rounded-2xl px-5 py-4 focus:border-neon-purple outline-none text-sm leading-relaxed transition-all border resize-none ${
                  isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'
                }`} 
                placeholder="Type your message here..." 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Button Label</label>
                <input 
                  value={btnText} 
                  onChange={e => setBtnText(e.target.value)} 
                  className={`w-full rounded-xl px-5 py-3.5 focus:border-neon-purple outline-none text-sm transition-all border ${
                    isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'
                  }`} 
                  placeholder="View Details" 
                />
              </div>
              <div>
                <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Button Destination</label>
                <input 
                  value={btnLink} 
                  onChange={e => setBtnLink(e.target.value)} 
                  className={`w-full rounded-xl px-5 py-3.5 focus:border-neon-purple outline-none text-sm transition-all border ${
                    isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'
                  }`} 
                  placeholder="https://dejavufm.com/live" 
                />
              </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-neon-purple text-white font-black py-5 rounded-[1.25rem] hover:bg-neon-blue transition-all uppercase tracking-[0.2em] text-xs shadow-xl shadow-neon-purple/20">Initialize Pop-up</button>
        </form>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
          Stored Campaigns
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}>{popups.length}</span>
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {popups.map(p => (
            <div key={p.id} className={`border rounded-[1.5rem] p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors ${
              isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    p.type === 'permanent' 
                      ? (isLightMode ? 'bg-neon-purple/10 text-neon-purple' : 'bg-neon-purple/20 text-neon-purple') 
                      : (isLightMode ? 'bg-neon-blue/10 text-neon-blue' : 'bg-neon-blue/20 text-neon-blue')
                  }`}>
                    {p.type}
                  </span>
                  {p.type === 'permanent' && (
                    <span className={`text-[9px] uppercase font-black tracking-widest flex items-center gap-1.5 ${p.is_active ? 'text-green-500' : (isLightMode ? 'text-black/20' : 'text-white/20')}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-green-500 animate-pulse' : 'bg-current'}`} />
                      {p.is_active ? 'Online' : 'Offline'}
                    </span>
                  )}
                </div>
                <h4 className={`font-black text-base sm:text-lg tracking-tight truncate ${isLightMode ? 'text-black' : 'text-white'}`}>{p.heading || "No Heading"}</h4>
                <p className={`text-xs sm:text-sm line-clamp-1 mt-0.5 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>{p.text}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                {p.type === 'immediate' && (
                  <button 
                    onClick={() => handlePushImmediate(p)}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-neon-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple transition-all shadow-lg shadow-neon-blue/20"
                  >
                    Broadcast
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(p.id)}
                  className={`p-3 rounded-xl transition-all ${
                    isLightMode ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-black/5' : 'bg-white/5 text-white/20 hover:text-red-500 hover:bg-red-500/10'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
          {popups.length === 0 && (
            <div className={`py-16 text-center border-2 border-dashed rounded-[2rem] transition-colors ${
              isLightMode ? 'border-black/5 text-black/20' : 'border-white/5 text-white/20'
            }`}>
              <div className="uppercase tracking-[0.3em] font-black text-[10px]">Registry is empty</div>
              <p className="text-[10px] mt-2 opacity-50">Create your first popup campaign above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
