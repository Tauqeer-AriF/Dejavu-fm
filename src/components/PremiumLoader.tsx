import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Mic } from "lucide-react";

interface PremiumLoaderProps {
  onComplete?: () => void;
}

export function PremiumLoader({ onComplete }: PremiumLoaderProps) {
  const [progress, setProgress] = useState(0);

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

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
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

      <div className="relative z-10 flex flex-col items-center">
        {/* Mic Icon Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative mb-16"
        >
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] relative group">
            <div className="absolute inset-x-0 inset-y-0 bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
            
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative z-10"
            >
              <Mic className="w-12 h-12 md:w-16 md:h-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
            </motion.div>
            
            {/* Interactive Pulse Rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: [0, 0.5, 0],
                  scale: [0.8, 1.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 1,
                  ease: "easeOut",
                }}
                className="absolute inset-0 border border-white/20 rounded-[2.5rem]"
              />
            ))}
          </div>
        </motion.div>

        {/* Text and Status */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center"
          >
            <h2 className="text-white font-display font-black text-3xl md:text-4xl uppercase tracking-tighter leading-none">
              DEJAVU<span className="text-neon-purple ml-1">FM</span>
            </h2>
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent mt-4" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center space-x-3"
          >
            <span className="text-white/30 text-[9px] font-mono uppercase tracking-[0.4em]">
              {progress < 30 ? "Syncing Airwaves" : progress < 70 ? "Filtering Signal" : "Ready for Broadcast"}
            </span>
          </motion.div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="mt-16 w-64 md:w-80 group">
          <div className="flex justify-between items-end mb-2 px-1">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">System Data Stream</span>
            <span className="text-[10px] font-mono text-neon-purple font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-purple to-neon-blue"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
            <motion.div 
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
            />
          </div>
        </div>
      </div>

      {/* Decorative Cinematic Details */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-[8px] font-mono text-white/40 tracking-[0.3em] uppercase">Status: ONAIR_SYSTEM_BOOT</div>
        <div className="absolute bottom-10 right-10 text-[8px] font-mono text-white/40 tracking-[0.3em] uppercase text-right">
          LATENCY: 12ms<br />
          STREAM: 320KBPS
        </div>
      </div>
    </motion.div>
  );
}
