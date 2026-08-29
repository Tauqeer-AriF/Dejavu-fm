import React, { useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Music2,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Layers,
  Smartphone,
  Eye,
  Disc3,
  Film,
  Zap,
  Activity
} from "lucide-react";
import { AIReel } from "./types";

export type StudioVisualFX = "clean" | "vhs" | "cyberpunk" | "analog";

interface PhonePreviewFrameProps {
  reel: AIReel;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentTime: number;
  duration: number;
  selectedAspect: string;
  isLight?: boolean;
}

export const StudioPhonePreviewFrame: React.FC<PhonePreviewFrameProps> = ({
  reel,
  videoRef,
  isPlaying,
  onTogglePlay,
  isMuted,
  onToggleMute,
  currentTime,
  duration,
  selectedAspect,
  isLight = false,
}) => {
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showSocialUI, setShowSocialUI] = useState(true);
  const [activeFX, setActiveFX] = useState<StudioVisualFX>("clean");
  const [showVinylHub, setShowVinylHub] = useState(true);

  // Dynamic filter classes based on active visual FX
  const getFilterStyle = () => {
    switch (activeFX) {
      case "vhs":
        return "contrast-125 saturate-150 brightness-95";
      case "cyberpunk":
        return "saturate-200 contrast-115 hue-rotate-15";
      case "analog":
        return "sepia-20 saturate-110 contrast-105 brightness-105";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
      {/* Studio Stage Controls & Visual FX Selector */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-full">
        <button
          onClick={() => setShowSocialUI(!showSocialUI)}
          className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold border flex items-center gap-1 sm:gap-1.5 transition ${
            showSocialUI
              ? "bg-neon-purple text-white border-neon-purple shadow-sm shadow-neon-purple/30"
              : isLight
              ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              : "bg-white/5 border-white/10 text-white/70 hover:text-white"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          {showSocialUI ? "Social Overlay" : "Clean Video"}
        </button>

        <button
          onClick={() => setShowSafeZones(!showSafeZones)}
          className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold border flex items-center gap-1 sm:gap-1.5 transition ${
            showSafeZones
              ? "bg-amber-500 text-black border-amber-400 shadow-sm"
              : isLight
              ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              : "bg-white/5 border-white/10 text-white/70 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {showSafeZones ? "Safe Zones" : "Check Bounds"}
        </button>

        {/* Visual Grading Presets */}
        <div className={`flex items-center gap-0.5 p-0.5 sm:p-1 rounded-xl border ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-black/40 border-white/10"
        }`}>
          {(["clean", "cyberpunk", "vhs", "analog"] as StudioVisualFX[]).map((fx) => (
            <button
              key={fx}
              onClick={() => setActiveFX(fx)}
              className={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase transition ${
                activeFX === fx
                  ? "bg-neon-blue text-black font-black shadow-xs"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {fx}
            </button>
          ))}
        </div>
      </div>

      {/* Outer Studio Glow + Phone Bezel */}
      <div className="relative group max-w-full flex justify-center">
        {/* Dynamic Backstage Ambient Glow */}
        <div className={`absolute -inset-4 rounded-[3rem] blur-2xl transition-all duration-700 pointer-events-none ${
          activeFX === 'cyberpunk'
            ? 'bg-gradient-to-r from-neon-purple/50 via-neon-blue/50 to-pink-500/40 opacity-90'
            : activeFX === 'analog'
            ? 'bg-gradient-to-r from-amber-500/40 via-orange-500/30 to-yellow-600/30 opacity-75'
            : 'bg-gradient-to-r from-neon-purple/30 via-neon-blue/30 to-amber-500/20 opacity-60'
        } group-hover:opacity-100`} />

        {/* Realistic Smartphone Chassis */}
        <div className={`relative ${
          selectedAspect === '1:1' ? 'w-[260px] h-[260px] xs:w-[300px] xs:h-[300px] sm:w-[320px] sm:h-[320px] rounded-3xl' :
          selectedAspect === '16:9' ? 'w-[290px] h-[163px] xs:w-[340px] xs:h-[191px] sm:w-[380px] sm:h-[214px] rounded-3xl' :
          'w-[250px] h-[480px] xs:w-[275px] xs:h-[530px] sm:w-[300px] sm:h-[580px] rounded-[2.2rem] sm:rounded-[2.5rem]'
        } p-2 bg-gradient-to-b from-slate-700 via-slate-900 to-black border-[3px] border-slate-600/80 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.4)] flex flex-col justify-between overflow-hidden shrink-0`}>
          
          {/* Inner Phone Screen */}
          <div className="relative w-full h-full bg-black rounded-[2rem] overflow-hidden flex items-center justify-center select-none">
            
            {/* Dynamic Island / Top Speaker Notch */}
            <div className="absolute top-2.5 inset-x-0 mx-auto w-24 h-4 bg-black rounded-full z-40 flex items-center justify-center gap-2 border border-white/10 pointer-events-none shadow-md">
              <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
            </div>

            {/* Video Element with Dynamic Visual FX */}
            <div className={`w-full h-full relative ${getFilterStyle()}`}>
              {reel.video_url ? (
                <video
                  key={reel.video_url}
                  ref={videoRef}
                  src={reel.video_url}
                  poster={reel.thumbnail_url || undefined}
                  playsInline
                  loop
                  className="w-full h-full object-cover"
                  onClick={onTogglePlay}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-xs font-sans font-medium text-white/40 p-4 text-center bg-zinc-950">
                  <Radio className="w-8 h-8 text-neon-purple animate-pulse" />
                  <span>Video Rendering in Progress...</span>
                </div>
              )}
            </div>

            {/* VHS Scanline Overlay */}
            {activeFX === "vhs" && (
              <div className="absolute inset-0 pointer-events-none z-20 opacity-35 mix-blend-overlay bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
            )}

            {/* Cyberpunk Optical Flare Vignette */}
            {activeFX === "cyberpunk" && (
              <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_80px_rgba(176,38,255,0.45)]" />
            )}

            {/* Analog Warm Glow & Grain */}
            {activeFX === "analog" && (
              <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_60px_rgba(245,158,11,0.35)] bg-amber-500/5 mix-blend-color-burn" />
            )}

            {/* Tap to Play / Pause Central Overlay */}
            <button
              onClick={onTogglePlay}
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/10 hover:bg-black/30 transition-all z-20 group/playbtn"
            >
              <div className={`w-14 h-14 rounded-full bg-neon-purple/90 text-white flex items-center justify-center shadow-xl shadow-neon-purple/50 transition-all transform ${
                isPlaying ? 'opacity-0 scale-75 group-hover/playbtn:opacity-100 group-hover/playbtn:scale-100' : 'opacity-100 scale-100'
              }`}>
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white ml-1" />}
              </div>
            </button>

            {/* Social Media Interface Mockup (TikTok / Reels / Shorts style) */}
            {showSocialUI && selectedAspect === '9:16' && (
              <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-3.5 pb-4">
                {/* Top Live Badges */}
                <div className="pt-4 flex items-center justify-between text-white drop-shadow-md">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>REC ● ON AIR 92.3</span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMute();
                    }}
                    className="pointer-events-auto p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-black/80 transition"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>

                {/* Right Floating Social Metrics Sidebar */}
                <div className="self-end flex flex-col items-center gap-3 mb-2">
                  {/* DJ Avatar */}
                  <div className="w-8 h-8 rounded-full border-2 border-neon-purple bg-zinc-800 flex items-center justify-center text-xs font-black shadow-lg overflow-hidden">
                    <Radio className="w-3.5 h-3.5 text-neon-purple" />
                  </div>

                  {/* Likes */}
                  <div className="flex flex-col items-center gap-0.5 drop-shadow-md text-white">
                    <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                    </div>
                    <span className="text-[9px] font-bold">14.2k</span>
                  </div>

                  {/* Comments */}
                  <div className="flex flex-col items-center gap-0.5 drop-shadow-md text-white">
                    <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <MessageCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[9px] font-bold">842</span>
                  </div>

                  {/* Share */}
                  <div className="flex flex-col items-center gap-0.5 drop-shadow-md text-white">
                    <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <Share2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[9px] font-bold">2.4k</span>
                  </div>

                  {/* Luxury Spinning Audio Vinyl Platter with DJ Station Label & Tonearm */}
                  <div className="relative group/platter">
                    {/* Audio-Reactive Ambient Backlight Halo */}
                    <div className={`absolute -inset-1 rounded-full blur-sm opacity-80 transition-all ${
                      isPlaying ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-neon-purple animate-pulse' : 'bg-amber-500/30'
                    }`} />
                    
                    {/* Rotating Vinyl Platter Body */}
                    <div className={`relative w-8 h-8 rounded-full bg-zinc-950 border-[1.5px] border-amber-400/90 shadow-2xl flex items-center justify-center overflow-hidden ${
                      isPlaying ? 'animate-spin' : ''
                    }`} style={{ animationDuration: '3.33s' }}>
                      {/* Concentric Grooves */}
                      <div className="absolute inset-0.5 rounded-full border border-white/10" />
                      <div className="absolute inset-1 rounded-full border border-white/20" />
                      <div className="absolute inset-1.5 rounded-full border border-white/10" />
                      
                      {/* Butterfly Light Reflection Sheen */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/25 via-transparent to-amber-300/20 pointer-events-none" />

                      {/* Center Label Badge */}
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-600 via-orange-600 to-black border border-amber-300 flex items-center justify-center shadow-inner">
                        <span className="text-[5px] font-black text-amber-200 tracking-tighter select-none">
                          92.3
                        </span>
                      </div>
                    </div>

                    {/* Miniature Metallic Tonearm Pivot & Stylus resting on Record */}
                    <div className="absolute -top-1 -right-1 pointer-events-none drop-shadow-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-600" />
                      <div className="w-3 h-[1.5px] bg-gradient-to-r from-slate-200 to-amber-400 origin-top-right transform -rotate-45 translate-x-[-1px] translate-y-[2px]" />
                    </div>
                  </div>
                </div>

                {/* Bottom Show Info & Captions with Dynamic Font-Scaling & Refined Semi-Transparent Backdrop */}
                <div className="space-y-1.5 mb-1 pr-8 text-left drop-shadow-xl">
                  {/* Creator Pill Overlay with Dynamic Sizing & Backdrop */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 shadow-lg max-w-full">
                    <span className={`font-display font-black tracking-wide text-white truncate ${
                      (reel.dj_name || '').length > 20 ? 'text-[10px]' : (reel.dj_name || '').length > 14 ? 'text-[10px]' : 'text-[11px]'
                    }`}>
                      @{reel.dj_name?.toLowerCase().replace(/\s+/g, '') || 'dejavufm'}
                    </span>
                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-neon-purple to-neon-blue text-[7.5px] font-display font-black rounded-md uppercase text-black shrink-0 tracking-wider shadow-sm">
                      VERIFIED DJ
                    </span>
                  </div>
                  
                  {/* Dynamic Font-Scaled Hook Capsule with Refined Frosted Glass Backdrop */}
                  {reel.hook ? (
                    <div className="rounded-xl p-2 bg-black/70 backdrop-blur-lg border border-white/25 shadow-xl max-w-full">
                      <p className={`font-display font-black leading-tight tracking-tight text-white ${
                        reel.hook.length > 60
                          ? 'text-[9.5px]'
                          : reel.hook.length > 35
                          ? 'text-[10.5px]'
                          : reel.hook.length > 20
                          ? 'text-[11px]'
                          : 'text-xs'
                      }`}>
                        "{reel.hook}"
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg px-2 py-1 bg-black/65 backdrop-blur-md border border-white/15 shadow-md">
                      <p className="text-[10px] font-sans text-white/95 font-medium line-clamp-2 leading-snug">
                        {reel.title}
                      </p>
                    </div>
                  )}

                  {/* Station / Show Name Badge */}
                  <div className="flex items-center gap-1.5 text-[8.5px] font-sans font-medium text-neon-blue bg-black/70 backdrop-blur-md border border-white/15 px-2 py-0.5 rounded-lg w-fit shadow-md">
                    <Music2 className="w-2.5 h-2.5 text-neon-purple shrink-0" />
                    <span className="truncate max-w-[170px] font-semibold">{reel.show_name || 'DejavuFM London Underground'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Social Media Safe-Zone Guidelines (TikTok / Reels safe margins) */}
            {showSafeZones && (
              <div className="absolute inset-0 z-40 pointer-events-none border-2 border-dashed border-amber-400/80 bg-amber-500/10 flex flex-col justify-between p-4">
                <div className="px-2 py-1 bg-amber-500 text-black text-[9px] font-mono font-bold rounded w-fit self-center">
                  TOP HEADER SAFE (120px)
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-amber-300 font-bold px-1">
                  <span>LEFT MARGIN</span>
                  <span>BUTTONS ZONE</span>
                </div>
                <div className="px-2 py-1 bg-amber-500 text-black text-[9px] font-mono font-bold rounded w-fit self-center">
                  BOTTOM CAPTIONS SAFE (180px)
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
