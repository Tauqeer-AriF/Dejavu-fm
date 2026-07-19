import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

export function useLogo() {
  const location = useLocation();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch("/api/public/settings").then(res => res.json())
  });

  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const isAdmin = location.pathname.startsWith('/admin');
      if (isAdmin) {
        return localStorage.getItem('dashboard_theme') === 'light';
      }
      return localStorage.getItem('theme') === 'light' || document.documentElement.classList.contains('light');
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isAdmin = location.pathname.startsWith('/admin');

    if (isAdmin) {
      const handleThemeChange = () => {
        setIsLightMode(localStorage.getItem('dashboard_theme') === 'light');
      };
      window.addEventListener('dashboard-theme-change', handleThemeChange);
      
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'dashboard_theme') {
          setIsLightMode(e.newValue === 'light');
        }
      };
      window.addEventListener('storage', handleStorageChange);

      return () => {
        window.removeEventListener('dashboard-theme-change', handleThemeChange);
        window.removeEventListener('storage', handleStorageChange);
      };
    } else {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            setIsLightMode(document.documentElement.classList.contains('light'));
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
    }
  }, [location.pathname]);

  useEffect(() => {
    if (settings?.favicon) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = settings.favicon;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = settings.favicon;
        document.head.appendChild(newLink);
      }
    }
  }, [settings?.favicon]);

  useEffect(() => {
    if (settings) {
      if (settings.font_sans) {
        const sansFallback = ', ui-sans-serif, system-ui, sans-serif';
        document.documentElement.style.setProperty('--font-sans', `"${settings.font_sans}"${sansFallback}`);
      }
      if (settings.font_display) {
        let displayFallback = ', sans-serif';
        if (settings.font_display === 'Playfair Display') displayFallback = ', serif';
        if (settings.font_display === 'JetBrains Mono') displayFallback = ', monospace';
        document.documentElement.style.setProperty('--font-display', `"${settings.font_display}"${displayFallback}`);
      }

      // Handle front-end default theme if user hasn't explicitly set a preference
      if (typeof window !== 'undefined') {
        // Always update the fallback so it's ready for the next front-end load
        if (settings.default_theme) {
          localStorage.setItem('default_theme_fallback', settings.default_theme);
        }

        const isAdmin = location.pathname.startsWith('/admin');
        if (!isAdmin) {
          const savedTheme = localStorage.getItem('theme');
          if (savedTheme === null) {
            const defaultTheme = settings.default_theme || 'dark';
            if (defaultTheme === 'light') {
              document.documentElement.classList.add('light');
              document.documentElement.style.backgroundColor = '#f8f9fa';
            } else {
              document.documentElement.classList.remove('light');
              document.documentElement.style.backgroundColor = '#0a0a0f';
            }
          }
        }
      }
    }
  }, [settings, location.pathname]);

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
