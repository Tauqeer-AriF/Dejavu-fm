import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Instagram, Music, Search, X, UserX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLogo } from '../hooks/useLogo';

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
      className="group relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 hover:border-neon-blue/30 transition-all duration-700 shadow-2xl hover:shadow-neon-blue/10"
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
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 space-y-4 md:space-y-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 z-40">
          <div className="space-y-3">
            <Link to={`/djs/${dj.id}`}>
              <h3 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter leading-[0.9] group-hover:text-neon-blue transition-colors duration-500">
                {dj.name}
              </h3>
            </Link>
            <div className="flex space-x-2">
              <span className="px-3 py-1 rounded-full bg-neon-purple/20 text-neon-purple text-[10px] font-black uppercase tracking-widest border border-neon-purple/20">Resident</span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest border border-white/5">Underground</span>
            </div>
          </div>

          <p className="text-white/60 text-sm leading-relaxed line-clamp-3 font-light">
            {dj.bio || "Crafting sonic journeys through the deepest layers of electronica and bass culture."}
          </p>

          <div className="flex items-center space-x-4">
            <div className="flex-1 flex space-x-3">
              {dj.instagram && (
                <a href={`https://instagram.com/${dj.instagram}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-2xl hover:bg-neon-purple hover:text-white transition-all duration-300">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {dj.soundcloud && (
                <a href={`https://soundcloud.com/${dj.soundcloud}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-2xl hover:bg-neon-blue hover:text-white transition-all duration-300">
                  <Music className="w-5 h-5" />
                </a>
              )}
            </div>
            
            <Link 
              to={`/podcasts?s=${encodeURIComponent(dj.name)}`}
              className="px-6 py-3 rounded-2xl bg-white text-dark-bg text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-neon-purple hover:text-white transition-all duration-300"
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
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase tracking-tighter relative z-10 drop-shadow-2xl">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">Residents</span>
        </h1>
        <p className="text-white/50 text-sm md:text-xl font-light tracking-wide relative z-10 max-w-2xl mx-auto border-t border-white/5 pt-8">
          The heartbeat of {appName}. Meet the masters of the underground bringing you the finest global soundscapes 24/7.
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
          <div className="w-16 h-16 border-4 border-white/10 border-t-neon-purple rounded-full animate-spin"></div>
          <p className="text-white/30 uppercase tracking-[0.3em] text-[10px] font-black">Summoning Artists...</p>
        </div>
      ) : filteredDjs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-10 px-4">
          {filteredDjs.map((dj, index) => (
            <div key={dj.id}>
              <DjCard dj={dj} index={index} resolveDjImage={resolveDjImage} logoUrl={logoUrl} isLightMode={isLightMode} settings={settings} />
            </div>
          ))}
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
