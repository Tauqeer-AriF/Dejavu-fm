import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminAdvanced() {
  const queryClient = useQueryClient();
  const { data: serverSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
  });

  const [features, setFeatures] = useState<Record<string, boolean>>({
    feat_chat: true,
    feat_shoutouts: true,
    feat_cinematic: true,
    feat_pwa: true,
    feat_bookings: true,
    feat_live_tools: true,
    feat_stream_quality: true,
  });
  const { showAlert } = useModal();

  useEffect(() => {
    if (serverSettings) {
      setFeatures({
        feat_chat: serverSettings.feat_chat !== '0',
        feat_shoutouts: serverSettings.feat_shoutouts !== '0',
        feat_cinematic: serverSettings.feat_cinematic !== '0',
        feat_pwa: serverSettings.feat_pwa !== '0',
        feat_bookings: serverSettings.feat_bookings !== '0',
        feat_live_tools: serverSettings.feat_live_tools !== '0',
        feat_stream_quality: serverSettings.feat_stream_quality !== '0',
      });
    }
  }, [serverSettings]);

  const handleToggle = (key: string, checked: boolean) => {
    setFeatures(prev => ({ ...prev, [key]: checked }));
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    
    // Save all features
    const settingsToSave = Object.fromEntries(
      Object.entries(features).map(([k, v]) => [k, v ? '1' : '0'])
    );

    const res = await fetchAdmin("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsToSave)
    });
    
    if (res.ok) {
      showAlert({ title: "Success", message: "Advanced features saved!", style: "success" });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } else {
      showAlert({ title: "Error", message: "Failed to save settings", style: "danger" });
    }
  };

  const toggleItems = [
    { id: 'feat_chat', title: 'Chat Room', description: 'Enable real-time chat functionality.' },
    { id: 'feat_shoutouts', title: 'Shoutout Widget', description: 'Enable direct interaction (fire, hearts, messages).' },
    { id: 'feat_cinematic', title: 'Cinematic Visualizer', description: 'Enable the immersive audio visualizer mode.' },
    { id: 'feat_pwa', title: 'PWA Install Prompt', description: 'Prompt users to install the web app to their home screen.' },
    { id: 'feat_bookings', title: 'DJ Bookings (Agency)', description: 'Enable the DJ inquiry and booking system.' },
    { id: 'feat_live_tools', title: 'Live Tools / Studio Cam', description: 'Enable the studio camera watch live tools.' },
    { id: 'feat_stream_quality', title: 'Stream Quality Toggle', description: 'Show or hide the stream quality selector in the playbar.' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-display font-black uppercase text-neon-purple tracking-wider flex items-center">
        <Ghost className="w-8 h-8 mr-3" /> Advanced Features
      </h2>

      <div className="bg-dark-bg/50 border border-white/10 rounded-2xl p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4">
            {toggleItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div>
                  <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                  <p className="text-sm text-white/50">{item.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={features[item.id] || false} 
                    onChange={e => handleToggle(item.id, e.target.checked)} 
                  />
                  <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neon-purple shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"></div>
                </label>
              </div>
            ))}
          </div>
          <button type="submit" className="bg-neon-purple text-white font-bold py-3 px-8 rounded hover:bg-neon-blue transition-all">Save Changes</button>
        </form>
      </div>
    </div>
  );
}

