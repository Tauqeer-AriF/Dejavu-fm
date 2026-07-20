import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, PlusSquare } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if the app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || 
      document.referrer.includes('android-app://');
      
    if (isStandalone) {
      return;
    }
    
    // Detect iOS
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    // Detect Android
    const isAndroid = /android/.test(window.navigator.userAgent.toLowerCase());
    
    if (isIos) {
      setDeviceType('ios');
    } else if (isAndroid) {
      setDeviceType('android');
    } else {
      // Don't show on desktop by default
      return;
    }

    // Check if user has previously dismissed the prompt
    const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (hasDismissed) {
      return;
    }

    // Android native install prompt handler
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setDeviceType('android');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt after 5 seconds
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (deviceType === 'android' && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 sm:bottom-32 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50 pointer-events-auto"
        >
          <div className="bg-dark-bg/95 backdrop-blur-xl border border-neon-purple/30 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <button 
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="pr-6">
              <h3 className="text-white font-bold text-lg mb-2 flex items-center">
                <span className="w-2 h-2 bg-neon-purple rounded-full mr-2 animate-pulse"></span>
                Install Dejavu FM App
              </h3>
              
              <p className="text-white/70 text-sm mb-4">
                Install our app on your home screen for quick and easy access to the live stream and chat.
              </p>
              
              {deviceType === 'ios' && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/80 space-y-2">
                  <p className="flex items-center">
                    1. Tap the <Share className="w-4 h-4 mx-2 text-neon-blue inline" /> Share button in your browser
                  </p>
                  <p className="flex items-center">
                    2. Scroll down and tap <PlusSquare className="w-4 h-4 mx-2 text-neon-purple inline" /> "Add to Home Screen"
                  </p>
                </div>
              )}
              
              {deviceType === 'android' && (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-gradient-to-r from-neon-purple to-neon-blue text-white font-bold py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(182,36,255,0.3)]"
                >
                  Add to Home Screen
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
