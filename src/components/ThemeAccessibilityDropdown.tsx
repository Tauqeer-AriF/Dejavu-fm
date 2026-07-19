import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sun, 
  Moon, 
  Eye, 
  Check, 
  RefreshCw, 
  ZoomIn, 
  Sparkles, 
  HelpCircle, 
  Settings, 
  Type, 
  VolumeX 
} from "lucide-react";
import { useLogo } from "../hooks/useLogo";

export type ContrastMode = "standard" | "high-dark" | "high-light" | "neon";
export type TextSize = "normal" | "large" | "extra";

export function ThemeAccessibilityDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ContrastMode>("standard");
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Grab active theme state from application settings & observer
  const { isLightMode } = useLogo();

  // Load saved preferences on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const savedMode = localStorage.getItem("contrast_mode") as ContrastMode;
    if (savedMode) {
      setMode(savedMode);
      applyContrastMode(savedMode);
    }

    const savedTextSize = localStorage.getItem("accessibility_text_size") as TextSize;
    if (savedTextSize) {
      setTextSize(savedTextSize);
      applyTextSize(savedTextSize);
    }

    const savedDyslexic = localStorage.getItem("accessibility_dyslexic") === "true";
    if (savedDyslexic) {
      setDyslexicFont(savedDyslexic);
      applyDyslexicFont(savedDyslexic);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const applyContrastMode = (newMode: ContrastMode) => {
    const html = document.documentElement;
    // Remove all previous classes
    html.classList.remove("contrast-high-dark", "contrast-high-light", "contrast-neon", "light");
    
    if (newMode === "high-dark") {
      html.classList.add("contrast-high-dark");
      localStorage.setItem("theme", "dark");
    } else if (newMode === "high-light") {
      html.classList.add("contrast-high-light", "light");
      localStorage.setItem("theme", "light");
    } else if (newMode === "neon") {
      html.classList.add("contrast-neon");
      localStorage.setItem("theme", "dark");
    } else {
      // Standard
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "light") {
        html.classList.add("light");
      } else {
        localStorage.setItem("theme", "dark"); // Default theme is dark
      }
    }

    // Dispatch theme event so components sync up instantly
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("theme-change"));
  };

  const applyTextSize = (size: TextSize) => {
    const html = document.documentElement;
    html.classList.remove("text-size-normal", "text-size-large", "text-size-extra");
    if (size === "large") {
      html.classList.add("text-size-large");
    } else if (size === "extra") {
      html.classList.add("text-size-extra");
    } else {
      html.classList.add("text-size-normal");
    }
  };

  const applyDyslexicFont = (enabled: boolean) => {
    const html = document.documentElement;
    if (enabled) {
      html.classList.add("accessibility-dyslexic");
    } else {
      html.classList.remove("accessibility-dyslexic");
    }
  };

  const toggleTheme = () => {
    const next = !isLightMode;
    const html = document.documentElement;
    
    // Set contrast mode back to standard if we toggle manually
    setMode("standard");
    localStorage.removeItem("contrast_mode");
    html.classList.remove("contrast-high-dark", "contrast-high-light", "contrast-neon");

    if (next) {
      html.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("theme-change"));
  };

  const handleModeChange = (newMode: ContrastMode) => {
    setMode(newMode);
    localStorage.setItem("contrast_mode", newMode);
    applyContrastMode(newMode);
  };

  const handleTextSizeChange = (newSize: TextSize) => {
    setTextSize(newSize);
    localStorage.setItem("accessibility_text_size", newSize);
    applyTextSize(newSize);
  };

  const handleDyslexicChange = () => {
    const nextVal = !dyslexicFont;
    setDyslexicFont(nextVal);
    localStorage.setItem("accessibility_dyslexic", String(nextVal));
    applyDyslexicFont(nextVal);
  };

  const handleReset = () => {
    setMode("standard");
    setTextSize("normal");
    setDyslexicFont(false);
    
    localStorage.removeItem("contrast_mode");
    localStorage.removeItem("accessibility_text_size");
    localStorage.removeItem("accessibility_dyslexic");
    
    const html = document.documentElement;
    html.classList.remove(
      "contrast-high-dark",
      "contrast-high-light",
      "contrast-neon",
      "text-size-large",
      "text-size-extra",
      "accessibility-dyslexic",
      "light"
    );
    localStorage.setItem("theme", "dark");
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("theme-change"));
  };

  const handleHardReset = () => {
    localStorage.removeItem("theme");
    localStorage.removeItem("default_theme_fallback");
    window.location.reload();
  };

  const isWidgetLight = isLightMode || mode === "high-light";

  return (
    <div className="relative font-sans select-none shrink-0" ref={dropdownRef}>
      {/* Header Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center p-2.5 rounded-full border transition-all duration-200 focus:outline-none shrink-0 ${
          mode === "neon"
            ? "bg-black text-[#00ffcc] border-[#00ffcc] shadow-[0_0_10px_rgba(0,255,204,0.3)]"
            : mode === "high-dark"
            ? "bg-black text-white border-white border-2"
            : mode === "high-light"
            ? "bg-[#ffffff] text-black border-black border-2"
            : isWidgetLight
            ? "bg-[#ffffff] text-slate-800 border-slate-200 hover:bg-slate-50 hover:text-black shadow-sm"
            : "text-white/60 hover:text-white bg-white/5 border border-white/5"
        }`}
        title="Theme & Accessibility Options"
        id="theme-accessibility-trigger"
      >
        {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </motion.button>

      {/* Dropdown Menu Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{ 
              backgroundColor: mode === "high-light" ? "#ffffff" : mode === "high-dark" || mode === "neon" ? "#000000" : isWidgetLight ? "#ffffff" : undefined
            }}
            className={`absolute right-[-56px] sm:right-0 top-[calc(100%+12px)] w-[calc(100vw-32px)] sm:w-80 rounded-3xl p-5 border shadow-2xl flex flex-col gap-4 backdrop-blur-3xl z-[1001] ${
              mode === "high-light"
                ? "bg-[#ffffff] text-black border-black"
                : mode === "high-dark"
                ? "bg-black text-white border-white"
                : mode === "neon"
                ? "bg-black text-[#00ffcc] border-[#00ffcc] shadow-[0_0_20px_rgba(0,255,204,0.2)]"
                : isWidgetLight
                ? "bg-[#ffffff] text-slate-900 border-slate-200 shadow-[0_15px_40px_rgba(0,0,0,0.12)]"
                : "bg-[#090a10] text-white border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.5)]"
            }`}
          >
            {/* Header / Reset */}
            <div className={`flex items-center justify-between border-b pb-3 ${
              isWidgetLight ? "border-slate-100" : "border-white/10"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  isWidgetLight ? "bg-neon-purple/10 text-neon-purple" : "bg-neon-purple/20 text-neon-purple"
                }`}>
                  <Eye className="w-4 h-4" />
                </div>
                <h4 className={`text-xs font-black uppercase tracking-widest ${
                  isWidgetLight ? "text-slate-800" : "text-white"
                }`}>
                  Accessibility Hub
                </h4>
              </div>
              <button 
                onClick={handleReset}
                className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider transition-colors ${
                  isWidgetLight ? "text-slate-500 hover:text-slate-950" : "text-white/40 hover:text-white"
                }`}
                title="Reset accessibility options"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Core Theme Toggle Mode */}
            <div className="space-y-2">
              <span className={`text-[9px] uppercase font-black tracking-widest block ml-1 ${
                isWidgetLight ? "text-slate-500" : "text-white/40"
              }`}>
                Standard Theme Toggler
              </span>
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                  isWidgetLight
                    ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900"
                    : "bg-white/5 hover:bg-white/10 border-white/5 text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  {isLightMode ? (
                    <>
                      <Moon className="w-4 h-4 text-neon-purple" /> Switch to Dark Mode
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" /> Switch to Light Mode
                    </>
                  )}
                </span>
                <span className={`text-[9px] uppercase px-2 py-0.5 rounded ${
                  isWidgetLight ? "bg-slate-200 text-slate-700" : "bg-white/10 text-white/60"
                }`}>
                  Toggle
                </span>
              </button>
              
              <button
                onClick={handleHardReset}
                className={`w-full flex items-center justify-center gap-2 p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                  isWidgetLight
                    ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                    : "bg-white/5 hover:bg-white/10 border-white/5 text-white/50 hover:text-white"
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                Reset Theme to Default
              </button>
            </div>

            {/* Contrast Presets Grid */}
            <div className="space-y-2">
              <span className={`text-[9px] uppercase font-black tracking-widest block ml-1 ${
                isWidgetLight ? "text-slate-500" : "text-white/40"
              }`}>
                Contrast Preset
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* Standard Preset */}
                <button
                  onClick={() => handleModeChange("standard")}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-left border text-xs transition-all ${
                    mode === "standard"
                      ? isWidgetLight
                        ? "bg-slate-100 border-neon-purple text-slate-900 font-bold"
                        : "bg-white/10 border-neon-purple text-white font-bold"
                      : isWidgetLight
                      ? "bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100"
                      : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>Standard</span>
                  {mode === "standard" && <Check className="w-3.5 h-3.5 text-neon-purple" />}
                </button>

                {/* High Contrast Dark */}
                <button
                  onClick={() => handleModeChange("high-dark")}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-left border text-xs transition-all ${
                    mode === "high-dark"
                      ? "bg-black border-white text-white font-bold"
                      : isWidgetLight
                      ? "bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      : "bg-black/80 border-white/20 text-white/80 hover:bg-black hover:border-white"
                  }`}
                >
                  <span>High (Dark)</span>
                  {mode === "high-dark" && <Check className="w-3.5 h-3.5 text-white" />}
                </button>

                {/* High Contrast Light */}
                <button
                  onClick={() => handleModeChange("high-light")}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-left border text-xs transition-all ${
                    mode === "high-light"
                      ? "bg-[#ffffff] border-black text-black font-bold shadow-md"
                      : isWidgetLight
                      ? "bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      : "bg-[#ffffff]/80 border-black/20 text-black/80 hover:bg-[#ffffff] hover:border-black"
                  }`}
                >
                  <span>High (Light)</span>
                  {mode === "high-light" && <Check className="w-3.5 h-3.5 text-black" />}
                </button>

                {/* Neon Cyberpunk */}
                <button
                  onClick={() => handleModeChange("neon")}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-left border text-xs transition-all ${
                    mode === "neon"
                      ? "bg-black border-[#00ffcc] text-[#00ffcc] font-bold shadow-[0_0_10px_rgba(0,255,204,0.3)]"
                      : isWidgetLight
                      ? "bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      : "bg-black border-[#00ffcc]/30 text-white/80 hover:border-[#00ffcc] hover:text-[#00ffcc]"
                  }`}
                >
                  <span className="flex items-center gap-1">Neon <Sparkles className="w-3 h-3 text-neon-blue animate-pulse" /></span>
                  {mode === "neon" && <Check className="w-3.5 h-3.5 text-[#00ffcc]" />}
                </button>
              </div>
            </div>

            {/* Font Size Tuner */}
            <div className="space-y-2">
              <span className={`text-[9px] uppercase font-black tracking-widest block ml-1 ${
                isWidgetLight ? "text-slate-500" : "text-white/40"
              }`}>
                Text Scale
              </span>
              <div className={`flex rounded-xl p-1 border ${
                isWidgetLight ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"
              }`}>
                <button
                  onClick={() => handleTextSizeChange("normal")}
                  className={`flex-1 py-1.5 rounded-lg text-center text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    textSize === "normal"
                      ? isWidgetLight
                        ? "shadow-sm font-bold border border-slate-200/50"
                        : "bg-white/10 text-white shadow-sm"
                      : isWidgetLight
                      ? "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      : "text-white/50 hover:text-white"
                  }`}
                  style={textSize === "normal" && isWidgetLight ? { backgroundColor: '#ffffff', color: '#0f172a' } : undefined}
                >
                  <span className={textSize === "normal" && isWidgetLight ? "text-slate-900" : ""}>Normal</span>
                </button>
                <button
                  onClick={() => handleTextSizeChange("large")}
                  className={`flex-1 py-1.5 rounded-lg text-center text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    textSize === "large"
                      ? isWidgetLight
                        ? "shadow-sm font-bold border border-slate-200/50"
                        : "bg-white/10 text-white shadow-sm"
                      : isWidgetLight
                      ? "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      : "text-white/50 hover:text-white"
                  }`}
                  style={textSize === "large" && isWidgetLight ? { backgroundColor: '#ffffff', color: '#0f172a' } : undefined}
                >
                  <ZoomIn className={`w-3 h-3 ${textSize === "large" && isWidgetLight ? "text-slate-900" : ""}`} /> <span className={textSize === "large" && isWidgetLight ? "text-slate-900" : ""}>Large</span>
                </button>
                <button
                  onClick={() => handleTextSizeChange("extra")}
                  className={`flex-1 py-1.5 rounded-lg text-center text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    textSize === "extra"
                      ? isWidgetLight
                        ? "shadow-sm font-bold border border-slate-200/50"
                        : "bg-white/10 text-white shadow-sm"
                      : isWidgetLight
                      ? "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      : "text-white/50 hover:text-white"
                  }`}
                  style={textSize === "extra" && isWidgetLight ? { backgroundColor: '#ffffff', color: '#0f172a' } : undefined}
                >
                  <ZoomIn className={`w-3.5 h-3.5 ${textSize === "extra" && isWidgetLight ? "text-slate-900" : ""}`} /> <span className={textSize === "extra" && isWidgetLight ? "text-slate-900" : ""}>Huge</span>
                </button>
              </div>
            </div>

            {/* Dyslexia Aid */}
            <div className={`border p-3 rounded-2xl flex items-center justify-between ${
              isWidgetLight ? "bg-slate-50 border-slate-100" : "bg-white/5 border-white/5"
            }`}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-bold ${isWidgetLight ? "text-slate-800" : "text-white"}`}>
                    Dyslexia-Friendly
                  </span>
                  <HelpCircle className={`w-3 h-3 ${isWidgetLight ? "text-slate-400" : "text-white/40"}`} title="Uses OpenDyslexic-style structural weight to make reading easier." />
                </div>
                <p className={`text-[10px] leading-normal ${isWidgetLight ? "text-slate-500" : "text-white/40"}`}>
                  Reduces reading strain with high-contrast heavy-bottom fonts.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={dyslexicFont} 
                  onChange={handleDyslexicChange} 
                  className="sr-only peer"
                />
                <div className={`w-9 h-5 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neon-purple ${
                  isWidgetLight ? "bg-slate-200" : "bg-white/10"
                }`}></div>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