export function AdminBranding() {
  const [appName, setAppName] = useState("");
  const [appTitle, setAppTitle] = useState("");
  const [appTagline, setAppTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoDark, setLogoDark] = useState("");
  const [logoLight, setLogoLight] = useState("");
  const [favicon, setFavicon] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#b026ff");
  const [secondaryColor, setSecondaryColor] = useState("#00d2ff");
  const [fontSans, setFontSans] = useState("Inter");
  const [fontDisplay, setFontDisplay] = useState("Inter");
  const { showAlert, showConfirm } = useModal();

  const DEFAULTS = {
    appName: "DEJAVU FM",
    appTitle: "DEJAVU FM | THE SOUND OF LONDON",
    appTagline: "The Underground Worldwide",
    logo_url: "",
    logo_dark: "",
    logo_light: "",
    favicon: "/favicon.ico",
    primary_color: "#b026ff",
    secondary_color: "#00d2ff",
    font_sans: "Inter",
    font_display: "Inter"
  };

  const fontOptions = [
    { name: "Inter (Modern Sans)", value: "Inter" },
    { name: "Space Grotesk (Tech Display)", value: "Space Grotesk" },
    { name: "Outfit (Clean Geometric)", value: "Outfit" },
    { name: "Playfair Display (Premium Serif)", value: "Playfair Display" },
    { name: "JetBrains Mono (Technical)", value: "JetBrains Mono" },
    { name: "Bebas Neue (Bold Headline)", value: "Bebas Neue" },
    { name: "Syne (Artistic / Future)", value: "Syne" },
    { name: "Plus Jakarta Sans (Minimal)", value: "Plus Jakarta Sans" }
  ];

  useEffect(() => {
    fetch("/api/public/settings").then(r=>r.json()).then(d => {
      setAppName(d.app_name || DEFAULTS.appName);
      setAppTitle(d.app_title || DEFAULTS.appTitle);
      setAppTagline(d.app_tagline || DEFAULTS.appTagline);
      setLogoUrl(d.logo_url || DEFAULTS.logo_url);
      setLogoDark(d.logo_dark || DEFAULTS.logo_dark);
      setLogoLight(d.logo_light || DEFAULTS.logo_light);
      setFavicon(d.favicon || DEFAULTS.favicon);
      setPrimaryColor(d.primary_color || DEFAULTS.primary_color);
      setSecondaryColor(d.secondary_color || DEFAULTS.secondary_color);
      setFontSans(d.font_sans || DEFAULTS.font_sans);
      setFontDisplay(d.font_display || DEFAULTS.font_display);
    });
  }, []);

  // Update the browser tab icon instantly when the favicon state changes
  useEffect(() => {
    if (favicon) {
      const cacheBuster = `v=${Date.now()}`;
      const finalUrl = favicon.includes('?') 
        ? `${favicon}&${cacheBuster}` 
        : `${favicon}?${cacheBuster}`;
        
      const selectors = ["link[rel*='icon']", "link[rel='apple-touch-icon']"];
      let found = false;
      
      selectors.forEach(selector => {
        const links = document.querySelectorAll(selector);
        links.forEach(link => {
          (link as HTMLLinkElement).href = finalUrl;
          found = true;
        });
      });

      if (!found) {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = finalUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [favicon]);

  const handleReset = async () => {
    const confirmed = await showConfirm({
      title: "Factory Reset",
      message: "Are you sure you want to reset ALL branding options to factory defaults? This action cannot be undone.",
      style: "danger",
      confirmText: "Reset Defaults"
    });
    if (!confirmed) return;

    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          app_name: DEFAULTS.appName,
          app_title: DEFAULTS.appTitle,
          app_tagline: DEFAULTS.appTagline,
          logo_url: DEFAULTS.logo_url,
          logo_dark: DEFAULTS.logo_dark,
          logo_light: DEFAULTS.logo_light,
          favicon: DEFAULTS.favicon,
          primary_color: DEFAULTS.primary_color,
          secondary_color: DEFAULTS.secondary_color,
          font_sans: DEFAULTS.font_sans,
          font_display: DEFAULTS.font_display
        })
      });
      if (res.ok) {
        showAlert({ title: "Reset Complete", message: "All branding settings have been restored to defaults.", style: "success" });
        setAppName(DEFAULTS.appName);
        setAppTitle(DEFAULTS.appTitle);
        setAppTagline(DEFAULTS.appTagline);
        setLogoUrl(DEFAULTS.logo_url);
        setLogoDark(DEFAULTS.logo_dark);
        setLogoLight(DEFAULTS.logo_light);
        setFavicon(DEFAULTS.favicon);
        setPrimaryColor(DEFAULTS.primary_color);
        setSecondaryColor(DEFAULTS.secondary_color);
        setFontSans(DEFAULTS.font_sans);
        setFontDisplay(DEFAULTS.font_display);
      }
    } catch(e) {
      console.error(e);
      showAlert({ title: "Error", message: "Failed to reset settings.", style: "danger" });
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          app_name: appName,
          app_title: appTitle,
          app_tagline: appTagline,
          logo_url: logoUrl,
          logo_dark: logoDark,
          logo_light: logoLight,
          favicon: favicon,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          font_sans: fontSans,
          font_display: fontDisplay
        })
      });
      if (res.ok) {
        showAlert({ title: "Success", message: "Branding settings saved!", style: "success" });
      }
    } catch(e) {
      console.error(e);
      showAlert({ title: "Error", message: "Failed to save branding settings", style: "danger" });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">Branding Settings</h3>
      
      <div className="bg-dark-bg/30 p-6 rounded-2xl border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-white/5">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white border border-black/10 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                {(logoLight || logoUrl) ? (
                  <img src={logoLight || logoUrl || undefined} alt="Light Mode" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <HomeIcon className="w-6 h-6 text-black/20" />
                )}
              </div>
              <span className="text-[9px] font-black uppercase text-white/40 mt-2 tracking-widest">Light Mode</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-dark-bg border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                {(logoDark || logoUrl) ? (
                  <img src={logoDark || logoUrl || undefined} alt="Dark Mode" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <HomeIcon className="w-6 h-6 text-white/10" />
                )}
              </div>
              <span className="text-[9px] font-black uppercase text-white/40 mt-2 tracking-widest">Dark Mode</span>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold uppercase tracking-tight" style={{ color: primaryColor, fontFamily: fontDisplay }}>{appName || "Your App Name"}</h4>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-black mt-1" style={{ fontFamily: fontSans }}>{appTagline || "Live Radio Preview"}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Application Name</label>
              <input 
                required
                value={appName} 
                onChange={e=>setAppName(e.target.value)} 
                className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" 
                placeholder="DEJAVU FM"
              />
            </div>
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">SEO Page Title</label>
              <input 
                required
                value={appTitle} 
                onChange={e=>setAppTitle(e.target.value)} 
                className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" 
                placeholder="DEJAVU FM | LONDON UNDERGROUND RADIO"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Branding Tagline</label>
            <input 
              required
              value={appTagline} 
              onChange={e=>setAppTagline(e.target.value)} 
              className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" 
              placeholder="The Sound of London"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Body Font (Sans)</label>
              <select 
                value={fontSans} 
                onChange={e=>setFontSans(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none"
              >
                {fontOptions.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Headings Font (Display)</label>
              <select 
                value={fontDisplay} 
                onChange={e=>setFontDisplay(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none"
              >
                {fontOptions.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <ImageUploadField label="Logo URL (Global / Fallback)" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." description="Base logo used if specific theme logos are missing." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField label="Dark Mode Logo" value={logoDark} onChange={setLogoDark} description="Optimized for dark backgrounds." />
              <ImageUploadField label="Light Mode Logo" value={logoLight} onChange={setLogoLight} description="Optimized for light backgrounds." />
            </div>
            <ImageUploadField label="Favicon URL" value={favicon} onChange={setFavicon} description="The browser tab icon (.ico or .png)." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Primary Brand Color</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={e=>setPrimaryColor(e.target.value)} 
                  className="w-10 h-10 bg-dark-bg border border-white/10 rounded cursor-pointer p-0 overflow-hidden" 
                />
                <input 
                  type="text" 
                  value={primaryColor} 
                  onChange={e=>setPrimaryColor(e.target.value)} 
                  className="flex-1 bg-dark-bg border border-white/10 rounded px-3 py-2 text-sm outline-none uppercase font-mono" 
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase mb-1 text-white/50 font-bold">Secondary Color</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="color" 
                  value={secondaryColor} 
                  onChange={e=>setSecondaryColor(e.target.value)} 
                  className="w-10 h-10 bg-dark-bg border border-white/10 rounded cursor-pointer p-0 overflow-hidden" 
                />
                <input 
                  type="text" 
                  value={secondaryColor} 
                  onChange={e=>setSecondaryColor(e.target.value)} 
                  className="flex-1 bg-dark-bg border border-white/10 rounded px-3 py-2 text-sm outline-none uppercase font-mono" 
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5">
            <button 
              type="submit" 
              className="bg-neon-purple px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-neon-blue transition-all text-white shadow-lg shadow-neon-purple/20 flex-1" 
              style={{ backgroundColor: primaryColor }}
            >
              Save Branding
            </button>
            <button 
              type="button" 
              onClick={handleReset}
              className="bg-white/5 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all"
            >
              Reset to Factory Defaults
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const [stream, setStream] = useState("");
  const [streamLow, setStreamLow] = useState("");
  const [streamMedium, setStreamMedium] = useState("");
  const [streamHigh, setStreamHigh] = useState("");
  const [rss, setRss] = useState("");
  const [studioVideoUrl, setStudioVideoUrl] = useState("");
  const [isOnAir, setIsOnAir] = useState(false);
  const { showAlert } = useModal();

  useEffect(() => {
    fetch("/api/public/settings").then(r=>r.json()).then(d => {
      setStream(d.stream_url || "");
      setStreamLow(d.stream_url_low || "");
      setStreamMedium(d.stream_url_medium || "");
      setStreamHigh(d.stream_url_high || "");
      setRss(d.rss_feed_url || "");
      setStudioVideoUrl(d.studio_video_url || "");
      setIsOnAir(d.is_on_air === '1');
    });
  }, []);

  const saveNode = async () => {
    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          stream_url: stream, 
          stream_url_low: streamLow,
          stream_url_medium: streamMedium,
          stream_url_high: streamHigh,
          rss_feed_url: rss, 
          studio_video_url: studioVideoUrl,
          is_on_air: isOnAir
        })
      });
      if (res.ok) {
        showAlert({ title: "Success", message: "General settings saved!", style: "success" });
      }
    } catch(e) {
      console.error(e);
      showAlert({ title: "Error", message: "Failed to save settings", style: "danger" });
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold border-b border-white/10 pb-4">General Settings</h3>
      
      <div className="bg-neon-purple/10 border border-neon-purple/30 p-6 rounded-2xl flex items-center justify-between max-w-xl">
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${isOnAir ? 'bg-neon-purple animate-pulse' : 'bg-white/20'}`}></div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs">Live Status Indicator</h4>
            <p className="text-[10px] text-white/40">Toggles the "LIVE" banner on the frontend.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOnAir(!isOnAir)}
          className={`w-14 h-7 rounded-full relative transition-colors ${isOnAir ? 'bg-neon-purple' : 'bg-white/10'}`}
        >
          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isOnAir ? 'left-8' : 'left-1'}`}></div>
        </button>
      </div>

      <div className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm mb-1 text-white/70">Default Stream URL (Fallback)</label>
          <input value={stream} onChange={e=>setStream(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2" />
        </div>
        
        <div className="pt-4 border-t border-white/5">
          <h4 className="text-lg font-bold mb-4">Stream Qualities</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-white/70">Low Quality URL (e.g. 64kbps AAC)</label>
              <input value={streamLow} onChange={e=>setStreamLow(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-white/70">Medium Quality URL (e.g. 128kbps MP3)</label>
              <input value={streamMedium} onChange={e=>setStreamMedium(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-white/70">High Quality URL (e.g. 256kbps MP3 or lossless)</label>
              <input value={streamHigh} onChange={e=>setStreamHigh(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <label className="block text-sm mb-1 text-white/70">Studio Video Embed URL (e.g. Twitch player URL)</label>
          <input value={studioVideoUrl} onChange={e=>setStudioVideoUrl(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2" placeholder="https://player.twitch.tv/?channel=bbcnews&parent=localhost" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-white/70">Podomatic RSS Feed URL</label>
          <div className="flex gap-2">
            <input value={rss} onChange={e=>setRss(e.target.value)} className="flex-1 bg-dark-bg border border-white/10 rounded px-4 py-2" />
            <button 
              type="button" 
              onClick={async () => {
                const res = await fetchAdmin("/api/admin/podcasts/refresh", { method: "POST" });
                if (res.ok) showAlert({ title: "Success", message: "Podcast cache cleared. It will re-import on next load.", style: "success" });
              }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded text-xs font-bold hover:bg-white/10 transition-colors"
            >
              Force Refresh
            </button>
          </div>
        </div>
        <button onClick={saveNode} className="bg-neon-purple px-6 py-2 rounded font-bold hover:bg-neon-blue transition-colors">Save Settings</button>
      </div>
    </div>
  );
}
