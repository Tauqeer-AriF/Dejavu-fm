import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Search, X, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useLogo } from "../hooks/useLogo";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.5 } }
};

import { SkeletonPodcast } from "../components/Skeleton";

export default function PodcastsPage() {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("s") || "";
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const itemsPerPage = 12;

  const { data: feed, isLoading: loading } = useQuery({
    queryKey: ['podcasts'],
    queryFn: () => fetch("/api/public/podcasts").then(res => res.json()),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/public/podcasts?refresh=true");
      await queryClient.invalidateQueries({ queryKey: ['podcasts'] });
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (feed?.error) return [];
    if (!feed?.items) return [];
    if (!query) return feed.items;
    
    const lowerQuery = query.toLowerCase();
    return feed.items.filter((item: any) => 
      item.title?.toLowerCase().includes(lowerQuery) || 
      item.contentSnippet?.toLowerCase().includes(lowerQuery) ||
      item.content?.toLowerCase().includes(lowerQuery)
    );
  }, [feed, query]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto space-y-12">
           <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="h-12 w-48 bg-white/5 rounded-xl animate-pulse" />
              <div className="h-12 w-64 bg-white/5 rounded-xl animate-pulse" />
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => <SkeletonPodcast key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setSearchParams({ s: val });
    } else {
      setSearchParams({});
    }
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchParams({});
    setCurrentPage(1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-16 pb-20 mt-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 relative px-4">
        <div className="text-center md:text-left relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.05 }}
            className="absolute -top-12 left-0 text-[10rem] font-black uppercase tracking-tighter text-stroke hidden md:block select-none pointer-events-none"
          >
            Archive
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-4xl sm:text-6xl md:text-8xl font-black font-display uppercase tracking-tighter leading-none relative z-10 drop-shadow-2xl ${isLightMode ? 'text-slate-900' : 'text-white'}`}
          >
            Catchup & <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">Archive</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`mt-6 text-base md:text-lg font-light tracking-wide border-l-2 pl-6 transition-colors ${
              isLightMode ? 'border-neon-purple/50 text-slate-500' : 'border-neon-purple/30 text-white/50'
            }`}
          >
            Missed a show? Dive into our massive archive of exclusive sessions and underground broadcasts.
          </motion.p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-5 w-full md:w-auto">
          <button 
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={`flex items-center space-x-3 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all border disabled:opacity-50 group w-full md:w-auto justify-center ${
              isLightMode ? 'bg-black/5 text-black/40 hover:text-black border-black/10' : 'bg-white/5 text-white/40 hover:text-white border-white/10'
            }`}
          >
            <RefreshCw className={`w-4 h-4 text-neon-blue ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Archive'}</span>
          </button>

          <div className="relative w-full md:w-96 group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 group-focus-within:text-neon-purple transition-colors ${isLightMode ? 'text-black/30' : 'text-white/30'}`} />
            <input 
              type="text"
              placeholder="Search shows or DJs..."
              value={query}
              onChange={handleSearch}
              className={`w-full border rounded-2xl py-3.5 pl-12 pr-12 text-sm focus:outline-none focus:border-neon-purple/50 transition-all font-medium ${
                isLightMode ? 'bg-black/5 border-black/10 focus:bg-white' : 'bg-white/5 border-white/10 focus:bg-white/10'
              }`}
            />
            {query && (
              <button 
                onClick={clearSearch}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${isLightMode ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}
              >
                <X className={`w-3.5 h-3.5 ${isLightMode ? 'text-black/50' : 'text-white/50'}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="glass-panel h-full rounded-2xl flex flex-col relative overflow-hidden border border-white/10">
              <div className="aspect-square w-full bg-white/10 animate-pulse border-b border-white/5"></div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="h-3 w-20 bg-white/10 animate-pulse rounded mt-1 mb-3"></div>
                <div className="h-6 w-full bg-white/10 animate-pulse rounded mb-2"></div>
                <div className="h-6 w-3/4 bg-white/10 animate-pulse rounded mb-4"></div>
                <div className="h-4 w-full bg-white/10 animate-pulse rounded mt-auto"></div>
              </div>
            </div>
          ))}
        </div>
      ) : feed?.error ? (
        <div className="text-center py-20 px-6 glass-panel rounded-3xl border border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Failed to load Catchup</h3>
            <p className="text-white/60 max-w-md mx-auto">{feed.error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-all font-bold uppercase tracking-widest text-xs border border-white/10"
          >
            Try Again
          </button>
        </div>
      ) : filteredItems.length ? (
        <div className="space-y-12 px-4">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {paginatedItems.map((item: any) => {
              const podcastId = btoa(item.guid || item.link).replace(/=/g, '');
              const imageUrl = item.itunes?.image || "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600";
              return (
                <motion.div 
                  key={podcastId} 
                  variants={itemVariants}
                  whileHover="hover"
                  className="group relative overflow-hidden rounded-2xl"
                >
                  <motion.div
                    className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-30"
                    variants={{ hover: { x: ['-150%', '150%'] } }}
                    transition={{ duration: 0.75, ease: "easeInOut" }}
                    initial={{ x: '-150%' }}
                  />
                  <Link to={`/podcasts/${podcastId}`} className="block h-full">
                    <div className={`glass-panel h-full rounded-2xl flex flex-col hover:bg-white/5 transition-all duration-300 relative border hover:border-white/20 ${
                      isLightMode ? 'bg-white border-black/10' : 'border-white/10'
                    }`}>
                      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] transition-colors pointer-events-none z-0 ${
                        isLightMode ? 'bg-neon-purple/[0.03]' : 'bg-neon-purple/5 group-hover:bg-neon-blue/10'
                      }`}></div>
                      
                      <div className={`aspect-square overflow-hidden relative border-b ${isLightMode ? 'border-black/5' : 'border-white/5'}`}>
                        <img src={imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                        <div className={`absolute inset-0 bg-gradient-to-t ${isLightMode ? 'from-white/90 via-white/20' : 'from-dark-bg/90 via-dark-bg/20'} to-transparent`}></div>
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                          <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-black text-neon-blue uppercase tracking-widest border border-white/10">Archive</span>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 shadow-2xl ${
                            isLightMode ? 'bg-neon-purple text-white' : 'bg-white text-dark-bg'
                          }`}>
                            <Play className="w-5 h-5 ml-1 fill-current" />
                          </div>
                        </div>
                      </div>
                      
                      <div className={`p-6 flex-1 flex flex-col relative z-10 bg-gradient-to-b from-transparent ${isLightMode ? 'to-black/[0.02]' : 'to-black/20'}`}>
                        <p className={`text-[10px] uppercase mt-1 mb-3 font-bold tracking-[0.2em] flex items-center ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
                          <span className="w-1 h-4 bg-neon-purple mr-3 rounded-full"></span>
                          {(item.pubDate || item.isoDate) ? new Date(item.pubDate || item.isoDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                        </p>
                        <h3 className={`text-lg font-display font-bold group-hover:text-neon-blue transition-colors leading-snug line-clamp-2 mb-3 ${isLightMode ? 'text-black' : 'text-white'}`}>
                          {item.title}
                        </h3>
                        
                        <p className={`font-light text-xs line-clamp-2 mt-auto leading-relaxed ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
                          {item.contentSnippet || item.content?.replace(/<[^>]+>/g, '') || "No description provided."}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-12 space-x-4">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-6 py-3 rounded-full border border-white/10 bg-dark-bg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold uppercase tracking-wider"
              >
                Previous
              </button>
              <div className="text-white/50 text-sm font-medium">
                Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-6 py-3 rounded-full border border-white/10 bg-dark-bg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold uppercase tracking-wider"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 text-white/50 glass-panel rounded-2xl border-dashed flex flex-col items-center justify-center space-y-4">
          <p className="text-lg">No podcasts found matching "{query}"</p>
          <button onClick={clearSearch} className="text-neon-purple hover:underline text-sm font-bold uppercase tracking-widest">Clear Search</button>
        </div>
      )}
    </motion.div>
  );
}
