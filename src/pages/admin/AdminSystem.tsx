import React, { useRef, useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

import { useLogo } from "../../hooks/useLogo";

export function AdminAdvanced() {
  const { isLightMode } = useLogo();
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
    feat_auto_fullscreen: true,
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
        feat_auto_fullscreen: serverSettings.feat_auto_fullscreen !== '0',
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <h2 className={`text-2xl sm:text-3xl font-display font-black uppercase tracking-wider flex items-center ${isLightMode ? 'text-black' : 'text-neon-purple'}`}>
        <Ghost className="w-7 h-7 sm:w-8 sm:h-8 mr-3" /> Advanced Features
      </h2>

      <div className={`border rounded-2xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4">
            {toggleItems.map(item => (
              <React.Fragment key={item.id}>
                <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex-1 pr-4">
                    <h3 className={`text-lg sm:text-xl font-bold mb-1 ${isLightMode ? 'text-black' : 'text-white'}`}>{item.title}</h3>
                    <p className={`text-xs sm:text-sm ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>{item.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={features[item.id] || false} 
                      onChange={e => handleToggle(item.id, e.target.checked)} 
                    />
                    <div className={`w-14 h-7 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-neon-purple shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] ${
                      isLightMode ? 'bg-black/10' : 'bg-white/10'
                    }`}></div>
                  </label>
                </div>

                {item.id === 'feat_live_tools' && (
                  <div className={`ml-6 sm:ml-10 pl-4 border-l-2 transition-all duration-300 -mt-2 mb-2 ${
                    features['feat_live_tools'] 
                      ? 'border-neon-purple/40 opacity-100' 
                      : 'border-white/5 opacity-40'
                  }`}>
                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      isLightMode ? 'bg-black/[0.02] border-black/5' : 'bg-white/[0.02] border-white/5'
                    }`}>
                      <div className="flex-1 pr-4 text-left">
                        <h4 className={`text-base font-bold mb-1 ${
                          features['feat_live_tools'] 
                            ? isLightMode ? 'text-black' : 'text-white' 
                            : isLightMode ? 'text-black/40' : 'text-white/40'
                        }`}>
                          ↳ Studio Cam Auto-Fullscreen
                        </h4>
                        <p className={`text-xs ${isLightMode ? 'text-black/50 font-medium' : 'text-white/40'}`}>
                          Automatically open the watch live studio cam in full-screen split mode upon page load.
                        </p>
                      </div>
                      <label className={`relative inline-flex items-center shrink-0 ${
                        features['feat_live_tools'] ? 'cursor-pointer' : 'cursor-not-allowed'
                      }`}>
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={features['feat_auto_fullscreen'] || false} 
                          disabled={!features['feat_live_tools']}
                          onChange={e => handleToggle('feat_auto_fullscreen', e.target.checked)} 
                        />
                        <div className={`w-12 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-purple shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] ${
                          isLightMode ? 'bg-black/10' : 'bg-white/10'
                        }`}></div>
                      </label>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <button 
            type="submit" 
            className="w-full sm:w-auto bg-neon-purple text-white font-black uppercase tracking-widest text-xs py-4 px-10 rounded-xl hover:bg-neon-blue transition-all shadow-lg shadow-neon-purple/20"
          >
            Save All Features
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminBranding() {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();
  const [appName, setAppName] = useState("");
  const [appTitle, setAppTitle] = useState("");
  const [appTagline, setAppTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoDark, setLogoDark] = useState("");
  const [logoLight, setLogoLight] = useState("");
  const [logoShape, setLogoShape] = useState("square");
  const [favicon, setFavicon] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#b026ff");
  const [secondaryColor, setSecondaryColor] = useState("#00d2ff");
  const [fontSans, setFontSans] = useState("Inter");
  const [fontDisplay, setFontDisplay] = useState("Inter");
  const [defaultTheme, setDefaultTheme] = useState("dark");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialSoundcloud, setSocialSoundcloud] = useState("");
  const [socialMixcloud, setSocialMixcloud] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [underHeaderText, setUnderHeaderText] = useState("");
  const [underHeaderAlign, setUnderHeaderAlign] = useState("center");
  const { showAlert, showConfirm } = useModal();

  // Live font preview: instantly updates variables in the document
  useEffect(() => {
    if (fontSans) {
      const sansFallback = ', ui-sans-serif, system-ui, sans-serif';
      document.documentElement.style.setProperty('--font-sans', `"${fontSans}"${sansFallback}`);
    }
  }, [fontSans]);

  useEffect(() => {
    if (fontDisplay) {
      let displayFallback = ', sans-serif';
      if (fontDisplay === 'Playfair Display') displayFallback = ', serif';
      if (fontDisplay === 'JetBrains Mono') displayFallback = ', monospace';
      document.documentElement.style.setProperty('--font-display', `"${fontDisplay}"${displayFallback}`);
    }
  }, [fontDisplay]);

  const DEFAULTS = {
    appName: "DEJAVUFM",
    appTitle: "DEJAVUFM | THE SOUND OF LONDON",
    appTagline: "The Underground Worldwide",
    logo_url: "",
    logo_dark: "",
    logo_light: "",
    logo_shape: "square",
    favicon: "/favicon.ico",
    primary_color: "#b026ff",
    secondary_color: "#00d2ff",
    font_sans: "Inter",
    font_display: "Inter",
    default_theme: "dark",
    under_header_text: "",
    under_header_align: "center"
  };

  const fontOptions = [
    { name: "Inter (Modern Sans)", value: "Inter" },
    { name: "Space Grotesk (Tech Display)", value: "Space Grotesk" },
    { name: "Outfit (Clean Geometric)", value: "Outfit" },
    { name: "Playfair Display (Premium Serif)", value: "Playfair Display" },
    { name: "JetBrains Mono (Technical)", value: "JetBrains Mono" },
    { name: "Bebas Neue (Bold Headline)", value: "Bebas Neue" },
    { name: "Syne (Artistic / Future)", value: "Syne" },
    { name: "Plus Jakarta Sans (Minimal)", value: "Plus Jakarta Sans" },
    { name: "Oswald (Condensed Display)", value: "Oswald" },
    { name: "Poppins (Modern Sans)", value: "Poppins" }
  ];

  const { data: serverSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
  });

  useEffect(() => {
    if (serverSettings) {
      setAppName(serverSettings.app_name !== undefined ? serverSettings.app_name : DEFAULTS.appName);
      setAppTitle(serverSettings.app_title || DEFAULTS.appTitle);
      setAppTagline(serverSettings.app_tagline !== undefined ? serverSettings.app_tagline : DEFAULTS.appTagline);
      setLogoUrl(serverSettings.logo_url || DEFAULTS.logo_url);
      setLogoDark(serverSettings.logo_dark || DEFAULTS.logo_dark);
      setLogoLight(serverSettings.logo_light || DEFAULTS.logo_light);
      setLogoShape(serverSettings.logo_shape !== undefined ? serverSettings.logo_shape : DEFAULTS.logo_shape);
      setFavicon(serverSettings.favicon || DEFAULTS.favicon);
      setPrimaryColor(serverSettings.primary_color || DEFAULTS.primary_color);
      setSecondaryColor(serverSettings.secondary_color || DEFAULTS.secondary_color);
      setFontSans(serverSettings.font_sans || DEFAULTS.font_sans);
      setFontDisplay(serverSettings.font_display || DEFAULTS.font_display);
      setDefaultTheme(serverSettings.default_theme || DEFAULTS.default_theme);
      setSocialInstagram(serverSettings.social_instagram || "");
      setSocialTwitter(serverSettings.social_twitter || "");
      setSocialFacebook(serverSettings.social_facebook || "");
      setSocialYoutube(serverSettings.social_youtube || "");
      setSocialSoundcloud(serverSettings.social_soundcloud || "");
      setSocialMixcloud(serverSettings.social_mixcloud || "");
      setSocialTiktok(serverSettings.social_tiktok || "");
      setUnderHeaderText(serverSettings.under_header_text || "");
      setUnderHeaderAlign(serverSettings.under_header_align || "center");
    }
  }, [serverSettings]);

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
          logo_shape: DEFAULTS.logo_shape,
          favicon: DEFAULTS.favicon,
          primary_color: DEFAULTS.primary_color,
          secondary_color: DEFAULTS.secondary_color,
          font_sans: DEFAULTS.font_sans,
          font_display: DEFAULTS.font_display,
          default_theme: DEFAULTS.default_theme,
          social_instagram: "",
          social_twitter: "",
          social_facebook: "",
          social_youtube: "",
          social_soundcloud: "",
          social_mixcloud: "",
          social_tiktok: "",
          under_header_text: "",
          under_header_align: "center"
        })
      });
      if (res.ok) {
        showAlert({ title: "Reset Complete", message: "All branding settings have been restored to defaults.", style: "success" });
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        setAppName(DEFAULTS.appName);
        setAppTitle(DEFAULTS.appTitle);
        setAppTagline(DEFAULTS.appTagline);
        setLogoUrl(DEFAULTS.logo_url);
        setLogoDark(DEFAULTS.logo_dark);
        setLogoLight(DEFAULTS.logo_light);
        setLogoShape(DEFAULTS.logo_shape);
        setFavicon(DEFAULTS.favicon);
        setPrimaryColor(DEFAULTS.primary_color);
        setSecondaryColor(DEFAULTS.secondary_color);
        setFontSans(DEFAULTS.font_sans);
        setFontDisplay(DEFAULTS.font_display);
        setDefaultTheme(DEFAULTS.default_theme);
        setSocialInstagram("");
        setSocialTwitter("");
        setSocialFacebook("");
        setSocialYoutube("");
        setSocialSoundcloud("");
        setSocialMixcloud("");
        setSocialTiktok("");
        setUnderHeaderText("");
        setUnderHeaderAlign("center");
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
          logo_shape: logoShape,
          favicon: favicon,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          font_sans: fontSans,
          font_display: fontDisplay,
          default_theme: defaultTheme,
          social_instagram: socialInstagram,
          social_twitter: socialTwitter,
          social_facebook: socialFacebook,
          social_youtube: socialYoutube,
          social_soundcloud: socialSoundcloud,
          social_mixcloud: socialMixcloud,
          social_tiktok: socialTiktok,
          under_header_text: underHeaderText,
          under_header_align: underHeaderAlign
        })
      });
      if (res.ok) {
        showAlert({ title: "Success", message: "Branding settings saved!", style: "success" });
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    } catch(e) {
      console.error(e);
      showAlert({ title: "Error", message: "Failed to save branding settings", style: "danger" });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl pb-12">
      <h3 className={`text-xl sm:text-2xl font-bold border-b pb-4 transition-colors ${isLightMode ? 'text-black border-black/10' : 'text-white border-white/10'}`}>Branding Settings</h3>
      
      <div className={`p-5 sm:p-6 rounded-2xl border transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/30 border-white/5'} space-y-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b transition-colors border-dashed border-neon-purple/20">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex flex-col items-center">
              <div className={`${logoShape === 'rectangle' ? 'w-24 sm:w-32 h-12 sm:h-16' : 'w-14 sm:w-16 h-14 sm:h-16'} bg-white border border-black/10 rounded-xl flex items-center justify-center overflow-hidden shadow-sm transition-all duration-300`}>
                {(logoLight || logoUrl) ? (
                  <img src={logoLight || logoUrl || undefined} alt="Light Mode" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <div className="text-center p-1">
                    <HomeIcon className="w-5 sm:w-6 h-5 sm:h-6 text-black/20 mx-auto" />
                  </div>
                )}
              </div>
              <span className={`text-[8px] font-black uppercase mt-2 tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Light Mode</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`${logoShape === 'rectangle' ? 'w-24 sm:w-32 h-12 sm:h-16' : 'w-14 sm:w-16 h-14 sm:h-16'} bg-dark-bg border border-white/10 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300`}>
                {(logoDark || logoUrl) ? (
                  <img src={logoDark || logoUrl || undefined} alt="Dark Mode" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <div className="text-center p-1">
                    <HomeIcon className="w-5 sm:w-6 h-5 sm:h-6 text-white/10 mx-auto" />
                  </div>
                )}
              </div>
              <span className={`text-[8px] font-black uppercase mt-2 tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Dark Mode</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {appName ? (
              <h4 className="text-xl sm:text-2xl font-bold uppercase tracking-tight truncate" style={{ color: primaryColor, fontFamily: fontDisplay }}>{appName}</h4>
            ) : (
              <h4 className={`text-xl sm:text-2xl font-bold uppercase tracking-tight italic opacity-20 ${isLightMode ? 'text-black' : 'text-white'}`}>No App Name</h4>
            )}
            {appTagline ? (
              <p className={`text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black mt-1 ${isLightMode ? 'text-black/50' : 'text-white/40'}`} style={{ fontFamily: fontSans }}>{appTagline}</p>
            ) : (
              <p className={`text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-black mt-1 italic opacity-20 ${isLightMode ? 'text-black' : 'text-white'}`}>No Tagline</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Application Name</label>
              <input 
                value={appName} 
                onChange={e=>setAppName(e.target.value)} 
                className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                placeholder="DEJAVUFM"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Branding Tagline</label>
              <input 
                value={appTagline} 
                onChange={e=>setAppTagline(e.target.value)} 
                className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                placeholder="The Sound of London"
              />
            </div>
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Logo Shape / Aspect Ratio</label>
              <select 
                value={logoShape} 
                onChange={e=>setLogoShape(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`}
              >
                <option value="square">Square (1:1 Ratio)</option>
                <option value="rectangle">Rectangle (Wide Ratio)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Under-Header Text</label>
              <input 
                value={underHeaderText} 
                onChange={e=>setUnderHeaderText(e.target.value)} 
                className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                placeholder="e.g. LIVE FROM THE LONDON STUDIO"
              />
              <span className="text-[10px] opacity-40 mt-1 block">Displays on the ticker/line below the main station navigation header.</span>
            </div>
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Under-Header Text Alignment</label>
              <select 
                value={underHeaderAlign} 
                onChange={e=>setUnderHeaderAlign(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`}
              >
                <option value="left">Left (Desktop)</option>
                <option value="center">Center</option>
                <option value="right">Right (Desktop)</option>
              </select>
              <span className="text-[10px] opacity-40 mt-1 block">Alignment on desktop screens (always centered on mobile).</span>
            </div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Body Font (Sans)</label>
              <select 
                value={fontSans} 
                onChange={e=>setFontSans(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`}
              >
                {fontOptions.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Headings Font (Display)</label>
              <select 
                value={fontDisplay} 
                onChange={e=>setFontDisplay(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`}
              >
                {fontOptions.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </div>
          </div>

          <div className={`space-y-4 pt-4 border-t transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <ImageUploadField label="Logo URL (Global / Fallback)" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." description="Base logo used if specific theme logos are missing." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField label="Dark Mode Logo" value={logoDark} onChange={setLogoDark} description="Optimized for dark backgrounds." />
              <ImageUploadField label="Light Mode Logo" value={logoLight} onChange={setLogoLight} description="Optimized for light backgrounds." />
            </div>
            <ImageUploadField label="Favicon URL" value={favicon} onChange={setFavicon} description="The browser tab icon (.ico or .png)." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Primary Brand Color</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={e=>setPrimaryColor(e.target.value)} 
                  className={`w-12 h-12 rounded-xl cursor-pointer p-0 overflow-hidden border ${isLightMode ? 'bg-black/[0.03] border-black/10' : 'bg-dark-bg border-white/10'}`} 
                />
                <input 
                  type="text" 
                  value={primaryColor} 
                  onChange={e=>setPrimaryColor(e.target.value)} 
                  className={`flex-1 rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border font-mono uppercase ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                />
              </div>
            </div>
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Secondary Color</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="color" 
                  value={secondaryColor} 
                  onChange={e=>setSecondaryColor(e.target.value)} 
                  className={`w-12 h-12 rounded-xl cursor-pointer p-0 overflow-hidden border ${isLightMode ? 'bg-black/[0.03] border-black/10' : 'bg-dark-bg border-white/10'}`} 
                />
                <input 
                  type="text" 
                  value={secondaryColor} 
                  onChange={e=>setSecondaryColor(e.target.value)} 
                  className={`flex-1 rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border font-mono uppercase ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                />
              </div>
            </div>
          </div>

          <div className={`space-y-4 pt-4 border-t transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>Front End Default Theme</h4>
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Default Theme Mode</label>
              <select
                value={defaultTheme}
                onChange={e => setDefaultTheme(e.target.value)}
                className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`}
              >
                <option value="dark" className={isLightMode ? "text-black bg-white" : "text-white bg-dark-bg"}>Dark Mode</option>
                <option value="light" className={isLightMode ? "text-black bg-white" : "text-white bg-dark-bg"}>Light Mode</option>
              </select>
              <p className={`text-[10px] mt-1.5 leading-relaxed ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                Controls whether first-time visitors see the player in Dark Mode or Light Mode by default.
              </p>
            </div>
          </div>

          <div className={`space-y-4 pt-4 border-t transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>Social Media Links</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Instagram URL</label>
                <input 
                  value={socialInstagram} 
                  onChange={e=>setSocialInstagram(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Twitter / X URL</label>
                <input 
                  value={socialTwitter} 
                  onChange={e=>setSocialTwitter(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                  placeholder="https://twitter.com/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Facebook URL</label>
                <input 
                  value={socialFacebook} 
                  onChange={e=>setSocialFacebook(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>YouTube URL</label>
                <input 
                  value={socialYoutube} 
                  onChange={e=>setSocialYoutube(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>SoundCloud URL</label>
                <input 
                  value={socialSoundcloud} 
                  onChange={e=>setSocialSoundcloud(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                  placeholder="https://soundcloud.com/..."
                />
              </div>
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Mixcloud URL</label>
                <input 
                  value={socialMixcloud} 
                  onChange={e=>setSocialMixcloud(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                  placeholder="https://mixcloud.com/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>TikTok URL</label>
                <input 
                  value={socialTiktok} 
                  onChange={e=>setSocialTiktok(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                  placeholder="https://tiktok.com/@..."
                />
              </div>
            </div>
          </div>

          <div className={`flex flex-col sm:flex-row gap-4 pt-6 border-t transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <button 
              type="submit" 
              className="bg-neon-purple px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-neon-blue transition-all text-white shadow-lg shadow-neon-purple/20 flex-1 text-xs" 
              style={{ backgroundColor: primaryColor }}
            >
              Save Branding
            </button>
            <button 
              type="button" 
              onClick={handleReset}
              className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all border ${
                isLightMode 
                  ? 'bg-black/5 text-black/50 hover:text-red-600 hover:bg-red-50 border-black/10 hover:border-red-500/20' 
                  : 'bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-500/10 border-white/5 hover:border-red-500/20'
              }`}
            >
              Reset to Defaults
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();
  const [stream, setStream] = useState("");
  const [streamLow, setStreamLow] = useState("");
  const [streamMedium, setStreamMedium] = useState("");
  const [streamHigh, setStreamHigh] = useState("");
  const [rss, setRss] = useState("");
  const [studioVideoUrl, setStudioVideoUrl] = useState("");
  const [isOnAir, setIsOnAir] = useState(false);
  const [adminCustomPath, setAdminCustomPath] = useState("/admin");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState("");
  const [maintenanceText, setMaintenanceText] = useState("");
  const [maintenanceEndTime, setMaintenanceEndTime] = useState("");
  const [maintenanceShowPlayer, setMaintenanceShowPlayer] = useState(false);
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
      setMaintenanceMode(d.maintenance_mode === '1');
      setMaintenanceTitle(d.maintenance_title || "TEMPORARY CLOSED FOR MAINTENANCE");
      setMaintenanceText(d.maintenance_text || "Our sound engineers are performing essential system updates. We will be back on-air shortly with upgraded streams, podcasts, and archives.");
      setMaintenanceEndTime(d.maintenance_end_time || "");
      setMaintenanceShowPlayer(d.maintenance_show_player === '1');
      if (d.admin_custom_path) {
        setAdminCustomPath(d.admin_custom_path);
      }
    });
  }, []);

  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);

  const saveMaintenanceOnly = async (overrideMode?: boolean) => {
    setIsSavingMaintenance(true);
    const modeToSave = overrideMode !== undefined ? overrideMode : maintenanceMode;
    const toastId = toast.loading("Updating maintenance status...");
    try {
      const res = await fetchAdmin("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          maintenance_mode: modeToSave ? '1' : '0',
          maintenance_title: maintenanceTitle,
          maintenance_text: maintenanceText,
          maintenance_end_time: maintenanceEndTime,
          maintenance_show_player: maintenanceShowPlayer
        })
      });
      if (res.ok) {
        toast.success(
          modeToSave 
            ? "Maintenance Mode is now ACTIVE!" 
            : "Maintenance settings updated successfully (Status: Inactive).",
          { id: toastId }
        );
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      } else {
        throw new Error("Failed to save on server");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save maintenance settings.", { id: toastId });
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  const saveNode = async () => {
    try {
      let formattedPath = adminCustomPath.trim();
      if (!formattedPath) {
        formattedPath = "/admin";
      }
      if (!formattedPath.startsWith('/')) {
        formattedPath = '/' + formattedPath;
      }
      if (formattedPath.length > 1 && formattedPath.endsWith('/')) {
        formattedPath = formattedPath.slice(0, -1);
      }

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
          is_on_air: isOnAir,
          admin_custom_path: formattedPath,
          maintenance_mode: maintenanceMode,
          maintenance_title: maintenanceTitle,
          maintenance_text: maintenanceText,
          maintenance_end_time: maintenanceEndTime,
          maintenance_show_player: maintenanceShowPlayer
        })
      });
      if (res.ok) {
        setAdminCustomPath(formattedPath);
        showAlert({ title: "Success", message: `General settings saved! Dashboard path updated to: ${formattedPath}`, style: "success" });
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    } catch(e) {
      console.error(e);
      showAlert({ title: "Error", message: "Failed to save settings", style: "danger" });
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <h3 className={`text-xl sm:text-2xl font-bold border-b pb-4 transition-colors ${isLightMode ? 'text-black border-black/10' : 'text-white border-white/10'}`}>General Settings</h3>
      
      <div className={`p-5 sm:p-6 rounded-2xl border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 max-w-2xl ${
        isOnAir 
          ? (isLightMode ? 'bg-neon-purple/5 border-neon-purple/20' : 'bg-neon-purple/10 border-neon-purple/30')
          : (isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/10')
      }`}>
        <div className="flex items-center space-x-4">
          <div className={`w-3.5 h-3.5 rounded-full shadow-lg ${isOnAir ? 'bg-neon-purple animate-pulse shadow-neon-purple/50' : (isLightMode ? 'bg-black/10' : 'bg-white/10')}`}></div>
          <div>
            <h4 className={`font-black uppercase tracking-widest text-[10px] sm:text-xs ${isLightMode ? 'text-black' : 'text-white'}`}>Live Station Status</h4>
            <p className={`text-[10px] mt-1 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Toggles the global "ON AIR" banner across the station.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOnAir(!isOnAir)}
          className={`w-14 h-7 rounded-full relative transition-all shadow-inner ${isOnAir ? 'bg-neon-purple' : (isLightMode ? 'bg-black/20' : 'bg-white/10')}`}
        >
          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${isOnAir ? 'left-8' : 'left-1'}`}></div>
        </button>
      </div>

      {/* Maintenance / Coming Soon Mode Card */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col items-stretch gap-6 max-w-2xl ${
        maintenanceMode 
          ? (isLightMode ? 'bg-red-500/[0.03] border-red-500/30 shadow-lg shadow-red-500/5' : 'bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/5')
          : (isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/10')
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className={`w-3.5 h-3.5 rounded-full shadow-lg ${maintenanceMode ? 'bg-red-500 animate-pulse shadow-red-500/50' : (isLightMode ? 'bg-black/10' : 'bg-white/10')}`}></div>
            <div>
              <h4 className={`font-black uppercase tracking-widest text-[10px] sm:text-xs ${isLightMode ? 'text-black' : 'text-white'}`}>Maintenance / Coming Soon Mode</h4>
              <p className={`text-[10px] mt-1 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                Activating this locks the public site under a beautiful "Coming Soon" screen. Admins still have full dashboard access.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`w-14 h-7 rounded-full relative transition-all shadow-inner shrink-0 ${maintenanceMode ? 'bg-red-500' : (isLightMode ? 'bg-black/20' : 'bg-white/10')}`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${maintenanceMode ? 'left-8' : 'left-1'}`}></div>
          </button>
        </div>

        <div className="space-y-4 pt-4 border-t border-dashed border-red-500/20">
          <div>
            <label className={`block text-[10px] uppercase mb-1 font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Coming Soon / Maintenance Title</label>
            <input 
              value={maintenanceTitle} 
              onChange={e => setMaintenanceTitle(e.target.value)} 
              className={`w-full rounded-xl px-4 py-3 text-sm focus:border-red-500 outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
              placeholder="e.g. TEMPORARY CLOSED FOR MAINTENANCE"
            />
          </div>
          <div>
            <label className={`block text-[10px] uppercase mb-1 font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Main Description Message</label>
            <textarea 
              value={maintenanceText} 
              onChange={e => setMaintenanceText(e.target.value)} 
              rows={3}
              className={`w-full rounded-xl px-4 py-3 text-sm focus:border-red-500 outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
              placeholder="Describe what is happening..."
            />
          </div>
          <div>
            <label className={`block text-[10px] uppercase mb-1 font-black tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Expected Back Time (Optional Countdown)</label>
            <div className="relative">
              <input 
                type="datetime-local"
                value={maintenanceEndTime} 
                onChange={e => setMaintenanceEndTime(e.target.value)} 
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch (err) {}
                }}
                style={{ colorScheme: isLightMode ? 'light' : 'dark' }}
                className={`w-full rounded-xl pl-4 pr-10 py-3 text-sm focus:border-red-500 outline-none transition-all border [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
              />
              <div className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                <Calendar className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className={`text-[10px] mt-1.5 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
              If specified, a live countdown timer will be displayed to visitors. Click on the input or calendar icon to select a date and time.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-red-500/20 bg-red-500/[0.01]">
            <div>
              <label className={`block text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>Show Live Player on Maintenance Page</label>
              <p className={`text-[10px] mt-1 ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
                Allows visitors to still play and stream your live radio broadcast while the site is under maintenance.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setMaintenanceShowPlayer(!maintenanceShowPlayer)}
              className={`w-14 h-7 rounded-full relative transition-all shadow-inner shrink-0 ${maintenanceShowPlayer ? 'bg-red-500' : (isLightMode ? 'bg-black/20' : 'bg-white/10')}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${maintenanceShowPlayer ? 'left-8' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className={`text-[10px] font-bold ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>
              Status: {maintenanceMode ? (
                <span className="text-red-500 font-black uppercase">Active (Locked Site)</span>
              ) : (
                <span className="text-green-500 font-black uppercase">Inactive (Live)</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => saveMaintenanceOnly()}
              disabled={isSavingMaintenance}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 ${
                maintenanceMode
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/15'
                  : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'
              } disabled:opacity-50`}
            >
              {isSavingMaintenance ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Save Maintenance Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Default Stream URL (Global Fallback)</label>
            <input 
              value={stream} 
              onChange={e=>setStream(e.target.value)} 
              className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
            />
          </div>
          
          <div className={`pt-6 border-t transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <h4 className={`text-lg font-bold mb-4 ${isLightMode ? 'text-black' : 'text-white'}`}>Streaming Tiers</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Low Bitrate (e.g. 64kbps AAC)</label>
                <input 
                  value={streamLow} 
                  onChange={e=>setStreamLow(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                />
              </div>
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Standard Bitrate (e.g. 128kbps MP3)</label>
                <input 
                  value={streamMedium} 
                  onChange={e=>setStreamMedium(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                />
              </div>
              <div>
                <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>High Definition (e.g. 320kbps MP3)</label>
                <input 
                  value={streamHigh} 
                  onChange={e=>setStreamHigh(e.target.value)} 
                  className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                />
              </div>
            </div>
          </div>

          <div className={`pt-6 border-t transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Studio Live Stream Embed (Twitch / YouTube)</label>
            <input 
              value={studioVideoUrl} 
              onChange={e=>setStudioVideoUrl(e.target.value)} 
              className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
              placeholder="https://player.twitch.tv/?channel=station&parent=site.com" 
            />
          </div>
          <div>
            <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Podomatic Podcast Feed URL</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                value={rss} 
                onChange={e=>setRss(e.target.value)} 
                className={`flex-1 rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
              />
              <button 
                type="button" 
                onClick={async () => {
                  const res = await fetchAdmin("/api/admin/podcasts/refresh", { method: "POST" });
                  if (res.ok) showAlert({ title: "Success", message: "Podcast cache cleared.", style: "success" });
                }}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                  isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                Force Sync
              </button>
            </div>
          </div>

          <div className={`pt-6 border-t space-y-3 transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <h4 className={`text-lg font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>Dashboard Access URL / Path</h4>
            <p className={`text-[11px] leading-relaxed ${isLightMode ? 'text-black/60' : 'text-white/50'}`}>
              Customize the URL path used to access the Creator Dashboard in the future. Default is <code className="px-1.5 py-0.5 rounded bg-neon-purple/10 text-neon-purple font-mono font-bold">/admin</code>. You can change this to any custom path (e.g., <code className="px-1.5 py-0.5 rounded bg-neon-purple/10 text-neon-purple font-mono font-bold">/control-panel</code> or <code className="px-1.5 py-0.5 rounded bg-neon-purple/10 text-neon-purple font-mono font-bold">/station-admin</code>).
            </p>
            <div>
              <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Dashboard Path</label>
              <div className="flex items-center space-x-2">
                <span className={`px-4 py-3 text-sm font-mono rounded-xl border select-none ${isLightMode ? 'bg-black/5 border-black/10 text-black/50' : 'bg-white/5 border-white/10 text-white/40'}`}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}
                </span>
                <input 
                  value={adminCustomPath} 
                  onChange={e => setAdminCustomPath(e.target.value)} 
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-mono focus:border-neon-purple outline-none transition-all border ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
                  placeholder="/admin"
                />
              </div>
              <p className={`text-[10px] mt-1.5 font-mono ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                Full Dashboard URL: <span className="text-neon-purple font-bold">{typeof window !== 'undefined' ? window.location.origin : ''}{adminCustomPath.startsWith('/') ? adminCustomPath : '/' + adminCustomPath}</span>
              </p>
            </div>
          </div>

          <div className={`pt-6 border-t transition-colors ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
            <AdminSecretSettings />
          </div>

          <button 
            onClick={saveNode} 
            className="w-full sm:w-auto bg-neon-purple text-white font-black uppercase tracking-widest text-xs py-4 px-10 rounded-xl hover:bg-neon-blue transition-all shadow-lg shadow-neon-purple/20 mt-4"
          >
            Update General Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSecretSettings() {
  const { isLightMode } = useLogo();
  const [secret, setSecret] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { showAlert } = useModal();

  useEffect(() => {
    fetchAdmin("/api/admin/settings/secret").then(r=>r.json()).then(d => {
      if (d.secret) setSecret(d.secret);
    });
  }, []);

  const handleSaveSecret = async () => {
    try {
      const res = await fetchAdmin("/api/admin/settings/secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret })
      });
      if (res.ok) {
        showAlert({ title: "Success", message: "Admin access secret updated!", style: "success" });
      } else {
        showAlert({ title: "Error", message: "Failed to update secret", style: "danger" });
      }
    } catch(e) {
      console.error(e);
      showAlert({ title: "Error", message: "Failed to update secret", style: "danger" });
    }
  };

  return (
    <div className="space-y-3">
      <h4 className={`text-lg font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>Admin Portal Security</h4>
      <label className={`block text-[10px] uppercase mb-1 font-bold tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Secret Access Answer (Authorized Name)</label>
      <div className="flex flex-col sm:flex-row gap-3 relative">
        <div className="relative flex-1">
          <input 
            type={showPassword ? "text" : "password"}
            value={secret} 
            onChange={e=>setSecret(e.target.value)} 
            className={`w-full rounded-xl px-4 py-3 text-sm focus:border-neon-purple outline-none transition-all border pr-12 ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} 
            placeholder="e.g. waynee"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors focus:outline-none ${isLightMode ? 'text-black/40 hover:text-black hover:bg-black/5' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button 
          type="button"
          onClick={handleSaveSecret}
          className="px-6 py-3 bg-neon-purple text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-blue transition-all shadow-lg shadow-neon-purple/20 whitespace-nowrap"
        >
          Update Secret
        </button>
      </div>
      <p className={`text-[10px] leading-relaxed mt-2 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>This is the answer required to access the admin login page from the public site.</p>
    </div>
  );
}
