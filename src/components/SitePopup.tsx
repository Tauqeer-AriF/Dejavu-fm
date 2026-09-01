import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation } from "react-router-dom";
import { getCachedSettings } from "../hooks/useLogo";
import { safeFetchJson } from "../utils/safeFetch";

export function SitePopup() {
  const location = useLocation();
  const pathname = location.pathname;

  const cachedSettings = getCachedSettings();
  const adminCustomPath = (cachedSettings?.admin_custom_path || '/admin').trim().replace(/\/+$/, '') || '/admin';
  const ownerCustomPath = (cachedSettings?.owner_custom_path || '/owner').trim().replace(/\/+$/, '') || '/owner';

  const isDashboard = pathname.startsWith(adminCustomPath) || pathname.startsWith(ownerCustomPath);

  const [popups, setPopups] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = sessionStorage.getItem('dejavufm_cached_popups');
      if (cached) {
        const parsed = JSON.parse(cached);
        const dismissed = JSON.parse(sessionStorage.getItem('dismissed_popups') || '[]');
        return Array.isArray(parsed) ? parsed.filter((p: any) => !dismissed.includes(p.id)) : [];
      }
    } catch (e) {}
    return [];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    // Get delay immediately from zero-flash settings cache
    const cachedSettings = getCachedSettings();
    let initialDelay = 10000;
    if (cachedSettings?.popup_delay) {
      initialDelay = parseInt(cachedSettings.popup_delay) || 10000;
    }

    const loadPopups = async () => {
      try {
        const [settings, data] = await Promise.all([
          safeFetchJson("/api/public/settings"),
          safeFetchJson("/api/public/popups")
        ]);

        let delay = initialDelay;
        if (settings?.popup_delay) {
          delay = parseInt(settings.popup_delay) || 10000;
        }

        // Filter out already dismissed popups
        const dismissed = JSON.parse(sessionStorage.getItem('dismissed_popups') || '[]');
        const activePopups = Array.isArray(data) ? data.filter((p: any) => !dismissed.includes(p.id)) : [];

        if (Array.isArray(data)) {
          sessionStorage.setItem('dejavufm_cached_popups', JSON.stringify(data));
        }

        if (activePopups.length > 0) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            setPopups(activePopups);
            setVisible(true);
          }, delay);
        }
      } catch (err) {
        console.warn("Site alerts fetch failed (likely network error).");
      }
    };
    
    // Start initial timer immediately if cached popups exist
    if (popups.length > 0) {
      timer = setTimeout(() => {
        setVisible(true);
      }, initialDelay);
    }

    loadPopups();

    // Immediate logic: Listen for real-time socket events
    let socketRetry: NodeJS.Timeout;
    const attachSocket = () => {
      const socket = (window as any).socket;
      if (socket) {
        socket.on('show_popup', (data: any) => {
          // Immediate popups show instantly and are added to the front of the queue
          setPopups(prev => [{ ...data, id: 'immediate-' + Date.now(), type: 'immediate' }, ...prev]);
          setCurrentIndex(0);
          setVisible(true);
        });
      } else {
        socketRetry = setTimeout(attachSocket, 1000);
      }
    };
    attachSocket();

    return () => { 
      const socket = (window as any).socket;
      if (socket) socket.off('show_popup');
      clearTimeout(socketRetry);
      clearTimeout(timer);
    };
  }, []);

  const handleClose = () => {
    const current = popups[currentIndex];
    if (current?.type === 'permanent') {
      const dismissed = JSON.parse(sessionStorage.getItem('dismissed_popups') || '[]');
      dismissed.push(current.id);
      sessionStorage.setItem('dismissed_popups', JSON.stringify(dismissed));
    }

    if (currentIndex < popups.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setVisible(false);
    }
  };

  const popup = popups[currentIndex];
  const btnText = popup?.btn_text || popup?.btnText;
  const btnLink = popup?.btn_link || popup?.btnLink;
  const btnTarget = (popup?.btn_target || popup?.btnTarget) === '_self' ? '_self' : '_blank';

  const btn2Text = popup?.btn2_text || popup?.btn2Text;
  const btn2Link = popup?.btn2_link || popup?.btn2Link;
  const btn2Target = (popup?.btn2_target || popup?.btn2Target) === '_self' ? '_self' : '_blank';

  if (isDashboard) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && popup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md cursor-pointer"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-dark-bg border border-white/10 rounded-[1.75rem] sm:rounded-[2.25rem] md:rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-2xl overflow-hidden text-center cursor-default"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            
            {/* Highly visible circular close button meeting the 44px mobile touch target guideline */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/80 hover:text-white transition-all border border-white/10 focus:outline-none shadow-md backdrop-blur-sm"
              aria-label="Close Pop-up"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 space-y-5 sm:space-y-6 pt-4 sm:pt-0">
              {popup.heading && (
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-black uppercase tracking-tighter text-white px-8 sm:px-12 md:px-0">
                  {popup.heading}
                </h3>
              )}
              {popup.text && (
                <p className="text-white/60 text-sm sm:text-base md:text-lg leading-relaxed font-light">
                  {popup.text}
                </p>
              )}
              {(btnText || btn2Text) && (
                <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                  {btnText && (
                    <a
                      href={btnLink || "#"}
                      target={btnTarget}
                      rel={btnTarget === "_blank" ? "noopener noreferrer" : undefined}
                      onClick={() => {
                        if (btnTarget === '_self') {
                          handleClose();
                        }
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-neon-purple text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neon-blue transition-all shadow-lg shadow-neon-purple/20"
                    >
                      {btnText}
                    </a>
                  )}
                  {btn2Text && (
                    <a
                      href={btn2Link || "#"}
                      target={btn2Target}
                      rel={btn2Target === "_blank" ? "noopener noreferrer" : undefined}
                      onClick={() => {
                        if (btn2Target === '_self') {
                          handleClose();
                        }
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg backdrop-blur-sm"
                    >
                      {btn2Text}
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
