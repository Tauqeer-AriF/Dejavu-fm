import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminPopup() {
  const [popups, setPopups] = useState<any[]>([]);
  const [heading, setHeading] = useState("");
  const [text, setText] = useState("");
  const [btnText, setBtnText] = useState("");
  const [btnLink, setBtnLink] = useState("");
  const [isPermanent, setIsPermanent] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const { showAlert } = useModal();

  useEffect(() => {
    loadPopups();
  }, []);

  const loadPopups = () => {
    fetchAdmin("/api/admin/popups").then(r => r.json()).then(setPopups);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetchAdmin("/api/admin/popups", {
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
    const res = await fetchAdmin(`/api/admin/popups/${id}`, { method: "DELETE" });
    if (res.ok) {
      showAlert({ title: "Deleted", message: "Pop-up removed.", style: "success" });
      loadPopups();
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-display font-black uppercase text-white tracking-wider flex items-center">
            <Sparkles className="w-8 h-8 mr-3 text-neon-purple" /> Pop-up <span className="text-neon-purple ml-2">Manager</span>
          </h2>
          <p className="text-white/40 text-xs mt-2 uppercase tracking-widest font-black">Announcements & Alerts</p>
        </div>
      </div>

      <div className="bg-dark-bg/50 border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl max-w-2xl">
        <h3 className="text-xl font-bold uppercase tracking-tight">Create New Pop-up</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => setIsPermanent(true)} className={`p-6 rounded-2xl border transition-all text-left ${isPermanent ? 'bg-neon-purple/10 border-neon-purple text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
            <div className="font-bold text-lg mb-1">Permanent</div>
            <p className="text-xs opacity-60">Shows 3s after load for everyone.</p>
          </button>
          <button onClick={() => setIsPermanent(false)} className={`p-6 rounded-2xl border transition-all text-left ${!isPermanent ? 'bg-neon-blue/10 border-neon-blue text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
            <div className="font-bold text-lg mb-1">Immediate</div>
            <p className="text-xs opacity-60">Pushed once in real-time via sockets.</p>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            {isPermanent && (
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                <span className="text-sm font-bold">Show on website</span>
                <button type="button" onClick={() => setIsActive(!isActive)} className={`w-12 h-6 rounded-full relative transition-colors ${isActive ? 'bg-neon-purple' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isActive ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
            )}
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-2">Popup Heading (Optional)</label>
              <input value={heading} onChange={e => setHeading(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-neon-purple outline-none text-sm" placeholder="e.g. BREAKING NEWS" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-2">Message Text</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-neon-purple outline-none text-sm leading-relaxed" placeholder="Write your message here..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input value={btnText} onChange={e => setBtnText(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 focus:border-neon-purple outline-none text-sm" placeholder="Button Label (Optional)" />
              <input value={btnLink} onChange={e => setBtnLink(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 focus:border-neon-purple outline-none text-sm" placeholder="Button Link (https://...)" />
            </div>
          </div>
          <button type="submit" className="w-full bg-neon-purple text-white font-bold py-4 rounded-2xl hover:bg-neon-blue transition-all uppercase tracking-widest text-xs shadow-xl">Create Pop-up</button>
        </form>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold uppercase tracking-tight">Active & Saved Pop-ups</h3>
        <div className="grid grid-cols-1 gap-4">
          {popups.map(p => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${p.type === 'permanent' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-neon-blue/20 text-neon-blue'}`}>
                    {p.type}
                  </span>
                  {p.type === 'permanent' && (
                    <span className={`text-[10px] uppercase font-bold ${p.is_active ? 'text-green-500' : 'text-white/20'}`}>
                      {p.is_active ? '● Active' : 'Inactive'}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-lg">{p.heading || "No Heading"}</h4>
                <p className="text-sm text-white/60 line-clamp-1">{p.text}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {p.type === 'immediate' && (
                  <button 
                    onClick={() => handlePushImmediate(p)}
                    className="px-4 py-2 bg-neon-blue/20 border border-neon-blue/30 text-neon-blue rounded-xl text-[10px] font-black uppercase hover:bg-neon-blue hover:text-dark-bg transition-all"
                  >
                    Push Now
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(p.id)}
                  className="p-2 text-white/20 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}
          {popups.length === 0 && (
            <div className="py-12 text-center text-white/20 uppercase tracking-widest font-black text-xs border border-dashed border-white/10 rounded-2xl">
              No saved pop-ups.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
