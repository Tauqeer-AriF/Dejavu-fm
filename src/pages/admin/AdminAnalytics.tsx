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

export function AdminAnalytics({ isAdminUser }: { isAdminUser?: boolean }) {
  const { isLightMode } = useLogo();
  const [stats, setStats] = useState<any>(null);
  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
  });

  const primaryColor = settings?.primary_color || '#b026ff';
  const secondaryColor = settings?.secondary_color || '#00d2ff';

  const getBrandColor = (index: number) => {
    const colors = [
      primaryColor,
      secondaryColor,
      '#facc15', // yellow
      '#10b981', // emerald
      '#6b7280'  // grey
    ];
    return colors[index % colors.length];
  };

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const { showAlert, showConfirm } = useModal();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        <div className={`h-10 w-48 rounded-xl ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}></div>
        <div className={`h-10 w-64 rounded-full ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1,2,3].map(i => (
          <div key={i} className={`h-32 rounded-3xl ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}></div>
        ))}
      </div>
      <div className={`h-64 rounded-3xl ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`}></div>
    </div>
  );

  if (error && !stats) return (
    <div className="p-8 space-y-4">
      <div className={`border p-6 rounded-3xl ${isLightMode ? 'bg-red-50 border-red-200 text-red-600' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
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

  if (!stats) return <div className={`p-8 font-mono text-sm ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>No analytics data available yet.</div>;

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
          <h3 className={`text-3xl font-black font-display uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>
            System <span className="text-neon-purple">Analytics</span>
          </h3>
          <p className={`text-sm mt-1 font-mono ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Performance and listener insights.
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          {isAdminUser && (
            <button 
              onClick={purgeAnalytics}
              className={`flex items-center space-x-2 px-4 py-2 border text-[10px] font-black uppercase tracking-widest rounded-full transition-all shrink-0 ${
                isLightMode 
                  ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-600' 
                  : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-500'
              }`}
            >
              <X className="w-3 h-3" />
              <span>Purge History</span>
            </button>
          )}
          
          <div className={`flex rounded-full p-1 h-fit w-full sm:w-auto shrink-0 order-last sm:order-none border ${
            isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
          }`}>
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setLoading(true);
                  setRange(r.value);
                }}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  range === r.value 
                    ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/20" 
                    : isLightMode 
                      ? "text-black/50 hover:text-black" 
                      : "text-white/40 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full h-fit shrink-0 border ${
            isLightMode ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-red-500/5 border-red-500/20 text-red-500'
          }`}>
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">{stats.realtimeListeners} Live</span>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div 
          whileHover="hover" 
          className={`p-6 rounded-3xl group hover:border-neon-purple/50 transition-colors shadow-xl relative overflow-hidden border ${
            isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'
          }`}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            initial={{ x: '-150%' }}
          />
          <div className="p-3 bg-neon-purple/10 rounded-2xl w-fit mb-4 relative z-10">
            <Users className="w-6 h-6 text-neon-purple" />
          </div>
          <p className={`text-xs uppercase tracking-widest font-bold relative z-10 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Total Site Visits
          </p>
          <p className={`text-3xl font-black mt-1 relative z-10 ${isLightMode ? 'text-black' : 'text-white'}`}>
            {(stats.monthlyListeners || 0).toLocaleString()}
          </p>
        </motion.div>

        <motion.div 
          whileHover="hover" 
          className={`p-6 rounded-3xl group hover:border-neon-blue/50 transition-colors shadow-xl relative overflow-hidden border ${
            isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'
          }`}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            initial={{ x: '-150%' }}
          />
          <div className="p-3 bg-neon-blue/10 rounded-2xl w-fit mb-4 relative z-10">
            <TrendingUp className="w-6 h-6 text-neon-blue" />
          </div>
          <p className={`text-xs uppercase tracking-widest font-bold relative z-10 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Peak Listeners (All Time)
          </p>
          <p className={`text-3xl font-black mt-1 relative z-10 ${isLightMode ? 'text-black' : 'text-white'}`}>
            {stats.peakListeners}
          </p>
        </motion.div>

        <motion.div 
          whileHover="hover" 
          className={`p-6 rounded-3xl group hover:border-yellow-400/50 transition-colors shadow-xl relative overflow-hidden border ${
            isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'
          }`}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            initial={{ x: '-150%' }}
          />
          <div className="p-3 bg-yellow-400/10 rounded-2xl w-fit mb-4 relative z-10">
            <PlayCircle className="w-6 h-6 text-yellow-400" />
          </div>
          <p className={`text-xs uppercase tracking-widest font-bold relative z-10 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Total Podcast Plays
          </p>
          <p className={`text-3xl font-black mt-1 relative z-10 ${isLightMode ? 'text-black' : 'text-white'}`}>
            {(stats.totalPodcastPlays || 0).toLocaleString()}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Retention / Hourly Pattern */}
        <div className={`p-6 rounded-3xl border ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'}`}>
          <h4 className={`text-lg font-bold mb-6 flex items-center space-x-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
            <Calendar className="w-5 h-5 text-neon-blue" />
            <span>Listener Activity ({range === 'all' ? 'Historical' : range})</span>
          </h4>
          {stats.retentionData && stats.retentionData.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.retentionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={secondaryColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"} />
                  <XAxis dataKey="time" stroke={isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)"} fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis stroke={isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)"} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isLightMode ? '#ffffff' : '#18181b', 
                      border: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: isLightMode ? '#111827' : '#ffffff'
                    }}
                    itemStyle={{ color: secondaryColor }}
                  />
                  <Area type="monotone" dataKey="listeners" stroke={secondaryColor} fillOpacity={1} fill="url(#colorListeners)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`h-[100px] flex items-center justify-center border border-dashed rounded-2xl ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
              <p className={`text-sm ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>Collecting hourly pattern data...</p>
            </div>
          )}
        </div>

        {/* Geo Distribution */}
        <div className={`p-6 rounded-3xl border ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'}`}>
          <h4 className={`text-lg font-bold mb-6 flex items-center space-x-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
            <Globe className="w-5 h-5 text-neon-purple" />
            <span>Real-time Global Reach</span>
          </h4>
          {stats.geoData && stats.geoData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-8">
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
                        <Cell key={`cell-${index}`} fill={getBrandColor(index)} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4 w-full">
                {stats.geoData.map((g: any, index: number) => (
                  <div key={g.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getBrandColor(index) }} />
                      <span className={`text-sm font-semibold ${isLightMode ? 'text-black' : 'text-white'}`}>{g.name}</span>
                    </div>
                    <span className={`text-sm ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>{g.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`h-[100px] flex items-center justify-center border border-dashed rounded-2xl ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
              <p className={`text-sm ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>Waiting for listeners to connect...</p>
            </div>
          )}
        </div>

        {/* Top Podcasts */}
        <div className={`p-6 rounded-3xl border ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'}`}>
          <h4 className={`text-lg font-bold mb-6 flex items-center space-x-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
            <PlayCircle className="w-5 h-5 text-yellow-400" />
            <span>Top Performing Catch Ups</span>
          </h4>
          {stats.topPodcasts && stats.topPodcasts.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topPodcasts} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"} horizontal={false} />
                  <XAxis type="number" stroke={isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)"} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke={isLightMode ? "#111827" : "#fff"} 
                    fontSize={10} 
                    width={isMobile ? 0 : 100} 
                    tick={!isMobile}
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: isLightMode ? '#ffffff' : '#18181b', 
                      border: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: isLightMode ? '#111827' : '#ffffff'
                    }}
                  />
                  <Bar dataKey="plays" radius={[0, 4, 4, 0]} barSize={24}>
                    {stats.topPodcasts.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getBrandColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`h-[100px] flex items-center justify-center border border-dashed rounded-2xl ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
              <p className={`text-sm ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>No podcast play data recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
