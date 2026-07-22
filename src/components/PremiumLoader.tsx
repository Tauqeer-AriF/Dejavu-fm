import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useLogo } from "../hooks/useLogo";
import { createPortal } from "react-dom";

interface PremiumLoaderProps {
  onComplete?: () => void;
}

export function PremiumLoader({ onComplete }: PremiumLoaderProps) {
  const [progress, setProgress] = useState(0);
  const { isLightMode } = useLogo();

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onComplete?.(), 800); // Slightly longer for premium feel
          return 100;
        }
        return prev + 0.8; // Slower, smoother progress
      });
    }, 20);

    return () => clearInterval(timer);
  }, [onComplete]);

  return createPortal(
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#050505]'}`}
      style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
    >
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-neon-purple/20 blur-[150px] rounded-full" 
        />
        <motion.div 
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-neon-blue/20 blur-[150px] rounded-full" 
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Glitch styled 'dejavufm' text matching the attachment */}
        <div className="relative inline-block select-none py-2 px-4">
          {/* Main Glitch Text Container */}
          <div className={`relative font-black text-6xl sm:text-7xl md:text-8xl tracking-tighter font-sans lowercase leading-none ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
            {/* Main solid text */}
            <span className={`relative z-10 block ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
              dejavufm
            </span>

            {/* Glitch Overlay Slice 1 - Top Offset */}
            <motion.span
              aria-hidden="true"
              animate={{
                x: [-2, 3, -1, 4, -2, 0],
                opacity: [0.9, 1, 0.8, 1, 0.9],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
              className={`absolute inset-0 z-20 pointer-events-none lowercase ${isLightMode ? 'text-slate-900' : 'text-white'}`}
              style={{
                clipPath: "polygon(0 12%, 100% 12%, 100% 38%, 0 38%)",
                transform: "translateX(-4px)",
              }}
            >
              dejavufm
            </motion.span>

            {/* Glitch Overlay Slice 2 - Middle Offset */}
            <motion.span
              aria-hidden="true"
              animate={{
                x: [3, -3, 2, -4, 1, 0],
                opacity: [1, 0.7, 1, 0.8, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: 0.2,
              }}
              className={`absolute inset-0 z-20 pointer-events-none lowercase ${isLightMode ? 'text-slate-900' : 'text-white'}`}
              style={{
                clipPath: "polygon(0 42%, 100% 42%, 100% 68%, 0 68%)",
                transform: "translateX(5px)",
              }}
            >
              dejavufm
            </motion.span>

            {/* Glitch Overlay Slice 3 - Lower Offset */}
            <motion.span
              aria-hidden="true"
              animate={{
                x: [-3, 2, -2, 3, -1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: 0.4,
              }}
              className={`absolute inset-0 z-20 pointer-events-none lowercase ${isLightMode ? 'text-slate-900' : 'text-white'}`}
              style={{
                clipPath: "polygon(0 72%, 100% 72%, 100% 88%, 0 88%)",
                transform: "translateX(-3px)",
              }}
            >
              dejavufm
            </motion.span>

            {/* Horizontal Slice Cut Line Artifacts */}
            <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
              {/* Slice artifact bar 1 across top left */}
              <motion.div 
                animate={{ opacity: [0.8, 0.2, 0.9, 0.4, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className={`absolute top-[22%] left-[8%] w-[28%] h-[3px] ${isLightMode ? 'bg-slate-900' : 'bg-white'}`} 
              />
              {/* Slice artifact bar 2 across middle 'j/a/v' */}
              <motion.div 
                animate={{ opacity: [0.3, 1, 0.4, 0.9, 0.3] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: 0.3 }}
                className={`absolute top-[48%] left-[26%] w-[38%] h-[2px] ${isLightMode ? 'bg-slate-900' : 'bg-white'}`} 
              />
              {/* Slice artifact bar 3 across 'f/m' */}
              <motion.div 
                animate={{ opacity: [0.9, 0.3, 0.8, 0.2, 0.9] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                className={`absolute top-[64%] right-[12%] w-[25%] h-[3px] ${isLightMode ? 'bg-slate-900' : 'bg-white'}`} 
              />
              {/* Micro digital glitch blocks */}
              <div className={`absolute top-[18%] left-[14%] w-3 h-1 ${isLightMode ? 'bg-slate-900' : 'bg-white'}`} />
              <div className={`absolute top-[34%] left-[32%] w-2.5 h-[2px] ${isLightMode ? 'bg-slate-900' : 'bg-white'}`} />
              <div className={`absolute top-[52%] left-[58%] w-4 h-[2px] ${isLightMode ? 'bg-slate-900' : 'bg-white'}`} />
              <div className={`absolute top-[70%] left-[78%] w-3 h-[2px] ${isLightMode ? 'bg-slate-900' : 'bg-white'}`} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
