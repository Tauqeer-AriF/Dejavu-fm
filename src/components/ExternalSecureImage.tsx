import React, { useState } from "react";
import { Lock, ExternalLink } from "lucide-react";

interface ExternalSecureImageProps {
  src?: string;
  alt?: string;
  className?: string;
  maxHeight?: string;
}

const getSecureImageUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/public/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export function ExternalSecureImage({
  src,
  alt = "Attached Image",
  className = "max-h-60 object-contain mx-auto",
  maxHeight = "max-h-60"
}: ExternalSecureImageProps) {
  const [isError, setIsError] = useState(false);
  const [triedDirect, setTriedDirect] = useState(false);

  if (!src) return null;

  const handleViewOriginal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(src, "_blank", "noopener,noreferrer");
  };

  if (isError) {
    return (
      <div className={`p-4 rounded-xl border border-white/10 bg-black/40 flex flex-col items-center justify-center text-center space-y-2 select-none my-2 ${maxHeight}`}>
        <div className="w-10 h-10 rounded-full bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center text-neon-purple">
          <Lock className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-white/90 uppercase tracking-wider">Protected Sandbox Asset</p>
          <p className="text-[10px] text-white/50 max-w-[220px] mx-auto leading-normal">
            This image is hosted on a secure developer environment. Click below to authorize and view it.
          </p>
        </div>
        <button
          onClick={handleViewOriginal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-purple hover:bg-neon-purple-hover text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          View Secure Image
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  const secureSrc = getSecureImageUrl(src);

  return (
    <img
      src={secureSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={(e) => {
        const target = e.currentTarget;
        if (!triedDirect && secureSrc && target.src !== src) {
          setTriedDirect(true);
          target.src = src || "";
        } else {
          setIsError(true);
        }
      }}
    />
  );
}
