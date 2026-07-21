import { motion } from "motion/react";

interface PremiumRingLoaderProps {
  size?: "sm" | "md" | "lg";
}

export function PremiumRingLoader({ size = "md" }: PremiumRingLoaderProps) {
  const dimensions = {
    sm: { container: "w-12 h-12", outer: "w-12 h-12", inner: "w-8 h-8", core: "w-2 h-2" },
    md: { container: "w-20 h-20", outer: "w-20 h-20", inner: "w-14 h-14", core: "w-3 h-3" },
    lg: { container: "w-28 h-28", outer: "w-28 h-28", inner: "w-20 h-20", core: "w-4 h-4" },
  }[size];

  return (
    <div className="relative flex items-center justify-center">
      {/* Background Soft Glow Aura */}
      <motion.div
        animate={{
          scale: [0.9, 1.1, 0.9],
          opacity: [0.12, 0.25, 0.12],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute rounded-full bg-neon-purple/40 blur-md ${
          size === "sm" ? "w-8 h-8" : size === "md" ? "w-14 h-14" : "w-20 h-20"
        }`}
      />

      <div className={`relative ${dimensions.container} flex items-center justify-center`}>
        {/* Outer Elegant Spinning Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "linear",
          }}
          className={`absolute ${dimensions.outer} rounded-full border border-transparent border-t-neon-purple border-r-neon-purple/30 border-l-neon-purple/10 shadow-[0_0_15px_rgba(168,85,247,0.3)]`}
        />

        {/* Inner Counter-Rotating Precision Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "linear",
          }}
          className={`absolute ${dimensions.inner} rounded-full border border-transparent border-b-neon-blue border-l-neon-blue/30 border-r-neon-blue/10 shadow-[0_0_12px_rgba(59,130,246,0.25)]`}
        />

        {/* Central Core Pulse Dot */}
        <motion.div
          animate={{
            scale: [0.85, 1.15, 0.85],
            opacity: [0.5, 0.9, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`${dimensions.core} rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]`}
        />
      </div>
    </div>
  );
}
