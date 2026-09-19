import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video as VideoIcon,
  MessageSquare
} from 'lucide-react';
import { useLogo } from '../../hooks/useLogo';

export interface LightboxMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  title?: string;
  caption?: string;
  sender?: string;
  avatar?: string;
  timestamp?: number;
  platform?: string;
}

export interface StudioMediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: LightboxMediaItem[];
  initialIndex?: number;
  isLightMode?: boolean;
}

export const StudioMediaLightbox: React.FC<StudioMediaLightboxProps> = ({
  isOpen,
  onClose,
  mediaItems,
  initialIndex = 0,
  isLightMode: propIsLightMode,
}) => {
  const { isLightMode: hookLightMode } = useLogo();
  const [domIsLight, setDomIsLight] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const html = document.documentElement;
    const body = document.body;
    return (
      html.classList.contains('light') ||
      html.classList.contains('theme-light') ||
      html.classList.contains('admin-light-mode') ||
      Boolean(body && (body.classList.contains('light') || body.classList.contains('theme-light') || body.classList.contains('admin-light-mode'))) ||
      html.getAttribute('data-theme') === 'light' ||
      localStorage.getItem('theme') === 'light' ||
      localStorage.getItem('studio_theme') === 'light'
    );
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkDomTheme = () => {
      const html = document.documentElement;
      const body = document.body;
      const isLight =
        html.classList.contains('light') ||
        html.classList.contains('theme-light') ||
        html.classList.contains('admin-light-mode') ||
        Boolean(body && (body.classList.contains('light') || body.classList.contains('theme-light') || body.classList.contains('admin-light-mode'))) ||
        html.getAttribute('data-theme') === 'light' ||
        localStorage.getItem('theme') === 'light' ||
        localStorage.getItem('studio_theme') === 'light';
      setDomIsLight(isLight);
    };

    checkDomTheme();
    window.addEventListener('theme-change', checkDomTheme);
    window.addEventListener('dashboard-theme-change', checkDomTheme);
    const observer = new MutationObserver(checkDomTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    }
    return () => {
      window.removeEventListener('theme-change', checkDomTheme);
      window.removeEventListener('dashboard-theme-change', checkDomTheme);
      observer.disconnect();
    };
  }, []);

  const isLightMode = propIsLightMode ?? (hookLightMode || domIsLight);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const mediaList = mediaItems || [];

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, mediaItems.length - 1)));
      setZoom(1);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, mediaItems.length]);

  // Reset zoom & pan when switching media
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  // Pause any background videos or audio elements on the page when lightbox is open or switches items
  useEffect(() => {
    if (!isOpen) return;

    try {
      const mediaElements = document.querySelectorAll('video, audio');
      mediaElements.forEach((el) => {
        if (el !== videoRef.current && el instanceof HTMLMediaElement && !el.paused) {
          el.pause();
        }
      });
    } catch {
      // ignore
    }
  }, [isOpen, currentIndex]);

  const currentItem = mediaItems[currentIndex];

  const handleClose = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
    }
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (mediaItems.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % mediaItems.length);
  }, [mediaItems.length]);

  const handlePrev = useCallback(() => {
    if (mediaItems.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + mediaItems.length) % mediaItems.length);
  }, [mediaItems.length]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(prev - 0.5, 0.5);
      if (next <= 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        handleResetZoom();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Mouse pan handlers for zoomed image
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoom <= 1) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (currentItem?.type !== 'image') return;
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleDownload = () => {
    if (!currentItem?.url) return;
    const link = document.createElement('a');
    link.href = currentItem.url;
    link.download = currentItem.title || `studio-media-${currentItem.id || Date.now()}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    if (!currentItem?.url) return;
    window.open(currentItem.url, '_blank', 'noopener,noreferrer');
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!isOpen || !currentItem || typeof document === 'undefined') return null;

  const content = (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[999999] flex flex-col backdrop-blur-2xl select-none overflow-hidden"
        style={{
          backgroundColor: isLightMode ? '#f8fafc' : '#07090e',
          color: isLightMode ? '#0f172a' : '#f8fafc',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          // If clicked directly on the outer backdrop, close
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Top Header Bar */}
        <div
          className="relative z-20 flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b gap-2 shadow-sm"
          style={{
            backgroundColor: isLightMode ? '#ffffff' : '#0f1420',
            borderColor: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            color: isLightMode ? '#0f172a' : '#ffffff',
          }}
        >
          {/* Left: Sender info & timestamp */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            {currentItem.avatar && (
              <img
                src={currentItem.avatar}
                alt={currentItem.sender || 'User'}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border"
                style={{
                  borderColor: isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
                  backgroundColor: isLightMode ? '#f1f5f9' : '#1e293b',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className="font-bold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[200px]"
                  style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}
                >
                  {currentItem.sender || 'Studio Attachment'}
                </span>
                {currentItem.platform && (
                  <span
                    className="hidden sm:inline-flex text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border shrink-0 font-semibold"
                    style={{
                      backgroundColor: isLightMode ? '#f1f5f9' : 'rgba(255,255,255,0.1)',
                      borderColor: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)',
                      color: isLightMode ? '#334155' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {currentItem.platform}
                  </span>
                )}
              </div>
              {currentItem.timestamp && (
                <p
                  className="text-[10px] sm:text-[11px] font-mono whitespace-nowrap truncate max-w-[130px] sm:max-w-none"
                  style={{ color: isLightMode ? '#64748b' : 'rgba(255,255,255,0.6)' }}
                >
                  {formatTimestamp(currentItem.timestamp)}
                </p>
              )}
            </div>
          </div>

          {/* Center: Counter & Title */}
          <div
            className="hidden lg:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border shrink-0 font-medium"
            style={{
              backgroundColor: isLightMode ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
              borderColor: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
              color: isLightMode ? '#334155' : 'rgba(255,255,255,0.85)',
            }}
          >
            {currentItem.type === 'image' ? (
              <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <VideoIcon className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span>
              {currentIndex + 1} / {mediaList.length}
            </span>
            {(currentItem.title) && (
              <>
                <span style={{ opacity: 0.4 }}>•</span>
                <span
                  className="truncate max-w-[180px] font-semibold"
                  style={{ color: isLightMode ? '#0f172a' : '#ffffff' }}
                >
                  {currentItem.title}
                </span>
              </>
            )}
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentItem.type === 'image' && (
              <div
                className="hidden sm:flex items-center gap-1 p-1 rounded-xl border mr-1"
                style={{
                  backgroundColor: isLightMode ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                  borderColor: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                }}
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  title="Zoom Out (-)"
                  className="p-1.5 rounded-lg disabled:opacity-30 cursor-pointer transition-colors"
                  style={{ color: isLightMode ? '#334155' : '#e2e8f0' }}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Zoom"
                  className="px-2 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors font-semibold"
                  style={{ color: isLightMode ? '#334155' : '#e2e8f0' }}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 4}
                  title="Zoom In (+)"
                  className="p-1.5 rounded-lg disabled:opacity-30 cursor-pointer transition-colors"
                  style={{ color: isLightMode ? '#334155' : '#e2e8f0' }}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  title="Rotate 90°"
                  className="p-1.5 rounded-lg cursor-pointer transition-colors"
                  style={{ color: isLightMode ? '#334155' : '#e2e8f0' }}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownload}
              title="Download Media File"
              className="p-2 rounded-xl border cursor-pointer transition-colors flex items-center justify-center"
              style={{
                backgroundColor: isLightMode ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                borderColor: isLightMode ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
                color: isLightMode ? '#1e293b' : '#ffffff',
              }}
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleOpenExternal}
              title="Open in New Tab"
              className="p-2 rounded-xl border cursor-pointer transition-colors hidden md:inline-flex items-center justify-center"
              style={{
                backgroundColor: isLightMode ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                borderColor: isLightMode ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
                color: isLightMode ? '#1e293b' : '#ffffff',
              }}
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2 rounded-xl border cursor-pointer transition-colors hidden sm:inline-flex items-center justify-center"
              style={{
                backgroundColor: isLightMode ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                borderColor: isLightMode ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
                color: isLightMode ? '#1e293b' : '#ffffff',
              }}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleClose}
              title="Close Lightbox (Esc)"
              className="p-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 border font-semibold"
              style={{
                backgroundColor: isLightMode ? '#fef2f2' : 'rgba(244, 63, 94, 0.15)',
                borderColor: isLightMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(244, 63, 94, 0.3)',
                color: isLightMode ? '#dc2626' : '#fca5a5',
              }}
            >
              <X className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase hidden sm:inline">Esc</span>
            </button>
          </div>
        </div>

        {/* Main Stage View */}
        <div
          className="relative flex-1 flex items-center justify-center p-4 overflow-hidden"
          onWheel={handleWheel}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          {/* Navigation Arrows */}
          {mediaList.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                title="Previous (Left Arrow)"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl backdrop-blur-md transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 border shadow-xl"
                style={{
                  backgroundColor: isLightMode ? '#ffffff' : 'rgba(15, 23, 42, 0.85)',
                  borderColor: isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
                  color: isLightMode ? '#0f172a' : '#ffffff',
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                title="Next (Right Arrow)"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl backdrop-blur-md transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 border shadow-xl"
                style={{
                  backgroundColor: isLightMode ? '#ffffff' : 'rgba(15, 23, 42, 0.85)',
                  borderColor: isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
                  color: isLightMode ? '#0f172a' : '#ffffff',
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Media Presentation */}
          <div className="relative flex items-center justify-center max-w-full max-h-full">
            {currentItem.type === 'image' ? (
              <div
                className={`transition-transform duration-100 ease-out select-none ${
                  zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                }`}
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                onMouseDown={handleMouseDown}
                onDoubleClick={() => {
                  if (zoom === 1) {
                    setZoom(2);
                  } else {
                    handleResetZoom();
                  }
                }}
              >
                <img
                  src={currentItem.url}
                  alt={currentItem.caption || currentItem.title || 'Studio Attachment'}
                  className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg pointer-events-auto"
                  style={{
                    boxShadow: isLightMode 
                      ? '0 20px 50px -10px rgba(0,0,0,0.2)' 
                      : '0 25px 60px -15px rgba(0,0,0,0.8)',
                  }}
                  draggable={false}
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div
                className="relative max-w-[90vw] max-h-[75vh] rounded-xl overflow-hidden shadow-2xl bg-black border"
                style={{
                  borderColor: isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)',
                }}
              >
                <video
                  ref={videoRef}
                  src={currentItem.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-[90vw] max-h-[75vh] object-contain"
                />
              </div>
            )}
          </div>

          {/* Floating Caption / Message Text */}
          {currentItem.caption && currentItem.caption.trim().length > 0 && (
            <div className="absolute bottom-20 z-20 max-w-xl mx-auto px-4 pointer-events-none">
              <div
                className="backdrop-blur-md px-4 py-2.5 rounded-2xl text-sm shadow-2xl pointer-events-auto text-center border font-medium"
                style={{
                  backgroundColor: isLightMode ? '#ffffff' : 'rgba(15, 23, 42, 0.9)',
                  borderColor: isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
                  color: isLightMode ? '#0f172a' : '#f8fafc',
                }}
              >
                <p className="whitespace-pre-wrap break-words">{currentItem.caption}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Thumbnail Strip (when multiple media items exist) */}
        {mediaList.length > 1 && (
          <div
            className="relative z-20 pt-2 pb-3 px-4 border-t"
            style={{
              backgroundColor: isLightMode ? '#ffffff' : '#0f1420',
              borderColor: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-5xl mx-auto scrollbar-thin"
              style={{
                scrollbarColor: isLightMode ? 'rgba(0,0,0,0.2) transparent' : 'rgba(255,255,255,0.2) transparent',
              }}
            >
              {mediaList.map((item, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={`${item.id}-${idx}`}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border transition-all duration-200 cursor-pointer"
                    style={{
                      borderColor: isActive
                        ? '#3b82f6'
                        : isLightMode
                        ? 'rgba(0,0,0,0.15)'
                        : 'rgba(255,255,255,0.15)',
                      boxShadow: isActive ? '0 0 0 2px rgba(59, 130, 246, 0.4)' : 'none',
                      opacity: isActive ? 1 : 0.6,
                    }}
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt="thumbnail"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <VideoIcon className="w-5 h-5 text-white/70" />
                      </div>
                    )}
                    {item.type === 'video' && (
                      <div className="absolute bottom-0.5 right-0.5 bg-black/70 p-0.5 rounded">
                        <VideoIcon className="w-2.5 h-2.5 text-rose-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};
