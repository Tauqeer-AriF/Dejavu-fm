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

  const logoUrlRaw = isLightMode 
    ? (settings?.logo_light || settings?.logo_url || undefined)
    : (settings?.logo_dark || settings?.logo_url || undefined);

  const logoUrl = (logoUrlRaw && logoUrlRaw.trim() !== "") ? logoUrlRaw : undefined;
  const logoShape = settings?.logo_shape || 'square';

  const resolveDjImage = (djPhoto: string | null | undefined) => {
    if (!djPhoto || djPhoto.trim() === "") {
      return logoUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=200&q=80";
    }
    return djPhoto;
  };

  return { logoUrl, logoShape, isLightMode, settings, resolveDjImage };
}
