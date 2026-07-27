import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Pause, Calendar, Share2, Copy, Twitter, Facebook, X, Check, RotateCcw, RotateCw, Volume2, VolumeX, Sliders, Download } from "lucide-react";
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
  const { 
    isPlaying, 
    togglePlay, 
    activeType, 
    podcastTrack, 
    podcastProgress, 
    podcastDuration, 
    playbackRate,
    playPodcast, 
    seekPodcast, 
    setPlaybackRate,
    volume,
    setVolume
  } = useAudio();
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

  const isCurrentPodcastPlaying = activeType === 'podcast' && podcastTrack?.id === id && isPlaying;
  const isCurrentPodcastLoaded = activeType === 'podcast' && podcastTrack?.id === id;

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const triggerBlobDownload = (blob: Blob) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${podcast.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    toast.success("Podcast downloaded successfully!");
  };

  const handleDownload = async () => {
    if (!audioUrl) {
      toast.error("Audio URL not found for this episode.");
      return;
    }
    setIsDownloading(true);
    setDownloadProgress(0);
    toast.info("Starting download...");

    try {
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const contentLength = response.headers.get('content-length');
      if (!contentLength) {
        const blob = await response.blob();
        triggerBlobDownload(blob);
        return;
      }

      const total = parseInt(contentLength, 10);
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("ReadableStream not supported or null body");
      }

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          setDownloadProgress(Math.round((loaded / total) * 100));
        }
      }

      const allChunks = new Uint8Array(loaded);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      const blob = new Blob([allChunks], { type: 'audio/mpeg' });
      triggerBlobDownload(blob);
    } catch (err) {
      console.warn("Direct stream download failed, falling back to basic download:", err);
      try {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        triggerBlobDownload(blob);
      } catch (fallbackErr) {
        console.warn("Blob fetch failed, falling back to direct link download:", fallbackErr);
        const link = document.createElement('a');
        link.href = audioUrl;
        link.target = "_blank";
        link.download = `${podcast.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Opening audio file for download...");
      }
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handlePlayPause = () => {
    playPodcast({
      id: id || "",
      title: podcast.title,
      audioUrl: audioUrl || "",
      imageUrl: imageUrl
    });
  };

  const handleSkipBackward = () => {
    if (!isCurrentPodcastLoaded) return;
    const newProgress = Math.max(0, podcastProgress - 15);
    seekPodcast(newProgress);
  };

  const handleSkipForward = () => {
    if (!isCurrentPodcastLoaded) return;
    const newProgress = Math.min(podcastDuration, podcastProgress + 15);
    seekPodcast(newProgress);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

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
      
      <div className="glass-panel p-6 md:p-10 rounded-3xl relative overflow-hidden">
        {/* Ambient glow from the top right */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-10">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
               <img src={imageUrl} alt={podcast.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
               <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 to-transparent opacity-60"></div>
            </div>
          </div>
          
          <div className="flex-1 space-y-6 flex flex-col justify-center items-start min-w-0 w-full">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-neon-purple/20 text-neon-purple rounded-full text-xs font-bold tracking-widest uppercase border border-neon-purple/30">
              <Calendar className="w-4 h-4" />
              <span>{dateStr}</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black font-display leading-[1.1] tracking-tight break-words w-full">
              {podcast.title}
            </h1>

            {/* Custom Premium Audio Player Dashboard */}
            {audioUrl ? (
              <div className="w-full bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 md:p-6 border border-white/5 space-y-6 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
                {/* Progress bar with timestamps */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-white/45 uppercase tracking-widest">
                    <span>{formatTime(isCurrentPodcastLoaded ? podcastProgress : 0)}</span>
                    <span>{formatTime(isCurrentPodcastLoaded ? podcastDuration : 0)}</span>
                  </div>
                  
                  <div className="relative group/progress flex items-center">
                    <input 
                      type="range"
                      min="0"
                      max={isCurrentPodcastLoaded ? (podcastDuration || 100) : 100}
                      value={isCurrentPodcastLoaded ? podcastProgress : 0}
                      onChange={(e) => {
                        if (!isCurrentPodcastLoaded) handlePlayPause();
                        seekPodcast(parseFloat(e.target.value));
                      }}
                      className="w-full h-1.5 bg-white/10 hover:bg-white/20 rounded-full appearance-none cursor-pointer accent-neon-purple outline-none transition-all duration-300 relative z-10"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 left-0 bg-gradient-to-r from-neon-purple to-neon-blue rounded-full pointer-events-none h-1"
                      style={{ 
                        width: `${isCurrentPodcastLoaded && podcastDuration ? (podcastProgress / podcastDuration) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Control Panel */}
                <div className="flex flex-col gap-6 w-full">
                  {/* Row 1: Play, Pause, Skip buttons (Centered and Hero) */}
                  <div className="flex items-center justify-center space-x-6 w-full">
                    <button 
                      onClick={handleSkipBackward}
                      className="p-3.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full border border-white/5 active:scale-90 transition-all cursor-pointer"
                      title="Skip backward 15s"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>

                    <button 
                      onClick={handlePlayPause}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-[0_0_30px_rgba(176,38,255,0.25)] border-2 cursor-pointer ${
                        isCurrentPodcastPlaying
                          ? 'bg-neon-purple border-neon-purple/30 text-white hover:scale-105'
                          : 'bg-white border-white/25 text-dark-bg hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                      }`}
                    >
                      {isCurrentPodcastPlaying ? (
                        <Pause className="w-7 h-7 fill-current" />
                      ) : (
                        <Play className="w-7 h-7 ml-1 fill-current" />
                      )}
                    </button>

                    <button 
                      onClick={handleSkipForward}
                      className="p-3.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full border border-white/5 active:scale-90 transition-all cursor-pointer"
                      title="Skip forward 15s"
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] bg-white/5 w-full" />

                  {/* Row 2: Speed Selector (Left) & Volume (Right) */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                    {/* Playback speed selector */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider text-white/30">Speed</span>
                      <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/5">
                        {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => setPlaybackRate(rate)}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                              playbackRate === rate && isCurrentPodcastLoaded
                                ? 'bg-neon-purple text-white shadow-[0_0_12px_rgba(176,38,255,0.45)]'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Volume slider */}
                    <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 shrink-0">
                      <Volume2 className="text-white/40 w-4 h-4 shrink-0" />
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-20 sm:w-24 accent-neon-blue cursor-pointer h-1"
                      />
                    </div>
                  </div>

                  {/* Row 3: Dedicated Share & Download Buttons under controls */}
                  <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-1">
                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="inline-flex h-9 items-center justify-center space-x-1.5 bg-white/5 hover:bg-white/10 text-white font-semibold py-1.5 px-6 rounded-xl transition-colors border border-white/10 text-xs uppercase tracking-wider cursor-pointer hover:border-white/20 hover:text-neon-blue"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="font-bold">Share Episode</span>
                    </button>

                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="inline-flex h-9 items-center justify-center space-x-1.5 bg-white/5 hover:bg-white/10 text-white font-semibold py-1.5 px-6 rounded-xl transition-colors border border-white/10 text-xs uppercase tracking-wider cursor-pointer hover:border-white/20 hover:text-neon-purple disabled:opacity-50"
                      title="Download episode as MP3"
                    >
                      {isDownloading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span className="font-bold">
                        {isDownloading ? `Downloading ${downloadProgress}%` : "Download MP3"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : podcast.link ? (
               <div className="flex flex-wrap items-center gap-4">
                  <a 
                    href={podcast.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center justify-center bg-neon-blue hover:bg-[#0099cc] text-dark-bg font-bold py-3 px-8 rounded-full transition-colors shadow-[0_0_20px_rgba(0,210,255,0.4)]"
                  >
                    <Play className="w-5 h-5 mr-2 fill-current" /> Play on Podomatic
                  </a>
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="inline-flex h-12 items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-white font-semibold py-2 px-6 rounded-full transition-colors border border-white/10 shrink-0"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">Share</span>
                  </button>
                  {audioUrl && (
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="inline-flex h-12 items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-white font-semibold py-2 px-6 rounded-full transition-colors border border-white/10 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {isDownloading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="text-sm font-bold uppercase tracking-wider">
                        {isDownloading ? `Downloading ${downloadProgress}%` : "Download MP3"}
                      </span>
                    </button>
                  )}
               </div>
            ) : null}
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
