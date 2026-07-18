import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  appTagline: string;
  shareUrl?: string;
}

export function ShareModal({ isOpen, onClose, appName, appTagline, shareUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const targetUrl = shareUrl || window.location.origin;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
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
            className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-neutral-950/90 border border-white/10 p-6 shadow-2xl text-white z-10 text-center"
          >
            {/* Glowing Neon Background Effect */}
            <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-neon-purple/20 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-neon-blue/15 blur-[80px] pointer-events-none" />

            {/* Header / Close Button */}
            <div className="flex justify-between items-center mb-5 relative z-10">
              <div className="flex items-center gap-2 text-neon-purple">
                <QrCode className="w-5 h-5 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Instant Access</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:border-white/30 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Info */}
            <div className="relative z-10 mb-6">
              <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                Share {appName}
              </h3>
              <p className="text-xs text-white/40 font-medium line-clamp-1 px-4">
                {appTagline}
              </p>
            </div>

            {/* QR Code Container - Custom Premium styling */}
            <div className="relative z-10 flex flex-col items-center justify-center mb-6">
              <div className="p-4 rounded-3xl bg-white shadow-2xl shadow-neon-purple/20 flex items-center justify-center border-4 border-neon-purple/30 relative">
                <QRCodeSVG
                  value={targetUrl}
                  size={160}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#0A0A0C"
                />
                
                {/* Embedded Mini Logo Circle in the very center */}
                <div className="absolute w-9 h-9 rounded-full bg-neutral-950 border border-neon-purple flex items-center justify-center text-[10px] font-black text-neon-purple tracking-tighter uppercase select-none">
                  FM
                </div>
              </div>
              <span className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em] mt-3">
                Scan with phone camera
              </span>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 flex flex-col gap-2.5">
              {/* Copy URL Button */}
              <button
                onClick={handleCopy}
                className={`w-full py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                  copied 
                    ? 'bg-[#00c853] text-white shadow-[#00c853]/20 scale-[0.98]' 
                    : 'bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 hover:border-white/20'
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
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue hover:brightness-110 text-neutral-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl shadow-neon-purple/15 flex items-center justify-center gap-2"
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
