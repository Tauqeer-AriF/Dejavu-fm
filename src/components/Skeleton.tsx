import { motion } from "motion/react";

export function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-white/5 border border-white/10 aspect-[3/4]">
      <motion.div
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
      />
      <div className="absolute inset-x-0 bottom-0 p-8 space-y-4">
        <div className="h-8 w-3/4 bg-white/10 rounded-lg" />
        <div className="flex space-x-2">
          <div className="h-4 w-16 bg-white/10 rounded-full" />
          <div className="h-4 w-16 bg-white/10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPodcast() {
  return (
    <div className="glass-panel h-full rounded-2xl flex flex-col border border-white/10 overflow-hidden">
      <div className="aspect-[16/9] bg-white/5 relative overflow-hidden">
        <motion.div
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        />
      </div>
      <div className="p-6 space-y-3">
        <div className="h-3 w-1/3 bg-white/10 rounded" />
        <div className="h-6 w-full bg-white/10 rounded" />
        <div className="h-4 w-2/3 bg-white/10 rounded" />
      </div>
    </div>
  );
}
