import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Instagram, Music, Search, X, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLogo } from '../hooks/useLogo';
import { PremiumRingLoader } from '../components/PremiumRingLoader';

interface DJ {
  id: string;
  name: string;
  bio: string;
  image_url: string;
  instagram: string;
  soundcloud: string;
  mixcloud: string;
}

import { SkeletonCard } from '../components/Skeleton';

function DjCard({ dj, index, resolveDjImage, logoUrl, isLightMode, settings }: { dj: DJ, index: number, resolveDjImage: (url: string) => string, logoUrl: string, isLightMode: boolean, settings: any }) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <motion.div      
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover="hover"
      className={`group relative overflow-hidden rounded-[2.5rem] transition-all duration-700 shadow-2xl ${
        isLightMode 
          ? 'bg-white border-black/10 hover:border-neon-blue/30 hover:shadow-neon-blue/5' 
          : 'bg-[#0A0A0A]/80 border-white/5 hover:border-neon-blue/30 hover:shadow-neon-blue/10 backdrop-blur-xl'
      }`}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-30"
        variants={{ hover: { x: ['-150%', '150%'] } }}
        transition={{ duration: 0.75, ease: "easeInOut" }}
        initial={{ x: '-150%' }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
      
      <div className="aspect-[3/4] relative overflow-hidden">
        <div className={`w-full h-full transition-transform duration-1000 group-hover:scale-105 relative z-0 ${resolveDjImage(dj.image_url) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-white' : 'bg-transparent') : ''}`}>
          {!isImageLoaded && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
          <img 
            src={resolveDjImage(dj.image_url)} 
            alt={dj.name}
            onLoad={() => setIsImageLoaded(true)}
            className={`w-full h-full transition-all duration-1000 grayscale group-hover:grayscale-0 contrast-110 group-hover:contrast-100 ${resolveDjImage(dj.image_url) === logoUrl && logoUrl ? 'object-contain p-12' : 'object-cover'} ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
        
        <Link to={`/djs/${dj.id}`} className="absolute inset-0 z-20"></Link>
        {/* Overlay with details */}
        <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-500 ${
          isLightMode 
            ? 'from-white via-white/95 to-transparent' 
            : 'from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent'
        } ${
          isLightMode ? 'opacity-95' : 'opacity-90'
        } group-hover:opacity-100`}></div>
        
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 space-y-4 md:space-y-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 z-40">
          <div className="space-y-1.5">
            <Link to={`/djs/${dj.id}`}>
              <h3 className={`text-4xl md:text-5xl font-display font-black uppercase tracking-tighter leading-[0.9] group-hover:text-neon-blue transition-colors duration-500 ${
                isLightMode ? 'text-slate-900' : 'text-white'
              }`}>
                {dj.name}
              </h3>
            </Link>
            <div className="flex space-x-2" style={{ marginTop: '5px' }}>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                isLightMode ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-neon-purple/20 text-neon-purple border-neon-purple/20'
              }`}>Resident</span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                isLightMode ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white/5 text-white/30 border-white/5'
              }`}>Underground</span>
            </div>
          </div>

          <p className={`text-sm leading-relaxed line-clamp-3 font-light ${
            isLightMode ? 'text-slate-500' : 'text-white/60'
          }`}>
            {dj.bio || "Crafting sonic journeys through the deepest layers of electronica and bass culture."}
          </p>

          <div className="flex items-center space-x-4">
            <div className="flex-1 flex space-x-3">
              {dj.instagram && (
                <a href={`https://instagram.com/${dj.instagram}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-neon-purple hover:text-white transition-all duration-300 ${
                  isLightMode ? 'bg-slate-100 text-slate-500 hover:shadow-lg' : 'bg-white/10 text-white/70'
                }`}>
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {dj.soundcloud && (
                <a href={`https://soundcloud.com/${dj.soundcloud}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-neon-blue hover:text-white transition-all duration-300 ${
                  isLightMode ? 'bg-slate-100 text-slate-500 hover:shadow-lg' : 'bg-white/10 text-white/70'
                }`}>
                  <Music className="w-5 h-5" />
                </a>
              )}
            </div>
            
            <Link 
              to={`/podcasts?s=${encodeURIComponent(dj.name)}`}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-neon-purple hover:text-white transition-all duration-300 ${
                isLightMode ? 'bg-slate-900 text-white' : 'bg-white text-dark-bg'
              }`}
            >
              Sessions
            </Link>
          </div>
        </div>
      </div>

      {/* Hover highlight bar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-neon-blue group-hover:w-full transition-all duration-700"></div>
    </motion.div>
  );
}

export default function DJs() {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
    refetchInterval: 3000,
  });

  const { data: djs, isLoading } = useQuery<DJ[]>({
    queryKey: ['djs'],
    queryFn: () => fetch('/api/public/djs').then(res => res.json()),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { logoUrl, isLightMode, resolveDjImage } = useLogo();

  const filteredDjs = useMemo(() => {
    if (!djs) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return djs;

    return djs.filter(dj => 
      dj.name.toLowerCase().includes(normalizedQuery) ||
      dj.bio?.toLowerCase().includes(normalizedQuery)
    );
  }, [djs, query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.ceil(filteredDjs.length / ITEMS_PER_PAGE);

  const paginatedDjs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDjs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDjs, currentPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="h-16 w-64 bg-white/5 rounded-2xl mx-auto animate-pulse" />
            <div className="h-4 w-48 bg-white/5 rounded mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const appName = settings?.app_name || "DejavuFM";

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-16 py-12"
    >
      <div className="relative text-center space-y-6 max-w-4xl mx-auto px-4 mb-20">
        <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 0.1 }}
           transition={{ duration: 1 }}
           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[4rem] sm:text-[10rem] md:text-[16rem] font-black pointer-events-none uppercase tracking-tighter w-full text-transparent text-stroke opacity-10 select-none whitespace-nowrap overflow-hidden"
        >
          Residents
        </motion.div>
        <h1 className={`text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase tracking-tighter relative z-10 drop-shadow-2xl ${
          isLightMode ? 'text-slate-900' : 'text-white'
        }`}>
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">Residents</span>
        </h1>
        <p className={`text-base md:text-lg font-light tracking-wide relative z-10 max-w-2xl mx-auto border-t pt-8 transition-colors ${
          isLightMode ? 'border-black/5 text-slate-500' : 'border-white/5 text-white/50'
        }`}>
          The heartbeat of {appName}. Meet the masters of the underground bringing you the finest global soundscapes 24/7.
        </p>
      </div>

      <div className="max-w-md mx-auto px-4">
        <div className="relative w-full group">
          <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
            isLightMode ? 'text-slate-400 group-focus-within:text-neon-purple' : 'text-white/20 group-focus-within:text-neon-purple'
          }`} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Find a resident DJ..."
            className={`w-full rounded-2xl py-4 pl-14 pr-14 text-sm focus:outline-none focus:border-neon-purple/50 transition-all font-medium ${
              isLightMode 
                ? 'bg-slate-100/80 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:shadow-lg' 
                : 'bg-white/[0.02] border border-white/10 text-white placeholder:text-white/30 focus:bg-white/5'
            }`}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className={`absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${
                isLightMode ? 'hover:bg-slate-200 text-slate-400 hover:text-slate-600' : 'hover:bg-white/10 text-white/50 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-6">
          <PremiumRingLoader size="md" />
          <p className="text-white/30 uppercase tracking-[0.3em] text-[10px] font-black">Summoning Artists...</p>
        </div>
      ) : filteredDjs.length > 0 ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-10 px-4">
            {paginatedDjs.map((dj, index) => (
              <div key={dj.id}>
                <DjCard dj={dj} index={index} resolveDjImage={resolveDjImage} logoUrl={logoUrl} isLightMode={isLightMode} settings={settings} />
              </div>
            ))}
          </div>

          {/* Premium Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-8 pb-4">
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all disabled:opacity-20 ${
                  isLightMode 
                    ? 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:hover:bg-slate-100 disabled:hover:text-slate-600' 
                    : 'bg-white/[0.02] border border-white/5 text-white/50 hover:border-white/20 hover:bg-white/5 disabled:hover:bg-transparent disabled:hover:border-white/5'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;
                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className={`w-12 h-12 rounded-2xl text-xs font-black transition-all flex items-center justify-center ${
                        isActive
                          ? "bg-neon-purple text-white border border-neon-purple/30 glow-box shadow-lg shadow-neon-purple/10"
                          : isLightMode 
                            ? "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-900"
                            : "bg-white/[0.02] text-white/40 border border-white/5 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all disabled:opacity-20 ${
                  isLightMode 
                    ? 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900 disabled:hover:bg-slate-100 disabled:hover:text-slate-600' 
                    : 'bg-white/[0.02] border border-white/5 text-white/50 hover:border-white/20 hover:bg-white/5 disabled:hover:bg-transparent disabled:hover:border-white/5'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`mx-4 py-20 text-center glass-panel rounded-2xl border-dashed flex flex-col items-center justify-center gap-4 ${
          isLightMode ? 'bg-slate-50 border-slate-200' : 'border-white/10'
        }`}>
          <UserX className={`w-12 h-12 ${isLightMode ? 'text-slate-300' : 'text-white/10'}`} />
          <p className={`uppercase font-black tracking-widest text-xs ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
            No DJs found for "{query}"
          </p>
        </div>
      )}
    </motion.div>
  );
}
