import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function SitePopup() {
  const [popups, setPopups] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const loadPopups = async () => {
      try {
        const settingsRes = await fetch("/api/public/settings");
        let delay = 10000;
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings.popup_delay) delay = parseInt(settings.popup_delay);
        }

        const res = await fetch("/api/public/popups");
        if (!res.ok) return;
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return; // Ignore if not JSON (e.g. server returned HTML fallback)
        }
        const data = await res.json();
        
        // Filter out already dismissed popups
        const dismissed = JSON.parse(sessionStorage.getItem('dismissed_popups') || '[]');
        const activePopups = Array.isArray(data) ? data.filter((p: any) => !dismissed.includes(p.id)) : [];

        if (activePopups.length > 0) {
          timer = setTimeout(() => {
            setPopups(activePopups);
            setVisible(true);
          }, delay);
        }
      } catch (err) {
        console.warn("Site alerts fetch failed (likely network error).");
      }
    };
    
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

  return (
    <AnimatePresence>
      {visible && popup && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-dark-bg border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            <button onClick={handleClose} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="relative z-10 space-y-6">
              {popup.heading && <h3 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tighter text-white">{popup.heading}</h3>}
              {popup.text && <p className="text-white/60 text-lg leading-relaxed font-light">{popup.text}</p>}
              {btnText && (
                <div className="pt-4">
                  <a href={btnLink || "#"} className="inline-flex items-center justify-center px-10 py-4 bg-neon-purple text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neon-blue transition-all shadow-lg shadow-neon-purple/20" target="_blank" rel="noopener noreferrer">
                    {btnText}
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}