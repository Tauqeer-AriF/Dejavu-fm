import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { Radio, Calendar, Podcast, Settings as AdminIcon, Headphones, Menu, X, Video, MessageSquare, Sun, Moon, FileText } from 'lucide-react';
import { PlayerBar } from './components/PlayerBar';
import { ChatSidebar } from './components/ChatSidebar';
import { ShoutoutWidget } from './components/ShoutoutWidget';
import { NotificationManager } from './components/NotificationManager';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { AudioProvider, useAudio } from './context/AudioContext';
import { ModalProvider } from './context/ModalContext';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { convertToLocalTime } from './lib/timeUtils';
import { useLogo } from './hooks/useLogo';
import { SecretAdminPrompt } from './components/SecretAdminPrompt';
import { SitePopup } from './components/SitePopup';

const queryClient = new QueryClient();

// Initialize global socket
if (typeof window !== 'undefined') {
  (window as any).socket = io();
}

// Imports
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import PodcastsPage from './pages/Podcasts';
import PodcastDetail from './pages/PodcastDetail';
import DJs from './pages/DJs';
import DJDetail from './pages/DJDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import WatchLive from './pages/WatchLive';
import Stream from './pages/Stream';
import Blog from './pages/Blog';
import BlogDetail from './pages/BlogDetail';

