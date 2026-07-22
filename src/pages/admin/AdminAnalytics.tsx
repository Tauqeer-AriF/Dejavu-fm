import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Clock, MapPin, Headphones, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";
import { useLogo } from "../../hooks/useLogo";

import { LiveLocationsModal } from '../../components/LiveLocationsModal';
import { PremiumRingLoader } from "../../components/PremiumRingLoader";

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
  const [geoTab, setGeoTab] = useState<"countries" | "cities">("countries");
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
      console.warn("Failed to fetch analytics (likely network error or blocked by ad-blocker).");
      setError("Network error: Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  const [error, setError] = useState("");
  const [showLiveLocations, setShowLiveLocations] = useState(false);
  const [liveLocations, setLiveLocations] = useState<{ip: string, location: string, isp: string, region: string, city: string, browser: string, device: string}[]>([]);

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

  const handleExportAllCSV = () => {
    if (!stats) {
      showAlert({
        title: "No Data",
        message: "No analytics data available to export.",
        style: "warning"
      });
      return;
    }

    const sections: string[] = [];

    // Header section
    sections.push("=== DEJAVUFM SYSTEM ANALYTICS REPORT ===");
    sections.push(`Generated On,${new Date().toISOString().replace('T', ' ').split('.')[0]}`);
    sections.push(`Selected Range,${range.toUpperCase()}`);
    sections.push("");

    // Overview Metrics Section
    sections.push("--- OVERVIEW METRICS ---");
    sections.push("Metric,Value");
    sections.push(`Real-time Listeners,${stats.realtimeListeners || 0}`);
    sections.push(`Monthly/Range Listeners,${stats.monthlyListeners || 0}`);
    sections.push(`Total Podcast Plays,${stats.totalPodcastPlays || 0}`);
    sections.push(`Peak Listener Time,"${stats.peakListenerTime || 'N/A'}"`);
    sections.push(`Top Listener Location,"${stats.topLocation || 'N/A'}"`);
    sections.push(`Most Popular Resident,"${stats.mostListenedDj || 'N/A'}"`);
    sections.push("");

    // 24-Hour Trends Section
    sections.push("--- 24-HOUR LISTENER TRENDS ---");
    sections.push("Hour,Real-time Peak,Historical Average");
    if (stats.trendData && stats.trendData.length > 0) {
      stats.trendData.forEach((item: any) => {
        sections.push(`${item.hour || ""},${item.peak !== undefined ? item.peak : 0},${item.average !== undefined ? item.average : 0}`);
      });
    } else {
      sections.push("No trend data available,,");
    }
    sections.push("");

    // Global Reach Section
    sections.push("--- GLOBAL REACH (COUNTRY DISTRIBUTION) ---");
    sections.push("Country,Reach Percentage");
    if (stats.geoData && stats.geoData.length > 0) {
      stats.geoData.forEach((item: any) => {
        sections.push(`"${item.name || ""}",${item.value !== undefined ? item.value : 0}%`);
      });
    } else {
      sections.push("No country geographic data available,");
    }
    sections.push("");

    sections.push("--- GLOBAL REACH (CITY DISTRIBUTION) ---");
    sections.push("City / Region,Reach Percentage");
    if (stats.cityData && stats.cityData.length > 0) {
      stats.cityData.forEach((item: any) => {
        sections.push(`"${item.name || ""}",${item.value !== undefined ? item.value : 0}%`);
      });
    } else {
      sections.push("No city geographic data available,");
    }
    sections.push("");

    // Top Performing Podcasts Section
    sections.push("--- TOP PERFORMING CATCH UPS (PODCAST PLAYS) ---");
    sections.push("Podcast Title,Plays");
    if (stats.topPodcasts && stats.topPodcasts.length > 0) {
      stats.topPodcasts.forEach((item: any) => {
        sections.push(`"${item.name || ""}",${item.plays !== undefined ? item.plays : 0}`);
      });
    } else {
      sections.push("No podcast data available,");
    }

    const csvContent = sections.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `system_analytics_${range}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showAlert({
      title: "Export Success",
      message: "Comprehensive system analytics CSV report downloaded successfully.",
      style: "success"
    });
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

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] w-full py-12">
        <PremiumRingLoader size="md" />
      </div>
    );
  }

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

  const fetchLiveLocations = async () => {
    setShowLiveLocations(true);
    setLiveLocations([]);
    try {
      const resp = await fetch('/api/admin/analytics/live-locations');
      const data = await resp.json();
      setLiveLocations(data);
    } catch (e) {
      console.error(e);
      setLiveLocations([]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header section with heading, filters, and buttons vertically integrated */}
      <div className="space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h3 className={`text-3xl font-black font-display uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>
              System <span className="text-neon-purple">Analytics</span>
            </h3>
            <p className={`text-sm mt-1 font-mono ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
              Performance and listener insights.
            </p>
          </div>
          
          <div 
            onClick={fetchLiveLocations}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full h-fit shrink-0 border cursor-pointer hover:opacity-80 transition-all ${
              isLightMode ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-red-500/5 border-red-500/20 text-red-500'
            }`}>
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">{stats.realtimeListeners} Live</span>
          </div>
        </div>
        
        <LiveLocationsModal 
          isOpen={showLiveLocations} 
          onClose={() => setShowLiveLocations(false)} 
          locations={liveLocations}
        />
        
        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
          {isAdminUser && (
            <button 
              onClick={purgeAnalytics}
              className={`flex items-center space-x-2 px-4 py-2 border text-[10px] font-black uppercase tracking-widest rounded-full transition-all shrink-0 cursor-pointer ${
                isLightMode 
                  ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-600' 
                  : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-500'
              }`}
            >
              <X className="w-3 h-3" />
              <span>Purge History</span>
            </button>
          )}
          
          <button
            onClick={handleExportAllCSV}
            className={`flex items-center space-x-2 px-4 py-2 border text-[10px] font-black uppercase tracking-widest rounded-full transition-all shrink-0 cursor-pointer ${
              isLightMode 
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-950 text-white' 
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
            }`}
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
          
          <div className={`flex rounded-full p-1 h-fit w-fit border ${
            isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
          }`}>
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setLoading(true);
                  setRange(r.value);
                }}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
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
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Peak Listener Time */}
        <motion.div 
          whileHover="hover" 
          className={`p-6 rounded-3xl group hover:border-orange-500/50 transition-colors shadow-xl relative overflow-hidden border ${
            isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'
          }`}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            initial={{ x: '-150%' }}
          />
          <div className="p-3 bg-orange-500/10 rounded-2xl w-fit mb-4 relative z-10">
            <Clock className="w-6 h-6 text-orange-500" />
          </div>
          <p className={`text-xs uppercase tracking-widest font-bold relative z-10 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Peak Listener Time
          </p>
          <p className={`text-xl font-black mt-1.5 relative z-10 tracking-tight truncate ${isLightMode ? 'text-black' : 'text-white'}`} title={stats.peakListenerTime}>
            {stats.peakListenerTime || "N/A"}
          </p>
        </motion.div>

        {/* Top Location */}
        <motion.div 
          whileHover="hover" 
          className={`p-6 rounded-3xl group hover:border-emerald-500/50 transition-colors shadow-xl relative overflow-hidden border ${
            isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'
          }`}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            initial={{ x: '-150%' }}
          />
          <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit mb-4 relative z-10">
            <MapPin className="w-6 h-6 text-emerald-500" />
          </div>
          <p className={`text-xs uppercase tracking-widest font-bold relative z-10 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Top Listener Location
          </p>
          <p className={`text-2xl font-black mt-1 relative z-10 tracking-tight truncate ${isLightMode ? 'text-black' : 'text-white'}`}>
            {stats.topLocation || "N/A"}
          </p>
        </motion.div>

        {/* Most Listened DJ */}
        <motion.div 
          whileHover="hover" 
          className={`p-6 rounded-3xl group hover:border-pink-500/50 transition-colors shadow-xl relative overflow-hidden border ${
            isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'
          }`}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            initial={{ x: '-150%' }}
          />
          <div className="p-3 bg-pink-500/10 rounded-2xl w-fit mb-4 relative z-10">
            <Headphones className="w-6 h-6 text-pink-500" />
          </div>
          <p className={`text-xs uppercase tracking-widest font-bold relative z-10 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
            Most Popular Resident
          </p>
          <p className={`text-2xl font-black mt-1 relative z-10 tracking-tight truncate ${isLightMode ? 'text-black' : 'text-white'}`}>
            {stats.mostListenedDj || "None yet"}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* 24-Hour Comparative Listener Trends Line Chart */}
        <div id="listener-trends-panel" className={`p-6 rounded-3xl border ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h4 className={`text-lg font-bold flex items-center space-x-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
                <TrendingUp className="w-5 h-5 text-neon-purple" />
                <span>{range === 'today' ? '24-Hour' : range === '7d' ? '7-Day' : range === '30d' ? '30-Day' : 'Historical'} Comparative Trends</span>
              </h4>
              <p className={`text-xs mt-1 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                {range === 'today' 
                  ? 'Comparing real-time active peak listeners against previous historical averages.'
                  : 'Daily engagement trends comparing active reach against overall averages.'}
              </p>
            </div>
          </div>
          {stats.trendData && stats.trendData.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"} />
                  <XAxis 
                    dataKey="hour" 
                    stroke={isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)"} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    minTickGap={range === 'today' ? 20 : 40} 
                  />
                  <YAxis 
                    stroke={isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)"} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isLightMode ? '#ffffff' : '#18181b', 
                      border: isLightMode ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: isLightMode ? '#111827' : '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle" 
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="peak" 
                    name={range === 'today' ? "Real-time Peak" : "Daily Activity"} 
                    stroke={primaryColor} 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={range !== 'today'}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="average" 
                    name={range === 'today' ? "Historical Average" : "Overall Average"} 
                    stroke={secondaryColor} 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`h-[150px] flex items-center justify-center border border-dashed rounded-2xl ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
              <p className={`text-sm ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>Generating trend comparison data...</p>
            </div>
          )}
        </div>

        {/* Geo Distribution */}
        <div className={`p-6 rounded-3xl border ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h4 className={`text-lg font-bold flex items-center space-x-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
              <Globe className="w-5 h-5 text-neon-purple" />
              <span>Real-time Global Reach</span>
            </h4>
            
            <div className={`p-0.5 rounded-full flex self-start ${isLightMode ? 'bg-zinc-100' : 'bg-white/5 border border-white/5'}`}>
              <button
                type="button"
                onClick={() => setGeoTab("countries")}
                className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  geoTab === "countries"
                    ? (isLightMode ? 'bg-white text-zinc-900 shadow-sm' : 'bg-white/10 text-white')
                    : (isLightMode ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white')
                }`}
              >
                Countries
              </button>
              <button
                type="button"
                onClick={() => setGeoTab("cities")}
                className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  geoTab === "cities"
                    ? (isLightMode ? 'bg-white text-zinc-900 shadow-sm' : 'bg-white/10 text-white')
                    : (isLightMode ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-400 hover:text-white')
                }`}
              >
                Cities
              </button>
            </div>
          </div>

          {(() => {
            const geoDisplayData = (geoTab === "countries" ? stats?.geoData : stats?.cityData) || [];
            return geoDisplayData.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-8">
                <div className="h-[200px] w-full max-w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={geoDisplayData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {geoDisplayData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={getBrandColor(index)} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  {geoDisplayData.map((g: any, index: number) => (
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
            );
          })()}
        </div>

        {/* Top Pages */}
        <div className={`p-6 rounded-3xl border ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'}`}>
          <h4 className={`text-lg font-bold mb-6 flex items-center space-x-2 ${isLightMode ? 'text-black' : 'text-white'}`}>
            <FileText className="w-5 h-5 text-neon-blue" />
            <span>Top Visited Pages</span>
          </h4>
          {stats.topPages && stats.topPages.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topPages} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"} horizontal={false} />
                  <XAxis type="number" stroke={isLightMode ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)"} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey="path" 
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
                    formatter={(value: any, name: string, props: any) => {
                      if (name === 'visits') return [`${value} Visits`, 'Visits'];
                      const stay = props.payload.avgStay;
                      const mins = Math.floor(stay / 60);
                      const secs = stay % 60;
                      const stayStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                      return [`${value} Visits (Avg. Stay: ${stayStr})`, 'Metrics'];
                    }}
                  />
                  <Bar dataKey="visits" radius={[0, 4, 4, 0]} barSize={24}>
                    {stats.topPages.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getBrandColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`h-[100px] flex items-center justify-center border border-dashed rounded-2xl ${isLightMode ? 'border-black/10' : 'border-white/10'}`}>
              <p className={`text-sm ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>No page visit data recorded yet.</p>
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
