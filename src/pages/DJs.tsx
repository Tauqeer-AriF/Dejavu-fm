import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { Instagram, Facebook, Search, X, UserX, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLogo } from '../hooks/useLogo';
import { PremiumRingLoader } from '../components/PremiumRingLoader';

const MixcloudIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 640 512" fill="currentColor">
    <path d="M424.43 219.729C416.124 134.727 344.135 68 256.919 68c-72.266 0-136.224 46.516-159.205 114.074-54.545 8.029-96.63 54.822-96.63 111.582 0 62.298 50.668 112.966 113.243 112.966h289.614c52.329 0 94.969-42.362 94.969-94.693 0-45.131-32.118-83.063-74.48-92.2zm-20.489 144.53H114.327c-39.04 0-70.881-31.564-70.881-70.604s31.841-70.604 70.881-70.604c18.827 0 36.548 7.475 49.838 20.766 19.963 19.963 50.133-10.227 30.18-30.18-14.675-14.398-32.672-24.365-52.053-29.349 19.935-44.3 64.79-73.926 114.628-73.926 69.496 0 125.979 56.483 125.979 125.702 0 13.568-2.215 26.857-6.369 39.594-8.943 27.517 32.133 38.939 40.147 13.29 2.769-8.306 4.984-16.889 6.369-25.472 19.381 7.476 33.502 26.303 33.502 48.453 0 28.795-23.535 52.33-52.607 52.33zm235.069-52.33c0 44.024-12.737 86.386-37.102 122.657-4.153 6.092-10.798 9.414-17.72 9.414-16.317 0-27.127-18.826-17.443-32.949 19.381-29.349 29.903-63.682 29.903-99.122s-10.521-69.773-29.903-98.845c-15.655-22.831 19.361-47.24 35.163-23.534 24.366 35.993 37.102 78.356 37.102 122.379zm-70.88 0c0 31.565-9.137 62.021-26.857 88.325-4.153 6.091-10.798 9.136-17.72 9.136-17.201 0-27.022-18.979-17.443-32.948 13.013-19.104 19.658-41.255 19.658-64.513 0-22.981-6.645-45.408-19.658-64.512-15.761-22.986 19.008-47.095 35.163-23.535 17.719 26.026 26.857 56.483 26.857 88.047z" />
  </svg>
);

interface DJ {
  id: string;
  name: string;
  bio: string;
  image_url: string;
  instagram: string;
  facebook?: string;
  mixcloud: string;
  badge1?: string;
  badge2?: string;
}

import { SkeletonCard } from '../components/Skeleton';