function Navigation({ onOpenChat, featChat }: { onOpenChat: () => void; featChat: boolean }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSecretPrompt, setShowSecretPrompt] = useState(false);
  const { logoUrl, isLightMode, settings } = useLogo();

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

  const appName = settings?.app_name || "DejavuFM";
  const appTagline = settings?.app_tagline || "Underground Gold Since 2005";
  
  // Detect if we are using a single logo for both modes
  const isSingleLogo = !!settings?.logo_url && !settings?.logo_light && !settings?.logo_dark;

  const isOnAir = settings?.is_on_air === '1';

  const featLiveTools = settings?.feat_live_tools !== '0';
  // Removed internal featChat definition since it's now a prop

  useEffect(() => {
    if (settings) {
      if (settings.primary_color) document.documentElement.style.setProperty('--color-neon-purple', settings.primary_color);
      if (settings.secondary_color) document.documentElement.style.setProperty('--color-neon-blue', settings.secondary_color);
      
      if (settings.font_sans) {
        const sansFallback = ', ui-sans-serif, system-ui, sans-serif';
        document.documentElement.style.setProperty('--font-sans', `"${settings.font_sans}"${sansFallback}`);
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
      <nav className="flex items-center justify-between p-4 md:p-8 max-w-[100rem] mx-auto w-full relative z-30 gap-4">
        <Link to="/" className="flex items-center space-x-3 md:space-x-4 z-40 shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
          <div className={`w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center overflow-hidden shrink-0 transition-all ${
            isLightMode 
              ? (isSingleLogo ? 'bg-neutral-900 shadow-xl' : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.1)]') 
              : (isSingleLogo ? 'bg-white shadow-xl' : 'bg-dark-bg border border-white/5 shadow-[0_10px_30px_rgba(255,255,255,0.05)]')
          }`}>
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-full h-full object-contain p-1" />
            ) : (
              <Headphones className={`w-7 h-7 ${isLightMode && !isSingleLogo ? 'text-dark-bg' : (isLightMode && isSingleLogo ? 'text-white' : (isLightMode ? 'text-dark-bg' : 'text-white'))}`} />
            )}
          </div>
          <div className="hidden sm:flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-3xl md:text-4xl font-display font-black tracking-tighter uppercase leading-none">
                {appName.split(' ')[0]}
                <span className="text-neon-purple glow-text ml-1 hidden sm:inline">{appName.split(' ').slice(1).join(' ')}</span>
              </span>
              {isOnAir && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-2 py-0.5 bg-red-500 rounded flex items-center space-x-1 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">Live</span>
                </motion.div>
              )}
            </div>
            <span className="text-[10px] uppercase tracking-[0.4em] font-black text-white/30 hidden md:block">{appTagline}</span>
          </div>
        </Link>
        
        <div className="hidden xl:flex items-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-2 py-2 shadow-2xl">
          <NavLink to="/" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>Listen</NavLink>
          {featLiveTools && (
            <NavLink to="/stream" className={({isActive}) => `px-4 xl:px-8 py-3 flex items-center gap-2 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-neon-purple text-white shadow-[0_0_25px_rgba(176,38,255,0.4)]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
              <Radio className="w-4 h-4 hidden xl:block" /> Stream
            </NavLink>
          )}
          <NavLink to="/schedule" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>Schedule</NavLink>
          <NavLink to="/djs" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>DJs</NavLink>
          <NavLink to="/podcasts" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive || location.pathname.startsWith('/podcasts/') ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>Podcasts</NavLink>
          <NavLink to="/blog" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive || location.pathname.startsWith('/blog/') ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>Blog</NavLink>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4 xl:space-x-6 z-40">
           {featChat !== false && (
             <button 
              onClick={onOpenChat}
              className="flex items-center space-x-2 xl:space-x-3 px-4 xl:px-6 py-3 rounded-2xl bg-white/5 hover:bg-neon-purple/20 border border-white/10 hover:border-neon-purple/50 transition-all group whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-5 h-5 text-neon-purple group-hover:animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Chat Room</span>
            </button>
           )}

          <button 
            onClick={() => setShowSecretPrompt(true)} 
            className="hidden xl:block text-white/20 hover:text-white transition-colors shrink-0"
          >
            <AdminIcon className="w-6 h-6" />
          </button>
          
          <button
            onClick={toggleTheme}
            className="text-white/60 hover:text-white transition-colors p-2 bg-white/5 rounded-full border border-white/5 shrink-0"
            title="Toggle Theme"
          >
            {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          
          <button 
            className="xl:hidden text-white w-12 h-12 flex flex-shrink-0 items-center justify-center bg-white/5 rounded-2xl border border-white/5"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(24px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-20 bg-dark-bg/90 xl:hidden pt-24 pb-8 overflow-y-auto"
          >
            <div className="flex flex-col min-h-full px-8 pb-32 max-w-md mx-auto">
              <div className="flex flex-col space-y-2 mt-auto mb-auto">
                {[
                  { path: '/', label: 'Listen', exact: true },
                  ...(featLiveTools ? [{ path: '/stream', label: 'Stream', icon: <Radio className="w-5 h-5" />, color: 'text-neon-purple' }] : []),
                  { path: '/schedule', label: 'Schedule' },
                  { path: '/djs', label: 'DJs' },
                  { path: '/podcasts', label: 'Podcasts', matchPrefix: true },
                  { path: '/blog', label: 'Blog', matchPrefix: true, icon: <FileText className="w-5 h-5" /> },
                  { path: '/about', label: 'About' },
                  { path: '/contact', label: 'Contact' },
                ].map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <NavLink 
                      to={item.path} 
                      onClick={() => setIsMobileMenuOpen(false)} 
                      className={({isActive}) => {
                        const isMatch = item.exact ? isActive : (isActive || (item.matchPrefix && location.pathname.startsWith(item.path)));
                        return `group flex items-center justify-between py-3 border-b border-white/5 transition-all w-full
                          ${isMatch ? 'text-white' : 'text-white/50 hover:text-white'}`
                      }}
                    >
                      {({isActive}) => {
                        const isMatch = item.exact ? isActive : (isActive || (item.matchPrefix && location.pathname.startsWith(item.path)));
                        return (
                          <>
                            <span className={`text-2xl font-display font-medium tracking-tight ${isMatch && item.color ? item.color : ''}`}>
                              {item.label}
                            </span>
                            {item.icon ? (
                              <div className={isMatch ? (item.color || 'text-white') : 'text-white/30 group-hover:text-white/70 transition-colors'}>
                                {item.icon}
                              </div>
                            ) : null}
                          </>
                        )
                      }}
                    </NavLink>
                  </motion.div>
                ))}
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8"
              >
                <div className="py-6 border-t border-white/10 w-full flex justify-center">
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowSecretPrompt(true);
                    }} 
                    className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center space-x-2"
                  >
                    <AdminIcon className="w-4 h-4" />
                    <span className="font-semibold uppercase tracking-widest text-[10px]">Admin Area</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SecretAdminPrompt 
        isOpen={showSecretPrompt} 
        onClose={() => setShowSecretPrompt(false)} 
      />
    </>
  );
}

function MobileBottomBar({ featLiveTools }: { featLiveTools: boolean }) {
  const location = useLocation();
  const isOnPodcasts = location.pathname.startsWith('/podcasts/');
  const isOnDJs = location.pathname.startsWith('/djs/');

  return (
    <div className="xl:hidden fixed bottom-6 sm:bottom-8 left-0 right-0 z-50 px-4 pointer-events-none flex justify-center">
      <div className="w-full max-w-[340px] sm:max-w-[400px] pointer-events-auto">
        <div className="bg-dark-bg/50 backdrop-blur-3xl rounded-[2rem] py-2 px-1 flex items-center justify-around shadow-[0_30px_60px_rgba(0,0,0,0.7)] border border-white/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/10 to-transparent pointer-events-none"></div>
          
          {[
            { to: "/", icon: Radio, label: "Listen", active: location.pathname === "/" },
            { to: "/schedule", icon: Calendar, label: "Shows" },
            { to: "/djs", icon: Headphones, label: "DJs", active: location.pathname === "/djs" || isOnDJs },
            { to: "/podcasts", icon: Podcast, label: "Archive", active: location.pathname === "/podcasts" || isOnPodcasts },
          ].map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              className={({isActive}) => {
                const isMatch = item.active !== undefined ? item.active : isActive;
                return `relative flex flex-col items-center justify-center p-2 rounded-[1.5rem] transition-all duration-500 w-[70px] sm:w-[80px] h-[60px] ${isMatch ? 'text-neon-purple active-bottom-glow' : 'text-white/40 hover:text-white/60'}`
              }}
            >
              {({isActive}) => {
                const isMatch = item.active !== undefined ? item.active : isActive;
                return (
                  <>
                    <motion.div
                      animate={{ y: isMatch ? -4 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="z-10"
                    >
                      <item.icon className="w-[1.375rem] h-[1.375rem]" />
                    </motion.div>
                    
                    <span className={`text-[8.5px] font-black uppercase tracking-[0.2em] transform transition-all duration-300 z-10 absolute bottom-1.5 ${isMatch ? 'opacity-100 translate-y-0 text-white' : 'opacity-0 translate-y-2'}`}>
                      {item.label}
                    </span>
                    
                    {isMatch && (
                      <motion.div 
                        layoutId="bottom-glow"
                        className="absolute inset-0 bg-white/5 rounded-[1.5rem] -z-0 border border-white/10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </>
                )
              }}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={location.pathname.startsWith('/admin') ? '/admin' : location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/watch" element={<WatchLive />} />
          <Route path="/stream" element={<Stream />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/djs" element={<DJs />} />
          <Route path="/djs/:id" element={<DJDetail />} />
          <Route path="/podcasts" element={<PodcastsPage />} />
          <Route path="/podcasts/:id" element={<PodcastDetail />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin/*" element={<Admin />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

import { CinematicVisualizer } from './components/CinematicVisualizer';
import { PremiumLoader } from './components/PremiumLoader';

function MainLayout() {
  const { setStreamUrl, setQualityUrls, setOnAirInfo, setCurrentTrack, isCinematicOpen, toggleCinematic } = useAudio();
  const location = useLocation();
  const [appNameState, setAppNameState] = useState("DejavuFM"); // kept for backward compatibility if needed, but not necessary
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const { logoUrl } = useLogo();

  const { data: scheduleData } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetch("/api/public/schedule").then(res => res.json()),
    refetchInterval: 10000,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
    refetchInterval: 3000,
  });

  // Prefetch critical data for faster navigation
  useEffect(() => {
    // Prefetch podcasts
    queryClient.prefetchQuery({
      queryKey: ['podcasts'],
      queryFn: () => fetch("/api/public/podcasts").then(res => res.json()),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
    
    // Prefetch DJs
    queryClient.prefetchQuery({
      queryKey: ['djs'],
      queryFn: () => fetch("/api/public/djs").then(res => res.json()),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

    queryClient.prefetchQuery({
      queryKey: ['blogs'],
      queryFn: () => fetch("/api/public/blogs").then(res => res.json()),
      staleTime: 1000 * 60 * 5,
    });
  }, []);

  const appName = settings?.app_name || "DejavuFM";

  const hasTracked = useRef(false);
  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;
    
    fetch('/api/public/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'page_views' })
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const updateOnAir = () => {
      const schedule = Array.isArray(scheduleData) ? scheduleData : [];
      const now = new Date();
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
        setOnAirInfo({
          djName: onAir.dj_name,
          showName: onAir.show_name,
          djPhoto: onAir.dj_photo || logoUrl,
          djBio: onAir.dj_bio,
          instagram: onAir.instagram,
          soundcloud: onAir.soundcloud,
          mixcloud: onAir.mixcloud
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
      
      if (settings.app_title) {
        document.title = settings.app_title;
      } else if (settings.app_name) {
        document.title = settings.app_name;
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

  const featChat = settings?.feat_chat !== '0';
  const featShoutouts = settings?.feat_shoutouts !== '0';
  const featCinematic = settings?.feat_cinematic !== '0';
  const featPWA = settings?.feat_pwa !== '0';
  const featBookings = settings?.feat_bookings !== '0';
  const featLiveTools = settings?.feat_live_tools !== '0';

  return (
    <>
      <AnimatePresence>
        {isAppLoading && <PremiumLoader onComplete={() => setIsAppLoading(false)} />}
      </AnimatePresence>
      
      <div className={`min-h-screen pb-40 md:pb-32 flex flex-col relative overflow-hidden bg-dark-bg selection:bg-neon-purple selection:text-white transition-opacity duration-1000 ${isAppLoading ? 'opacity-0' : 'opacity-100'}`}>
      {/* Premium Moving Mesh Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-purple/20 rounded-full blur-[120px] animate-[pulse_10s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/20 rounded-full blur-[120px] animate-[pulse_12s_ease-in-out_infinite_2s]"></div>
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-white/5 rounded-full blur-[100px] animate-[pulse_15s_ease-in-out_infinite_4s]"></div>
      </div>
      
      <Navigation onOpenChat={() => setIsChatOpen(true)} featChat={featChat} />
      <SitePopup />
      <NotificationManager />
      {featChat && <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
      {featShoutouts && <ShoutoutWidget />}
      
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 relative z-10">
        <ErrorBoundary key={location.pathname}>
          <AnimatedRoutes />
        </ErrorBoundary>
      </main>

      <footer className="w-full max-w-7xl mx-auto p-4 md:p-8 pt-24 border-t border-white/5 relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 text-white/40 text-sm mb-40 md:mb-32">
        <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-8 gap-y-6">
          <Link to="/about" className="hover:text-white transition-colors uppercase tracking-[0.2em] text-[10px] font-black">About</Link>
          <Link to="/contact" className="hover:text-white transition-colors uppercase tracking-[0.2em] text-[10px] font-black">Advertising</Link>
          <Link to="/schedule" className="hover:text-white transition-colors uppercase tracking-[0.2em] text-[10px] font-black">Schedule</Link>
          <Link to="/blog" className="hover:text-white transition-colors uppercase tracking-[0.2em] text-[10px] font-black">Blog</Link>
        </div>
        <div className="flex flex-col items-center md:items-end space-y-2 text-center md:text-right">
          <p className="font-black uppercase tracking-[0.2em] text-[10px]">© {new Date().getFullYear()} {appName}. All rights reserved.</p>
          <p className="text-[10px] uppercase tracking-[0.4em] opacity-30 italic text-center md:text-right">Handcrafted for the underground since 2005</p>
        </div>
      </footer>
      
      {!location.pathname.startsWith('/admin') && <MobileBottomBar featLiveTools={featLiveTools} />}
      <PlayerBar />
      {featCinematic && <CinematicVisualizer isOpen={isCinematicOpen} onClose={toggleCinematic} />}
      {featPWA && <PWAInstallPrompt />}
    </div>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        <AudioProvider>
          <Router>
            <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: '#09090b', borderColor: 'var(--color-neon-purple)', color: 'white' } }} />
            <MainLayout />
          </Router>
        </AudioProvider>
      </ModalProvider>
    </QueryClientProvider>
  );
}
