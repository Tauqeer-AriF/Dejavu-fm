import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Smile } from 'lucide-react';

export const COMMON_REACTIONS = ['❤️', '🔥', '👍', '👏', '😂', '🎵', '🎧', '⚡', '🙌', '💯'];

interface MessageReactionsProps {
  messageId: string;
  reactions?: Record<string, string[]>;
  currentUser?: string;
  isLightMode?: boolean;
  onToggleReaction: (emoji: string) => void;
  disabled?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

const checkIsLightMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const html = document.documentElement;
  return (
    html.classList.contains('light') ||
    html.classList.contains('contrast-high-light') ||
    html.classList.contains('admin-light-mode') ||
    localStorage.getItem('theme') === 'light'
  );
};

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions = {},
  currentUser,
  isLightMode: propIsLightMode,
  onToggleReaction,
  disabled = false,
  align = 'left',
  className = '',
}) => {
  const [localIsLight, setLocalIsLight] = useState<boolean>(() => checkIsLightMode());

  useEffect(() => {
    const updateTheme = () => {
      setLocalIsLight(checkIsLightMode());
    };

    updateTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });

    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true });
    }

    window.addEventListener('theme-change', updateTheme);
    window.addEventListener('dashboard-theme-change', updateTheme);
    window.addEventListener('storage', updateTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('theme-change', updateTheme);
      window.removeEventListener('dashboard-theme-change', updateTheme);
      window.removeEventListener('storage', updateTheme);
    };
  }, []);

  const isLightMode = propIsLightMode !== undefined ? propIsLightMode : localIsLight;

  const [showPicker, setShowPicker] = useState(false);
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const [pickerCoords, setPickerCoords] = useState<{ top: number; left: number } | null>(null);
  
  const pickerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position the 2-row reaction picker shifted slightly left of center in the chat room container via Portal
  const updatePlacement = useCallback(() => {
    if (!pickerRef.current) return;
    const triggerRect = pickerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (triggerRect.bottom < 0 || triggerRect.top > viewportHeight) {
      setShowPicker(false);
      return;
    }
    
    // Find closest bounded chat container (like ChatSidebar or Admin Chat)
    const container = pickerRef.current.closest('.front-chat-sidebar') || 
                      pickerRef.current.closest('.admin-chat-container') ||
                      pickerRef.current.closest('[class*="chat"]') ||
                      document.body;
    
    const containerRect = container ? container.getBoundingClientRect() : { left: 0, right: viewportWidth, width: viewportWidth, top: 0, bottom: viewportHeight };

    // Calculate horizontal placement shifted slightly to the left (-32px from container center)
    let targetX = (containerRect.left + containerRect.width / 2) - 32;
    // Safety clamp: keep within viewport with padding for the ~200px wide popover
    targetX = Math.max(110, Math.min(viewportWidth - 110, targetX));

    // Vertical placement for 2-row container (~84px height)
    let topY = triggerRect.top - 94;
    if (topY < 60) {
      topY = triggerRect.bottom + 8;
    }

    setPickerCoords({ top: topY, left: targetX });
  }, []);

  useLayoutEffect(() => {
    if (showPicker) {
      updatePlacement();
      const timer = requestAnimationFrame(() => {
        updatePlacement();
      });
      window.addEventListener('resize', updatePlacement);
      window.addEventListener('scroll', updatePlacement, true);
      return () => {
        cancelAnimationFrame(timer);
        window.removeEventListener('resize', updatePlacement);
        window.removeEventListener('scroll', updatePlacement, true);
      };
    }
  }, [showPicker, updatePlacement]);

  // Close picker on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideTrigger = pickerRef.current && pickerRef.current.contains(target);
      const isInsidePopover = popoverRef.current && popoverRef.current.contains(target);
      if (!isInsideTrigger && !isInsidePopover) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const activeReactions: [string, string[]][] = Object.entries(reactions || {}).filter(
    (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
  );

  const hasAnyReactions = activeReactions.length > 0;
  const currentUsernameLower = (currentUser || '').trim().toLowerCase();

  return (
    <div className={`relative flex flex-wrap items-center gap-1.5 pt-1.5 select-none ${className}`}>
      {/* Existing Reaction Badges */}
      <AnimatePresence mode="popLayout">
        {activeReactions.map(([emoji, users]) => {
          const hasReacted = Boolean(
            currentUsernameLower &&
              users.some(u => u.toLowerCase() === currentUsernameLower)
          );
          const count = users.length;
          const userTooltipList = users
            .map(u => (currentUsernameLower && u.toLowerCase() === currentUsernameLower ? 'You' : u))
            .join(', ');

          return (
            <div key={emoji} className="relative group/pill">
              <motion.button
                type="button"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                disabled={disabled}
                onClick={() => onToggleReaction(emoji)}
                onMouseEnter={() => setHoveredEmoji(emoji)}
                onMouseLeave={() => setHoveredEmoji(null)}
                style={{
                  backgroundColor: hasReacted
                    ? (isLightMode ? '#f3e8ff' : 'rgba(176, 38, 255, 0.25)')
                    : (isLightMode ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)'),
                  borderColor: hasReacted
                    ? (isLightMode ? '#c084fc' : 'rgba(176, 38, 255, 0.7)')
                    : (isLightMode ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'),
                  color: hasReacted
                    ? (isLightMode ? '#581c87' : '#ffffff')
                    : (isLightMode ? '#334155' : 'rgba(255, 255, 255, 0.85)'),
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-xs"
                title={userTooltipList}
              >
                <span className="text-sm leading-none">{emoji}</span>
                <span 
                  className={`text-[10px] tracking-tight ${
                    hasReacted 
                      ? (isLightMode ? 'text-purple-900 font-black' : 'text-neon-pink font-bold') 
                      : (isLightMode ? 'text-slate-600 font-medium' : 'text-white/70 font-medium')
                  }`}
                >
                  {count}
                </span>
              </motion.button>

              {/* Hover Tooltip showing user names */}
              <AnimatePresence>
                {hoveredEmoji === emoji && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      backgroundColor: isLightMode ? '#ffffff' : '#0F111D',
                      borderColor: isLightMode ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)',
                      color: isLightMode ? '#0f172a' : '#ffffff',
                      boxShadow: isLightMode ? '0 8px 24px rgba(0, 0, 0, 0.12)' : '0 4px 20px rgba(0, 0, 0, 0.6)',
                    }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap z-50 pointer-events-none border backdrop-blur-md"
                  >
                    <span className="font-semibold text-neon-purple mr-1">{emoji}</span>
                    <span className="font-medium">{userTooltipList}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </AnimatePresence>

      {/* Add Reaction Button (Pill or Icon Trigger) */}
      <div className="relative" ref={pickerRef}>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          disabled={disabled}
          onClick={() => setShowPicker(!showPicker)}
          style={{
            backgroundColor: hasAnyReactions
              ? (isLightMode ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)')
              : 'transparent',
            borderColor: hasAnyReactions
              ? (isLightMode ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)')
              : 'transparent',
            color: isLightMode ? '#64748b' : 'rgba(255, 255, 255, 0.6)',
          }}
          className={`flex items-center justify-center rounded-full transition-all cursor-pointer ${
            hasAnyReactions
              ? 'w-6 h-6 border'
              : 'w-6 h-6 opacity-50 hover:opacity-100'
          }`}
          title="Add Reaction"
        >
          <Smile className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* 2-Row Reaction Popover Rendered via Portal Directly into document.body */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showPicker && pickerCoords && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, scale: 0.85, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 6 }}
                transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                style={{
                  position: 'fixed',
                  left: `${pickerCoords.left}px`,
                  top: `${pickerCoords.top}px`,
                  transform: 'translateX(-50%)',
                  zIndex: 999999,
                  backgroundColor: isLightMode ? '#ffffff' : '#121424',
                  borderColor: isLightMode ? '#e2e8f0' : 'rgba(255, 255, 255, 0.15)',
                  boxShadow: isLightMode 
                    ? '0 16px 40px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)' 
                    : '0 12px 40px rgba(0, 0, 0, 0.8)',
                }}
                className="p-1.5 rounded-2xl grid grid-cols-5 gap-1.5 border backdrop-blur-xl shadow-2xl pointer-events-auto select-none"
              >
                {COMMON_REACTIONS.map(emoji => {
                  const isReacted = currentUsernameLower && reactions[emoji]?.some(u => u.toLowerCase() === currentUsernameLower);
                  return (
                    <motion.button
                      key={emoji}
                      type="button"
                      whileHover={{ scale: 1.25, y: -1.5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleReaction(emoji);
                        setShowPicker(false);
                      }}
                      style={{
                        backgroundColor: isReacted
                          ? (isLightMode ? '#f3e8ff' : 'rgba(176, 38, 255, 0.3)')
                          : undefined,
                        outline: isReacted
                          ? (isLightMode ? '1.5px solid #c084fc' : '1.5px solid #b026ff')
                          : undefined,
                      }}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-base sm:text-lg transition-colors shrink-0 cursor-pointer ${
                        isReacted
                          ? ''
                          : isLightMode
                            ? 'hover:bg-slate-100 text-slate-800'
                            : 'hover:bg-white/10 text-white'
                      }`}
                    >
                      {emoji}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
