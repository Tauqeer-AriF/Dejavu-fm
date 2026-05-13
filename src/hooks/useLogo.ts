import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export function useLogo() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch("/api/public/settings").then(res => res.json())
  });

  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'light' || document.documentElement.classList.contains('light');
    }
    return false;
  });

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsLightMode(document.documentElement.classList.contains('light'));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const logoUrl = isLightMode 
    ? (settings?.logo_light || settings?.logo_url || undefined)
    : (settings?.logo_dark || settings?.logo_url || undefined);

  const resolveDjImage = (djPhoto: string | null | undefined) => {
    if (!djPhoto) return logoUrl;
    if (djPhoto.includes("images.unsplash.com")) return logoUrl;
    return djPhoto;
  };

  return { logoUrl, isLightMode, settings, resolveDjImage };
}
