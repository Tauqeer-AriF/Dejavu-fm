import React, { useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';

interface VisualizerProps {
  type: 'bars' | 'wave' | 'circle';
  className?: string;
  color?: string;
  count?: number;
}

export function Visualizer({ type = 'bars', className = '', color = '#B026FF', count = 32 }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getAnalyser, isPlaying } = useAudio();
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = getAnalyser();
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : count);

    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      if (!isPlaying || !analyser) {
        // Subtle idle animation or static line
        ctx.beginPath();
        ctx.strokeStyle = color + '40'; // Low opacity
        ctx.lineWidth = 2;
        if (type === 'bars') {
          const barWidth = width / count;
          for (let i = 0; i < count; i++) {
            ctx.fillStyle = color + '20';
            ctx.fillRect(i * barWidth, height - 2, barWidth - 1, 2);
          }
        } else {
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          ctx.stroke();
        }
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      if (type === 'bars') {
        const barWidth = (width / count) * 2.5;
        let x = 0;

        for (let i = 0; i < count; i++) {
          const barHeight = (dataArray[i] / 255) * height;
          
          // Gradient for the bar
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, color + 'aa');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

          x += barWidth + 1;
        }
      } else if (type === 'wave') {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.lineJoin = 'round';

        const sliceWidth = width / count;
        let x = 0;

        for (let i = 0; i < count; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (type === 'circle') {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 4;

        for (let i = 0; i < count; i++) {
          const barHeight = (dataArray[i] / 255) * 50;
          const angle = (i * 2 * Math.PI) / count;
          
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barHeight);
          const y2 = centerY + Math.sin(angle) * (radius + barHeight);

          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [getAnalyser, isPlaying, type, color, count]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
      width={300}
      height={100}
    />
  );
}
