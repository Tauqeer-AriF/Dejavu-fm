import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin } from 'lucide-react';
import { useLogo } from '../hooks/useLogo';

interface LiveLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: { ip: string, location: string, isp: string, region: string, city: string, browser: string, device: string }[];
}

export function LiveLocationsModal({ isOpen, onClose, locations }: LiveLocationsModalProps) {
  const { isLightMode } = useLogo();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
            className={`relative w-full max-w-lg overflow-hidden rounded-[32px] p-6 shadow-2xl z-10 transition-all ${
              isLightMode 
                ? 'bg-white border border-slate-200 text-slate-900' 
                : 'bg-neutral-950/90 border border-white/10 text-white'
            }`}
          >
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2 text-red-500">
                <MapPin className="w-5 h-5 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Live Connections</span>
              </div>
              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isLightMode
                    ? 'bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                    : 'bg-white/5 border border-white/10 hover:border-white/30 text-white/50 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {locations.length > 0 ? (
                locations.map((loc, i) => (
                  <div key={i} className={`text-xs font-mono p-3 rounded-xl flex flex-col gap-1 ${isLightMode ? 'bg-slate-50' : 'bg-white/5'}`}>
                    <div className="flex justify-between font-bold text-sm">
                        <span>{loc.city}, {loc.region}</span>
                        <span className="opacity-50 font-normal">{loc.ip}</span>
                    </div>
                    <div className="text-[10px] opacity-70">ISP: {loc.isp}</div>
                    <div className="text-[10px] opacity-70">Browser: {loc.browser}</div>
                    <div className="text-[10px] opacity-70">Device: {loc.device}</div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 opacity-50 space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto" />
                  <p className="text-xs">Loading active connections...</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
