import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { Radio, Calendar, Podcast, Shield as AdminIcon, Headphones, Menu, X, Video, MessageSquare, Sun, Moon, FileText, ChevronDown, ExternalLink, Info, Instagram, Twitter, Facebook, Youtube, Cloud, Music, Share2, Layers } from 'lucide-react';
import { PlayerBar } from './components/PlayerBar';
import { ChatSidebar } from './components/ChatSidebar';
import { ShoutoutWidget } from './components/ShoutoutWidget';
import { NotificationManager } from './components/NotificationManager';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { AudioProvider, useAudio } from './context/AudioContext';
import { ModalProvider, useModal } from './context/ModalContext';
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { convertToLocalTime } from './lib/timeUtils';
import { useLogo } from './hooks/useLogo';
import { SecretAdminPrompt } from './components/SecretAdminPrompt';
import { SitePopup } from './components/SitePopup';
import { AdvertisementSliders } from './components/AdvertisementSliders';
import { CinematicVisualizer } from './components/CinematicVisualizer';
import { AppLoader } from './components/AppLoader';
import { FeaturesSlider } from './components/FeaturesSlider';
// @ts-ignore
import glitchLogoUrl from './assets/images/dejavufm_glitch_logo_1784796255055.png';
import { ThemeAccessibilityDropdown } from './components/ThemeAccessibilityDropdown';
import { ShareModal } from './components/ShareModal';
import { PremiumRingLoader } from './components/PremiumRingLoader';
import { suppressAccessibilityForAdmin, applyFrontAccessibilityOptions } from './utils/accessibility';

const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.83V7.62a6.34 6.34 0 0 0-5.83 6.3 6.34 6.34 0 0 0 9.17 5.61A6.33 6.33 0 0 0 15.82 14V8.42a8.31 8.31 0 0 0 4.77 1.52V6.49a4.85 4.85 0 0 1-1-.2z" />
  </svg>
);

