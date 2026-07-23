import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLogo } from "../hooks/useLogo";
// @ts-ignore
import defaultGlitchLogo from "../assets/images/dejavufm_glitch_logo_1784796255055.png";

interface PremiumLoaderProps {
  onComplete?: () => void;
}

export function PremiumLoader({ onComplete }: PremiumLoaderProps) {
  const { logoUrl: dynamicLogoUrl, isLightMode, settings } = useLogo();
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const logoToUse = settings?.premium_loader_image || dynamicLogoUrl || defaultGlitchLogo;
  const isDefaultGlitch = logoToUse === defaultGlitchLogo;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none ${
        isLightMode ? 'bg-slate-50' : 'bg-[#070913]'
      }`}
      style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
    >
      <img
        src={logoToUse}
        alt="dejavufm"
        referrerPolicy="no-referrer"
        loading="eager"
        fetchPriority="high"
        className={`w-64 sm:w-80 md:w-[28rem] h-auto object-contain ${
          isDefaultGlitch
            ? isLightMode
              ? "invert hue-rotate-180 mix-blend-multiply"
              : "mix-blend-screen"
            : ""
        }`}
      />
    </div>,
    document.body
  );
}

