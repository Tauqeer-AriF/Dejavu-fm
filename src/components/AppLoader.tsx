import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLogo } from "../hooks/useLogo";
// @ts-ignore
import defaultGlitchLogo from "../assets/images/dejavufm_glitch_logo_1784796255055.png";

interface AppLoaderProps {
  onComplete?: () => void;
}

export function AppLoader({ onComplete }: AppLoaderProps) {
  const { isLightMode } = useLogo();
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

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none ${
        isLightMode ? "bg-white" : "bg-black"
      }`}
    >
      <img
        src={defaultGlitchLogo}
        alt="dejavufm"
        referrerPolicy="no-referrer"
        fetchPriority="high"
        className={`w-64 sm:w-80 md:w-[28rem] h-auto object-contain ${
          isLightMode ? "invert" : ""
        }`}
      />
    </div>,
    document.body
  );
}