// Pages
import Home from './pages/Home';
const Schedule = lazy(() => import('./pages/Schedule'));
const PodcastsPage = lazy(() => import('./pages/Podcasts'));
const PodcastDetail = lazy(() => import('./pages/PodcastDetail'));
const DJs = lazy(() => import('./pages/DJs'));
const DJDetail = lazy(() => import('./pages/DJDetail'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Admin = lazy(() => import('./pages/Admin'));
const WatchLive = lazy(() => import('./pages/WatchLive'));
const Features = lazy(() => import('./pages/Features'));
const FeatureDetail = lazy(() => import('./pages/FeatureDetail'));
const Arch421 = lazy(() => import('./pages/Arch421'));

const queryClient = new QueryClient();

// Initialize global socket
if (typeof window !== 'undefined') {
  (window as any).socket = io({ transports: ['websocket'] });
}


function Navigation({ onOpenChat, featChat, isStaff }: { onOpenChat: () => void; featChat: boolean; isStaff?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isMobileFeaturesOpen, setIsMobileFeaturesOpen] = useState(false);
  const [showSecretPrompt, setShowSecretPrompt] = useState(false);
  const { logoUrl, logoShape, isLightMode, settings } = useLogo();

  const handleAdminClick = () => {
    // Senior Dev: If the user is already confirmed as staff or has passed the secret, go straight to admin
    if (isStaff || sessionStorage.getItem('admin_secret_passed') === 'true') {
      navigate('/admin');
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
  const appTagline = settings?.app_tagline !== undefined ? settings.app_tagline : "Underground Gold Since 2005";
  
  // Detect if we are using a single logo for both modes
  const isSingleLogo = !!settings?.logo_url && !settings?.logo_light && !settings?.logo_dark;

  const isOnAir = settings?.is_on_air === '1';

  const featLiveTools = settings?.feat_live_tools !== '0';
  // Removed internal featChat definition since it's now a prop

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
      <div className="w-full bg-[#f75c1e] text-[#ffffff] py-2.5 px-4 shadow-md relative z-[1001] border-b border-black/10">
        <div className="max-w-[100rem] mx-auto flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5 font-display font-black tracking-tight text-xs sm:text-sm md:text-base uppercase text-[#ffffff] min-w-0">
            <span className="bg-black/20 border border-white/20 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono tracking-widest text-[#ffffff] shrink-0 hidden xs:inline-block">ANNOUNCEMENT</span>
            <span className="truncate text-[#ffffff]">ARCH 421: THE UNMUTED ARCHIVES. OPENING SOON.</span>
          </div>
          <Link 
            to="/arch421"
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-md hover:scale-[1.03] active:scale-[0.98] shrink-0 ${
              isLightMode 
                ? 'bg-[#ffffff] text-[#0f172a] hover:bg-slate-100 border border-white/40 font-black' 
                : 'bg-[#000000] hover:bg-neutral-900 text-[#ffffff] border border-white/10 font-black'
            }`}
          >
            Learn More
          </Link>
        </div>
      </div>

      <nav className="flex items-center justify-between p-4 md:p-8 max-w-[100rem] mx-auto w-full relative z-[1000] gap-4">
        <Link 
          to="/" 
          className="flex items-center space-x-3 md:space-x-4 z-40 shrink-0 group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" 
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {logoUrl && (
            <div className="relative rounded-xl md:rounded-2xl shrink-0 transition-all duration-300">
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
                  className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-[1.03]" 
                />
              </div>
            </div>
          )}
          {appName && appName.trim() !== "" && !logoUrl && (
            <div className="flex flex-col relative">
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
                {isOnAir && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-2 py-0.5 bg-red-500 rounded-full flex items-center space-x-1 shadow-[0_0_15px_rgba(239,68,68,0.55)] border border-red-400/20"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                    </span>
                    <span className="text-[8px] font-black uppercase text-white tracking-[0.15em]">Live</span>
                  </motion.div>
                )}
              </div>
              {appTagline && appTagline.trim() !== "" && (
                <div className="flex items-center gap-1.5 mt-1 hidden md:flex">
                  <span className="w-1.5 h-[1px] bg-neon-purple/50 group-hover:w-3.5 transition-all duration-300" />
                  <span className="text-[8px] md:text-[9px] uppercase tracking-[0.35em] font-black text-white/30 group-hover:text-white/50 transition-colors duration-300">{appTagline}</span>
                </div>
              )}
            </div>
          )}
        </Link>
        
        <div className="hidden xl:flex items-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-2 py-2 shadow-2xl">
          <NavLink to="/arch421" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-[#f75c1e] text-white shadow-[0_0_20px_rgba(247,92,30,0.4)]' : 'text-[#f75c1e] bg-transparent hover:bg-[#f75c1e]/10'}`}>Arch421</NavLink>
          <NavLink to="/" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>Listen</NavLink>
          {featLiveTools && (
            <NavLink to="/watch" className={({isActive}) => `px-4 xl:px-8 py-3 flex items-center gap-2 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-neon-purple text-white shadow-[0_0_25px_rgba(176,38,255,0.4)]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
              <Radio className="w-4 h-4 hidden xl:block" /> Watch
            </NavLink>
          )}
          <NavLink to="/schedule" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>Schedule</NavLink>
          <NavLink to="/djs" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>DJs and Hosts</NavLink>
          <NavLink to="/podcasts" className={({isActive}) => `px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isActive || location.pathname.startsWith('/podcasts/') ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>Podcasts</NavLink>
          
          <div 
            className="relative group h-full flex items-center"
            onMouseEnter={() => setIsFeaturesOpen(true)}
            onMouseLeave={() => setIsFeaturesOpen(false)}
          >
            <button 
              onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
              className={`px-4 xl:px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex items-center gap-1.5 ${location.pathname.startsWith('/features') || location.pathname === '/contact' ? 'bg-white text-dark-bg shadow-xl' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              Features <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isFeaturesOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isFeaturesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute top-[calc(100%+8px)] left-0 w-64 bg-dark-bg/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[1001] p-1.5"
                >
                  <div className="px-3 py-2 mb-1 border-b border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Explore</span>
                  </div>
                  <Link 
                    to="/features" 
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-white/70 hover:text-white hover:bg-white/10 transition-all group/item"
                    onClick={() => setIsFeaturesOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center group-hover/item:bg-neon-purple/20 transition-colors">
                      <FileText className="w-4 h-4 text-neon-purple" />
                    </div>
                    All Features
                  </Link>
                  <a 
                    href="https://dejavufmstore.secure-decoration.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-white/70 hover:text-white hover:bg-white/10 transition-all group/item"
                    onClick={() => setIsFeaturesOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center group-hover/item:bg-neon-blue/20 transition-colors">
                        <Radio className="w-4 h-4 text-neon-blue" />
                      </div>
                      Online Store
                    </div>
                    <ExternalLink className="w-3 h-3 text-white/30" />
                  </a>
                  <Link 
                    to="/about" 
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-white/70 hover:text-white hover:bg-white/10 transition-all group/item"
                    onClick={() => setIsFeaturesOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover/item:bg-yellow-500/20 transition-colors">
                      <Info className="w-4 h-4 text-yellow-400" />
                    </div>
                    About Station
                  </Link>
                  <Link 
                    to="/contact" 
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-white/70 hover:text-white hover:bg-white/10 transition-all group/item"
                    onClick={() => setIsFeaturesOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover/item:bg-green-500/20 transition-colors">
                      <MessageSquare className="w-4 h-4 text-green-400" />
                    </div>
                    Contact Us
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4 xl:space-x-6 z-40">
           {featChat !== false && (
             <motion.button 
              onClick={onOpenChat}
              whileHover="hover"
              className="flex items-center space-x-2 xl:space-x-3 px-4 xl:px-6 py-3 rounded-2xl bg-white/5 hover:bg-neon-purple/20 border border-white/10 hover:border-neon-purple/50 transition-all group whitespace-nowrap shrink-0 relative overflow-hidden"
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
            className="xl:hidden text-white w-12 h-12 flex flex-shrink-0 items-center justify-center bg-white/5 rounded-2xl border border-white/5"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {location.pathname === '/' && settings?.under_header_text && settings.under_header_text.trim() !== "" && (
        <div className={`w-full bg-transparent transition-colors select-none ${
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
            className="fixed inset-0 z-[950] bg-dark-bg/95 xl:hidden pt-36 sm:pt-40 pb-12 overflow-y-auto"
          >
            <div className="flex flex-col min-h-full px-8 pb-32 max-w-md mx-auto">
              <div className="flex flex-col space-y-2.5 mt-2 mb-auto">
                {[
                  { path: '/arch421', label: 'Arch421', icon: <Layers className="w-5 h-5" />, color: 'text-[#f75c1e]' },
                  { path: '/', label: 'Listen', exact: true },
                  ...(featLiveTools ? [{ path: '/watch', label: 'Watch', icon: <Radio className="w-5 h-5" />, color: 'text-neon-purple' }] : []),
                  { path: '/schedule', label: 'Schedule' },
                  { path: '/djs', label: 'DJs and Hosts' },
                  { path: '/podcasts', label: 'Podcasts', matchPrefix: true },
                  { 
                    label: 'Features', 
                    isMenu: true,
                    isOpen: isMobileFeaturesOpen,
                    setOpen: setIsMobileFeaturesOpen,
                    subItems: [
                      { path: '/features', label: 'All Features', icon: <FileText className="w-4 h-4" /> },
                      { path: 'https://dejavufmstore.secure-decoration.com', label: 'Online Store', isExternal: true, icon: <ExternalLink className="w-4 h-4" /> },
                      { path: '/about', label: 'About Station', icon: <Info className="w-4 h-4" /> },
                      { path: '/contact', label: 'Contact', icon: <MessageSquare className="w-4 h-4" /> },
                    ]
                  },
                ].map((item: any, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {item.isMenu ? (
                      <div className="flex flex-col">
                        <button 
                          onClick={() => item.setOpen?.(!item.isOpen)}
                          className="flex items-center justify-between py-3 border-b border-white/5 transition-all w-full text-white/50 hover:text-white"
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
                              className="overflow-hidden bg-white/5 rounded-2xl mt-2 mb-4"
                            >
                              {item.subItems?.map((sub) => (
                                sub.isExternal ? (
                                  <a 
                                    key={sub.path}
                                    href={sub.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-between p-4 text-white/60 hover:text-white border-b border-white/5 last:border-0"
                                  >
                                    <span className="text-lg font-medium tracking-tight uppercase tracking-[0.1em] text-[14px]">
                                      {sub.label}
                                    </span>
                                    {sub.icon}
                                  </a>
                                ) : (
                                  <NavLink 
                                    key={sub.path}
                                    to={sub.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({isActive}) => `flex items-center justify-between p-4 border-b border-white/5 last:border-0 ${isActive ? 'text-white bg-white/10' : 'text-white/60 hover:text-white'}`}
                                  >
                                    <span className="text-lg font-medium tracking-tight uppercase tracking-[0.1em] text-[14px]">
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
                        className="group flex items-center justify-between py-3 border-b border-white/5 transition-all w-full text-white/50 hover:text-white"
                      >
                        <span className="text-2xl font-display font-medium tracking-tight">
                          {item.label}
                        </span>
                        {item.icon ? (
                          <div className="text-white/30 group-hover:text-white/70 transition-colors">
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
                          return `group flex items-center justify-between py-3 border-b border-white/5 transition-all w-full
                            ${isMatch ? 'text-white' : 'text-white/50 hover:text-white'}`;
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
                                <div className={isMatch ? (item.color || 'text-white') : 'text-white/30 group-hover:text-white/70 transition-colors'}>
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

function MobileBottomBar({ featLiveTools }: { featLiveTools: boolean }) {
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
      className="xl:hidden fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[440px] sm:max-w-[540px] select-none transform-gpu pointer-events-auto touch-manipulation" 
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
        <div className="bg-dark-bg/90 backdrop-blur-[24px] rounded-[1.75rem] py-1.5 px-1.5 flex items-center shadow-[0_18px_45px_rgba(0,0,0,0.45)] border border-white/10 relative overflow-hidden group pointer-events-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/10 to-transparent pointer-events-none" />
          
          {[
            { to: "/", icon: Radio, active: location.pathname === "/" },
            ...(featLiveTools ? [{ to: "/watch", icon: Video, active: location.pathname === "/watch" }] : []),
            { to: "/schedule", icon: Calendar, active: location.pathname === "/schedule" },
            { to: "/djs", icon: Headphones, active: location.pathname === "/djs" || isOnDJs },
            { to: "/podcasts", icon: Podcast, active: location.pathname === "/podcasts" || isOnPodcasts },
          ].map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              className={({isActive}) => {
                const isMatch = item.active !== undefined ? item.active : isActive;
                return `relative flex-1 flex items-center justify-center rounded-[1.5rem] transition-all duration-500 h-[52px] z-10 pointer-events-auto ${isMatch ? 'text-neon-purple active-bottom-glow' : 'text-white/40 hover:text-white/70'}`
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
                        className="absolute inset-0 bg-white/5 rounded-[1.5rem] -z-0 border border-white/10"
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
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/arch421" element={<Arch421 />} />
            <Route path="/admin/*" element={
              <Suspense fallback={
                <AppLoader size="lg" fullScreen />
              }>
                <Admin />
              </Suspense>
            } />
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

  const { data: authData } = useQuery({
    queryKey: ['auth-check'],
    queryFn: () => fetch('/api/public/auth/check').then(res => res.json()),
    refetchInterval: 10000,
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

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
      queryKey: ['features'],
      queryFn: () => fetch("/api/public/features").then(res => res.json()),
      staleTime: 1000 * 60 * 5,
    });
  }, []);

  const appName = settings?.app_name || "DejavuFM";
  const appTagline = settings?.app_tagline !== undefined ? settings.app_tagline : "Underground Gold Since 2005";

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
      
      if (settings.seo_title) {
        document.title = settings.seo_title;
      } else if (settings.app_title) {
        document.title = settings.app_title;
      } else if (settings.app_name) {
        document.title = settings.app_name;
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

  const [isSplitActive, setIsSplitActive] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      suppressAccessibilityForAdmin();
    } else {
      applyFrontAccessibilityOptions();
    }
  }, [location.pathname]);

  // Dynamic Client-Side SEO Engine: Automatically update tab titles & meta on route navigation
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      document.title = "Admin Engine | DejavuFM";
      return;
    }

    const appTitle = settings?.seo_title || settings?.app_title || settings?.app_name || "DejavuFM";
    const baseDesc = settings?.seo_description || "DejavuFM is the underground radio station combining London beats with global energy.";
    
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

    let title = appTitle;
    let desc = baseDesc;

    if (location.pathname === "/arch421") {
      title = `ARCH 421: THE UNMUTED ARCHIVES. OPENING SOON. | ${appTitle}`;
      desc = "Unlock the exclusive archives of ARCH 421. Opening soon on DejavuFM. Be ready for the unmuted sound experience.";
    } else if (location.pathname === "/watch") {
      title = `Watch Live Studio Feed | ${appTitle}`;
      desc = "Watch our resident DJs live from the DejavuFM broadcasting studio. Tune into underground sound, live chats, and visual feeds.";
    } else if (location.pathname === "/schedule") {
      title = `Radio Broadcast Schedule & Timetable | ${appTitle}`;
      desc = "Check out the full weekly broadcast timetable on DejavuFM. Find slot times for your favorite Resident DJs and never miss a live show.";
    } else if (location.pathname === "/djs") {
      title = `Resident DJs, Hosts & Creators | ${appTitle}`;
      desc = "Meet the incredible resident DJs and hosts of DejavuFM. Discover bios, scheduled times, and dynamic audio archives from London's finest.";
    } else if (location.pathname === "/podcasts") {
      title = `Podcasts & Audio Catch-Up Library | ${appTitle}`;
      desc = "Missed a live set? Catch up with our comprehensive podcast archive containing past shows, guest mixes, and exclusive interviews on demand.";
    } else if (location.pathname === "/features") {
      title = `Features, News & Highlights | ${appTitle}`;
      desc = "Stay informed with the latest DejavuFM features, underground radio news, event highlights, and special announcement postings.";
    } else if (location.pathname === "/about") {
      title = `About Us & Station History | ${appTitle}`;
      desc = "The heartbeat of London's underground since 2005. Read about our journey, culture, and our dedication to showcasing underground music.";
    } else if (location.pathname === "/contact") {
      title = `Contact Us & Request Studio Line | ${appTitle}`;
      desc = "Get in touch with the team at DejavuFM. Drop a line for inquiries, partnerships, resident bookings, or general suggestions.";
    }

    document.title = title;
    updateMetaTag('name', 'description', desc);
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', desc);
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', desc);
  }, [location.pathname, settings]);

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

  return (
    <>
      <div className={`min-h-screen ${location.pathname.startsWith('/admin') || isSplitActive ? '' : 'pb-40 md:pb-32'} flex flex-col relative overflow-x-hidden bg-dark-bg selection:bg-neon-purple selection:text-white`}>
      {/* Premium Moving Mesh Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-neon-purple/20 rounded-full blur-[120px] animate-[pulse_10s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/20 rounded-full blur-[120px] animate-[pulse_12s_ease-in-out_infinite_2s]"></div>
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-white/5 rounded-full blur-[100px] animate-[pulse_15s_ease-in-out_infinite_4s]"></div>
      </div>
      <div className="app-shimmer-overlay" aria-hidden="true"></div>
      
      {!isSplitActive && <Navigation onOpenChat={() => setIsChatOpen(true)} featChat={featChat} isStaff={isStaff} />}
      <SitePopup />
      <NotificationManager />
      {featChat && !isSplitActive && <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
      {featShoutouts && !location.pathname.startsWith('/admin') && !isSplitActive && <ShoutoutWidget isChatOpen={isChatOpen} />}
      
      <main className={location.pathname.startsWith('/admin/studio') || isSplitActive ? "flex-1 w-full relative" : "flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 relative"}>
        {!location.pathname.startsWith('/admin') && !isSplitActive && <AdvertisementSliders position="top" />}
        <ErrorBoundary key={location.pathname.startsWith('/admin') ? '/admin' : location.pathname}>
          <AnimatedRoutes />
        </ErrorBoundary>
        {!location.pathname.startsWith('/admin') && !isSplitActive && <FeaturesSlider />}
        {!location.pathname.startsWith('/admin') && !isSplitActive && <AdvertisementSliders position="bottom" />}
      </main>

      {!location.pathname.startsWith('/admin') && !isSplitActive && (
        <footer className="w-full max-w-7xl mx-auto p-4 md:p-8 pt-24 border-t border-white/5 relative flex flex-col md:flex-row items-center justify-between gap-10 text-white/40 text-sm mb-40 md:mb-32">
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 w-full md:w-auto">
            <button 
              onClick={handleShare} 
              className="flex items-center justify-center gap-2.5 px-6 py-3 md:p-0 md:w-10 md:h-10 rounded-full bg-neon-purple/[0.04] md:bg-white/5 border border-neon-purple/20 md:border-white/10 text-white/70 md:text-white/50 hover:text-white hover:border-neon-purple/50 hover:bg-neon-purple/10 transition-all shadow-md hover:shadow-xl cursor-pointer order-first md:order-last w-full max-w-[240px] md:max-w-none md:w-10 mb-[10px] md:mb-0" 
              title="Share Website"
            >
              <Share2 className="w-4 h-4 text-neon-purple animate-pulse" />
              <span className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-neon-purple">Share Station</span>
            </button>

            <div className="flex flex-wrap justify-center items-center gap-4">
              {settings?.social_instagram && (
                <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all shadow-md hover:shadow-xl" title="Instagram">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {settings?.social_twitter && (
                <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all shadow-md hover:shadow-xl" title="Twitter / X">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {settings?.social_facebook && (
                <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all shadow-md hover:shadow-xl" title="Facebook">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {settings?.social_youtube && (
                <a href={settings.social_youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all shadow-md hover:shadow-xl" title="YouTube">
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              {settings?.social_soundcloud && (
                <a href={settings.social_soundcloud} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all shadow-md hover:shadow-xl" title="SoundCloud">
                  <Cloud className="w-4 h-4" />
                </a>
              )}
              {settings?.social_mixcloud && (
                <a href={settings.social_mixcloud} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all shadow-md hover:shadow-xl" title="Mixcloud">
                  <Music className="w-4 h-4" />
                </a>
              )}
              {settings?.social_tiktok && (
                <a href={settings.social_tiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all shadow-md hover:shadow-xl" title="TikTok">
                  <TikTokIcon className="w-4 h-4" />
                </a>
              )}
              {!settings?.social_instagram && !settings?.social_twitter && !settings?.social_facebook && !settings?.social_youtube && !settings?.social_soundcloud && !settings?.social_mixcloud && !settings?.social_tiktok && (
                <span className="text-[10px] uppercase tracking-[0.2em] opacity-40">Social profiles not configured</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end space-y-2 text-center md:text-right">
            <p className="font-black tracking-[0.2em] text-[10px]">© {new Date().getFullYear()} dejavufm.com. All rights reserved.</p>
            <p className="text-[10px] uppercase tracking-[0.4em] opacity-30 italic text-center md:text-right">{appTagline}</p>
          </div>
        </footer>
      )}
      
      {!location.pathname.startsWith('/admin') && !isSplitActive && <MobileBottomBar featLiveTools={featLiveTools} />}
      {!isSplitActive && <PlayerBar />}
      {featCinematic && <CinematicVisualizer isOpen={isCinematicOpen} onClose={toggleCinematic} />}
      {featPWA && <PWAInstallPrompt />}
      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        appName={appName} 
        appTagline={appTagline} 
      />
    </div>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ModalProvider>
          <AudioProvider>
            <Toaster closeButton theme="dark" position="bottom-left" toastOptions={{ style: { background: '#09090b', borderColor: 'var(--color-neon-purple)', color: 'white' } }} />
            <MainLayout />
          </AudioProvider>
        </ModalProvider>
      </Router>
    </QueryClientProvider>
  );
}
