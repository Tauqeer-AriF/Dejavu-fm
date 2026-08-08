import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLogo } from '../hooks/useLogo';

export async function playHighFidelitySound(status: 'approved' | 'on_deck') {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const audioCtx = new AudioCtxClass();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    
    // Master volume and lowpass filter for warmth
    const masterGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    // Delay effect for retro depth
    const delay = audioCtx.createDelay();
    const delayGain = audioCtx.createGain();
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, audioCtx.currentTime);
    filter.Q.setValueAtTime(1.5, audioCtx.currentTime);
    
    delay.delayTime.setValueAtTime(0.15, audioCtx.currentTime);
    delayGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    
    filter.connect(masterGain);
    filter.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(masterGain);
    
    masterGain.connect(audioCtx.destination);
    masterGain.gain.setValueAtTime(0.12, audioCtx.currentTime);

    if (status === 'approved') {
      // Euphoric major-7th chord arpeggio
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + idx * 0.08 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.08 + 0.4);
        
        osc.connect(gainNode);
        gainNode.connect(filter);
        
        osc.start(audioCtx.currentTime + idx * 0.08);
        osc.stop(audioCtx.currentTime + idx * 0.08 + 0.4);
      });
      
      filter.frequency.exponentialRampToValueAtTime(3200, audioCtx.currentTime + 0.5);
    } else {
      // Dramatic "On Deck" sub drop followed by twin neon chime
      const subOsc = audioCtx.createOscillator();
      const subGain = audioCtx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(140, audioCtx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
      
      subGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      subOsc.connect(subGain);
      subGain.connect(audioCtx.destination);
      subOsc.start();
      subOsc.stop(audioCtx.currentTime + 0.3);

      const chimeTimes = [0.08, 0.2];
      chimeTimes.forEach((startTime) => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc1.type = 'sine';
        osc2.type = 'triangle';
        
        osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime + startTime);
        osc1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + startTime + 0.08);
        
        osc2.frequency.setValueAtTime(1174.66, audioCtx.currentTime + startTime);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + 0.3);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(filter);
        
        osc1.start(audioCtx.currentTime + startTime);
        osc1.stop(audioCtx.currentTime + startTime + 0.3);
        osc2.start(audioCtx.currentTime + startTime);
        osc2.stop(audioCtx.currentTime + startTime + 0.3);
      });
    }
  } catch {}
}

