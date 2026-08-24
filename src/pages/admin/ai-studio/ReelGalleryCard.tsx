import React from "react";
import { CheckSquare, Square, Play, Flame, Radio, Music2 } from "lucide-react";
import { AIReel, ReelCategory, ReelStatus } from "./types";

interface ReelGalleryCardProps {
  reel: AIReel;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: (e: React.MouseEvent) => void;
  getCategoryColor: (cat: ReelCategory) => string;
  getStatusBadge: (st: ReelStatus) => React.ReactNode;
  isLight?: boolean;
}

export const ReelGalleryCard: React.FC<ReelGalleryCardProps> = ({
  reel,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  getCategoryColor,
  getStatusBadge,
  isLight = false,
}) => {
  const viralityPercent = reel.virality_score || 85;
  const isHighVirality = viralityPercent >= 90;

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer relative group ${
        isSelected
          ? isLight
            ? "bg-gradient-to-r from-neon-purple/10 to-neon-blue/5 border-neon-purple shadow-md shadow-neon-purple/10 ring-1 ring-neon-purple"
            : "bg-gradient-to-r from-neon-purple/20 to-neon-blue/10 border-neon-purple shadow-xl shadow-neon-purple/15 ring-1 ring-neon-purple/60"
          : isLight
          ? "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs"
          : "bg-black/30 border-white/10 hover:border-white/25 hover:bg-white/5"
      }`}
    >
      {/* Checkbox Multi-Select */}
      <div
        onClick={onToggleCheck}
        className="absolute top-3 right-3 z-10 p-1 hover:scale-110 transition"
      >
        {isChecked ? (
          <CheckSquare className="w-4 h-4 text-neon-purple fill-neon-purple/20" />
        ) : (
          <Square className={`w-4 h-4 ${isLight ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white"}`} />
        )}
      </div>

      <div className="flex gap-3.5 items-center">
        {/* 9:16 Video Thumbnail Container with Hover Ripple */}
        <div className={`w-20 h-32 rounded-xl border overflow-hidden relative flex-shrink-0 flex items-center justify-center group-hover:shadow-md transition ${
          isLight ? "bg-slate-900 border-slate-200" : "bg-black/60 border-white/10"
        }`}>
          {reel.thumbnail_url ? (
            <img
              src={reel.thumbnail_url}
              alt={reel.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <div className="text-[10px] font-sans text-white/40 text-center p-1">9:16 Preview</div>
          )}

          {/* Center Play Button on hover */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-[1px]">
            <div className="w-8 h-8 rounded-full bg-neon-purple text-white flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
          </div>

          {/* Duration Badge */}
          <div className="absolute bottom-1 right-1 bg-black/85 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold text-white/90 shadow">
            {Math.round(reel.duration_seconds)}s
          </div>

          {/* Format Badge */}
          {reel.aspect_ratio && reel.aspect_ratio !== '9:16' && (
            <div className="absolute top-1 left-1 bg-neon-purple/90 px-1 py-0.5 rounded text-[9px] font-sans font-bold text-white">
              {reel.aspect_ratio}
            </div>
          )}
        </div>

        {/* Reel Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 pr-5 space-y-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryColor(reel.category)}`}>
                {reel.category}
              </span>
              {getStatusBadge(reel.status)}
            </div>

            <h4 className={`font-display font-bold text-sm line-clamp-1 group-hover:text-neon-purple transition ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              {reel.title}
            </h4>

            {reel.hook ? (
              <p className={`text-xs font-sans font-semibold line-clamp-1 mt-0.5 ${
                isLight ? "text-cyan-800 font-bold" : "text-neon-blue"
              }`}>
                "{reel.hook}"
              </p>
            ) : null}

            <div className={`text-[11px] flex items-center gap-2 mt-1 ${
              isLight ? "text-slate-500" : "text-white/40"
            }`}>
              <span className="truncate">{reel.dj_name}</span>
              <span>•</span>
              <span className="truncate">{reel.show_name}</span>
            </div>
          </div>

          {/* Footer Metrics with Virality Score Meter */}
          <div className={`flex items-center justify-between pt-2 border-t ${
            isLight ? "border-slate-100" : "border-white/5"
          }`}>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${
              isHighVirality 
                ? "text-rose-500" 
                : isLight ? "text-amber-600" : "text-amber-400"
            }`}>
              <Flame className={`w-3.5 h-3.5 ${isHighVirality ? "fill-rose-500 animate-bounce" : "fill-current"}`} />
              <span>Virality: {viralityPercent}%</span>
            </div>

            <span className={`text-[10px] font-mono ${
              isLight ? "text-slate-400" : "text-white/30"
            }`}>
              {new Date(reel.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
