import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Calendar, Share2, Copy, Twitter, Facebook, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useAudio } from "../context/AudioContext";

function ShareModal({ podcast, isOpen, onClose }: { podcast: any, isOpen: boolean, onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Listen to "${podcast.title}" on DejavuFM\n`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass-panel rounded-2xl shadow-2xl p-6 overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/20 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold">Share Episode</h3>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleTwitterShare}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/20 transition-colors font-medium"
                >
                  <Twitter className="w-5 h-5" />
                  <span>Share on Twitter</span>
                </button>
                
                <button 
                  onClick={handleFacebookShare}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#4267B2]/10 hover:bg-[#4267B2]/20 text-[#4267B2] border border-[#4267B2]/20 transition-colors font-medium"
                >
                  <Facebook className="w-5 h-5" />
                  <span>Share on Facebook</span>
                </button>

                <div className="relative mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-white/50 mb-2">Or copy link</p>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={shareUrl}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white/70 focus:outline-none"
                    />
                    <button 
                      onClick={handleCopy}
                      className="flex bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg p-2.5 transition-colors text-white"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function PodcastDetail() {
  const { isPlaying, togglePlay } = useAudio();
  const { id } = useParams();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const { data: feed, isLoading: loading } = useQuery({
    queryKey: ['podcasts'],
    queryFn: () => fetch("/api/public/podcasts").then(res => res.json()),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-12 pb-20 mt-8 relative">
        <div className="w-32 h-6 bg-white/10 animate-pulse rounded"></div>
        <div className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row gap-10">
            <div className="w-full md:w-1/3 flex-shrink-0">
               <div className="aspect-square rounded-2xl bg-white/10 animate-pulse"></div>
            </div>
            
            <div className="flex-1 space-y-6 flex flex-col justify-center">
              <div className="w-32 h-6 bg-white/10 animate-pulse rounded-full"></div>
              
              <div className="space-y-3">
                <div className="h-10 w-full bg-white/10 animate-pulse rounded"></div>
                <div className="h-10 w-3/4 bg-white/10 animate-pulse rounded"></div>
              </div>

              <div className="flex gap-4 pt-4">
                <div className="h-12 w-full bg-white/10 animate-pulse rounded-full"></div>
                <div className="h-12 w-28 shrink-0 bg-white/10 animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-10 border-t border-white/10">
            <div className="w-48 h-8 bg-white/10 animate-pulse rounded mb-6"></div>
            <div className="space-y-4">
               <div className="h-4 w-full bg-white/10 animate-pulse rounded"></div>
               <div className="h-4 w-full bg-white/10 animate-pulse rounded"></div>
               <div className="h-4 w-5/6 bg-white/10 animate-pulse rounded"></div>
               <div className="h-4 w-4/5 bg-white/10 animate-pulse rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (feed?.error) {
    return (
      <div className="max-w-4xl mx-auto py-40 px-6 text-center">
        <h2 className="text-3xl font-display font-bold mb-4 text-red-500">Error Loading Feed</h2>
        <p className="text-white/60 mb-8">{feed.error}</p>
        <Link to="/podcasts" className="text-neon-purple hover:underline">Back to Library</Link>
      </div>
    );
  }

  const podcast = feed?.items?.find((i: any) => {
    try {
      const idStr = i.guid || i.link || "";
      const currentId = btoa(idStr).replace(/=/g, '');
      return currentId === id;
    } catch (e) {
      return false;
    }
  });

  if (!podcast) {
    return (
      <div className="text-center py-40 bg-dark-bg">
        <h2 className="text-3xl font-display font-bold mb-4">Podcast Not Found</h2>
        <Link to="/podcasts" className="text-neon-purple hover:text-neon-blue transition-colors">Return to Podcasts</Link>
      </div>
    );
  }

  const audioUrl = podcast.enclosure?.url;

  const dateStr = (podcast.pubDate || podcast.isoDate) 
    ? new Date(podcast.pubDate || podcast.isoDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) 
    : 'Recent';

  // Extract a sensible image if possible; many RSS feeds have itunes:image or just use a default
  const imageUrl = podcast.itunes?.image || "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=1200";

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto space-y-12 pb-20 mt-8 relative"
    >
      <Link to="/podcasts" className="inline-flex items-center text-white/50 hover:text-neon-blue transition-colors group">
        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Library
      </Link>
      
      <div className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden">
        {/* Ambient glow from the top right */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-10">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
               <img src={imageUrl} alt={podcast.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
               <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 to-transparent opacity-60"></div>
            </div>
          </div>
          
          <div className="flex-1 space-y-6 flex flex-col justify-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-neon-purple/20 text-neon-purple rounded-full text-xs font-bold tracking-widest uppercase border border-neon-purple/30">
              <Calendar className="w-4 h-4" />
              <span>{dateStr}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black font-display leading-[1.1] tracking-tight">
              {podcast.title}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
              {audioUrl ? (
                <div className="flex-1">
                  <audio 
                    controls 
                    onPlay={() => {
                      if (isPlaying) togglePlay();
                      fetch('/api/public/analytics/podcast-play', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: podcast.title })
                      }).catch(() => {});
                    }}
                    src={audioUrl} 
                    className="w-full h-12 custom-audio filter invert sepia hue-rotate-[240deg]" 
                    controlsList="nodownload"
                    autoPlay
                  />
                </div>
              ) : podcast.link ? (
                 <div>
                    <a href={podcast.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-neon-blue hover:bg-[#0099cc] text-dark-bg font-bold py-3 px-8 rounded-full transition-colors shadow-[0_0_20px_rgba(0,210,255,0.4)]">
                      <Play className="w-5 h-5 mr-2 fill-current" /> Play on Podomatic
                    </a>
                 </div>
              ) : null}
              
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex h-12 items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-white font-semibold py-2 px-6 rounded-full transition-colors border border-white/10 shrink-0"
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>


            </div>
          </div>
        </div>

        <div className="mt-12 pt-10 border-t border-white/10 relative z-10">
          <h3 className="text-2xl font-bold font-display mb-6 tracking-tight">Episode Notes</h3>
          <div 
            className="prose prose-invert prose-p:text-white/70 prose-a:text-neon-blue hover:prose-a:text-neon-purple prose-img:rounded-xl max-w-none text-[15px] md:text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: podcast.content || podcast.contentSnippet || "No description provided." }}
          />
        </div>
      </div>
      
      <ShareModal 
        podcast={podcast} 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
      />
    </motion.div>
  );
}
