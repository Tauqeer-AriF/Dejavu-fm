import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAudio } from '../context/AudioContext';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useLogo } from '../hooks/useLogo';

export function CinematicVisualizer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const { getAnalyser, isPlaying, currentTrack, onAirInfo } = useAudio();
  const { isLightMode } = useLogo();
  const animationRef = useRef<number>();
  const isLightModeRef = useRef(isLightMode);

  useEffect(() => {
    isLightModeRef.current = isLightMode;
  }, [isLightMode]);

  // Fallback metadata formatting
  const title = currentTrack && currentTrack !== "DejavuFM Live" ? currentTrack : (onAirInfo?.showName || "DejavuFM Live");
  const artist = onAirInfo ? (onAirInfo.djName || "DejavuFM") : "DejavuFM";

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = getAnalyser();

    // Use full width and height
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    let lastTime = performance.now();
    let smoothedBass = 0;

    const render = (time: number) => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      if (!isPlaying) {
        // Draw elegant, static, non-looping idle frame
        ctx.fillStyle = isLightModeRef.current ? '#f8fafc' : '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        const radius = Math.min(width, height) * 0.25;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isLightModeRef.current ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 4;
        ctx.stroke();

        if (textContainerRef.current) {
          textContainerRef.current.style.transform = 'scale(1)';
        }
        return; // Suspend animation loop entirely!
      }

      animationRef.current = requestAnimationFrame(render);
      const dt = time - lastTime;
      lastTime = time;

      // Respect light mode for fade background overlay
      ctx.fillStyle = isLightModeRef.current ? 'rgba(248, 250, 252, 0.25)' : 'rgba(10, 10, 15, 0.2)';
      ctx.fillRect(0, 0, width, height);

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);

        // Calculate bass energy (first few bins)
        let bassSum = 0;
        const bassBins = 8;
        for (let i = 0; i < bassBins; i++) {
          bassSum += dataArray[i];
        }
        const bassAvg = bassSum / bassBins;
        
        // Smooth bass for scaling the circle (pulse)
        smoothedBass = smoothedBass * 0.8 + bassAvg * 0.2;
        const scale = 1 + (smoothedBass / 255) * 0.15;
        if (textContainerRef.current) {
          textContainerRef.current.style.transform = `scale(${scale})`;
        }

        const count = analyser.frequencyBinCount / 4; // Use lower half of freq
        const radius = Math.min(width, height) * 0.25;

        ctx.beginPath();
        // Draw circular waves
        for (let i = 0; i < count; i++) {
          const val = dataArray[i];
          const barHeight = (val / 255) * (Math.min(width, height) * 0.3);
          const angle = (i * 2 * Math.PI) / count;

          const x1 = cx + Math.cos(angle) * (radius + barHeight * 0.05);
          const y1 = cy + Math.sin(angle) * (radius + barHeight * 0.05);
          const x2 = cx + Math.cos(angle) * (radius + barHeight);
          const y2 = cy + Math.sin(angle) * (radius + barHeight);

          // Calculate dynamic color based on freq bin and amplitude, with distinct lightness for light mode contrast
          const hue = (i / count) * 360 + (time * 0.05);
          const lightness = isLightModeRef.current ? '50%' : '65%';
          ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}, ${0.5 + (val / 255) * 0.5})`;
          ctx.lineWidth = 4 + (val / 255) * 6;
          ctx.lineCap = 'round';

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        
        // Draw outer secondary rings
        const outerCount = analyser.frequencyBinCount / 2;
        for (let i = 0; i < outerCount; i += 2) {
          const val = dataArray[i];
          if (val < 100) continue;
          const angle = -(i * 2 * Math.PI) / outerCount + (time * 0.001);
          const dist = radius + (val / 255) * radius * 1.5;
          
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          
          const lightness = isLightModeRef.current ? '50%' : '75%';
          ctx.fillStyle = `hsla(${(i / outerCount) * 360 + (time * 0.1)}, 100%, ${lightness}, ${val / 255})`;
          ctx.beginPath();
          ctx.arc(px, py, 2 + (val / 255) * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Fallback procedural animation for iOS/Safari without Analyser
        const pulse = Math.sin(time * 0.003) * 0.5 + 0.5; // 0 to 1 pulse
        const scale = 1 + pulse * 0.08;
        if (textContainerRef.current) {
          textContainerRef.current.style.transform = `scale(${scale})`;
        }

        const count = 64;
        const radius = Math.min(width, height) * 0.25;

        // Draw ambient glowing procedural rings
        for (let i = 0; i < count; i++) {
          const angle = (i * 2 * Math.PI) / count;
          // Generate a wave-like pattern using sine/cosine based on time and index
          const noise = Math.sin(i * 0.2 + time * 0.002) * Math.cos(i * 0.05 - time * 0.001);
          const val = (noise + 1) / 2; // 0 to 1
          
          const barHeight = val * (Math.min(width, height) * 0.15);
          const x1 = cx + Math.cos(angle) * (radius + barHeight * 0.1);
          const y1 = cy + Math.sin(angle) * (radius + barHeight * 0.1);
          const x2 = cx + Math.cos(angle) * (radius + barHeight);
          const y2 = cy + Math.sin(angle) * (radius + barHeight);

          const hue = (i / count) * 360 + (time * 0.02);
          const lightness = isLightModeRef.current ? '50%' : '65%';
          ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}, ${0.3 + val * 0.4})`;
          ctx.lineWidth = 3 + val * 4;
          ctx.lineCap = 'round';

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Draw some ambient particle nodes swirling around the ring
        const particlesCount = 20;
        for (let i = 0; i < particlesCount; i++) {
          const orbitAngle = (i * 2 * Math.PI) / particlesCount + (time * 0.0003);
          const distance = radius + Math.sin(time * 0.001 + i) * 30 + 50;
          const px = cx + Math.cos(orbitAngle) * distance;
          const py = cy + Math.sin(orbitAngle) * distance;

          const lightness = isLightModeRef.current ? '50%' : '75%';
          ctx.fillStyle = `hsla(${(i / particlesCount) * 360 + (time * 0.05)}, 100%, ${lightness}, 0.4)`;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [getAnalyser, isPlaying, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed inset-0 z-[20000] flex items-center justify-center overflow-hidden transition-colors duration-300 ${
            isLightMode ? 'bg-slate-50' : 'bg-[#0a0a0f]'
          }`}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ filter: 'blur(1px)' }}
          />
          
          <button
            onClick={onClose}
            className={`absolute top-8 right-8 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border ${
              isLightMode
                ? 'bg-[#ffffff] hover:bg-slate-100 border-slate-200 text-slate-800 shadow-md'
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md'
            }`}
          >
            <X className="w-6 h-6" />
          </button>

          <div
            ref={textContainerRef}
            className="absolute bottom-16 left-0 right-0 flex flex-col items-center pointer-events-none transition-transform duration-75 ease-out"
          >
            <div className={`px-12 py-8 rounded-5xl border shadow-2xl text-center max-w-2xl px-6 transition-all duration-300 ${
              isLightMode
                ? 'bg-[#ffffff] border-slate-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.06)]'
                : 'bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]'
            }`}>
              <h2 className={`text-4xl md:text-5xl font-display font-black tracking-tight mb-4 ${
                isLightMode
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent'
              }`}>{title}</h2>
              <p className={`text-xl md:text-2xl font-medium uppercase tracking-[0.2em] ${
                isLightMode ? 'text-slate-600' : 'text-white/70'
              }`}>{artist}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
