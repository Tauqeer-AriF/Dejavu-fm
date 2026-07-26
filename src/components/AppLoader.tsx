import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { useLogo } from "../hooks/useLogo";
// @ts-ignore
import defaultGlitchLogo from "../assets/images/dejavufm_glitch_logo_1784796255055.png";

interface AppLoaderProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export function AppLoader({ size = "lg", fullScreen = false }: AppLoaderProps) {
  const { logoUrl, isLightMode, settings } = useLogo();
  const [hasError, setHasError] = useState(false);

  const displayLogo = (!hasError && logoUrl) ? logoUrl : defaultGlitchLogo;

  // Determine if we need to invert the logo in light mode
  // We invert if it's the default logo, or if the user is using the same logo for light and dark modes
  const isDefaultGlitch = displayLogo === defaultGlitchLogo || 
    (typeof displayLogo === "string" && displayLogo.toLowerCase().includes("dejavufm_glitch_logo"));
  
  const hasSameLogoForBoth = settings && settings.logo_light && settings.logo_light === settings.logo_dark;
  const isFallbackLogo = settings && !settings.logo_light && settings.logo_url;
  
  const shouldInvert = isLightMode && (isDefaultGlitch || hasSameLogoForBoth || isFallbackLogo);

  const imageSizes = {
    sm: "w-32 sm:w-40",
    md: "w-48 sm:w-56",
    lg: "w-64 sm:w-80 md:w-96",
  }[size];

  const loaderContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center gap-8"
    >
      {/* Glow behind brand logo */}
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{
            scale: [0.95, 1.08, 0.95],
            opacity: isLightMode ? [0.1, 0.25, 0.1] : [0.2, 0.45, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`absolute -inset-4 rounded-full blur-2xl pointer-events-none ${isLightMode ? 'bg-neon-purple/20' : 'bg-neon-purple/30'}`}
        />

        {/* Main Brand Logo */}
        <motion.img
          animate={{
            scale: [0.98, 1.02, 0.98],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          src={displayLogo}
          alt="dejavufm"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className={`${imageSizes} h-auto object-contain relative z-10`}
          style={{
            filter: shouldInvert
              ? "invert(1) drop-shadow(0px 0px 15px rgba(168, 85, 247, 0.2))"
              : "drop-shadow(0px 0px 20px rgba(168, 85, 247, 0.35))"
          }}
        />
      </div>
    </motion.div>
  );

  if (fullScreen) {
    return createPortal(
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 select-none transition-colors duration-300 ${
          isLightMode ? "bg-[#f8fafc] text-slate-900" : "bg-[#070913] text-white"
        }`}
      >
        {loaderContent}
      </div>,
      document.body
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 min-h-[300px] w-full select-none ${
        isLightMode ? "text-slate-900" : "text-white"
      }`}
    >
      {loaderContent}
    </div>
  );
}



