import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminLiveTools() {
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(8000);
  const { showAlert } = useModal();

  const handlePushTrack = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/push-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artist, title, duration })
    });
    if (res.ok) {
      showAlert({ title: "Success", message: `Pushed "${artist} - ${title}" to live stream!`, style: "success" });
      setArtist("");
      setTitle("");
    } else {
      showAlert({ title: "Error", message: "Failed to push track ID.", style: "danger" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">Live Studio Tools</h3>
      
      <div className="bg-dark-bg border border-white/10 p-6 rounded-xl">
        <h4 className="text-lg font-bold mb-4 flex items-center space-x-2">
          <Radio className="w-5 h-5 text-neon-blue" />
          <span>Push Track ID</span>
        </h4>
        <p className="text-sm text-white/50 mb-6">
          Display the current track being played on the live video stream and drop an alert in the public chat.
        </p>
        <form onSubmit={handlePushTrack} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Artist Name</label>
            <input 
              type="text" 
              value={artist} 
              onChange={e => setArtist(e.target.value)} 
              required
              className="w-full bg-panel-bg border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-neon-purple"
              placeholder="e.g. Disclosure"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Track Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required
              className="w-full bg-panel-bg border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-neon-purple"
              placeholder="e.g. Latch"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Display Duration</label>
            <select 
              value={duration} 
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full bg-panel-bg border border-white/10 rounded px-4 py-2 focus:outline-none focus:border-neon-purple text-white cursor-pointer"
            >
              <option value={5000}>5 Seconds</option>
              <option value={8000}>8 Seconds (Default)</option>
              <option value={15000}>15 Seconds</option>
              <option value={30000}>30 Seconds</option>
              <option value={60000}>1 Minute</option>
              <option value={120000}>2 Minutes</option>
              <option value={300000}>5 Minutes</option>
            </select>
          </div>
          <button type="submit" className="px-6 py-2 bg-neon-purple text-white rounded hover:bg-neon-blue transition-colors uppercase tracking-widest text-sm font-bold flex items-center justify-center w-full sm:w-auto">
            Push to Stream
          </button>
        </form>
      </div>
    </div>
  );
}
