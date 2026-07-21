import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdmin } from './adminApi';
import { X, Search, Image as ImageIcon, Video, Music, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function MediaPickerModal({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (url: string) => void }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['adminMedia'],
    queryFn: async () => {
      const res = await fetchAdmin('/api/admin/media');
      if (!res.ok) throw new Error('Failed to load media');
      return res.json();
    },
    enabled: isOpen,
  });

  const allFilteredImages = useMemo(() => {
    // Only show images for now
    const images = media.filter((m: any) => m.type === 'image');
    if (!search.trim()) return images;
    return images.filter((item: any) => item.filename.toLowerCase().includes(search.toLowerCase()));
  }, [media, search]);

  const totalPages = Math.ceil(allFilteredImages.length / ITEMS_PER_PAGE);

  const paginatedMedia = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allFilteredImages.slice(start, start + ITEMS_PER_PAGE);
  }, [allFilteredImages, currentPage]);

  // Reset to page 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl max-h-[85vh] bg-[#0d0d0f] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-lg text-white">Select from Media</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search images..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-white/40 focus:border-neon-purple focus:outline-none transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-neon-purple" />
              <p>Loading media...</p>
            </div>
          ) : allFilteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
              <p>No images found in Media Library</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {paginatedMedia.map((item: any) => (
                  <div 
                    key={item.filename}
                    onClick={() => {
                      onSelect(item.url);
                      onClose();
                    }}
                    className="group cursor-pointer relative aspect-square bg-black/40 rounded-xl border border-white/5 overflow-hidden hover:border-neon-purple transition-colors"
                  >
                    <img src={item.url} alt={item.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-neon-purple text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">Select</span>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, i, arr) => {
                        const showEllipsis = i > 0 && p - arr[i-1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="text-white/20">...</span>}
                            <button
                              onClick={() => setCurrentPage(p)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                                currentPage === p 
                                  ? 'bg-neon-purple text-white' 
                                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
