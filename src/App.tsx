import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { Radio, Calendar, Podcast, Shield as AdminIcon, Headphones, Menu, X, Video, MessageSquare, Sun, Moon, FileText, ChevronDown, ExternalLink, Info, Instagram, Twitter, Facebook, Youtube, Cloud, Music, Share2, Layers, Globe, ShieldAlert, Power, Sparkles, Ticket, Apple, Smartphone } from 'lucide-react';
import { PlayerBar } from './components/PlayerBar';
import { NotificationManager } from './components/NotificationManager';
import { GlobalRequestAlerts } from './components/GlobalRequestAlerts';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { AudioProvider, useAudio } from './context/AudioContext';
import { ModalProvider, useModal } from './context/ModalContext';
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { convertToLocalTime, getLondonTime } from './lib/timeUtils';
import { useLogo } from './hooks/useLogo';
import { SecretAdminPrompt } from './components/SecretAdminPrompt';
import { SitePopup } from './components/SitePopup';
import { AdvertisementSliders } from './components/AdvertisementSliders';
import { AppLoader } from './components/AppLoader';
import { FeaturesSlider } from './components/FeaturesSlider';
import { safeFetchJson } from './utils/safeFetch';

// Resilient Lazy Import Helper with automatic chunk retry and cache invalidation
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>
) {
  return lazy(async () => {
    try {
      const module = await componentImport();
      sessionStorage.removeItem('app_chunk_retry');
      return module.default ? module : { default: module };
    } catch (error) {
      console.warn('[LazyRetry] Initial module import failed, retrying...', error);
      try {
        await new Promise(r => setTimeout(r, 100));
        const module = await componentImport();
        sessionStorage.removeItem('app_chunk_retry');
        return module.default ? module : { default: module };
      } catch (retryError) {
        const pageHasBeenRefreshed = sessionStorage.getItem('app_chunk_retry');
        if (!pageHasBeenRefreshed) {
          sessionStorage.setItem('app_chunk_retry', 'true');
          window.location.reload();
        }
        throw retryError;
      }
    }
  });
}

import { ChatSidebar } from './components/ChatSidebar';
import { ShoutoutWidget } from './components/ShoutoutWidget';
import { CinematicVisualizer } from './components/CinematicVisualizer';
// @ts-ignore
import glitchLogoUrl from './assets/images/dejavufm_glitch_logo_1784796255055.png';
import { ThemeAccessibilityDropdown } from './components/ThemeAccessibilityDropdown';
import { ShareModal } from './components/ShareModal';
import { PremiumRingLoader } from './components/PremiumRingLoader';
import { triggerHaptic } from './lib/hapticHelper';
import { suppressAccessibilityForAdmin, applyFrontAccessibilityOptions } from './utils/accessibility';
import { GamificationProvider } from './context/GamificationContext';
import { GamificationNavBadge } from './components/gamification/GamificationNavBadge';
import { GamificationHubModal } from './components/gamification/GamificationHubModal';
import { LevelUpModal } from './components/gamification/LevelUpModal';
import { PersonalizedGreetingModal } from './components/PersonalizedGreetingModal';
import { getPodcastId } from './utils/safeFetch';

const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.83V7.62a6.34 6.34 0 0 0-5.83 6.3 6.34 6.34 0 0 0 9.17 5.61A6.33 6.33 0 0 0 15.82 14V8.42a8.31 8.31 0 0 0 4.77 1.52V6.49a4.85 4.85 0 0 1-1-.2z" />
  </svg>
);

const MixcloudIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 640 512" fill="currentColor">
    <path d="M424.43 219.729C416.124 134.727 344.135 68 256.919 68c-72.266 0-136.224 46.516-159.205 114.074-54.545 8.029-96.63 54.822-96.63 111.582 0 62.298 50.668 112.966 113.243 112.966h289.614c52.329 0 94.969-42.362 94.969-94.693 0-45.131-32.118-83.063-74.48-92.2zm-20.489 144.53H114.327c-39.04 0-70.881-31.564-70.881-70.604s31.841-70.604 70.881-70.604c18.827 0 36.548 7.475 49.838 20.766 19.963 19.963 50.133-10.227 30.18-30.18-14.675-14.398-32.672-24.365-52.053-29.349 19.935-44.3 64.79-73.926 114.628-73.926 69.496 0 125.979 56.483 125.979 125.702 0 13.568-2.215 26.857-6.369 39.594-8.943 27.517 32.133 38.939 40.147 13.29 2.769-8.306 4.984-16.889 6.369-25.472 19.381 7.476 33.502 26.303 33.502 48.453 0 28.795-23.535 52.33-52.607 52.33zm235.069-52.33c0 44.024-12.737 86.386-37.102 122.657-4.153 6.092-10.798 9.414-17.72 9.414-16.317 0-27.127-18.826-17.443-32.949 19.381-29.349 29.903-63.682 29.903-99.122s-10.521-69.773-29.903-98.845c-15.655-22.831 19.361-47.24 35.163-23.534 24.366 35.993 37.102 78.356 37.102 122.379zm-70.88 0c0 31.565-9.137 62.021-26.857 88.325-4.153 6.091-10.798 9.136-17.72 9.136-17.201 0-27.022-18.979-17.443-32.948 13.013-19.104 19.658-41.255 19.658-64.513 0-22.981-6.645-45.408-19.658-64.512-15.761-22.986 19.008-47.095 35.163-23.535 17.719 26.026 26.857 56.483 26.857 88.047z" />
  </svg>
);

// Pages
import Home from './pages/Home';
import Admin from './pages/Admin';
const Schedule = lazyWithRetry(() => import('./pages/Schedule'));
const PodcastsPage = lazyWithRetry(() => import('./pages/Podcasts'));
const PodcastDetail = lazyWithRetry(() => import('./pages/PodcastDetail'));
const DJs = lazyWithRetry(() => import('./pages/DJs'));
const DJDetail = lazyWithRetry(() => import('./pages/DJDetail'));
const About = lazyWithRetry(() => import('./pages/About'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const WatchLive = lazyWithRetry(() => import('./pages/WatchLive'));
const Features = lazyWithRetry(() => import('./pages/Features'));
const FeatureDetail = lazyWithRetry(() => import('./pages/FeatureDetail'));
const Events = lazyWithRetry(() => import('./pages/Events').then(m => ({ default: m.Events })));
const EventDetail = lazyWithRetry(() => import('./pages/EventDetail').then(m => ({ default: m.EventDetail })));
const Arch421 = lazyWithRetry(() => import('./pages/Arch421'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const Maintenance = lazyWithRetry(() => import('./pages/Maintenance'));
const CustomDynamicPage = lazyWithRetry(() => import('./pages/CustomDynamicPage').then(m => ({ default: m.CustomDynamicPage })));
const Booth = lazyWithRetry(() => import('./pages/Booth'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents aggressive background fetching when switching tabs/windows or waking device
      refetchOnReconnect: false,   // Prevents redundant fetches during minor network state changes
      staleTime: 1000 * 30,        // Consider data fresh for 30 seconds to minimize redundant API requests
      retry: 1,                    // Limit retries to prevent hammering server on failure
    },
  },
});

// Initialize global socket
if (typeof window !== 'undefined') {
  let tabId = sessionStorage.getItem('dejavu_tab_id');
  if (!tabId) {
    tabId = 'tab_' + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem('dejavu_tab_id', tabId);
  }

  let browserId = localStorage.getItem('dejavu_browser_id');
  if (!browserId) {
    browserId = 'browser_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('dejavu_browser_id', browserId);
  }

  const socketInstance = io({
    transports: ['websocket'],
    auth: {
      tabId,
      browserId,
      userAgent: navigator.userAgent
    },
    query: {
      tabId,
      browserId
    }
  });

  socketInstance.on('settings_updated', (updatedSettings: any) => {
    queryClient.setQueryData(['settings'], updatedSettings);
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  });

  socketInstance.on('kill_switch_toggled', () => {
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  });

  socketInstance.on('system_cache_purged', async (data: any) => {
    console.log("[Cache] System cache purged notification received from server:", data);
    const scope = data?.scope || 'all';

    // 1. Flush browser CacheStorage if full or UI purge
    if (scope === 'all' || scope === 'visitor_ui') {
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
      } catch (e) {
        console.warn("[Cache] CacheStorage clear warning:", e);
      }
    }

    // 2. Trigger progressive Service Worker / PWA update check
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const reg of registrations) {
            reg.update().catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("[Cache] Service worker update check error:", e);
    }

    // 3. Update local cache version token
    if (data?.version) {
      localStorage.setItem('app_cache_version', data.version);
    }

    // 4. Targeted or full React Query cache invalidation
    if (scope === 'podcasts') {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] });
      queryClient.invalidateQueries({ queryKey: ['podcast-feed'] });
    } else if (scope === 'audio_meta') {
      queryClient.invalidateQueries({ queryKey: ['now-playing'] });
      queryClient.invalidateQueries({ queryKey: ['stream-metadata'] });
      queryClient.invalidateQueries({ queryKey: ['curated-tracks'] });
    } else if (scope === 'visitor_ui') {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    } else {
      queryClient.invalidateQueries();
    }
  });

  socketInstance.on('force_logout', async (data: any) => {
    console.warn("[Socket] Force logout event triggered by Administrator:", data);

    // 1. Clear local/session storage credentials instantly
    localStorage.removeItem("admin_token");
    localStorage.removeItem("chat_user_token");
    sessionStorage.removeItem("admin_secret_passed");
    localStorage.removeItem("dejavu_blocked_users");

    // 2. Perform backend logouts to discard HttpOnly session cookies
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (e) {}
    try {
      await fetch("/api/public/auth/logout", { method: "POST" });
    } catch (e) {}

    // 3. Dispatch global sync event to notify any open component state
    window.dispatchEvent(new CustomEvent('chat_auth_sync', { detail: null }));

    // 4. Redirect to the admin portal with a custom warning parameter
    window.location.href = "/admin?reason=terminated";
  });

  (window as any).socket = socketInstance;
}


