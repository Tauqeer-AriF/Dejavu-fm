import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface PremiumLoaderProps {
  onComplete?: () => void;
}

export function PremiumLoader({ onComplete }: PremiumLoaderProps) {
  const [isLight, setIsLight] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const checkTheme = () => {
      const isHtmlLight = document.documentElement.classList.contains('light') || 
                          document.documentElement.classList.contains('admin-light-mode');
      const savedStudioTheme = localStorage.getItem('studio_theme');
      const savedDbTheme = localStorage.getItem('dashboard_theme');
      
      setIsLight(isHtmlLight || savedStudioTheme === 'light' || savedDbTheme === 'light');
    };

    checkTheme();
    
    // Set up observer to track real-time theme updates
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-colors duration-200 select-none ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#070913] text-white'
      }`}
      style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
    >
      <div className="relative z-10 flex flex-col items-center justify-center">
        <h1 className="font-black text-6xl sm:text-7xl md:text-8xl tracking-tighter font-sans lowercase leading-none">
          dejavufm
        </h1>
      </div>
    </div>,
    document.body
  );
}
