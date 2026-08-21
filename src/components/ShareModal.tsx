import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLogo } from '../hooks/useLogo';
import { useGamification } from '../context/GamificationContext';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  appTagline: string;
  shareUrl?: string;
}

export function ShareModal({ isOpen, onClose, appName, appTagline, shareUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { isLightMode } = useLogo();
  const { claimShareXp } = useGamification();
  const targetUrl = shareUrl || window.location.origin;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      toast.success('Link copied to clipboard! +25 XP');
      await claimShareXp('Dejavu FM', targetUrl);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: appName,
      text: appTagline,
      url: targetUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('Station shared successfully! +25 XP');
        await claimShareXp('Dejavu FM', targetUrl);
      } catch (e) {
        console.log('Native share failed or aborted', e);
      }
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative w-full max-w-sm overflow-hidden rounded-[32px] p-6 shadow-2xl z-10 text-center transition-all ${
              isLightMode 
                ? 'bg-[#ffffff] border border-slate-200 text-slate-900' 
                : 'bg-neutral-950/90 border border-[#ffffff]/10 text-[#ffffff]'
            }`}
          >
            {/* Glowing Neon Background Effect */}
            <div className={`absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-all ${
              isLightMode ? 'bg-neon-purple/10' : 'bg-neon-purple/20'
            }`} />
            <div className={`absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-all ${
              isLightMode ? 'bg-neon-blue/5' : 'bg-neon-blue/15'
            }`} />

            {/* Header / Close Button */}
            <div className="flex justify-between items-center mb-5 relative z-10">
              <div className="flex items-center gap-2 text-neon-purple">
                <QrCode className="w-5 h-5 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Instant Access</span>
              </div>
              <button
                onClick={onClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isLightMode
                    ? 'bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-200/50'
                    : 'bg-[#ffffff]/5 border border-[#ffffff]/10 hover:border-[#ffffff]/30 text-[#ffffff]/50 hover:text-[#ffffff]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Info */}
            <div className="relative z-10 mb-6">
              <h3 className={`text-2xl font-black uppercase tracking-tight mb-1 ${
                isLightMode ? 'text-slate-900' : 'text-[#ffffff]'
              }`}>
                Share {appName}
              </h3>
              <p className={`text-xs font-medium line-clamp-1 px-4 ${
                isLightMode ? 'text-slate-500' : 'text-[#ffffff]/40'
              }`}>
                {appTagline}
              </p>
            </div>

            {/* QR Code Container - Custom Premium styling */}
            <div className="relative z-10 flex flex-col items-center justify-center mb-6">
              <div className={`p-4 rounded-3xl bg-[#ffffff] flex items-center justify-center border-4 border-neon-purple/30 relative shadow-2xl ${
                isLightMode ? 'shadow-neon-purple/10 border-neon-purple/20' : 'shadow-neon-purple/20'
              }`}>
                <QRCodeSVG
                  value={targetUrl}
                  size={160}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#0A0A0C"
                />
                
                {/* Embedded Mini Logo Circle in the very center */}
                <div className={`absolute w-9 h-9 rounded-full border border-neon-purple flex items-center justify-center text-[10px] font-black text-neon-purple tracking-tighter uppercase select-none ${
                  isLightMode ? 'bg-[#ffffff]' : 'bg-neutral-950'
                }`}>
                  FM
                </div>
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] mt-3 ${
                isLightMode ? 'text-slate-500' : 'text-[#ffffff]/30'
              }`}>
                Scan with phone camera
              </span>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 flex flex-col gap-2.5">
              {/* Copy URL Button */}
              <button
                onClick={handleCopy}
                className={`w-full py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md hover:shadow-lg ${
                  copied 
                    ? 'bg-[#00c853] text-[#ffffff] shadow-[#00c853]/20 scale-[0.98]' 
                    : isLightMode
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300'
                      : 'bg-[#ffffff]/5 hover:bg-[#ffffff]/10 text-[#ffffff]/90 border border-[#ffffff]/10 hover:border-[#ffffff]/20'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neon-purple" />
                    <span>Copy Station Link</span>
                  </>
                )}
              </button>

              {/* Native App Share (if supported) */}
              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className={`w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue hover:brightness-110 text-neutral-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl ${
                    isLightMode ? 'shadow-neon-purple/10' : 'shadow-neon-purple/15'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share via Apps</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
