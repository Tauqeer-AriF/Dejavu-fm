import React, { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, Search, X, Sparkles, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("s") || "";
  const [currentPage, setCurrentPage] = useState(1);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState<any[] | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const itemsPerPage = 12;

  const { data: feed, isLoading: loading } = useQuery({
    queryKey: ['podcasts'],
    queryFn: () => fetch("/api/public/podcasts").then(res => res.json()),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || !feed?.items) return;
    
    setAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      
      const podcastList = feed.items.slice(0, 40).map((item: any) => ({
        id: btoa(item.guid || item.link || "").replace(/=/g, ''),
        title: item.title,
        description: (item.contentSnippet || item.content || "").substring(0, 150).replace(/<[^>]*>/g, '')
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analysing underground radio archives. A listener wants this vibe: "${aiPrompt}".
        Pick the top 4 most relevant podcasts from this list. Return ONLY a JSON array of IDs.
        
        List: ${JSON.stringify(podcastList)}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const matchedIds = JSON.parse(response.text || "[]");
      const matchedPodcasts = feed.items.filter((item: any) => {
        const id = btoa(item.guid || item.link || "").replace(/=/g, '');
        return matchedIds.includes(id);
      });

      setAiResult(matchedPodcasts);
      setCurrentPage(1);
    } catch (err) {
      console.error("AI Search Error:", err);
    } finally {
      setAiProcessing(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (aiResult) return aiResult;
    if (feed?.error) return [];
    if (!feed?.items) return [];
    if (!query) return feed.items;
    
    const lowerQuery = query.toLowerCase();
    return feed.items.filter((item: any) => 
      item.title?.toLowerCase().includes(lowerQuery) || 
      item.contentSnippet?.toLowerCase().includes(lowerQuery) ||
      item.content?.toLowerCase().includes(lowerQuery)
    );
  }, [feed, query, aiResult]);

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
            className="text-5xl md:text-8xl font-black font-display uppercase tracking-tighter leading-tight relative"
          >
            Catchup & <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-blue to-neon-purple bg-[length:200%_auto] animate-[gradient_4s_linear_infinite]">Archive</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 mt-6 text-lg md:text-xl max-w-2xl font-light border-l-2 border-neon-purple/30 pl-6"
          >
            Missed a show? Dive into our massive archive of exclusive sessions and underground broadcasts.
          </motion.p>
        </div>

        <div className="flex flex-col items-end gap-5 w-full md:w-auto">
          <button 
            onClick={() => {
              setIsAiSearching(!isAiSearching);
              setAiResult(null);
              setSearchParams({});
            }}
            className={`flex items-center space-x-3 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all group overflow-hidden relative ${
              isAiSearching 
                ? "bg-neon-purple text-white shadow-[0_0_20px_rgba(176,38,255,0.4)]" 
                : "bg-white/5 text-white/40 hover:text-white border border-white/10"
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isAiSearching ? 'animate-pulse' : 'text-neon-purple'}`} />
            <span>{isAiSearching ? 'Exit Vibe Search' : 'Smart Vibe Finder'}</span>
          </button>

          <div className="relative w-full md:w-96 group">
            {!isAiSearching ? (
              <>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-neon-purple transition-colors" />
                <input 
                  type="text"
                  placeholder="Search shows or DJs..."
                  value={query}
                  onChange={handleSearch}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm focus:outline-none focus:border-neon-purple/50 focus:bg-white/10 transition-all font-medium"
                />
                {query && (
                  <button 
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-all"
                  >
                    <X className="w-3.5 h-3.5 text-white/50" />
                  </button>
                )}
              </>
            ) : (
              <form onSubmit={handleAiSearch} className="flex gap-2 w-full">
                <div className="relative flex-1">
                  <Wand2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-purple" />
                  <input 
                    autoFocus
                    placeholder="Describe your mood..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-neon-purple/10 border border-neon-purple/30 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-neon-purple transition-all font-medium placeholder:text-white/30"
                  />
                </div>
                <button 
                  disabled={aiProcessing}
                  className="bg-neon-purple hover:bg-neon-purple/80 text-white px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
                >
                  {aiProcessing ? '...' : 'Find'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="glass-panel h-full rounded-2xl flex flex-col relative overflow-hidden border border-white/10">
              <div className="aspect-[16/9] w-full bg-white/10 animate-pulse border-b border-white/5"></div>
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
          <AnimatePresence mode="wait">
            {aiResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-neon-purple/10 border border-neon-purple/20 p-6 rounded-3xl flex items-center justify-between mb-8 group"
              >
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 bg-neon-purple/20 rounded-2xl flex items-center justify-center border border-neon-purple/30 group-hover:rotate-12 transition-transform">
                    <Sparkles className="w-6 h-6 text-neon-purple" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-white">Smart Match Active</h4>
                    <p className="text-xs text-white/40 mt-0.5">Top picks for: <span className="text-neon-purple">"{aiPrompt}"</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => { setAiResult(null); setAiPrompt(''); }}
                  className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {paginatedItems.map((item: any) => {
              const podcastId = btoa(item.guid || item.link).replace(/=/g, '');
              const imageUrl = item.itunes?.image || "https://images.unsplash.com/photo-1516280440503-4560b4313f8c?auto=format&fit=crop&q=80&w=600";
              return (
                <motion.div 
                  key={podcastId} 
                  variants={itemVariants}
                  className="group relative"
                >
                  <Link to={`/podcasts/${podcastId}`} className="block h-full">
                    <div className="glass-panel h-full rounded-2xl flex flex-col hover:bg-white/5 transition-all duration-300 relative overflow-hidden border border-white/10 hover:border-white/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 rounded-full blur-[50px] group-hover:bg-neon-blue/10 transition-colors pointer-events-none"></div>
                      
                      <div className="aspect-[16/9] overflow-hidden relative border-b border-white/5">
                        <img src={imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 via-dark-bg/20 to-transparent"></div>
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                          <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-black text-neon-blue uppercase tracking-widest border border-white/10">Archive</span>
                          <div className="w-12 h-12 rounded-full bg-white text-dark-bg flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 shadow-2xl">
                            <Play className="w-5 h-5 ml-1 fill-current" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col relative z-10 bg-gradient-to-b from-transparent to-black/20">
                        <p className="text-[10px] text-white/40 uppercase mt-1 mb-3 font-bold tracking-[0.2em] flex items-center">
                          <span className="w-1 h-4 bg-neon-purple mr-3 rounded-full"></span>
                          {(item.pubDate || item.isoDate) ? new Date(item.pubDate || item.isoDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                        </p>
                        <h3 className="text-lg font-display font-bold group-hover:text-neon-blue transition-colors leading-snug line-clamp-2 mb-3">
                          {item.title}
                        </h3>
                        
                        <p className="text-white/60 font-light text-xs line-clamp-2 mt-auto leading-relaxed">
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
