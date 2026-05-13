import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Instagram, Music, Radio, ExternalLink } from 'lucide-react';
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

export default function DJs() {
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

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-6">
          <div className="w-16 h-16 border-4 border-white/10 border-t-neon-purple rounded-full animate-spin"></div>
          <p className="text-white/30 uppercase tracking-[0.3em] text-[10px] font-black">Summoning Artists...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-10">
          {djs?.map((dj, index) => (
            <motion.div
              key={dj.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 hover:border-neon-blue/30 transition-all duration-700 shadow-2xl hover:shadow-neon-blue/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-neon-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              
              <div className="aspect-[3/4] relative overflow-hidden">
                <div className={`w-full h-full transition-transform duration-1000 group-hover:scale-105 ${resolveDjImage(dj.image_url) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-white' : 'bg-transparent') : ''}`}>
                  <img 
                    src={resolveDjImage(dj.image_url)} 
                    alt={dj.name}
                    className={`w-full h-full transition-all duration-1000 grayscale group-hover:grayscale-0 contrast-110 group-hover:contrast-100 ${resolveDjImage(dj.image_url) === logoUrl && logoUrl ? 'object-contain p-12' : 'object-cover'}`}
                  />
                </div>
                
                <Link to={`/djs/${dj.id}`} className="absolute inset-0 z-20"></Link>
                {/* Overlay with details */}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 space-y-4 md:space-y-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <div className="space-y-3">
                    <h3 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter leading-[0.9] group-hover:text-neon-blue transition-colors duration-500">
                      {dj.name}
                    </h3>
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
          ))}
        </div>
      )}
    </motion.div>
  );
}
