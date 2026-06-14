import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminAnalytics({ isAdminUser }: { isAdminUser?: boolean }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const { showAlert, showConfirm } = useModal();

  const fetchStats = async (selectedRange: string) => {
    try {
      const res = await fetchAdmin(`/api/admin/analytics?range=${selectedRange}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setError("");
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to fetch analytics data");
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
      setError("Network error: Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState("");

  const purgeAnalytics = async () => {
    const confirmed = await showConfirm({
      title: "Purge Analytics Data",
      message: "Are you sure you want to PERMANENTLY delete all historical analytics? This will reset all visitor counts, peak listener records, and geo-data. This action cannot be undone.",
      style: "danger",
      confirmText: "Purge Everything"
    });

    if (confirmed) {
      try {
        const res = await fetchAdmin("/api/admin/analytics/purge", { method: "DELETE" });
        if (res.ok) {
          showAlert({
            title: "Data Purged",
            message: "All analytics history has been successfully deleted.",
            style: "success"
          });
          fetchStats(range);
        }
      } catch (err) {
        console.error("Failed to purge analytics", err);
        showAlert({
          title: "Error",
          message: "Failed to purge analytics data.",
          style: "danger"
        });
      }
    }
  };

  useEffect(() => {
    fetchStats(range);
    
    // Connect to Socket.io for instant updates
    const socket = (window as any).socket;
    if (socket) {
      socket.on('stats_update', (update: any) => {
        setStats((prev: any) => ({
          ...prev,
          ...update
        }));
      });
    }
    
    // Fallback polling for historical data
    const interval = setInterval(() => fetchStats(range), 60000);
    return () => {
      clearInterval(interval);
      if (socket) socket.off('stats_update');
    };
  }, [range]);

  if (loading && !stats) return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-10 w-48 bg-white/5 rounded-xl"></div>
        <div className="h-10 w-64 bg-white/5 rounded-full"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1,2,3].map(i => (
          <div key={i} className="h-32 bg-white/5 rounded-3xl"></div>
        ))}
      </div>
      <div className="h-64 bg-white/5 rounded-3xl"></div>
    </div>
  );

  if (error && !stats) return (
    <div className="p-8 space-y-4">
      <div className="bg-red-500/20 border border-red-500/50 p-6 rounded-3xl text-red-400">
        <h4 className="text-lg font-bold mb-2 uppercase">Analytics Error</h4>
        <p className="text-sm opacity-80">{error}</p>
        <button 
          onClick={() => { setLoading(true); fetchStats(range); }}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-400 transition-colors"
        >
          Retry Fetch
        </button>
      </div>
    </div>
  );

  if (!stats) return <div className="text-white/50 p-8">No analytics data available yet.</div>;

  const ranges = [
    { label: "Today", value: "today" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-black font-display uppercase tracking-tight">System <span className="text-neon-purple">Analytics</span></h3>
          <p className="text-white/40 text-sm mt-1 font-mono">Performance and listener insights.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          {isAdminUser && (
            <button 
              onClick={purgeAnalytics}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-black uppercase text-red-500 tracking-widest rounded-full transition-all shrink-0"
            >
              <X className="w-3 h-3" />
              <span>Purge History</span>
            </button>
          )}
          
          <div className="flex bg-white/5 border border-white/10 rounded-full p-1 h-fit shrink-0">
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setLoading(true);
                  setRange(r.value);
                }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  range === r.value 
                    ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20" 
                    : "text-white/40 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2 bg-red-500/5 border border-red-500/20 px-4 py-2 rounded-full h-fit shrink-0">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">{stats.realtimeListeners} Live</span>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:border-neon-purple/50 transition-colors shadow-xl">
          <div className="p-3 bg-neon-purple/10 rounded-2xl w-fit mb-4">
            <Users className="w-6 h-6 text-neon-purple" />
          </div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Total Site Visits</p>
          <p className="text-3xl font-black mt-1">{(stats.monthlyListeners || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:border-neon-blue/50 transition-colors shadow-xl">
          <div className="p-3 bg-neon-blue/10 rounded-2xl w-fit mb-4">
            <TrendingUp className="w-6 h-6 text-neon-blue" />
          </div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Peak Listeners (All Time)</p>
          <p className="text-3xl font-black mt-1">{stats.peakListeners}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:border-yellow-400/50 transition-colors shadow-xl">
          <div className="p-3 bg-yellow-400/10 rounded-2xl w-fit mb-4">
            <PlayCircle className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Total Podcast Plays</p>
          <p className="text-3xl font-black mt-1">{(stats.totalPodcastPlays || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Retention / Hourly Pattern */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
          <h4 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-neon-blue" />
            <span>Listener Activity ({range === 'all' ? 'Historical' : range})</span>
          </h4>
          {stats.retentionData && stats.retentionData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.retentionData}>
                  <defs>
                    <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#00d2ff' }}
                  />
                  <Area type="monotone" dataKey="listeners" stroke="#00d2ff" fillOpacity={1} fill="url(#colorListeners)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-white/30 text-sm">Collecting hourly pattern data...</p>
            </div>
          )}
        </div>

        {/* Geo Distribution */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
          <h4 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <Globe className="w-5 h-5 text-neon-purple" />
            <span>Real-time Global Reach</span>
          </h4>
          {stats.geoData && stats.geoData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[200px] w-full max-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.geoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.geoData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4 w-full">
                {stats.geoData.map((g: any) => (
                  <div key={g.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="text-sm font-semibold">{g.name}</span>
                    </div>
                    <span className="text-white/40 text-sm">{g.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-white/30 text-sm">Waiting for listeners to connect...</p>
            </div>
          )}
        </div>

        {/* Top Podcasts */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
          <h4 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <PlayCircle className="w-5 h-5 text-yellow-400" />
            <span>Top Performing Catch Ups</span>
          </h4>
          {stats.topPodcasts && stats.topPodcasts.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topPodcasts} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#fff" fontSize={12} width={150} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="plays" radius={[0, 4, 4, 0]} barSize={24}>
                    {stats.topPodcasts.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-white/30 text-sm">No podcast play data recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