export function GlobalRequestAlerts() {
  const { isLightMode } = useLogo();

  const [liveAlert, setLiveAlert] = useState<{
    id: number;
    title: string;
    artist: string;
    requesterName: string;
    status: 'approved' | 'on_deck';
    timestamp: number;
  } | null>(null);

  const soundsEnabledRef = useRef<boolean>(true);

  useEffect(() => {
    const checkSounds = () => {
      try {
        soundsEnabledRef.current = localStorage.getItem('booth_sounds_enabled') !== 'false';
      } catch {
        soundsEnabledRef.current = true;
      }
    };
    checkSounds();

    const handleCustomChange = (e: any) => {
      if (typeof e.detail === 'boolean') {
        soundsEnabledRef.current = e.detail;
      } else {
        checkSounds();
      }
    };

    window.addEventListener('booth_sounds_changed', handleCustomChange);
    window.addEventListener('storage', checkSounds);
    return () => {
      window.removeEventListener('booth_sounds_changed', handleCustomChange);
      window.removeEventListener('storage', checkSounds);
    };
  }, []);

  useEffect(() => {
    if (liveAlert) {
      const timer = setTimeout(() => {
        setLiveAlert(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [liveAlert]);

  useEffect(() => {
    // Listen to global socket updates across all pages
    const socket = (window as any).socket;
    if (!socket) return;

    const handleStatusUpdate = (payload: { id: number; status: string; request: any }) => {
      const { id, status, request } = payload;
      if (!request) return;

      if (status === 'approved' || status === 'on_deck') {
        setLiveAlert({
          id,
          title: request.track_title || 'Unknown Track',
          artist: request.artist || 'Unknown Artist',
          requesterName: request.requester_name || 'Anonymous Listener',
          status: status as 'approved' | 'on_deck',
          timestamp: Date.now()
        });

        if (soundsEnabledRef.current) {
          playHighFidelitySound(status as 'approved' | 'on_deck');
        }
      }

      // Trigger custom high-importance sound/visual notification to original requester
      try {
        const savedMyRequests = JSON.parse(localStorage.getItem('booth_my_requests') || '[]');
        if (savedMyRequests.includes(id)) {
          if (status === 'approved') {
            toast.success(`🎉 DJ Approved Your Track!`, {
              description: `"${request.track_title}" has been approved for the broadcast queue!`,
              duration: 10000,
            });
          } else if (status === 'on_deck') {
            toast.info(`🔥 Your Track is ON DECK!`, {
              description: `"${request.track_title}" is playing next! Tuned in?`,
              duration: 12000,
            });
          } else if (status === 'played') {
            toast(`🎧 Now Playing Your Request!`, {
              description: `Enjoy "${request.track_title}" playing live on air now!`,
              duration: 10000,
            });
          }
        }
      } catch {}
    };

    socket.on("songRequestStatusUpdated", handleStatusUpdate);

    return () => {
      socket.off("songRequestStatusUpdated", handleStatusUpdate);
    };
  }, []);

  return (
    <AnimatePresence>
      {liveAlert && (
        <motion.div
          key={`global-live-alert-${liveAlert.id}-${liveAlert.timestamp}`}
          initial={{ opacity: 0, y: -50, scale: 0.9, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`fixed top-6 left-1/2 z-[99999] w-[calc(100%-32px)] max-w-md p-5 rounded-2xl border booth-live-alert ${
            isLightMode
              ? 'bg-[#ffffff] border-purple-300 text-slate-900 shadow-[0_15px_40px_rgba(147,51,234,0.18)]'
              : 'bg-[#0a0c10]/95 border-purple-500/30 text-white shadow-[0_15px_45px_rgba(0,0,0,0.8)] shadow-purple-950/20'
          } backdrop-blur-md overflow-hidden`}
        >
          {/* Glowing neon top pulse strip */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
            liveAlert.status === 'approved'
              ? (isLightMode ? 'from-emerald-500 via-teal-500 to-emerald-600' : 'from-emerald-400 via-green-500 to-teal-500 animate-pulse')
              : (isLightMode ? 'from-indigo-500 via-purple-600 to-pink-500' : 'from-neon-blue via-neon-purple to-neon-pink animate-pulse')
          }`} />

          <div className="flex items-center gap-4 relative z-10">
            <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl border shrink-0 ${
              liveAlert.status === 'approved'
                ? (isLightMode ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500')
                : (isLightMode ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple')
            }`}>
              <motion.div
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-current opacity-5 rounded-xl"
              />
              {liveAlert.status === 'approved' ? (
                <Check className="w-6 h-6 animate-bounce" />
              ) : (
                <Sparkles className="w-6 h-6 animate-pulse" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${
                  liveAlert.status === 'approved'
                    ? (isLightMode ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200' : 'bg-emerald-500/15 text-emerald-500')
                    : (isLightMode ? 'bg-purple-100 text-purple-800 font-bold border border-purple-200' : 'bg-neon-purple/15 text-neon-purple')
                }`}>
                  {liveAlert.status === 'approved' ? 'Request Approved' : 'Track On Deck'}
                </span>
                <span className={`text-[9px] font-semibold font-sans truncate ${isLightMode ? 'text-slate-600' : 'text-white/40'}`}>
                  • Requested by {liveAlert.requesterName}
                </span>
              </div>
              <h4 className={`text-sm font-display font-black uppercase truncate tracking-tight mt-1 leading-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                {liveAlert.title}
              </h4>
              <p className={`text-xs font-semibold font-sans truncate ${isLightMode ? 'text-slate-700 font-bold' : 'text-white/60'}`}>
                {liveAlert.artist}
              </p>
            </div>
          </div>

          {/* Simulated high-fidelity live audio wave visualizer */}
          <div className="flex items-end justify-center gap-1 h-3 mt-4 opacity-80">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((bar) => (
              <motion.div
                key={bar}
                animate={{ height: ["4px", "12px", "4px"] }}
                transition={{
                  duration: 0.4 + Math.random() * 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: bar * 0.04
                }}
                className={`w-1 rounded-full ${
                  liveAlert.status === 'approved' 
                    ? (isLightMode ? 'bg-emerald-600' : 'bg-emerald-400') 
                    : (isLightMode ? 'bg-purple-600' : 'bg-neon-purple')
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
