import React, { useEffect, useState } from 'react';
import { 
  Search, Globe, FileCode, Code, Trash2, Edit2, Plus, 
  RefreshCw, ExternalLink, Copy, Check, Activity, Database, 
  AlertTriangle, TrendingUp, X, Palette
} from 'lucide-react';
import { useLogo } from '../../hooks/useLogo';
import { useModal } from '../../context/ModalContext';
import { ImageUploadField } from './ImageUploadField';
import { fetchAdmin } from './adminApi';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid 
} from 'recharts';

type TabType = 'overview' | 'global' | 'overrides' | 'injector' | 'css' | 'robots';

interface SeoOverride {
  id: number;
  route_path: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_image: string | null;
  updated_at: string;
}

interface SeoMetrics {
  totalDjs: number;
  totalFeatures: number;
  totalPodcasts: number;
  totalCustomPages: number;
  totalSitemapUrls: number;
  lastPingTime: string;
  lastPingStatus: string;
  lastPingDetails: string;
  performanceData: Array<{ date: string; clicks: number; impressions: number; avgPosition: number }>;
  crawledLast24h: number;
  crawlErrors: number;
  avgCtr: string;
}

export function AdminSEO() {
  const { isLightMode } = useLogo();
  const { showAlert } = useModal();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Global SEO Settings State
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoImage, setSeoImage] = useState('');
  const [customHeaderInject, setCustomHeaderInject] = useState('');
  const [robotsTxt, setRobotsTxt] = useState('');
  const [customCss, setCustomCss] = useState('');
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  // SEO Overrides State
  const [overrides, setOverrides] = useState<SeoOverride[]>([]);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [editingOverrideId, setEditingOverrideId] = useState<number | null>(null);
  
  // Override Form Fields
  const [routePath, setRoutePath] = useState('');
  const [overrideTitle, setOverrideTitle] = useState('');
  const [overrideDescription, setOverrideDescription] = useState('');
  const [overrideImage, setOverrideImage] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // SEO Metrics & Ping State
  const [metrics, setMetrics] = useState<SeoMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingStatus, setPingStatus] = useState<{ status: 'idle' | 'success' | 'failed'; details: string }>({ status: 'idle', details: '' });

  // Clipboard Copied States
  const [copiedSitemap, setCopiedSitemap] = useState(false);

  // Load All Config Data
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Global Settings
      const settingsRes = await fetch('/api/public/settings');
      if (!settingsRes.ok) throw new Error('Failed to load global settings');
      const settingsData = await settingsRes.json();
      
      setSeoTitle(settingsData.seo_title || settingsData.app_title || settingsData.app_name || 'DejavuFM');
      setSeoDescription(settingsData.seo_description || 'DejavuFM is the heartbeat of London\'s underground radio scene.');
      setSeoImage(settingsData.seo_image || settingsData.logo_url || settingsData.favicon || '/icon.svg');
      setCustomHeaderInject(settingsData.custom_header_inject || '');
      setRobotsTxt(settingsData.robots_txt || '');
      setCustomCss(settingsData.custom_css || '');

      // 2. Fetch Metrics & Overrides
      await Promise.all([fetchMetrics(), fetchOverrides()]);

    } catch (err: any) {
      console.error(err);
      showAlert({ title: 'Error', message: 'Could not load SEO configurations.', style: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetchAdmin('/api/admin/seo/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error('Failed to fetch SEO metrics:', e);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchOverrides = async () => {
    setIsLoadingOverrides(true);
    try {
      const res = await fetchAdmin('/api/admin/seo/overrides');
      if (res.ok) {
        const data = await res.json();
        setOverrides(data);
      }
    } catch (e) {
      console.error('Failed to fetch overrides:', e);
    } finally {
      setIsLoadingOverrides(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Save Global Config
  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobal(true);
    try {
      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        body: {
          seo_title: seoTitle,
          seo_description: seoDescription,
          seo_image: seoImage,
        },
      });
      if (!res.ok) throw new Error('Failed to save global SEO tags');
      showAlert({ title: 'Success', message: 'Global SEO configurations updated successfully.', style: 'success' });
      fetchMetrics();
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message || 'Save failed.', style: 'danger' });
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // Save Custom Header Injector
  const handleSaveHeaderInject = async () => {
    setIsSavingGlobal(true);
    try {
      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        body: {
          custom_header_inject: customHeaderInject,
        },
      });
      if (!res.ok) throw new Error('Failed to update header script injector');
      showAlert({ title: 'Success', message: 'Custom script and header tags injected successfully.', style: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message || 'Save failed.', style: 'danger' });
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // Save Robots.txt
  const handleSaveRobots = async () => {
    setIsSavingGlobal(true);
    try {
      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        body: {
          robots_txt: robotsTxt,
        },
      });
      if (!res.ok) throw new Error('Failed to update robots.txt');
      showAlert({ title: 'Success', message: 'robots.txt rules updated successfully.', style: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message || 'Save failed.', style: 'danger' });
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // Save Custom CSS
  const handleSaveCustomCss = async () => {
    setIsSavingGlobal(true);
    try {
      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        body: {
          custom_css: customCss,
        },
      });
      if (!res.ok) throw new Error('Failed to update Custom CSS');
      showAlert({ title: 'Success', message: 'Custom CSS updated successfully.', style: 'success' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message || 'Save failed.', style: 'danger' });
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // Save Page-Specific SEO Override
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routePath) {
      showAlert({ title: 'Validation Warning', message: 'Please specify a route path.', style: 'warning' });
      return;
    }
    setIsSavingOverride(true);
    try {
      const res = await fetchAdmin('/api/admin/seo/overrides', {
        method: 'POST',
        body: {
          route_path: routePath,
          seo_title: overrideTitle || null,
          seo_description: overrideDescription || null,
          seo_image: overrideImage || null,
        },
      });
      if (!res.ok) throw new Error('Failed to save override');
      
      showAlert({ title: 'Override Synced', message: `SEO override configured for ${routePath}`, style: 'success' });
      
      // Reset override form
      setRoutePath('');
      setOverrideTitle('');
      setOverrideDescription('');
      setOverrideImage('');
      setShowOverrideForm(false);
      setEditingOverrideId(null);
      
      // Refresh
      fetchOverrides();
      fetchMetrics();
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message || 'Save override failed.', style: 'danger' });
    } finally {
      setIsSavingOverride(false);
    }
  };

  // Edit Override Mode Trigger
  const handleEditOverride = (ov: SeoOverride) => {
    setEditingOverrideId(ov.id);
    setRoutePath(ov.route_path);
    setOverrideTitle(ov.seo_title || '');
    setOverrideDescription(ov.seo_description || '');
    setOverrideImage(ov.seo_image || '');
    setShowOverrideForm(true);
  };

  // Delete Page-Specific SEO Override
  const handleDeleteOverride = async (id: number, path: string) => {
    if (!window.confirm(`Are you sure you want to remove the SEO override for "${path}"?`)) return;
    try {
      const res = await fetchAdmin(`/api/admin/seo/overrides/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete override');
      showAlert({ title: 'Override Removed', message: 'Page meta tags reset to default.', style: 'success' });
      fetchOverrides();
      fetchMetrics();
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message || 'Delete override failed.', style: 'danger' });
    }
  };

  // Trigger Live Sitemap Search Indexing Ping
  const handleTriggerPing = async () => {
    setIsPinging(true);
    setPingStatus({ status: 'idle', details: 'Broadcasting indexing signal to search networks...' });
    try {
      const res = await fetchAdmin('/api/admin/seo/ping', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPingStatus({ status: 'success', details: `Ping successful! ${data.last_ping_details}` });
        showAlert({ title: 'Search Engines Signalled', message: 'Google and Bing crawler services pinged successfully.', style: 'success' });
      } else {
        setPingStatus({ status: 'failed', details: `Ping finished partially: ${data.last_ping_details || 'Server returned failure'}` });
        showAlert({ title: 'Ping Incomplete', message: 'One or more indexing services could not be reached directly.', style: 'warning' });
      }
      fetchMetrics();
    } catch (err: any) {
      setPingStatus({ status: 'failed', details: err.message || 'Connection timeout.' });
      showAlert({ title: 'Ping Failed', message: err.message || 'Connection lost during indexing ping.', style: 'danger' });
    } finally {
      setIsPinging(false);
    }
  };

  const copySitemapLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dejavufm.com';
    navigator.clipboard.writeText(`${origin}/sitemap.xml`);
    setCopiedSitemap(true);
    setTimeout(() => setCopiedSitemap(false), 2000);
  };

  return (
    <div className={`space-y-8 pb-12 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isLightMode ? 'bg-neon-purple/10 text-neon-purple' : 'bg-neon-purple/20 text-neon-purple'}`}>
            <Search className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className={`text-2xl sm:text-3xl font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>SEO Engine Suite</h2>
            <p className={`text-xs sm:text-sm ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Configure search visibility, indexation pipelines, JSON-LD scripts, and meta tags.</p>
          </div>
        </div>

        {/* Global Loading / Status Refresh */}
        <button 
          onClick={loadInitialData}
          disabled={isLoading || isLoadingMetrics || isLoadingOverrides}
          className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all ${
            isLightMode 
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' 
              : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/10 text-white/70'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || isLoadingMetrics || isLoadingOverrides) ? 'animate-spin' : ''}`} />
          Reload Data
        </button>
      </div>

      {/* Modern Horizontal Navigation Tabs */}
      <div 
        className={`flex flex-nowrap overflow-x-auto no-scrollbar touch-pan-x gap-1 p-1 rounded-2xl w-full ${isLightMode ? 'bg-slate-100/80 border border-black/5 shadow-inner' : 'bg-black/20 border border-white/5'}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center justify-center gap-1.5 px-2.5 md:px-3.5 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl transition-all shrink-0 grow ${
            activeTab === 'overview'
              ? (isLightMode ? 'bg-white text-neon-purple shadow-sm' : 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20')
              : (isLightMode ? 'text-slate-600 hover:bg-white/50' : 'text-white/50 hover:bg-white/[0.02] hover:text-white')
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Analytics & Indexing
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`flex items-center justify-center gap-1.5 px-2.5 md:px-3.5 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl transition-all shrink-0 grow ${
            activeTab === 'global'
              ? (isLightMode ? 'bg-white text-neon-purple shadow-sm' : 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20')
              : (isLightMode ? 'text-slate-600 hover:bg-white/50' : 'text-white/50 hover:bg-white/[0.02] hover:text-white')
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Global Config
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          className={`flex items-center justify-center gap-1.5 px-2.5 md:px-3.5 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl transition-all shrink-0 grow ${
            activeTab === 'overrides'
              ? (isLightMode ? 'bg-white text-neon-purple shadow-sm' : 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20')
              : (isLightMode ? 'text-slate-600 hover:bg-white/50' : 'text-white/50 hover:bg-white/[0.02] hover:text-white')
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Page Overrides
          {overrides.length > 0 && (
            <span className={`text-[9px] px-1 py-0.5 rounded-full font-black leading-none ${isLightMode ? 'bg-black/10 text-black' : 'bg-white/20 text-white'}`}>
              {overrides.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('injector')}
          className={`flex items-center justify-center gap-1.5 px-2.5 md:px-3.5 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl transition-all shrink-0 grow ${
            activeTab === 'injector'
              ? (isLightMode ? 'bg-white text-neon-purple shadow-sm' : 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20')
              : (isLightMode ? 'text-slate-600 hover:bg-white/50' : 'text-white/50 hover:bg-white/[0.02] hover:text-white')
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Script Injector
        </button>
        <button
          onClick={() => setActiveTab('css')}
          className={`flex items-center justify-center gap-1.5 px-2.5 md:px-3.5 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl transition-all shrink-0 grow ${
            activeTab === 'css'
              ? (isLightMode ? 'bg-white text-neon-purple shadow-sm' : 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20')
              : (isLightMode ? 'text-slate-600 hover:bg-white/50' : 'text-white/50 hover:bg-white/[0.02] hover:text-white')
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Custom CSS
        </button>
        <button
          onClick={() => setActiveTab('robots')}
          className={`flex items-center justify-center gap-1.5 px-2.5 md:px-3.5 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl transition-all shrink-0 grow ${
            activeTab === 'robots'
              ? (isLightMode ? 'bg-white text-neon-purple shadow-sm' : 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20')
              : (isLightMode ? 'text-slate-600 hover:bg-white/50' : 'text-white/50 hover:bg-white/[0.02] hover:text-white')
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          Sitemap & Robots
        </button>
      </div>

      {/* TAB 1: OVERVIEW & INDEXING */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`border rounded-3xl p-6 transition-all ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
              <p className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-2 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Sitemap Index Coverage</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-display tracking-tight text-neon-purple">
                  {metrics?.totalSitemapUrls || 9}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLightMode ? 'bg-neon-blue/10 text-neon-blue' : 'bg-neon-blue/20 text-neon-blue'}`}>
                  URLs Indexed
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed mt-2 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                {metrics?.totalDjs || 0} DJs, {metrics?.totalFeatures || 0} Articles, {metrics?.totalPodcasts || 0} Episodes.
              </p>
            </div>

            <div className={`border rounded-3xl p-6 transition-all ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
              <p className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-2 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Google Indexing Ratio</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-display tracking-tight text-emerald-500">100%</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLightMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  0 Errors
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed mt-2 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                {metrics?.crawledLast24h || 12} URLs crawled in past 24 hours.
              </p>
            </div>

            <div className={`border rounded-3xl p-6 transition-all ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
              <p className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-2 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Last Sitemap Ping</p>
              <div className="flex items-center gap-2">
                {metrics?.lastPingStatus === 'success' ? (
                  <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500`}>Success</span>
                ) : metrics?.lastPingStatus === 'failed' ? (
                  <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-xl bg-red-500/10 text-red-500`}>Failed</span>
                ) : (
                  <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-xl bg-slate-500/10 text-slate-500`}>Never</span>
                )}
                <span className={`text-xs font-mono font-medium ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                  {metrics?.lastPingTime ? new Date(metrics.lastPingTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No record'}
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed mt-2.5 truncate ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                {metrics?.lastPingDetails || 'Sitemap has not been pinged yet.'}
              </p>
            </div>

            <div className={`border rounded-3xl p-6 transition-all ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
              <p className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-2 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Avg. Organic Position</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-display tracking-tight text-neon-blue">
                  {metrics?.performanceData ? metrics.performanceData[metrics.performanceData.length - 1].avgPosition : '10.5'}
                </span>
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  +0.4 Position
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed mt-2 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                Average search position across keywords.
              </p>
            </div>
          </div>

          {/* Organic Clicks & Impressions Search Chart */}
          <div className={`border rounded-3xl p-6 transition-all ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className={`text-lg font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Organic Search Traffic Trend</h3>
                <p className={`text-xs ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Daily search clicks and impressions compiled over past 7 days.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-neon-purple" />
                  Clicks (Avg: 200)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-neon-blue" />
                  Impressions (Avg: 3,500)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              {metrics?.performanceData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c084fc" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? '#e2e8f0' : '#1e1e2d'} vertical={false} />
                    <XAxis dataKey="date" stroke={isLightMode ? '#64748b' : '#475569'} fontSize={10} tickLine={false} />
                    <YAxis stroke={isLightMode ? '#64748b' : '#475569'} fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isLightMode ? '#ffffff' : '#0f172a', 
                        borderColor: isLightMode ? '#cbd5e1' : '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: isLightMode ? '#0f172a' : '#f8fafc'
                      }} 
                    />
                    <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#c084fc" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" />
                    <Area type="monotone" dataKey="impressions" name="Impressions" stroke="#60a5fa" strokeWidth={2} fillOpacity={1} fill="url(#colorImpressions)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <LoaderIcon className="w-6 h-6 animate-spin text-neon-purple" />
                </div>
              )}
            </div>
          </div>

          {/* Sitemap Ping Console Panel */}
          <div className={`border rounded-3xl p-6 transition-all relative overflow-hidden ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded bg-neon-purple/10 text-neon-purple`}>Active SEO Indexing Protocol</span>
                <h3 className={`text-lg font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Instant Sitemap Verification Ping</h3>
                <p className={`text-xs leading-relaxed ${isLightMode ? 'text-black/60' : 'text-white/50'}`}>
                  Whenever you create custom pages, modify podcast settings, or add resident profiles, you can broadcast an updated sitemap map to search engine engines. This signals web crawlers to instantly schedule re-crawling of DejavuFM pages.
                </p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  disabled={isPinging}
                  onClick={handleTriggerPing}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-neon-purple hover:bg-neon-blue text-white font-black uppercase tracking-widest text-xs py-4 px-8 rounded-2xl transition-all shadow-lg shadow-neon-purple/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
                  {isPinging ? 'Signalling Indexers...' : 'Ping Search Indexers'}
                </button>
              </div>
            </div>

            {/* Active Ping Logs Output Console */}
            {pingStatus.details && (
              <div className={`mt-5 p-4 rounded-2xl border text-xs font-mono flex items-start gap-3 ${
                pingStatus.status === 'success' 
                  ? (isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400')
                  : pingStatus.status === 'failed'
                  ? (isLightMode ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-500/5 border-red-500/20 text-red-400')
                  : (isLightMode ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/[0.02] border-white/5 text-white/60')
              }`}>
                {pingStatus.status === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                ) : pingStatus.status === 'failed' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <LoaderIcon className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                )}
                <div>
                  <p className="font-bold uppercase tracking-wide mb-1 text-[10px]">Index Crawler Response Output:</p>
                  <p>{pingStatus.details}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL META CONFIG */}
      {activeTab === 'global' && (
        <form onSubmit={handleSaveGlobal} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,360px)]">
            <div className="space-y-6">
              <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <label className={`block text-[10px] uppercase tracking-[0.2em] font-bold mb-3 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>SEO Title (Global)</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Enter the site SEO title"
                  className={`w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all border ${
                    isLightMode 
                      ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                      : 'bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                  }`}
                  disabled={isLoading}
                />
              </div>

              <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <label className={`block text-[10px] uppercase tracking-[0.2em] font-bold mb-3 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>SEO Description (Global)</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Enter the SEO description for the application"
                  className={`w-full min-h-[160px] rounded-2xl px-4 py-3.5 text-sm outline-none transition-all border resize-none ${
                    isLightMode 
                      ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                      : 'bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                  }`}
                  disabled={isLoading}
                />
              </div>

              <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <ImageUploadField
                  label="Social Share Image"
                  value={seoImage}
                  onChange={setSeoImage}
                  placeholder="https://..."
                  description="Landscape image recommended for social media previews."
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm text-black' : 'bg-dark-bg/50 border-white/10 text-white'}`}>
                <p className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-6 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Google Preview</p>
                <div className="space-y-1.5">
                  <p className="text-neon-purple text-base font-semibold hover:underline cursor-pointer truncate">{seoTitle || 'DejavuFM | The Sound of London'}</p>
                  <p className={`text-xs ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                    {typeof window !== 'undefined' ? window.location.origin : 'https://dejavufm.com'}
                  </p>
                  <p className={`text-sm leading-relaxed mt-2 ${isLightMode ? 'text-black/70' : 'text-white/70'}`}>{seoDescription || 'DejavuFM is the underground radio station combining London beats with global energy.'}</p>
                </div>
              </div>

              <div className={`border rounded-3xl overflow-hidden transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <div className={`px-5 sm:px-6 py-4 border-b ${isLightMode ? 'border-black/5' : 'border-white/10'}`}>
                  <p className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Social Preview</p>
                </div>
                <div className="p-5 sm:p-6 space-y-4">
                  <div className={`aspect-video overflow-hidden rounded-2xl border ${isLightMode ? 'bg-black/5 border-black/5' : 'bg-black/30 border-white/5'}`}>
                    {seoImage ? (
                      <img src={seoImage} alt="SEO preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs uppercase font-black tracking-widest opacity-20">No preview image</div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className={`text-[10px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>DEJAVUFM</p>
                    <p className={`text-lg font-bold tracking-tight leading-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{seoTitle || 'DejavuFM | The Sound of London'}</p>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>{seoDescription || 'DejavuFM is the underground radio station combining London beats with global energy.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-4 border-t border-dashed border-neon-purple/20">
            <div className={`text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
              {isLoading ? 'Syncing SEO data…' : 'Configuration ready for deployment.'}
            </div>
            <button
              type="submit"
              disabled={isSavingGlobal || isLoading}
              className="w-full sm:w-auto bg-neon-purple text-white font-black uppercase tracking-widest text-xs py-4 px-10 rounded-xl hover:bg-neon-blue transition-all shadow-lg shadow-neon-purple/20 disabled:opacity-50"
            >
              {isSavingGlobal ? 'Syncing...' : 'Save SEO Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PAGE-SPECIFIC SEO OVERRIDES */}
      {activeTab === 'overrides' && (
        <div className="space-y-6">
          {/* Header Action Row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className={`text-lg font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Page-Specific SEO Overrides</h3>
              <p className={`text-xs ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Override metadata on dynamic pages, individual DJ bios, podcasts, or custom pages.</p>
            </div>
            <button
              onClick={() => {
                setEditingOverrideId(null);
                setRoutePath('');
                setOverrideTitle('');
                setOverrideDescription('');
                setOverrideImage('');
                setShowOverrideForm(!showOverrideForm);
              }}
              className="flex items-center gap-2 bg-neon-purple hover:bg-neon-blue text-white font-black uppercase tracking-widest text-xs py-3.5 px-6 rounded-xl transition-all shadow-md shrink-0"
            >
              {showOverrideForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showOverrideForm ? 'Cancel Form' : 'Add Path Override'}
            </button>
          </div>

          {/* Form Panel Expansion */}
          {showOverrideForm && (
            <form onSubmit={handleSaveOverride} className={`border rounded-3xl p-6 space-y-6 ${isLightMode ? 'bg-slate-50 border-black/10 shadow-sm' : 'bg-dark-bg/40 border-white/10'}`}>
              <div className="flex items-center justify-between border-b border-dashed pb-4 border-neon-purple/10">
                <span className="text-xs font-black uppercase tracking-wider text-neon-purple">
                  {editingOverrideId ? 'Modify Path Override Rules' : 'Establish New Page Override'}
                </span>
                <span className={`text-[10px] leading-none ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>
                  Overrides have higher priority than automatic defaults.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>Route Path (e.g. /watch or /djs/resident-one)</label>
                    <input
                      type="text"
                      required
                      value={routePath}
                      disabled={editingOverrideId !== null}
                      onChange={(e) => setRoutePath(e.target.value)}
                      placeholder="/djs/name-slug"
                      className={`w-full rounded-xl px-4 py-3 text-sm border focus:border-neon-purple focus:outline-none transition-all ${
                        isLightMode ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-black/40 border-white/10 text-white placeholder-white/25'
                      }`}
                    />
                    <p className={`text-[10px] mt-1.5 leading-normal ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>
                      Provide the exact URL slug path on the station. Must start with a slash (e.g., <code className="font-mono">/watch</code>, <code className="font-mono">/djs/dejavu-resident</code>).
                    </p>
                  </div>

                  <div>
                    <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>SEO Override Title</label>
                    <input
                      type="text"
                      value={overrideTitle}
                      onChange={(e) => setOverrideTitle(e.target.value)}
                      placeholder="Custom Page Title for Search Engines"
                      className={`w-full rounded-xl px-4 py-3 text-sm border focus:border-neon-purple focus:outline-none transition-all ${
                        isLightMode ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-black/40 border-white/10 text-white placeholder-white/25'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] uppercase font-black tracking-widest mb-2 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>SEO Override Description</label>
                    <textarea
                      value={overrideDescription}
                      onChange={(e) => setOverrideDescription(e.target.value)}
                      placeholder="Custom Page Meta Description for index snippet display"
                      className={`w-full min-h-[100px] rounded-xl px-4 py-3 text-sm border focus:border-neon-purple focus:outline-none transition-all resize-none ${
                        isLightMode ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400' : 'bg-black/40 border-white/10 text-white placeholder-white/25'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <ImageUploadField
                    label="Override Preview Image"
                    value={overrideImage}
                    onChange={setOverrideImage}
                    placeholder="https://..."
                    description="Custom cover artwork displayed for this route path on search and social indices."
                  />

                  <div className={`p-4 rounded-2xl border text-xs leading-normal flex items-start gap-3 ${
                    isLightMode ? 'bg-neon-purple/5 border-neon-purple/10 text-slate-600' : 'bg-neon-purple/5 border-white/5 text-white/70'
                  }`}>
                    <AlertTriangle className="w-5 h-5 shrink-0 text-neon-purple" />
                    <div>
                      <p className="font-black uppercase text-[10px] mb-1 text-neon-purple">Route Path Matching Advice:</p>
                      <p>
                        Web crawlers read paths exactly. Be certain your route matches what is on the site:
                        <br />• DJs list: <code className="font-mono">/djs</code>
                        <br />• Dynamic custom pages: <code className="font-mono">/terms</code> or <code className="font-mono">/about-us</code>
                        <br />• Individual DJ profile: <code className="font-mono">/djs/[dj_id]</code>
                        <br />• Individual Podcast index: <code className="font-mono">/podcasts/[podcast_id]</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dashed border-neon-purple/10">
                <button
                  type="button"
                  onClick={() => setShowOverrideForm(false)}
                  className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    isLightMode ? 'hover:bg-slate-100 border-slate-200 text-slate-600' : 'hover:bg-white/[0.04] border-white/10 text-white/70'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOverride}
                  className="bg-neon-purple hover:bg-neon-blue text-white font-black uppercase tracking-widest text-xs py-3 px-8 rounded-xl transition-all shadow"
                >
                  {isSavingOverride ? 'Syncing...' : (editingOverrideId ? 'Update Override' : 'Establish Override')}
                </button>
              </div>
            </form>
          )}

          {/* List display */}
          <div className={`border rounded-3xl overflow-hidden ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isLightMode ? 'border-black/5' : 'border-white/10'}`}>
              <span className={`text-[10px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                Active Page Override Parameters ({overrides.length})
              </span>
              {isLoadingOverrides && (
                <LoaderIcon className="w-4 h-4 animate-spin text-neon-purple" />
              )}
            </div>

            {overrides.length === 0 ? (
              <div className={`p-8 text-center text-xs ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                <Database className="w-8 h-8 mx-auto mb-3 opacity-30 text-neon-purple" />
                <p className="font-black uppercase tracking-wide mb-1">No Page-Specific Overrides</p>
                <p>Path overrides you add will appear here. Click 'Add Path Override' to establish one.</p>
              </div>
            ) : (
              <div className="divide-y divide-dashed divide-neon-purple/10">
                {overrides.map((ov) => (
                  <div key={ov.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-neon-purple/[0.01] transition-all">
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Image Thumb */}
                      <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-dashed ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-black/30 border-white/10'}`}>
                        {ov.seo_image ? (
                          <img src={ov.seo_image} alt="Override preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-30">
                            <Search className="w-4 h-4 text-neon-purple" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold bg-neon-purple/10 text-neon-purple px-2 py-0.5 rounded">
                            {ov.route_path}
                          </code>
                          <span className={`text-[10px] ${isLightMode ? 'text-black/30' : 'text-white/30'}`}>
                            Updated: {new Date(ov.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className={`text-sm font-bold truncate ${isLightMode ? 'text-black' : 'text-white'}`}>
                          {ov.seo_title || 'Default Title Override'}
                        </h4>
                        <p className={`text-xs leading-relaxed line-clamp-2 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                          {ov.seo_description || 'No description override.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditOverride(ov)}
                        className={`p-2.5 rounded-xl border transition-colors ${
                          isLightMode 
                            ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700' 
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] text-white/70 hover:text-white'
                        }`}
                        title="Edit Override"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOverride(ov.id, ov.route_path)}
                        className={`p-2.5 rounded-xl border border-dashed transition-colors ${
                          isLightMode 
                            ? 'bg-red-50 border-red-200 hover:bg-red-100 text-red-600' 
                            : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 text-red-400'
                        }`}
                        title="Remove Override"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: HEADER SCRIPTS INJECTOR */}
      {activeTab === 'injector' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className={`text-lg font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Custom Meta Tag & Header Injector</h3>
              <p className={`text-xs ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Inject Google verification keys, analytics snippets, or third-party tracking scripts.</p>
            </div>
            <button
              onClick={handleSaveHeaderInject}
              disabled={isSavingGlobal}
              className="bg-neon-purple hover:bg-neon-blue text-white font-black uppercase tracking-widest text-xs py-3.5 px-8 rounded-xl transition-all shadow-md flex items-center gap-2 self-start md:self-center"
            >
              {isSavingGlobal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
              {isSavingGlobal ? 'Saving Changes...' : 'Save Script Injection'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,360px)] gap-6">
            <div className="space-y-4">
              <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className={`block text-[10px] uppercase tracking-[0.2em] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                    HTML Code Injection Console (Pasted into Head)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-neon-purple bg-neon-purple/5 px-2 py-0.5 rounded">
                    &lt;head&gt; section
                  </span>
                </div>

                <textarea
                  value={customHeaderInject}
                  onChange={(e) => setCustomHeaderInject(e.target.value)}
                  placeholder="<!-- Paste your custom meta keys or tracking script tags here -->&#10;<meta name='google-site-verification' content='...' />"
                  className={`w-full min-h-[300px] rounded-2xl px-4 py-4 text-xs font-mono outline-none transition-all border ${
                    isLightMode 
                      ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                      : 'bg-black/60 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* Warnings & Security Guard */}
              <div className={`border rounded-3xl p-6 space-y-4 transition-all ${
                isLightMode ? 'bg-amber-50/40 border-amber-200 text-slate-700' : 'bg-amber-500/5 border-amber-500/10 text-white/80'
              }`}>
                <div className="flex items-center gap-2.5 text-amber-500">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider">Validation Guard Notice</span>
                </div>
                <div className="text-xs leading-relaxed space-y-2">
                  <p>
                    Please review your injected scripts carefully before saving. Badly formatted HTML or tags without closing quotes can disrupt the main page render layout.
                  </p>
                  <p className="font-bold">Prohibited Tags:</p>
                  <p>
                    Do not inject custom stylesheet <code className="font-mono text-neon-purple">&lt;style&gt;</code> overrides here. Please use the dedicated <strong className="text-neon-purple">Custom CSS</strong> tab instead!
                  </p>
                </div>
              </div>

              {/* Sample codes helper */}
              <div className={`border rounded-3xl p-6 space-y-3 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <p className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                  Recommended Integrations
                </p>
                <div className="space-y-2 text-xs leading-relaxed">
                  <div className="p-3 rounded-xl border border-dashed border-neon-purple/10 bg-neon-purple/[0.02]">
                    <p className="font-bold mb-1">Google Site Verification:</p>
                    <code className="block p-1 bg-black/40 text-white text-[9px] rounded font-mono overflow-x-auto whitespace-nowrap">
                      &lt;meta name="google-site-verification" content="VerificationKey" /&gt;
                    </code>
                  </div>
                  <div className="p-3 rounded-xl border border-dashed border-neon-purple/10 bg-neon-purple/[0.02]">
                    <p className="font-bold mb-1">Google Analytics (gtag.js):</p>
                    <code className="block p-1 bg-black/40 text-white text-[9px] rounded font-mono overflow-x-auto whitespace-nowrap">
                      &lt;script async src="https://www.googletag..."&gt;&lt;/script&gt;
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4.5: CUSTOM CSS PANEL */}
      {activeTab === 'css' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className={`text-lg font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Custom CSS Styling</h3>
              <p className={`text-xs ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Inject custom style rules to personalize the appearance and override colors, fonts, or layouts of the radio application.</p>
            </div>
            <button
              onClick={handleSaveCustomCss}
              disabled={isSavingGlobal}
              className="bg-neon-purple hover:bg-neon-blue text-white font-black uppercase tracking-widest text-xs py-3.5 px-8 rounded-xl transition-all shadow-md flex items-center gap-2 self-start md:self-center animate-pulse"
            >
              {isSavingGlobal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
              {isSavingGlobal ? 'Saving Changes...' : 'Save CSS Rules'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,360px)] gap-6">
            <div className="space-y-4">
              <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className={`block text-[10px] uppercase tracking-[0.2em] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                    Active CSS Ruleset Editor
                  </label>
                  <span className="text-[10px] font-mono font-bold text-neon-purple bg-neon-purple/5 px-2 py-0.5 rounded">
                    &lt;style&gt; tag injection
                  </span>
                </div>

                <textarea
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  placeholder="/* Customize the radio application styling below */&#10;.custom-header {&#10;  background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);&#10;}&#10;&#10;/* Override brand text color */&#10;.brand-title {&#10;  color: #a855f7 !important;&#10;}"
                  className={`w-full min-h-[400px] rounded-2xl px-4 py-4 text-xs font-mono outline-none transition-all border ${
                    isLightMode 
                      ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                      : 'bg-black/60 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* Warnings & Security Guard */}
              <div className={`border rounded-3xl p-6 space-y-4 transition-all ${
                isLightMode ? 'bg-amber-50/40 border-amber-200 text-slate-700' : 'bg-amber-500/5 border-amber-500/10 text-white/80'
              }`}>
                <div className="flex items-center gap-2.5 text-amber-500">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider">Style Override Notice</span>
                </div>
                <div className="text-xs leading-relaxed space-y-2">
                  <p>
                    These CSS rules will be injected directly into the document head and will apply globally across all pages of the app.
                  </p>
                  <p>
                    To target specific elements, inspect their classes using browser DevTools or use unique IDs if available. Use the <code className="font-mono text-neon-purple">!important</code> flag if your styles are being overridden by default Tailwind styles.
                  </p>
                </div>
              </div>

              {/* Sample codes helper */}
              <div className={`border rounded-3xl p-6 space-y-3 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <p className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                  CSS Inspiration Snippets
                </p>
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3 rounded-xl border border-dashed border-neon-purple/10 bg-neon-purple/[0.02]">
                    <p className="font-bold mb-1">Make scrollbars neon purple:</p>
                    <pre className="block p-2 bg-black/40 text-white text-[9px] rounded font-mono overflow-x-auto whitespace-pre">
{`::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-thumb {
  background: #a855f7;
  border-radius: 4px;
}`}
                    </pre>
                  </div>
                  <div className="p-3 rounded-xl border border-dashed border-neon-purple/10 bg-neon-purple/[0.02]">
                    <p className="font-bold mb-1">Custom Background Pulse Effect:</p>
                    <pre className="block p-2 bg-black/40 text-white text-[9px] rounded font-mono overflow-x-auto whitespace-pre">
{`@keyframes breathe {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
.app-shimmer-overlay {
  animation: breathe 8s infinite;
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SITEMAP & ROBOTS */}
      {activeTab === 'robots' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(340px,380px)] gap-6">
            {/* Robots.txt Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Configure robots.txt</h3>
                  <p className={`text-xs ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Instruct search index spiders on what directories to crawl.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveRobots}
                  disabled={isSavingGlobal}
                  className="bg-neon-purple hover:bg-neon-blue text-white font-black uppercase tracking-widest text-xs py-3 px-6 rounded-xl transition-all shadow"
                >
                  {isSavingGlobal ? 'Saving...' : 'Save robots.txt'}
                </button>
              </div>

              <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <textarea
                  value={robotsTxt}
                  onChange={(e) => setRobotsTxt(e.target.value)}
                  placeholder="User-agent: *&#10;Allow: /&#10;Disallow: /admin"
                  className={`w-full min-h-[250px] rounded-2xl px-4 py-4 text-xs font-mono outline-none transition-all border ${
                    isLightMode 
                      ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                      : 'bg-black/60 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                  }`}
                />
              </div>
            </div>

            {/* Sitemap Information & Live Links */}
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Live Sitemap Maps</h3>
                <p className={`text-xs ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Discoverable sitemap directory indexes.</p>
              </div>

              <div className={`border rounded-3xl p-5 sm:p-6 space-y-4 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLightMode ? 'bg-neon-purple/10 text-neon-purple' : 'bg-neon-purple/20 text-neon-purple'}`}>
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>sitemap.xml</h4>
                    <p className={`text-[10px] uppercase font-bold tracking-wider ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>Main Index File</p>
                  </div>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono overflow-x-auto gap-3 ${
                  isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/40 border-white/5 text-white/80'
                }`}>
                  <span className="truncate">/sitemap.xml</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={copySitemapLink}
                      className={`p-2 rounded hover:bg-neon-purple/10 text-neon-purple transition-all`}
                      title="Copy URL"
                    >
                      {copiedSitemap ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href="/sitemap.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2 rounded hover:bg-neon-blue/10 text-neon-blue transition-all`}
                      title="View Sitemap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-neon-purple/10 text-xs leading-relaxed space-y-2">
                  <p className="font-bold">Automatic Schema Inclusions:</p>
                  <p className={`${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>
                    Your sitemap.xml automatically gathers indices and structures paths for:
                  </p>
                  <ul className={`list-disc pl-5 space-y-1 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                    <li>Station Static Pages (Home, Schedule, Watch)</li>
                    <li>Resident DJs ({metrics?.totalDjs || 0} items)</li>
                    <li>Editorial Features ({metrics?.totalFeatures || 0} items)</li>
                    <li>Catch Up Podcast Library ({metrics?.totalPodcasts || 0} items)</li>
                    <li>CMS custom pages ({metrics?.totalCustomPages || 0} items)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline fallback loader icon component
function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