function DjCard({ dj, index, resolveDjImage, logoUrl, settings }: { dj: DJ, index: number, resolveDjImage: (url: string) => string, logoUrl: string, isLightMode?: boolean, settings: any }) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <motion.div      
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover="hover"
      className="group relative overflow-hidden rounded-[2.5rem] transition-all duration-700 shadow-2xl bg-[#0A0A0A]/80 border-white/5 hover:border-neon-blue/30 hover:shadow-neon-blue/10 backdrop-blur-xl"
    >
      <motion.div
        className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-30"
        variants={{ hover: { x: ['-150%', '150%'] } }}
        transition={{ duration: 0.75, ease: "easeInOut" }}
        initial={{ x: '-150%' }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
      
      <div className="aspect-[3/4] relative overflow-hidden">
        <div className="w-full h-full transition-transform duration-1000 group-hover:scale-105 relative z-0">
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
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 space-y-4 md:space-y-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 z-40">
          <div className="space-y-1.5" style={{ marginBottom: '15px' }}>
            <Link to={`/djs/${dj.id}`}>
              <h3 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter leading-[0.9] text-white group-hover:text-neon-blue transition-colors duration-500">
                {dj.name}
              </h3>
            </Link>
            <div className="flex space-x-2" style={{ marginTop: '15px' }}>
              {dj.badge1 !== undefined && dj.badge1 !== null && dj.badge1 !== "" ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors bg-neon-purple/20 text-neon-purple border-neon-purple/20">
                  {dj.badge1}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors bg-neon-purple/20 text-neon-purple border-neon-purple/20">
                  Resident
                </span>
              )}
              {dj.badge2 !== undefined && dj.badge2 !== null && dj.badge2 !== "" ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors bg-white/5 text-white/30 border-white/5">
                  {dj.badge2}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors bg-white/5 text-white/30 border-white/5">
                  Underground
                </span>
              )}
            </div>
          </div>

          <p className="text-sm leading-relaxed line-clamp-3 font-light text-white/60">
            {dj.bio || "Crafting sonic journeys through the deepest layers of electronica and bass culture."}
          </p>

          <div className="flex items-center space-x-4">
            <div className="flex-1 flex space-x-3">
              {dj.instagram && (
                <a href={`https://instagram.com/${dj.instagram}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-neon-purple hover:text-white transition-all duration-300 bg-white/10 text-white/70">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {dj.facebook && (
                <a href={dj.facebook.startsWith('http') ? dj.facebook : `https://facebook.com/${dj.facebook}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-neon-blue hover:text-white transition-all duration-300 bg-white/10 text-white/70">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {dj.mixcloud && (
                <a href={dj.mixcloud.startsWith('http') ? dj.mixcloud : `https://mixcloud.com/${dj.mixcloud}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-sky-500 hover:text-white transition-all duration-300 bg-white/10 text-white/70" title={`Mixcloud: ${dj.mixcloud}`}>
                  <MixcloudIcon className="w-5 h-5" />
                </a>
              )}
            </div>
            
            <Link 
              to={`/podcasts?s=${encodeURIComponent(dj.name)}`}
              className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-neon-purple hover:text-white transition-all duration-300 bg-white text-dark-bg"
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
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('search') || searchParams.get('s') || "");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('s') || "";
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

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

  const { logoUrl, isLightMode, resolveDjImage, getPageTitle } = useLogo();

  const rawTitle = getPageTitle('djs', 'The Residents');
  const words = rawTitle.split(' ');
  const firstPart = words.slice(0, -1).join(' ') || '';
  const lastWord = words.length > 1 ? words[words.length - 1] : words[0];

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
      className="front-page-djs space-y-16 py-12"
    >
      <div className="relative text-center space-y-6 max-w-4xl mx-auto px-4 mb-20">
        <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 0.1 }}
           transition={{ duration: 1 }}
           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[4rem] sm:text-[10rem] md:text-[16rem] font-black pointer-events-none uppercase tracking-tighter w-full text-transparent text-stroke opacity-10 select-none whitespace-nowrap overflow-hidden"
        >
          {lastWord}
        </motion.div>
        <h1 className={`text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase tracking-tighter relative z-10 drop-shadow-2xl ${
          isLightMode ? 'text-slate-900' : 'text-white'
        }`}>
          {firstPart && firstPart + " "}<span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">{lastWord}</span>
        </h1>
        <p className={`text-base md:text-lg font-light tracking-wide relative z-10 max-w-2xl mx-auto border-t pt-8 transition-colors ${
          isLightMode ? 'border-black/5 text-slate-500' : 'border-white/5 text-white/50'
        }`}>
          Meet Deja’s current roster of leading DJs and Host
        </p>
      </div>

      <div className="max-w-md mx-auto px-4">
        <div className="relative w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-neon-purple transition-colors" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Find a resident DJ..."
            className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-14 pr-14 text-sm focus:outline-none focus:border-neon-purple/50 focus:bg-white/5 transition-all font-medium placeholder:text-white/30"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-4 h-4 text-white/50" />
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
                aria-label="Previous Page"
                className={`dj-pagination-btn w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
                  currentPage === 1
                    ? isLightMode
                      ? 'border-slate-200 bg-slate-100/70 text-slate-300 cursor-not-allowed'
                      : 'border-white/5 bg-white/5 text-white/20 cursor-not-allowed'
                    : isLightMode
                    ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-xs hover:border-slate-400'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white/60 hover:text-white'
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
                      className={`dj-pagination-btn w-12 h-12 rounded-2xl text-xs font-black transition-all flex items-center justify-center border ${
                        isActive
                          ? "active-page-btn bg-neon-purple text-white border-neon-purple/40 glow-box shadow-lg shadow-neon-purple/20"
                          : isLightMode
                          ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-950 hover:border-slate-300 shadow-xs"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
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
                aria-label="Next Page"
                className={`dj-pagination-btn w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
                  currentPage === totalPages
                    ? isLightMode
                      ? 'border-slate-200 bg-slate-100/70 text-slate-300 cursor-not-allowed'
                      : 'border-white/5 bg-white/5 text-white/20 cursor-not-allowed'
                    : isLightMode
                    ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-xs hover:border-slate-400'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mx-4 py-20 text-center glass-panel rounded-2xl border-dashed flex flex-col items-center justify-center gap-4">
          <UserX className="w-12 h-12 text-white/10" />
          <p className="text-white/40 uppercase font-black tracking-widest text-xs">
            No DJs found for "{query}"
          </p>
        </div>
      )}
    </motion.div>
  );
}