function Navigation({ onOpenChat, featChat, isStaff }: { onOpenChat: () => void; featChat: boolean; isStaff?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isMobileFeaturesOpen, setIsMobileFeaturesOpen] = useState(false);
  const [showSecretPrompt, setShowSecretPrompt] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [openMobileDropdownKey, setOpenMobileDropdownKey] = useState<string | null>(null);
  const { logoUrl, logoShape, isLightMode, settings } = useLogo();

  const adminPath = (settings?.admin_custom_path || '/admin').trim().replace(/\/+$/, '') || '/admin';
  const isAdmin = location.pathname.startsWith('/admin') || (adminPath !== '/admin' && location.pathname.startsWith(adminPath));

  const handleAdminClick = () => {
    // Senior Dev: If the user is already confirmed as staff or has passed the secret, go straight to admin
    if (isStaff || sessionStorage.getItem('admin_secret_passed') === 'true') {
      navigate(adminPath);
    } else {
      setShowSecretPrompt(true);
    }
  };

  // Professional touch: Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const toggleTheme = () => {
    const next = !isLightMode;
    if (next) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
    // Note: useLogo will update automatically via MutationObserver
  };

  const appName = settings?.app_name !== undefined ? settings.app_name : "DejavuFM";
  const appTagline = settings?.app_tagline !== undefined ? settings.app_tagline : "The UKs Most Influential Independent Radio Station";
  const isLongTagline = appTagline.length > 25;
  
  const isSingleLogo = !!settings?.logo_url && !settings?.logo_light && !settings?.logo_dark;

  const isOnAir = settings?.is_on_air === '1';

  const featLiveTools = settings?.feat_live_tools !== '0';
  const featBooth = settings?.feat_booth !== '0';
  const featSpecialEvents = settings?.feat_special_events !== '0';
  // Removed internal featChat definition since it's now a prop

  // Custom navigation parsing from the master Menu tab settings
  let customLabels: Record<string, string> = {};
  if (settings?.menu_item_labels) {
    try {
      customLabels = JSON.parse(settings.menu_item_labels);
    } catch {}
  }

  let customVisibility: Record<string, boolean> = {};
  if (settings?.menu_item_visibility) {
    try {
      customVisibility = JSON.parse(settings.menu_item_visibility);
    } catch {}
  }

  let customPaths: Record<string, string> = {};
  if (settings?.menu_item_paths) {
    try {
      customPaths = JSON.parse(settings.menu_item_paths);
    } catch {}
  }

  let customOrder: string[] = ['arch421', 'listen', 'watch', 'events', 'schedule', 'djs', 'podcasts', 'features', 'booth'];
  if (settings?.menu_order) {
    customOrder = settings.menu_order.split(',').map((k: string) => k.trim());
    if (!customOrder.includes('events')) {
      const scheduleIdx = customOrder.indexOf('schedule');
      if (scheduleIdx !== -1) {
        customOrder.splice(scheduleIdx, 0, 'events');
      } else {
        customOrder.splice(3, 0, 'events');
      }
    }
    if (!customOrder.includes('booth')) {
      customOrder.push('booth');
    }
  }

  let customSubItems: Record<string, { label: string; path: string; isExternal?: boolean }[]> = {};
  if (settings?.menu_sub_items) {
    try {
      customSubItems = JSON.parse(settings.menu_sub_items);
    } catch {}
  }

  // Backwards compatibility fallback for default features sub-items if not customized in the DB
  if (!customSubItems['features'] || customSubItems['features'].length === 0) {
    customSubItems['features'] = [
      { path: '/features', label: 'All Features' },
      { path: 'https://dejavufmstore.secure-decoration.com', label: 'Online Store', isExternal: true },
      { path: '/about', label: 'About Station' },
      { path: '/contact', label: 'Contact Us' }
    ];
  }

  const defaultItems = [
    { key: 'arch421', path: '/arch421', defaultLabel: 'Arch421' },
    { key: 'listen', path: '/', defaultLabel: 'Listen' },
    { key: 'watch', path: '/watch', defaultLabel: 'Watch' },
    { key: 'events', path: '/events', defaultLabel: 'Events' },
    { key: 'schedule', path: '/schedule', defaultLabel: 'Schedule' },
    { key: 'djs', path: '/djs', defaultLabel: 'DJs and Hosts' },
    { key: 'podcasts', path: '/podcasts', defaultLabel: 'Podcasts' },
    { key: 'features', path: '/features', defaultLabel: 'Features' },
    { key: 'booth', path: '/booth', defaultLabel: 'DJ Booth' }
  ];

  const renderedMenuItems = customOrder
    .map(key => {
      const isCustom = key.startsWith('custom_');
      let path = '/';
      let label = key;

      if (isCustom) {
        path = customPaths[key] || '#';
        label = customLabels[key] || 'Custom Link';
      } else {
        const defaultItem = defaultItems.find(item => item.key === key);
        if (!defaultItem) return null;
        path = defaultItem.path;
        label = customLabels[key] || defaultItem.defaultLabel;
      }

      const subItems = customSubItems[key] || [];
      const hasSubItems = subItems.length > 0;

      if (hasSubItems) {
        return {
          key,
          render: (lbl: string) => (
            <div 
              key={key}
              className="relative group h-full flex items-center"
              onMouseEnter={() => setActiveDropdown(key)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button 
                onClick={() => setActiveDropdown(activeDropdown === key ? null : key)}
                className={`px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  subItems.some(sub => location.pathname === sub.path) 
                    ? (isLightMode ? 'bg-[#000000] text-[#ffffff] shadow-md border border-black/5' : 'bg-[#ffffff] text-[#000000] shadow-xl')
                    : (isLightMode ? 'text-[#000000]/60 hover:text-[#000000] hover:bg-black/5' : 'text-white/50 hover:text-white hover:bg-white/5')
                }`}
              >
                {lbl} <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${activeDropdown === key ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {activeDropdown === key && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute top-full left-0 pt-2 w-64 z-50 pointer-events-auto"
                  >
                    <div className={`border rounded-2xl overflow-hidden p-1.5 ${
                      isLightMode 
                        ? 'bg-[#ffffff] border-black/10 text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.15)]' 
                        : 'backdrop-blur-3xl bg-dark-bg/95 border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                    }`}>
                      <div className={`px-3 py-2 mb-1 border-b ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isLightMode ? 'text-black/30' : 'text-white/20'}`}>Explore</span>
                      </div>
                      {subItems.map((sub, subIdx) => {
                        const isExt = sub.isExternal || sub.path.startsWith('http://') || sub.path.startsWith('https://');
                        const displaySubLabel = sub.label?.trim() || (() => {
                          const cleanPath = (sub.path || '').replace(/^\//, '').split('?')[0];
                          if (!cleanPath) return 'Direct Link';
                          return cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1);
                        })();

                        if (isExt) {
                          return (
                            <a 
                              key={subIdx}
                              href={sub.path} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={`flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all group/item ${
                                isLightMode
                                  ? 'text-black/70 hover:text-black hover:bg-black/5'
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                              }`}
                              onClick={() => setActiveDropdown(null)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center group-hover/item:bg-neon-blue/20 transition-colors">
                                  <Radio className="w-4 h-4 text-neon-blue" />
                                </div>
                                {displaySubLabel}
                              </div>
                              <ExternalLink className={`w-3 h-3 ${isLightMode ? 'text-black/30' : 'text-white/30'}`} />
                            </a>
                          );
                        } else {
                          return (
                            <Link 
                              key={subIdx}
                              to={sub.path} 
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all group/item ${
                                isLightMode
                                  ? 'text-black/70 hover:text-black hover:bg-black/5'
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                              }`}
                              onClick={() => setActiveDropdown(null)}
                            >
                              <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center group-hover/item:bg-neon-purple/20 transition-colors">
                                <FileText className="w-4 h-4 text-neon-purple" />
                              </div>
                              {displaySubLabel}
                            </Link>
                          );
                        }
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        };
      }

      // No sub-menu items, render as standard link
      const isExternal = path.startsWith('http://') || path.startsWith('https://');
      return {
        key,
        render: (lbl: string) => {
          if (isExternal) {
            return (
              <a 
                key={key} 
                href={path} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap text-white/50 hover:text-white hover:bg-white/5 flex items-center gap-1"
              >
                {lbl}
              </a>
            );
          } else {
            // Apply special stylings if key matches arch421 or watch, etc.
            if (key === 'arch421') {
              return (
                <NavLink 
                  key={key} 
                  to={path} 
                  className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-[#f75c1e] text-[#ffffff] shadow-[0_0_20px_rgba(247,92,30,0.4)]' : 'text-[#f75c1e] bg-transparent hover:bg-[#f75c1e]/10'}`}
                >
                  {lbl}
                </NavLink>
              );
            }
            if (key === 'watch') {
              return (
                <NavLink 
                  key={key} 
                  to={path} 
                  className={({isActive}) => `px-4 xl:px-8 py-3 flex items-center gap-2 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-neon-purple text-[#ffffff] shadow-[0_0_25px_rgba(176,38,255,0.4)]' : (isLightMode ? 'text-[#000000]/60 hover:text-[#000000] hover:bg-black/5' : 'text-white/50 hover:text-white hover:bg-white/5')}`}
                >
                  <Radio className="w-4 h-4 hidden xl:block" /> {lbl}
                </NavLink>
              );
            }
            return (
              <NavLink 
                key={key} 
                to={path} 
                className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? (isLightMode ? 'bg-[#000000] text-[#ffffff] shadow-md border border-black/5' : 'bg-[#ffffff] text-[#000000] shadow-xl') : (isLightMode ? 'text-[#000000]/60 hover:text-[#000000] hover:bg-black/5' : 'text-white/50 hover:text-white hover:bg-white/5')}`}
              >
                {lbl}
              </NavLink>
            );
          }
        }
      };
    })
    .filter((item): item is NonNullable<typeof item> => {
      if (!item) return false;
      if (customVisibility[item.key] === false) return false;
      if (item.key === 'watch' && featLiveTools === false) return false;
      if (item.key === 'booth' && featBooth === false) return false;
      if (item.key === 'events' && featSpecialEvents === false) return false;
      return true;
    })
    .map(item => {
      const label = customLabels[item.key] || (defaultItems.find(d => d.key === item.key)?.defaultLabel || item.key);
      return item.render(label);
    });

  const defaultMobileItems = [
    { key: 'arch421', path: '/arch421', defaultLabel: 'Arch421', icon: <Layers className="w-5 h-5" />, color: 'text-[#f75c1e]' },
    { key: 'listen', path: '/', defaultLabel: 'Listen', icon: <Radio className="w-5 h-5" />, color: 'text-neon-purple', exact: true },
    { key: 'watch', path: '/watch', defaultLabel: 'Watch', icon: <Video className="w-5 h-5" />, color: 'text-neon-purple', conditional: featLiveTools },
    { key: 'events', path: '/events', defaultLabel: 'Events', icon: <Ticket className="w-5 h-5" />, color: 'text-neon-purple' },
    { key: 'schedule', path: '/schedule', defaultLabel: 'Schedule', icon: <Calendar className="w-5 h-5" />, color: 'text-neon-purple' },
    { key: 'djs', path: '/djs', defaultLabel: 'DJs and Hosts', icon: <Headphones className="w-5 h-5" />, color: 'text-neon-purple' },
    { key: 'podcasts', path: '/podcasts', defaultLabel: 'Podcasts', icon: <Podcast className="w-5 h-5" />, color: 'text-neon-purple', matchPrefix: true },
    { key: 'features', path: '/features', defaultLabel: 'Features', icon: <FileText className="w-5 h-5" />, color: 'text-neon-purple' },
    { key: 'booth', path: '/booth', defaultLabel: 'DJ Booth', icon: <Music className="w-5 h-5" />, color: 'text-neon-purple' }
  ];

  const renderedMobileItems = customOrder
    .map(key => {
      const isCustom = key.startsWith('custom_');
      const defaultItem = !isCustom ? defaultMobileItems.find(item => item.key === key) : undefined;
      let path = '/';
      let label = key;
      let isExternal = false;
      let exact = false;
      let matchPrefix = false;

      if (isCustom) {
        path = customPaths[key] || '#';
        label = customLabels[key] || 'Custom Link';
        isExternal = path.startsWith('http://') || path.startsWith('https://');
      } else {
        if (!defaultItem) return null;
        path = defaultItem.path || '/';
        label = customLabels[key] || defaultItem.defaultLabel;
        isExternal = !!(defaultItem as any).isExternal;
        exact = !!defaultItem.exact;
        matchPrefix = !!defaultItem.matchPrefix;
      }

      const subItems = customSubItems[key] || [];
      const hasSubItems = subItems.length > 0;

      if (hasSubItems) {
        return {
          key,
          defaultLabel: label,
          isMenu: true,
          exact,
          matchPrefix,
          isOpen: openMobileDropdownKey === key,
          setOpen: (open: boolean) => setOpenMobileDropdownKey(open ? key : null),
          subItems: subItems.map(sub => {
            const displaySubLabel = sub.label?.trim() || (() => {
              const cleanPath = (sub.path || '').replace(/^\//, '').split('?')[0];
              if (!cleanPath) return 'Direct Link';
              return cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1);
            })();

            return {
              path: sub.path,
              label: displaySubLabel,
              isExternal: sub.isExternal || sub.path.startsWith('http://') || sub.path.startsWith('https://'),
              icon: <Globe className="w-4 h-4" />
            };
          })
        };
      }

      // Regular item
      const itemIcon = defaultItem?.icon || (
        key === 'arch421' ? <Layers className="w-5 h-5" /> :
        key === 'listen' ? <Radio className="w-5 h-5" /> :
        key === 'watch' ? <Video className="w-5 h-5" /> :
        key === 'events' ? <Ticket className="w-5 h-5" /> :
        key === 'schedule' ? <Calendar className="w-5 h-5" /> :
        key === 'djs' ? <Headphones className="w-5 h-5" /> :
        key === 'podcasts' ? <Podcast className="w-5 h-5" /> :
        key === 'features' ? <FileText className="w-5 h-5" /> :
        key === 'booth' ? <Music className="w-5 h-5" /> :
        <Globe className="w-5 h-5" />
      );

      const itemColor = defaultItem?.color || (
        key === 'arch421' ? 'text-[#f75c1e]' : 'text-neon-purple'
      );

      return {
        key,
        path,
        defaultLabel: label,
        isExternal,
        exact,
        matchPrefix,
        icon: itemIcon,
        color: itemColor
      };
    })
    .filter((item): item is NonNullable<typeof item> => {
      if (!item) return false;
      if (customVisibility[item.key] === false) return false;
      if (item.key === 'watch' && featLiveTools === false) return false;
      if (item.key === 'booth' && featBooth === false) return false;
      if (item.key === 'events' && featSpecialEvents === false) return false;
      return true;
    })
    .map(item => ({
      ...item,
      label: customLabels[item.key] || item.defaultLabel
    }));

  useEffect(() => {
    if (settings) {
      if (settings.primary_color) {
        document.documentElement.style.setProperty('--color-neon-purple', settings.primary_color);
        localStorage.setItem('branding_primary_color', settings.primary_color);
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
          metaThemeColor = document.createElement('meta');
          metaThemeColor.setAttribute('name', 'theme-color');
          document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', settings.primary_color);
      }
      if (settings.secondary_color) {
        document.documentElement.style.setProperty('--color-neon-blue', settings.secondary_color);
        localStorage.setItem('branding_secondary_color', settings.secondary_color);
      }
      
      if (settings.font_sans) {
        const sansFallback = ', ui-sans-serif, system-ui, sans-serif';
        document.documentElement.style.setProperty('--font-sans', `"${settings.font_sans}"${sansFallback}`);
        document.documentElement.style.setProperty('--font-mono', `"${settings.font_sans}"${sansFallback}`);
      }
      if (settings.font_display) {
        let displayFallback = ', sans-serif';
        if (settings.font_display === 'Playfair Display') displayFallback = ', serif';
        if (settings.font_display === 'JetBrains Mono') displayFallback = ', monospace';
        document.documentElement.style.setProperty('--font-display', `"${settings.font_display}"${displayFallback}`);
      }
    }
  }, [settings]);

  if (isAdmin) return null; // Admin has its own nav

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="front-announcement-bar w-full bg-[#f75c1e] text-[#ffffff] py-2.5 px-4 shadow-md relative z-[1000] border-b border-black/10">
        <div className="front-announcement-container max-w-[100rem] mx-auto flex items-center justify-between gap-3 text-left">
          <div className="front-announcement-text flex items-center gap-2.5 font-display font-black tracking-tight text-xs sm:text-sm md:text-base uppercase text-[#ffffff] min-w-0">
            <span className="front-announcement-badge bg-black/20 border border-white/20 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono tracking-widest text-[#ffffff] shrink-0 hidden xs:inline-block">ANNOUNCEMENT</span>
            <span className="truncate text-[#ffffff]">ARCH 421: THE UNMUTED ARCHIVES. OPENING SOON.</span>
          </div>
          <Link 
            to="/arch421"
            className={`front-announcement-link inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-md hover:scale-[1.03] active:scale-[0.98] shrink-0 ${
              isLightMode 
                ? 'bg-[#ffffff] text-[#0f172a] hover:bg-slate-100 border border-white/40 font-black' 
                : 'bg-[#000000] hover:bg-neutral-900 text-[#ffffff] border border-white/10 font-black'
            }`}
          >
            Learn More
          </Link>
        </div>
      </div>

      <nav className={`front-navbar flex items-center justify-between p-4 md:p-8 max-w-[100rem] mx-auto w-full relative z-[1000] gap-4 transition-colors duration-300 ${
        isMobileMenuOpen 
          ? isLightMode 
            ? 'bg-[#ffffff] border-b border-black/10' 
            : 'bg-[#080809] border-b border-white/5'
          : 'bg-transparent'
      }`}>
        <Link 
          to="/" 
          className="front-nav-logo flex items-center space-x-3 md:space-x-4 z-40 shrink-0 group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" 
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {logoUrl && (
            <div className="front-logo-wrapper relative rounded-xl md:rounded-2xl shrink-0 transition-all duration-300">
              {/* Outer soft glowing ambient accent layer */}
              <div className="absolute inset-0 bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none" />
              
              {/* Core container with ultra-premium borders and subtle inner/outer shadows */}
              <div className={`${
                logoShape === 'rectangle' ? 'w-32 sm:w-36 md:w-40 h-14 sm:h-15 md:h-16 px-3' : 'w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 p-1.5'
              } relative z-10 flex items-center justify-center overflow-hidden shrink-0 transition-all duration-300 rounded-xl md:rounded-2xl ${
                isLightMode 
                  ? 'bg-black border border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]' 
                  : (isSingleLogo 
                      ? 'bg-white/10 backdrop-blur-md border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:bg-white/15' 
                      : 'bg-black/30 backdrop-blur-md border border-white/[0.06] group-hover:border-neon-purple/30 shadow-[0_10px_35px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_25px_rgba(176,38,255,0.15)]')
              }`}>
                {/* Premium sweeping diagonal shine effect on hover */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none z-20" />
                
                <img 
                  src={logoUrl} 
                  alt={appName || "Logo"} 
                  className="front-logo-img w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-[1.03]" 
                />
              </div>
            </div>
          )}
          {appName && appName.trim() !== "" && !logoUrl && (
            <div className="front-app-title flex flex-col relative">
              <div className="flex items-center space-x-2">
                <span className="text-xl sm:text-2xl md:text-4xl font-display font-black tracking-tighter uppercase leading-none select-none transition-all duration-300">
                  <span className={`${
                    isLightMode 
                      ? "text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800" 
                      : "text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-neutral-400"
                  }`}>
                    {appName.split(' ')[0]}
                  </span>
                  <span className="text-neon-purple glow-text ml-1.5 inline-block transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1">
                    {appName.split(' ').slice(1).join(' ')}
                  </span>
                </span>
              </div>
            </div>
          )}
        </Link>
        
        <div className="front-nav-menu hidden xl:flex items-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-2 py-2 shadow-2xl">
          {renderedMenuItems}
        </div>

        <div className="front-nav-actions flex items-center space-x-2 md:space-x-4 xl:space-x-6 z-40">
           {featChat !== false && (
             <motion.button 
              id="toggle-chat-button"
              onClick={onOpenChat}
              whileHover="hover"
              className="front-chat-btn flex items-center space-x-2 xl:space-x-3 px-4 xl:px-6 py-3 rounded-2xl bg-white/5 hover:bg-neon-purple/20 border border-white/10 hover:border-neon-purple/50 transition-all group whitespace-nowrap shrink-0 relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 z-0"
                variants={{ hover: { x: ['-150%', '150%'] } }}
                transition={{ duration: 0.75, ease: "easeInOut" }}
                initial={{ x: '-150%' }}
              />
              <MessageSquare className="w-5 h-5 text-neon-purple group-hover:animate-bounce relative z-10" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block relative z-10">Chat Room</span>
            </motion.button>
           )}

          <ThemeAccessibilityDropdown />
          
          <button 
            className={`front-mobile-menu-toggle xl:hidden w-12 h-12 flex flex-shrink-0 items-center justify-center rounded-2xl border transition-all ${
              isLightMode 
                ? 'text-slate-900 bg-black/5 hover:bg-black/10 border-black/10' 
                : 'text-white bg-white/5 hover:bg-white/10 border-white/5'
            }`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {location.pathname === '/' && settings?.under_header_text && settings.under_header_text.trim() !== "" && (
        <div className={`front-under-header w-full bg-transparent transition-colors select-none ${
          isLightMode 
            ? 'text-black/70' 
            : 'text-white/70'
        }`}>
          <div className="max-w-[100rem] mx-auto px-4 md:px-8 py-[5px] text-[10px] md:text-xs font-black uppercase tracking-[0.25em]">
            <div className={`flex w-full justify-center text-center ${
              settings.under_header_align === 'left' ? 'md:justify-start md:text-left' :
              settings.under_header_align === 'right' ? 'md:justify-end md:text-right' :
              'justify-center text-center'
            }`}>
              <span>{settings.under_header_text}</span>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(24px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`front-mobile-menu-drawer fixed inset-0 z-[950] xl:hidden pt-36 sm:pt-44 pb-12 overflow-y-auto ${
              isLightMode ? 'bg-slate-50/95 text-slate-900' : 'bg-dark-bg/95 text-white'
            }`}
          >
            <div className="flex flex-col min-h-full px-6 sm:px-8 pb-32 max-w-md mx-auto">
              {/* Top Gamification Container in Mobile Menu */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="mb-5 mt-2 sm:mt-0 shrink-0"
              >
                <GamificationNavBadge
                  mobileMenu
                  isLightMode={isLightMode}
                  onItemClick={() => setIsMobileMenuOpen(false)}
                />
              </motion.div>

              <div className="flex flex-col space-y-2.5 mt-1 mb-auto">
                {renderedMobileItems.map((item: any, index) => (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {item.isMenu ? (
                      <div className="flex flex-col">
                        <button 
                          onClick={() => item.setOpen?.(!item.isOpen)}
                          className={`flex items-center justify-between py-3 border-b transition-all w-full ${
                            isLightMode 
                              ? 'border-slate-200 text-slate-700 hover:text-slate-900' 
                              : 'border-white/5 text-white/50 hover:text-white'
                          }`}
                        >
                          <span className="text-2xl font-display font-medium tracking-tight">
                            {item.label}
                          </span>
                          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${item.isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {item.isOpen && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className={`overflow-hidden rounded-2xl mt-2 mb-4 ${
                                isLightMode ? 'bg-[#ffffff] border border-slate-200' : 'bg-white/5'
                              }`}
                            >
                              {item.subItems?.map((sub) => (
                                sub.isExternal ? (
                                  <a 
                                    key={sub.path}
                                    href={sub.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center justify-between p-4 border-b last:border-0 ${
                                      isLightMode 
                                        ? 'text-slate-700 hover:text-slate-900 border-slate-200' 
                                        : 'text-white/60 hover:text-white border-white/5'
                                    }`}
                                  >
                                    <span className="text-lg font-medium tracking-tight uppercase tracking-[0.15em] text-[14px]">
                                      {sub.label}
                                    </span>
                                    {sub.icon}
                                  </a>
                                ) : (
                                  <NavLink 
                                    key={sub.path}
                                    to={sub.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({isActive}) => `flex items-center justify-between p-4 border-b last:border-0 ${
                                      isActive 
                                        ? (isLightMode ? 'text-neon-purple bg-slate-200/70 font-bold border-slate-200' : 'text-white bg-white/10 border-white/5') 
                                        : (isLightMode ? 'text-slate-700 hover:text-slate-900 border-slate-200' : 'text-white/60 hover:text-white border-white/5')
                                    }`}
                                  >
                                    <span className="text-lg font-medium tracking-tight uppercase tracking-[0.15em] text-[14px]">
                                      {sub.label}
                                    </span>
                                    {sub.icon}
                                  </NavLink>
                                )
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : item.isExternal ? (
                      <a 
                        href={item.path} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className={`group flex items-center justify-between py-3 border-b transition-all w-full ${
                          isLightMode 
                            ? 'border-slate-200 text-slate-700 hover:text-slate-900' 
                            : 'border-white/5 text-white/50 hover:text-white'
                        }`}
                      >
                        <span className="text-2xl font-display font-medium tracking-tight">
                          {item.label}
                        </span>
                        {item.icon ? (
                          <div className={isLightMode ? 'text-slate-400 group-hover:text-slate-700 transition-colors' : 'text-white/30 group-hover:text-white/70 transition-colors'}>
                            {item.icon}
                          </div>
                        ) : null}
                      </a>
                    ) : (
                      <NavLink 
                        to={item.path} 
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className={({isActive}) => {
                          const isMatch = item.exact ? isActive : (isActive || (item.matchPrefix && location.pathname.startsWith(item.path)));
                          if (item.path === '/arch421') {
                            return `group flex items-center justify-between px-5 py-3.5 my-1 rounded-2xl bg-[#f75c1e] text-white font-bold transition-all w-full shadow-lg hover:brightness-110`;
                          }
                          return `group flex items-center justify-between py-3 border-b transition-all w-full ${
                            isMatch 
                              ? (isLightMode ? 'text-slate-900 font-bold border-slate-300' : 'text-white font-bold border-white/10') 
                              : (isLightMode ? 'text-slate-600 hover:text-slate-900 border-slate-200' : 'text-white/50 hover:text-white border-white/5')
                          }`;
                        }}
                      >
                        {({isActive}) => {
                          const isMatch = item.exact ? isActive : (isActive || (item.matchPrefix && location.pathname.startsWith(item.path)));
                          if (item.path === '/arch421') {
                            return (
                              <>
                                <span className="text-2xl font-display font-black tracking-tight text-white uppercase">
                                  {item.label}
                                </span>
                                <div className="text-white">
                                  {item.icon}
                                </div>
                              </>
                            );
                          }
                          return (
                            <>
                              <span className={`text-2xl font-display font-medium tracking-tight ${isMatch && item.color ? item.color : ''}`}>
                                {item.label}
                              </span>
                              {item.icon ? (
                                <div className={isMatch ? (item.color || (isLightMode ? 'text-slate-900' : 'text-white')) : (isLightMode ? 'text-slate-400 group-hover:text-slate-700 transition-colors' : 'text-white/30 group-hover:text-white/70 transition-colors')}>
                                  {item.icon}
                                </div>
                              ) : null}
                            </>
                          );
                        }}
                      </NavLink>
                    )}
                  </motion.div>
                ))}
              </div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SecretAdminPrompt 
        isOpen={showSecretPrompt} 
        onClose={() => setShowSecretPrompt(false)} 
        isLightMode={isLightMode}
      />
    </>
  );
}

function MobileBottomBar({ featLiveTools, featBooth }: { featLiveTools: boolean; featBooth: boolean }) {
  const { isLightMode } = useLogo();
  const location = useLocation();
  const isOnPodcasts = location.pathname.startsWith('/podcasts/');
  const isOnDJs = location.pathname.startsWith('/djs/');
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always show when near the top of the page
      if (currentScrollY < 10) {
        setIsVisible(true);
        return;
      }

      const diff = currentScrollY - lastScrollY.current;
      // Only trigger if we've scrolled more than 10px to avoid jitter
      if (Math.abs(diff) > 10) {
        setIsVisible(diff < 0);
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div 
      animate={{ 
        y: isVisible ? 0 : 120,
        opacity: isVisible ? 1 : 0
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="front-mobile-bottom-bar xl:hidden fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[440px] sm:max-w-[540px] select-none transform-gpu pointer-events-auto touch-manipulation" 
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
        <div className={`backdrop-blur-[24px] rounded-[1.75rem] py-1.5 px-1.5 flex items-center shadow-[0_18px_45px_rgba(0,0,0,0.45)] border relative overflow-hidden group pointer-events-auto ${isLightMode ? "bg-[#ffffff]/90 border-black/10" : "bg-dark-bg/90 border-white/10"}`}>
          <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/10 to-transparent pointer-events-none" />
          
          {[
            { to: "/", icon: Radio, active: location.pathname === "/" },
            ...(featLiveTools ? [{ to: "/watch", icon: Video, active: location.pathname === "/watch" }] : []),
            ...(!featBooth ? [{ to: "/schedule", icon: Calendar, active: location.pathname === "/schedule" }] : []),
            ...(featBooth ? [{ to: "/booth", icon: Music, active: location.pathname === "/booth" }] : []),
            { to: "/djs", icon: Headphones, active: location.pathname === "/djs" || isOnDJs },
            { to: "/podcasts", icon: Podcast, active: location.pathname === "/podcasts" || isOnPodcasts },
          ].map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              onClick={() => triggerHaptic('selection')}
              className={({isActive}) => {
                const isMatch = item.active !== undefined ? item.active : isActive;
                return `relative flex-1 flex items-center justify-center rounded-[1.5rem] transition-all duration-500 h-[52px] z-10 pointer-events-auto ${isMatch ? 'text-neon-purple active-bottom-glow' : isLightMode ? 'text-black/40 hover:text-black/70' : 'text-white/40 hover:text-white/70'}`
              }}
            >
              {({isActive}) => {
                const isMatch = item.active !== undefined ? item.active : isActive;
                return (
                  <>
                    <motion.div
                      animate={{ y: isMatch ? -2 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="z-10"
                    >
                      <item.icon className="w-5 h-5" />
                    </motion.div>
                    
                    {isMatch && (
                      <motion.div 
                        layoutId="bottom-glow"
                        className={`absolute inset-0 rounded-[1.5rem] -z-0 border ${isLightMode ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"}`}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                  </>
                )
              }}
            </NavLink>
          ))}
        </div>
    </motion.div>
  );
}

function AnimatedRoutes({ adminPath = '/admin' }: { adminPath?: string }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin') || (adminPath !== '/admin' && location.pathname.startsWith(adminPath));

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => safeFetchJson("/api/public/settings"),
  });
  const featBooth = settings?.feat_booth !== '0';
  const featSpecialEvents = settings?.feat_special_events !== '0';

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={isAdmin ? 'admin' : location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[45vh] w-full py-12">
            <PremiumRingLoader size="md" />
          </div>
        }>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/watch" element={<WatchLive />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/djs" element={<DJs />} />
            <Route path="/djs/:id" element={<DJDetail />} />
            <Route path="/podcasts" element={<PodcastsPage />} />
            <Route path="/podcasts/:id" element={<PodcastDetail />} />
            <Route path="/features" element={<Features />} />
            <Route path="/features/:slug" element={<FeatureDetail />} />
            <Route path="/events" element={featSpecialEvents ? <Events /> : <Navigate to="/" replace />} />
            <Route path="/events/:slug" element={featSpecialEvents ? <EventDetail /> : <Navigate to="/" replace />} />
            <Route path="/booth" element={featBooth ? <Booth /> : <Navigate to="/" replace />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/arch421" element={<Arch421 />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/dejavufm-privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/admin/*" element={
              <Suspense fallback={
                <AppLoader size="lg" fullScreen />
              }>
                <Admin />
              </Suspense>
            } />
            {adminPath !== '/admin' && (
              <Route path={`${adminPath}/*`} element={
                <Suspense fallback={
                  <AppLoader size="lg" fullScreen />
                }>
                  <Admin />
                </Suspense>
              } />
            )}
            <Route path="/:slug" element={<CustomDynamicPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function MainLayout() {
  const { setStreamUrl, setQualityUrls, setOnAirInfo, setCurrentTrack, isCinematicOpen, toggleCinematic } = useAudio();
  const location = useLocation();
  const { showAlert } = useModal();
  const [appNameState, setAppNameState] = useState("DejavuFM"); // kept for backward compatibility if needed, but not necessary
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { logoUrl, isLightMode } = useLogo();

  const { data: scheduleData } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => safeFetchJson("/api/public/schedule"),
    refetchInterval: 10000,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => safeFetchJson('/api/public/settings'),
    refetchInterval: 3000,
  });

  const { data: authData } = useQuery({
    queryKey: ['auth-check'],
    queryFn: async () => {
      let token = null;
      try { token = localStorage.getItem("admin_token"); } catch {}
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return safeFetchJson('/api/public/auth/check', { headers, credentials: 'include' });
    },
    refetchInterval: 5000,
  });

  const { data: podcastsFeed } = useQuery({
    queryKey: ['podcasts'],
    queryFn: () => safeFetchJson("/api/public/podcasts"),
    staleTime: 1000 * 60 * 5,
  });

  const { data: djsData } = useQuery({
    queryKey: ['djs'],
    queryFn: () => safeFetchJson("/api/public/djs"),
    staleTime: 1000 * 60 * 5,
  });

  const { data: featuresData } = useQuery({
    queryKey: ['features'],
    queryFn: () => safeFetchJson("/api/public/features"),
    staleTime: 1000 * 60 * 5,
  });

  const isStaff = authData?.loggedIn && (authData?.isAdmin || authData?.role);

  // Monitor Online/Offline Connection Status
  useEffect(() => {
    const handleOnline = () => {
      toast.success("Connection Restored", {
        description: "You are back online. Reconnecting streams...",
        duration: 4000,
      });
    };

    const handleOffline = () => {
      toast.error("Connection Lost", {
        description: "You are currently offline. Live audio playback may be interrupted.",
        duration: 8000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleOpenChat = () => setIsChatOpen(true);
    window.addEventListener("open-chat", handleOpenChat);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("open-chat", handleOpenChat);
    };
  }, []);

  // Prefetch critical data for faster navigation
  useEffect(() => {
    // Prefetch podcasts
    queryClient.prefetchQuery({
      queryKey: ['podcasts'],
      queryFn: () => safeFetchJson("/api/public/podcasts"),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
    
    // Prefetch DJs
    queryClient.prefetchQuery({
      queryKey: ['djs'],
      queryFn: () => safeFetchJson("/api/public/djs"),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

    queryClient.prefetchQuery({
      queryKey: ['features'],
      queryFn: () => safeFetchJson("/api/public/features"),
      staleTime: 1000 * 60 * 5,
    });
  }, []);

  const appName = settings?.app_name || "DejavuFM";
  const appTagline = settings?.app_tagline !== undefined ? settings.app_tagline : "The UKs Most Influential Independent Radio Station";

  const handleShare = () => {
    setIsShareOpen(true);
  };

  const lastPathname = useRef(location.pathname);
  const entryTime = useRef(Date.now());

  useEffect(() => {
    const handleRouteChange = () => {
      if (lastPathname.current !== location.pathname) {
        const duration = (Date.now() - entryTime.current) / 1000; // in seconds
        
        const isAdminPath = (path: string) => 
          path.startsWith('/admin') || 
          path.startsWith('/dashboard') || 
          path.startsWith('/studio');

        // Track the stay duration of the PREVIOUS page if not admin
        if (!isAdminPath(lastPathname.current)) {
          fetch('/api/public/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              category: 'page_stay', 
              event_key: lastPathname.current,
              value: duration
            })
          }).catch(() => {});
        }

        // Reset for the NEW page
        lastPathname.current = location.pathname;
        entryTime.current = Date.now();

        // Track the NEW page view if not admin
        if (!isAdminPath(location.pathname)) {
          fetch('/api/public/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              category: 'page_views', 
              event_key: location.pathname 
            })
          }).catch(() => {});
        }
      }
    };

    handleRouteChange();
    
    // Also handle visibility change to track when user leaves the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const duration = (Date.now() - entryTime.current) / 1000;
        fetch('/api/public/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            category: 'page_stay', 
            event_key: location.pathname,
            value: duration
          })
        }).catch(() => {});
      } else {
        entryTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname]);

  useEffect(() => {
    const updateOnAir = () => {
      const schedule = Array.isArray(scheduleData) ? scheduleData : [];
      const now = getLondonTime();
      const currentDay = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const onAir = schedule.find((s: any) => {
        const start = convertToLocalTime(s.day_of_week, s.start_time);
        const end = convertToLocalTime(s.day_of_week, s.end_time);
        
        if (start.dayOfWeek !== currentDay) return false;
        
        // Handle normal and cross-midnight shows
        const isCrossMidnight = start.timeStr > end.timeStr;
        if (!isCrossMidnight) {
          return start.timeStr <= currentTime && end.timeStr > currentTime;
        } else {
          return currentTime >= start.timeStr || currentTime < end.timeStr;
        }
      });

      if (onAir) {
        const start = convertToLocalTime(onAir.day_of_week, onAir.start_time);
        const end = convertToLocalTime(onAir.day_of_week, onAir.end_time);
        setOnAirInfo({
          djName: onAir.dj_name,
          showName: onAir.show_name,
          djPhoto: onAir.dj_photo || logoUrl,
          djBio: onAir.dj_bio,
          instagram: onAir.instagram,
          soundcloud: onAir.soundcloud,
          mixcloud: onAir.mixcloud,
          facebook: onAir.facebook,
          startTime: start.timeStr,
          endTime: end.timeStr
        });
        setCurrentTrack(`${onAir.dj_name} - ${onAir.show_name}`);
      } else {
        setOnAirInfo(null);
        setCurrentTrack(`${appName} Auto-Mix`);
      }
    };

    updateOnAir();
    const interval = setInterval(updateOnAir, 1000); // Check every second for exact real-time transition
    
    return () => clearInterval(interval);
  }, [scheduleData, setOnAirInfo, setCurrentTrack, appName, logoUrl]);

  useEffect(() => {
    if (settings) {
      if (settings.stream_url) setStreamUrl(settings.stream_url);
      
      if (settings.app_name) {
        document.title = settings.app_name;
      } else if (settings.seo_title) {
        document.title = settings.seo_title;
      } else if (settings.app_title) {
        document.title = settings.app_title;
      }

      const updateMetaTag = (attrName: string, attrValue: string, content: string) => {
        const selector = attrName === 'property' ? `meta[property="${attrValue}"]` : `meta[name="${attrValue}"]`;
        let element = document.head.querySelector(selector) as HTMLMetaElement | null;
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute(attrName, attrValue);
          document.head.appendChild(element);
        }
        element.content = content;
      };

      if (settings.seo_description) {
        updateMetaTag('name', 'description', settings.seo_description);
        updateMetaTag('property', 'og:description', settings.seo_description);
        updateMetaTag('name', 'twitter:description', settings.seo_description);
      }

      if (settings.seo_title) {
        updateMetaTag('property', 'og:title', settings.seo_title);
        updateMetaTag('name', 'twitter:title', settings.seo_title);
      }

      if (settings.seo_image) {
        updateMetaTag('property', 'og:image', settings.seo_image);
        updateMetaTag('name', 'twitter:image', settings.seo_image);
        updateMetaTag('name', 'twitter:card', 'summary_large_image');
      }
      
      if (settings.favicon) {
        const cacheBuster = `v=${Date.now()}`;
        const finalUrl = settings.favicon.includes('?') 
          ? `${settings.favicon}&${cacheBuster}` 
          : `${settings.favicon}?${cacheBuster}`;
          
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

      if (settings.primary_color) {
        document.documentElement.style.setProperty('--color-neon-purple', settings.primary_color);
      }
      if (settings.secondary_color) {
        document.documentElement.style.setProperty('--color-neon-blue', settings.secondary_color);
      }

      if (settings.font_sans) {
        const sansFallback = ', ui-sans-serif, system-ui, sans-serif';
        document.documentElement.style.setProperty('--font-sans', `"${settings.font_sans}"${sansFallback}`);
        document.documentElement.style.setProperty('--font-mono', `"${settings.font_sans}"${sansFallback}`);
      }
      if (settings.font_display) {
        let displayFallback = ', sans-serif';
        if (settings.font_display === 'Playfair Display') displayFallback = ', serif';
        if (settings.font_display === 'JetBrains Mono') displayFallback = ', monospace';
        document.documentElement.style.setProperty('--font-display', `"${settings.font_display}"${displayFallback}`);
      }

      const urls = {
        low: settings.stream_url_low || settings.stream_url || "",
        medium: settings.stream_url_medium || settings.stream_url || "",
        high: settings.stream_url_high || settings.stream_url || ""
      };
      setQualityUrls(urls);
    }
  }, [settings, setStreamUrl, setQualityUrls]);

  // Synchronize system cache invalidation version with client storage
  useEffect(() => {
    if (settings?.system_cache_version) {
      const currentStored = localStorage.getItem('app_cache_version');
      if (currentStored && currentStored !== settings.system_cache_version) {
        console.log("[Cache] Server cache version bump detected:", settings.system_cache_version);
        if ('caches' in window) {
          caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))).catch(() => {});
        }
        localStorage.setItem('app_cache_version', settings.system_cache_version);
        queryClient.invalidateQueries();
      } else if (!currentStored) {
        localStorage.setItem('app_cache_version', settings.system_cache_version);
      }
    }
  }, [settings?.system_cache_version]);

  const adminPath = (settings?.admin_custom_path || '/admin').trim().replace(/\/+$/, '') || '/admin';
  const isAdmin = location.pathname.startsWith('/admin') || (adminPath !== '/admin' && location.pathname.startsWith(adminPath));

  const [isSplitActive, setIsSplitActive] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      suppressAccessibilityForAdmin();
    } else {
      applyFrontAccessibilityOptions();
    }
  }, [location.pathname, isAdmin]);

  // Dynamic Client-Side SEO Engine: Automatically update tab titles & meta on route navigation
  useEffect(() => {
    if (isAdmin) {
      const adminAppName = settings?.app_name || "DejavuFM";
      if (location.pathname.includes('/admin/studio')) {
        document.title = `Studio Inbox | ${adminAppName}`;
      } else if (location.pathname.includes('/admin/advanced')) {
        document.title = `Advanced Features | ${adminAppName}`;
      } else {
        document.title = `Dashboard | ${adminAppName}`;
      }
      return;
    }

    const appTitle = settings?.app_name || "DejavuFM";
    const baseDesc = settings?.seo_description || `${appTitle} is the underground radio station combining London beats with global energy.`;
    
    const updateMetaTag = (attrName: string, attrValue: string, content: string) => {
      const selector = attrName === 'property' ? `meta[property="${attrValue}"]` : `meta[name="${attrValue}"]`;
      let element = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.content = content;
    };

    let customPageTitles: Record<string, string> = {};
    if (settings?.menu_item_page_titles) {
      try {
        customPageTitles = JSON.parse(settings.menu_item_page_titles);
      } catch (e) {}
    }

    let title = appTitle;
    let desc = baseDesc;

    if (location.pathname.startsWith("/podcasts/")) {
      const id = location.pathname.split("/").filter(Boolean).pop();
      const podcast = podcastsFeed?.items?.find((i: any) => {
        try {
          return getPodcastId(i) === id;
        } catch (e) {
          return false;
        }
      });
      if (podcast) {
        title = `${podcast.title} | ${appTitle}`;
        desc = (podcast.contentSnippet || podcast.content || desc).substring(0, 160).replace(/<[^>]*>/g, '') + "...";
      } else {
        title = `Podcast | ${appTitle}`;
      }
    } else if (location.pathname.startsWith("/djs/")) {
      const id = location.pathname.split("/").filter(Boolean).pop();
      const dj = djsData?.find((d: any) => String(d.id) === id);
      if (dj) {
        title = `${dj.name} | ${appTitle} Resident`;
        desc = (dj.bio || desc).substring(0, 160);
      } else {
        title = `Resident DJ | ${appTitle}`;
      }
    } else if (location.pathname.startsWith("/features/")) {
      const slug = location.pathname.split("/").filter(Boolean).pop();
      const feature = featuresData?.find((f: any) => f.slug === slug);
      if (feature) {
        title = `${feature.title} | ${appTitle} Features`;
        desc = (feature.excerpt || feature.content || desc).substring(0, 160).replace(/<[^>]*>/g, '') + "...";
      } else {
        title = `Feature Highlight | ${appTitle}`;
      }
    } else if (location.pathname === "/arch421") {
      const pageTitle = customPageTitles['arch421'] || "ARCH 421: THE UNMUTED ARCHIVES. OPENING SOON.";
      title = `${pageTitle} | ${appTitle}`;
      desc = "Unlock the exclusive archives of ARCH 421. Opening soon on DejavuFM. Be ready for the unmuted sound experience.";
    } else if (location.pathname === "/watch") {
      const pageTitle = customPageTitles['watch'] || "Watch Live Studio Feed";
      title = `${pageTitle} | ${appTitle}`;
      desc = "Watch our resident DJs live from the DejavuFM broadcasting studio. Tune into underground sound, live chats, and visual feeds.";
    } else if (location.pathname === "/schedule") {
      const pageTitle = customPageTitles['schedule'] || "Radio Broadcast Schedule & Timetable";
      title = `${pageTitle} | ${appTitle}`;
      desc = "Check out the full weekly broadcast timetable on DejavuFM. Find slot times for your favourite Resident DJs and never miss a live show.";
    } else if (location.pathname === "/djs") {
      const pageTitle = customPageTitles['djs'] || "Resident DJs, Hosts & Creators";
      title = `${pageTitle} | ${appTitle}`;
      desc = "Meet the incredible resident DJs and hosts of DejavuFM. Discover bios, scheduled times, and dynamic audio archives from London's finest.";
    } else if (location.pathname === "/podcasts") {
      const pageTitle = customPageTitles['podcasts'] || "Podcasts & Audio Catch-Up Library";
      title = `${pageTitle} | ${appTitle}`;
      desc = "Missed a live set? Catch up with our comprehensive podcast archive containing past shows, guest mixes, and exclusive interviews on demand.";
    } else if (location.pathname === "/features") {
      const pageTitle = customPageTitles['features'] || "Features, News & Highlights";
      title = `${pageTitle} | ${appTitle}`;
      desc = "Stay informed with the latest DejavuFM features, underground radio news, event highlights, and special announcement postings.";
    } else if (location.pathname === "/about") {
      const pageTitle = customPageTitles['about'] || "About Us & Station History";
      title = `${pageTitle} | ${appTitle}`;
      desc = "The heartbeat of London's underground since 2005. Read about our journey, culture, and our dedication to showcasing underground music.";
    } else if (location.pathname === "/contact") {
      const pageTitle = customPageTitles['contact'] || "Contact Us & Request Studio Line";
      title = `${pageTitle} | ${appTitle}`;
      desc = "Get in touch with the team at DejavuFM. Drop a line for inquiries, partnerships, resident bookings, or general suggestions.";
    } else if (location.pathname === "/") {
      const tagline = settings?.app_tagline || "The UKs Most Influential Independent Radio Station";
      title = `${appTitle} | ${tagline}`;
    }

    document.title = title;
    updateMetaTag('name', 'description', desc);
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', desc);
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', desc);
  }, [location.pathname, settings, podcastsFeed, djsData, featuresData]);

  useEffect(() => {
    const handleSplitChange = (e: CustomEvent<{ active: boolean }>) => {
      setIsSplitActive(!!e.detail?.active);
    };
    window.addEventListener('split-view-change', handleSplitChange as EventListener);
    return () => {
      window.removeEventListener('split-view-change', handleSplitChange as EventListener);
    };
  }, []);

  const featChat = settings?.feat_chat !== '0';
  const featShoutouts = settings?.feat_shoutouts !== '0';
  const featCinematic = settings?.feat_cinematic !== '0';
  const featPWA = settings?.feat_pwa !== '0';
  const featBookings = settings?.feat_bookings !== '0';
  const featLiveTools = settings?.feat_live_tools !== '0';
  const featBooth = settings?.feat_booth !== '0';
  const featSpecialEvents = settings?.feat_special_events !== '0';

  const isOwner = authData?.loggedIn && authData?.role === 'owner';
  const isLoginPage = isAdmin && !authData?.loggedIn;

  if (settings?.app_kill_switch === '1' && !isAdmin) {
    const isUserLoggedIn = authData?.loggedIn;
    return (
      <div className="min-h-screen w-full bg-[#090a0f] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Animated grid lines background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
        
        {/* Subtle glowing orbs */}
        <div className="absolute top-[20%] left-[30%] w-96 h-96 rounded-full bg-red-600/10 blur-[150px] animate-pulse pointer-events-none" />
        
        <div className="max-w-xl w-full text-center space-y-8 relative z-10 px-4">
          <div className="inline-flex p-5 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase font-display text-red-500">
              System Offline
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40 font-mono">
              Emergency Suspension Active
            </p>
          </div>

          <div className="h-px w-24 bg-red-500/30 mx-auto" />

          <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-md mx-auto font-medium">
            This application has been suspended by Station Management. Standard broadcast functions, DJ booths, audio player, and chat features are temporarily offline.
          </p>
        </div>
      </div>
    );
  }

  if (settings?.maintenance_mode === '1' && !isAdmin) {
    return (
      <Suspense fallback={<div className="min-h-screen w-full bg-[#080809] flex items-center justify-center text-white/40">Loading Transmission...</div>}>
        {settings?.custom_css && (
          <style id="custom-injected-css">{settings.custom_css}</style>
        )}
        <Maintenance settings={settings} />
      </Suspense>
    );
  }

  return (
    <>
      {settings?.custom_css && !isAdmin && (
        <style id="custom-injected-css">{settings.custom_css}</style>
      )}
      <div className={`front-wrapper min-h-screen ${isAdmin || isSplitActive ? '' : 'pb-40 md:pb-32'} flex flex-col relative overflow-x-clip bg-dark-bg selection:bg-neon-purple selection:text-white`}>
      {/* Premium Moving Mesh Background */}
      <div className="front-mesh-bg fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-purple/20 rounded-full blur-[120px] animate-[pulse_10s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/20 rounded-full blur-[120px] animate-[pulse_12s_ease-in-out_infinite_2s]"></div>
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-white/5 rounded-full blur-[100px] animate-[pulse_15s_ease-in-out_infinite_4s]"></div>
      </div>
      <div className="app-shimmer-overlay" aria-hidden="true"></div>
      
      {!isSplitActive && <Navigation onOpenChat={() => setIsChatOpen(true)} featChat={featChat} isStaff={isStaff} />}
      <SitePopup />
      <NotificationManager />
      <GlobalRequestAlerts />
      {featChat && !isSplitActive && (
        <Suspense fallback={null}>
          <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </Suspense>
      )}
      {featShoutouts && !isAdmin && !isSplitActive && (
        <Suspense fallback={null}>
          <ShoutoutWidget isChatOpen={isChatOpen} />
        </Suspense>
      )}
      
      <main className={`front-main-container ${location.pathname.includes('/studio') || isSplitActive ? "flex-1 w-full relative" : "flex-1 w-full max-w-7xl mx-auto py-4 md:py-8 px-0 relative"}`}>
        {!isAdmin && !isSplitActive && <AdvertisementSliders position="top" />}
        <ErrorBoundary key={isAdmin ? 'admin' : location.pathname}>
          <AnimatedRoutes adminPath={adminPath} />
        </ErrorBoundary>
        {!isAdmin && !isSplitActive && <FeaturesSlider />}
        {!isAdmin && !isSplitActive && <AdvertisementSliders position="bottom" />}
      </main>

      {!isAdmin && !isSplitActive && (
        <footer className={`front-footer w-full max-w-7xl mx-auto p-4 md:p-8 pt-24 border-t relative flex flex-col gap-10 text-sm mb-40 md:mb-32 ${isLightMode ? 'border-black/10 text-black/60' : 'border-white/5 text-white/40'}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 w-full">
            {/* Left Column: Social Channels + Apps Underneath */}
            <div className="flex flex-col items-center md:items-start gap-4 w-full md:w-auto">
              {/* Dedicated Mobile Share Button (Appears above social icons on mobile only) */}
              <div className="w-full flex md:hidden justify-center items-center">
                <button
                  id="front-mobile-footer-share-btn"
                  onClick={() => {
                    triggerHaptic('selection');
                    handleShare();
                  }}
                  className={`front-mobile-share-btn w-full max-w-[260px] flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:scale-95 border cursor-pointer ${
                    isLightMode
                      ? '!bg-[#ffffff] !text-[#000000] hover:!bg-[#f4f4f5] !border-black/10 shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                  }`}
                  aria-label="Share Website"
                >
                  <Share2 className="w-4 h-4 text-neon-purple animate-pulse shrink-0" />
                  <span>Share Station</span>
                </button>
              </div>

              {/* Row 1: Social Icons & Desktop Share Button on the right */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full sm:w-auto">
                <div className="front-footer-socials flex flex-wrap justify-center items-center gap-3">
                  {settings?.social_instagram && (
                    <a 
                      href={settings.social_instagram} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md hover:shadow-xl ${
                        isLightMode 
                          ? 'bg-black/[0.03] border-black/10 text-black/60 hover:text-black hover:border-black/30 hover:bg-black/10' 
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10'
                      }`} 
                      title="Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {settings?.social_twitter && (
                    <a 
                      href={settings.social_twitter} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md hover:shadow-xl ${
                        isLightMode 
                          ? 'bg-black/[0.03] border-black/10 text-black/60 hover:text-black hover:border-black/30 hover:bg-black/10' 
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10'
                      }`} 
                      title="Twitter / X"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {settings?.social_facebook && (
                    <a 
                      href={settings.social_facebook} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md hover:shadow-xl ${
                        isLightMode 
                          ? 'bg-black/[0.03] border-black/10 text-black/60 hover:text-black hover:border-black/30 hover:bg-black/10' 
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10'
                      }`} 
                      title="Facebook"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {settings?.social_youtube && (
                    <a 
                      href={settings.social_youtube} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md hover:shadow-xl ${
                        isLightMode 
                          ? 'bg-black/[0.03] border-black/10 text-black/60 hover:text-black hover:border-black/30 hover:bg-black/10' 
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10'
                      }`} 
                      title="YouTube"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                  {settings?.social_soundcloud && (
                    <a 
                      href={settings.social_soundcloud} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md hover:shadow-xl ${
                        isLightMode 
                          ? 'bg-black/[0.03] border-black/10 text-black/60 hover:text-black hover:border-black/30 hover:bg-black/10' 
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10'
                      }`} 
                      title="SoundCloud"
                    >
                      <Cloud className="w-4 h-4" />
                    </a>
                  )}
                  {settings?.social_mixcloud && (
                    <a 
                      href={settings.social_mixcloud} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md hover:shadow-xl ${
                        isLightMode 
                          ? 'bg-black/[0.03] border-black/10 text-black/60 hover:text-black hover:border-black/30 hover:bg-black/10' 
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10'
                      }`} 
                      title="Mixcloud"
                    >
                      <MixcloudIcon className="w-5 h-5" />
                    </a>
                  )}
                  {settings?.social_tiktok && (
                    <a 
                      href={settings.social_tiktok} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md hover:shadow-xl ${
                        isLightMode 
                          ? 'bg-black/[0.03] border-black/10 text-black/60 hover:text-black hover:border-black/30 hover:bg-black/10' 
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10'
                      }`} 
                      title="TikTok"
                    >
                      <TikTokIcon className="w-4 h-4" />
                    </a>
                  )}
                  {!settings?.social_instagram && !settings?.social_twitter && !settings?.social_facebook && !settings?.social_youtube && !settings?.social_soundcloud && !settings?.social_mixcloud && !settings?.social_tiktok && (
                    <span className={`text-[10px] uppercase tracking-[0.2em] ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Social profiles not configured</span>
                  )}
                </div>

                <button 
                  onClick={() => {
                    triggerHaptic('selection');
                    handleShare();
                  }} 
                  className={`hidden md:flex front-footer-share-btn items-center justify-center gap-2.5 w-10 h-10 rounded-full transition-all shadow-md hover:shadow-xl cursor-pointer border ${
                    isLightMode 
                      ? 'bg-black/[0.03] border-black/10 text-black/70 hover:text-neon-purple hover:border-neon-purple/50 hover:bg-neon-purple/5' 
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-neon-purple/50 hover:bg-neon-purple/10'
                  }`}
                  title="Share Website"
                  aria-label="Share Website"
                >
                  <Share2 className="w-4 h-4 text-neon-purple animate-pulse" />
                </button>
              </div>

              {/* Row 2: Apps Directly Under Social Icons */}
              {(settings?.app_ios_url || settings?.app_android_url) && (
                <div className="front-footer-apps flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                  {settings?.app_ios_url && (
                    <a 
                      href={settings.app_ios_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-sm hover:shadow-md ${
                        isLightMode 
                          ? 'bg-black/[0.03] border-black/10 text-black hover:border-black/30 hover:bg-black/5' 
                          : 'bg-white/5 border-white/10 text-white hover:border-white/30 hover:bg-white/10'
                      }`} 
                      title="Download on Apple App Store (iOS)"
                      aria-label="Apple App Store"
                    >
                      <Apple className="w-4 h-4 text-current shrink-0" />
                      <div className="flex flex-col text-left leading-tight">
                        <span className="text-[7px] font-bold uppercase tracking-wider opacity-60">App Store</span>
                        <span className="text-[10px] font-black tracking-tight">iOS</span>
                      </div>
                    </a>
                  )}
                  {settings?.app_android_url && (
                    <a 
                      href={settings.app_android_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-sm hover:shadow-md ${
                        isLightMode 
                          ? 'bg-black/[0.03] border-black/10 text-black hover:border-black/30 hover:bg-black/5' 
                          : 'bg-white/5 border-white/10 text-white hover:border-white/30 hover:bg-white/10'
                      }`} 
                      title="Get it on Google Play (Android)"
                      aria-label="Google Play Store"
                    >
                      <Smartphone className="w-4 h-4 text-neon-blue shrink-0" />
                      <div className="flex flex-col text-left leading-tight">
                        <span className="text-[7px] font-bold uppercase tracking-wider opacity-60">Google Play</span>
                        <span className="text-[10px] font-black tracking-tight">Android</span>
                      </div>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Copyright, Tagline & Privacy Policy */}
            <div className="flex flex-col items-center md:items-end space-y-2 text-center md:text-right">
              <p className={`front-footer-copyright font-black tracking-[0.2em] text-[10px] ${isLightMode ? 'text-black/70' : 'text-white/60'}`}>© {new Date().getFullYear()} dejavufm.com. All rights reserved.</p>
              <p className="front-footer-tagline text-[10px] uppercase tracking-[0.3em] font-bold italic text-center md:text-right text-[#7a7878]">
                {appTagline}
              </p>
              <Link to="/privacy-policy" className="front-footer-privacy-link text-[10px] font-black uppercase tracking-[0.2em] text-neon-purple hover:text-neon-blue hover:underline transition-all mt-1">Privacy Policy</Link>
            </div>
          </div>

          <div className={`front-footer-credits w-[400px] max-w-full mx-auto border-t pt-6 flex justify-center ${isLightMode ? 'border-black/10' : 'border-white/[0.05]'}`}>
            <p className={`text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-center ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>
              Developed by{" "}
              <a 
                href="https://creativeengagementservices.com/web-agency" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`${isLightMode ? 'text-black/60 hover:text-black hover:border-black/40' : 'text-white/50 hover:text-white hover:border-white/40'} transition-all font-black border-b border-transparent pb-0.5`}
              >
                Creative Engagement Services
              </a>
            </p>
          </div>
        </footer>
      )}
      
      {!location.pathname.startsWith('/admin') && !isSplitActive && <MobileBottomBar featLiveTools={featLiveTools} featBooth={featBooth} />}
      {!isSplitActive && <PlayerBar />}
      {!isAdmin && !isSplitActive && (
        <div id="floating-gamification-container" className="hidden sm:block fixed bottom-24 sm:bottom-28 xl:bottom-12 left-4 sm:left-6 xl:left-8 z-40 pointer-events-auto">
          <GamificationNavBadge isLightMode={isLightMode} />
        </div>
      )}
      {featCinematic && (
        <Suspense fallback={null}>
          <CinematicVisualizer isOpen={isCinematicOpen} onClose={toggleCinematic} />
        </Suspense>
      )}
      {featPWA && <PWAInstallPrompt />}
      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        appName={appName} 
        appTagline={appTagline} 
      />
      <GamificationHubModal />
      <LevelUpModal />
      <PersonalizedGreetingModal />
    </div>
    </>
  );
}

function AppToaster() {
  const { isLightMode } = useLogo();
  return (
    <Toaster 
      closeButton 
      theme={isLightMode ? "light" : "dark"} 
      position="bottom-left" 
      toastOptions={{ 
        style: isLightMode 
          ? { background: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '16px' } 
          : { background: '#09090b', borderColor: 'var(--color-neon-purple)', color: 'white', borderRadius: '16px' },
        className: 'rounded-2xl'
      }} 
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ModalProvider>
          <AudioProvider>
            <GamificationProvider>
              <AppToaster />
              <MainLayout />
            </GamificationProvider>
          </AudioProvider>
        </ModalProvider>
      </Router>
    </QueryClientProvider>
  );
}
