import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Send, User, LogOut, Loader2, Instagram, Music2, Globe, Radio, Sparkles, Clock, MessageSquare, Users, Eye, EyeOff, Maximize2, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useAudio } from '../context/AudioContext';
import { useLogo } from '../hooks/useLogo';
import { convertToLocalTime } from '../lib/timeUtils';
import { ChatSidebar } from '../components/ChatSidebar';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

function getEmbedUrl(url: string | null) {
  if (!url) return null;
  
  try {
    const parsedUrl = new URL(url);
    const hostname = window.location.hostname;
    
    // Handle Twitch
    if (parsedUrl.hostname.includes('twitch.tv')) {
      let channel = parsedUrl.searchParams.get('channel');
      if (!channel) {
         // Fallback to pathname (e.g. https://www.twitch.tv/dejavufmlive)
         const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
         if (pathParts.length > 0) {
           channel = pathParts[0];
         }
      }
      
      if (channel) {
        // Twitch requires parent parameters for all frames in the chain
        const parents = [
          hostname,
          'localhost',
          'ai.studio',
          'aistudio.google.com',
          'google.com',
          'run.app',
          'dejavufm.com',
          'www.dejavufm.com'
        ];
        
        // Dynamically append current parent origin if we are in an iframe
        if (typeof document !== 'undefined' && document.referrer) {
          try {
            const referrerUrl = new URL(document.referrer);
            if (referrerUrl.hostname) {
              parents.push(referrerUrl.hostname);
            }
          } catch (e) {}
        }
        
        // Also extract any parents already provided in the input URL
        const existingParents = parsedUrl.searchParams.getAll('parent').map(p => p.replace(/\/+$/, ''));
        
        // Remove duplicates and empty strings
        const uniqueParents = Array.from(new Set([...parents, ...existingParents].filter(Boolean)));
        const parentParams = uniqueParents.map(p => `parent=${p}`).join('&');
        
        return `https://player.twitch.tv/?autoplay=true&muted=false&channel=${channel}&${parentParams}`;
      }
    }
    
    // Handle YouTube
    if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')) {
      let videoId = parsedUrl.searchParams.get('v');
      
      // youtu.be/VIDEO_ID
      if (parsedUrl.hostname.includes('youtu.be')) {
        videoId = parsedUrl.pathname.slice(1);
      }
      // youtube.com/embed/VIDEO_ID
      if (parsedUrl.pathname.includes('/embed/')) {
        videoId = parsedUrl.pathname.split('/embed/')[1];
      }
      // youtube.com/live/VIDEO_ID
      if (parsedUrl.pathname.includes('/live/')) {
        videoId = parsedUrl.pathname.split('/live/')[1];
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0`;
      }
    }
    
    // Return original url if no special formatting needed
    return url;
  } catch (e) {
    return url;
  }
}

const getSecureImageUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/public/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export default function WatchLive() {
  const { logoUrl, resolveDjImage, isLightMode } = useLogo();
  
  const [trackOverlay, setTrackOverlay] = useState<{artist: string, title: string} | null>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [studioVideoUrlState, setStudioVideoUrlState] = useState<string | null>(null);
  const [playerKey, setPlayerKey] = useState(0);

  const handleRefreshPlayer = () => {
    setPlayerKey(prev => prev + 1);
    toast.success("Stream reloaded successfully");
  };

  const socketRef = useRef<Socket | null>(null);

  // Use react-query for settings to keep it automatically in sync
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
    refetchInterval: 3000,
  });

  const { onAirInfo, isPlaying, togglePlay } = useAudio();

  const studioVideoUrl = settings?.studio_video_url || studioVideoUrlState;
  const featChat = settings?.feat_chat !== '0';

  const [isSplitActive, setIsSplitActive] = useState(false);

  // Disable scroll on body when split screen theater mode is active
  useEffect(() => {
    if (isSplitActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSplitActive]);

  useEffect(() => {
    // Pause background radio if it's playing so the video audio can be heard
    if (isPlaying) {
      togglePlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;
    
    socketRef.current = socket;

    const onPushTrack = (data: {artist: string, title: string}) => {
      setTrackOverlay(data);
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = setTimeout(() => {
        setTrackOverlay(null);
      }, 8000); 
    };

    socket.on('pushTrack', onPushTrack);

    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      socket.off('pushTrack', onPushTrack);
    };
  }, []);

  const { data: scheduleData } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => fetch('/api/public/schedule').then(res => res.json())
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto px-4 pt-4 pb-6 lg:h-[calc(100vh-140px)] lg:min-h-[650px] flex flex-col"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 items-stretch">
        
        {/* Left Side: Video Player Section */}
        <div className={`lg:col-span-8 flex flex-col h-full ${isLightMode ? 'bg-[#ffffff] border-black/10' : 'bg-black/40 border-white/5'} border rounded-3xl overflow-hidden shadow-2xl relative min-h-[450px] lg:min-h-0`}>
          {/* Top Control Bar of Video Section */}
          <div className={`flex items-center justify-between px-5 py-3 border-b ${isLightMode ? 'bg-black/[0.03] border-black/10 text-black' : 'bg-[#0e0e11] border-white/5 text-white'} shrink-0`}>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                Live Studio Cam
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Refresh Player Button */}
              {getEmbedUrl(studioVideoUrl) && (
                <button
                  type="button"
                  onClick={handleRefreshPlayer}
                  className={`flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 ${isLightMode ? 'text-black border-black/10' : 'text-white border-white/5'} border rounded-full transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer`}
                  title="Reload Live Video Stream"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reload Stream</span>
                </button>
              )}

              {/* Split Screen Button - Desktop & Mobile/Tablet */}
              {featChat && (
                <button
                  type="button"
                  onClick={() => setIsSplitActive(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/20 rounded-full transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.1)] hover:shadow-[0_0_15px_rgba(0,242,254,0.25)]"
                  title="Enter Interactive Split-Screen View"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Split View</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 w-full relative bg-black group flex items-center justify-center aspect-[4/3] sm:aspect-video lg:aspect-auto">
            {getEmbedUrl(studioVideoUrl) ? (
              <iframe 
                key={`${playerKey}-${getEmbedUrl(studioVideoUrl) || 'empty'}`}
                src={getEmbedUrl(studioVideoUrl) || undefined} 
                className="w-full h-full border-none absolute inset-0 z-10" 
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; clipboard-write; gyroscope"
                allowFullScreen>
              </iframe>
            ) : (
              <>
                <div className="absolute inset-0 z-0">
                  <img src="https://images.unsplash.com/photo-1542628682-88321d2a4828?auto=format&fit=crop&w=1200&q=80" 
                       alt="Live Studio" className="w-full h-full object-cover opacity-60" />
                </div>
                <div className="relative z-10 text-center space-y-4">
                  <div className="inline-flex items-center space-x-2 bg-red-500/20 text-red-500 px-4 py-1.5 rounded-full border border-red-500/30">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-sm font-bold uppercase tracking-widest">Live Studio Cam</span>
                  </div>
                </div>
              </>
            )}

            {/* Animated Track overlay */}
            <AnimatePresence>
              {trackOverlay && (
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bottom-6 left-6 z-[60] bg-black/80 backdrop-blur-md border-l-4 border-l-neon-pink p-4 rounded-xl shadow-2xl pointer-events-none"
                >
                  <div className="text-neon-pink text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-neon-pink rounded-full animate-pulse"></span>
                    <span>Now Playing</span>
                  </div>
                  <div className="text-xl font-bold text-[#ffffff] break-words max-w-[250px] leading-tight mb-1">{trackOverlay.title}</div>
                  <div className="text-sm font-medium text-[#ffffff]/70 truncate max-w-[250px]">{trackOverlay.artist}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DJ and Show Info */}
          <div className={`flex p-4 ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-dark-bg/80 border-white/5'} border-t flex-row items-center gap-4 shrink-0`}>
             {resolveDjImage(onAirInfo?.djPhoto) && (
               <div className="w-16 h-16 rounded-xl overflow-hidden shadow-2xl border-2 border-neon-purple/30 shrink-0 bg-white/5">
                 <img src={resolveDjImage(onAirInfo?.djPhoto)} alt={onAirInfo?.djName || "DJ"} className={`w-full h-full ${resolveDjImage(onAirInfo?.djPhoto) === logoUrl && logoUrl ? 'object-contain p-2' : 'object-cover'}`} />
               </div>
             )}
             <div className="flex-1 text-left min-w-0">
               <div className="flex items-center justify-start gap-2 mb-0.5">
                 <h2 className="text-lg font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue italic truncate">
                   {onAirInfo?.djName || "DEJAVU FM"}
                 </h2>
                 <div className="px-2 py-0.5 bg-red-500 rounded flex items-center space-x-1 shadow-[0_0_15px_rgba(239,68,68,0.3)] shrink-0">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-black uppercase text-white tracking-widest leading-none">Live</span>
                 </div>
               </div>
               <h3 className={`${isLightMode ? 'text-black/80' : 'text-white/90'} font-bold text-xs truncate`}>{onAirInfo?.showName || "Global Underground Stream"}</h3>
             </div>
             
             {(onAirInfo?.instagram || onAirInfo?.soundcloud || onAirInfo?.mixcloud) && (
               <div className="flex gap-4 shrink-0">
                 {onAirInfo.instagram && (
                   <a href={`https://instagram.com/${onAirInfo.instagram}`} target="_blank" rel="noopener noreferrer" className={`p-2.5 rounded-xl ${isLightMode ? 'bg-black/5 hover:bg-neon-purple/15 border-black/10 text-black/50 hover:text-black' : 'bg-white/5 hover:bg-neon-purple/20 border-white/5 text-white/50 hover:text-white'} border transition-all`}>
                     <Instagram className="w-5 h-5" />
                   </a>
                 )}
                 {onAirInfo.soundcloud && (
                   <a href={`https://soundcloud.com/${onAirInfo.soundcloud}`} target="_blank" rel="noopener noreferrer" className={`p-2.5 rounded-xl ${isLightMode ? 'bg-black/5 hover:bg-neon-blue/15 border-black/10 text-black/50 hover:text-black' : 'bg-white/5 hover:bg-neon-blue/20 border-white/5 text-white/50 hover:text-white'} border transition-all`}>
                     <Music2 className="w-5 h-5" />
                   </a>
                 )}
                 {onAirInfo.mixcloud && (
                   <a href={`https://mixcloud.com/${onAirInfo.mixcloud}`} target="_blank" rel="noopener noreferrer" className={`p-2.5 rounded-xl ${isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black/50 hover:text-black' : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/50 hover:text-white'} border transition-all`}>
                     <Globe className="w-5 h-5" />
                   </a>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Right Side: Chat Room Section */}
        <div className={`lg:col-span-4 flex flex-col h-[550px] sm:h-[600px] lg:h-full ${isLightMode ? 'bg-[#ffffff] border-black/10' : 'bg-black/40 border-white/5'} border rounded-3xl overflow-hidden shadow-2xl relative`}>
          {!featChat ? (
            <div className={`flex flex-col items-center justify-center h-full opacity-20 text-center space-y-4 py-12 ${isLightMode ? 'text-black' : 'text-white'}`}>
              <MessageSquare className="w-12 h-12" />
              <p className="text-xs font-bold uppercase tracking-widest">
                Live Chat is currently offline
              </p>
            </div>
          ) : (
            <div className="flex-1 w-full relative flex flex-col min-h-0">
              <ChatSidebar embedded={true} />
            </div>
          )}
        </div>

      </div>

      {/* Split Screen Theater View (Desktop & Mobile) */}
      <AnimatePresence>
        {isSplitActive && featChat && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[2000] flex flex-col bg-[#08090d] select-none overflow-hidden"
          >
            {/* Unified Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/40 shrink-0">
              {/* Left Side: Live Badge + DJ Show Info */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                    Live
                  </span>
                </div>
                
                <div className="hidden sm:flex items-center gap-2 border-l border-white/10 pl-3.5 min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue italic truncate max-w-[120px] md:max-w-[180px]">
                    {onAirInfo?.djName || "DEJAVU FM"}
                  </span>
                  <span className="text-[11px] text-white/50 truncate max-w-[150px] md:max-w-[250px]">
                    — {onAirInfo?.showName || "Global Underground Stream"}
                  </span>
                </div>
                <div className="sm:hidden text-[10px] font-black uppercase tracking-wider text-white/90">
                  Split Screen Cam
                </div>
              </div>

              {/* Right Side: Social Links + Exit Button */}
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2">
                  {onAirInfo?.instagram && (
                    <a href={`https://instagram.com/${onAirInfo.instagram}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-white/5 hover:bg-neon-purple/20 text-white/50 hover:text-white border border-white/5 hover:border-neon-purple/30 transition-all">
                      <Instagram className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {onAirInfo?.soundcloud && (
                    <a href={`https://soundcloud.com/${onAirInfo.soundcloud}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-white/5 hover:bg-neon-blue/20 text-white/50 hover:text-white border border-white/5 hover:border-neon-blue/30 transition-all">
                      <Music2 className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {onAirInfo?.mixcloud && (
                    <a href={`https://mixcloud.com/${onAirInfo.mixcloud}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5 hover:border-white/10 transition-all">
                      <Globe className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsSplitActive(false)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-red-500/10 hover:text-red-400 active:bg-white/20 border border-white/10 hover:border-red-500/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Exit Split View</span>
                </button>
              </div>
            </div>

            {/* Split Content Body */}
            <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row bg-[#030406]">
              {/* Left Portion: Video Player Section */}
              <div className="w-full lg:w-1/2 lg:shrink-0 flex flex-col bg-black relative h-full">
                {/* On mobile, we enforce aspect-video; on desktop, it stretches to fill the left pane */}
                <div className="w-full aspect-video lg:aspect-auto lg:flex-1 bg-black relative shrink-0 lg:shrink flex items-center justify-center">
                  {getEmbedUrl(studioVideoUrl) ? (
                    <iframe 
                      key={`split-${playerKey}-${getEmbedUrl(studioVideoUrl)}`}
                      src={getEmbedUrl(studioVideoUrl) || undefined} 
                      className="w-full h-full border-none absolute inset-0 z-10" 
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; clipboard-write; gyroscope"
                      allowFullScreen>
                    </iframe>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center p-4">
                      <Radio className="w-12 h-12 text-white/20 animate-pulse mb-3" />
                      <p className="text-white/60 text-sm font-bold uppercase tracking-widest">No Stream URL configured</p>
                    </div>
                  )}

                  {/* Animated Track overlay inside Split view */}
                  <AnimatePresence>
                    {trackOverlay && (
                      <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute bottom-6 left-6 z-[60] bg-black/80 backdrop-blur-md border-l-4 border-l-neon-pink p-4 rounded-xl shadow-2xl pointer-events-none"
                      >
                        <div className="text-neon-pink text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 bg-neon-pink rounded-full animate-pulse"></span>
                          <span>Now Playing</span>
                        </div>
                        <div className="text-xl font-bold text-[#ffffff] break-words max-w-[250px] leading-tight mb-1">{trackOverlay.title}</div>
                        <div className="text-sm font-medium text-[#ffffff]/70 truncate max-w-[250px]">{trackOverlay.artist}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Portion: Chat Sidebar */}
              <div className="w-full lg:w-1/2 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0b0c10] flex flex-col min-h-0 flex-1 lg:flex-none">
                <ChatSidebar embedded={true} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
