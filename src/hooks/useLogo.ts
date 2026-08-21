import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { safeFetchJson } from '../utils/safeFetch';

export function useLogo() {
  const location = useLocation();
  const pathname = location?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => safeFetchJson("/api/public/settings"),
    staleTime: 1000 * 60 * 2,
  });

  const customAdminPath = (settings?.admin_custom_path || '/admin').trim().replace(/\/+$/, '') || '/admin';
  const checkAdmin = (p: string) => p.startsWith(customAdminPath);

  const getThemeState = useCallback((p: string) => {
    if (typeof window === 'undefined') return false;
    const isAdmin = checkAdmin(p);
    if (isAdmin) {
      return document.documentElement.classList.contains('admin-light-mode');
    }
    return localStorage.getItem('theme') === 'light' || document.documentElement.classList.contains('light');
  }, [customAdminPath]);

  const [isLightMode, setIsLightMode] = useState(() => getThemeState(pathname));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isAdmin = checkAdmin(pathname);

    const handleThemeChange = () => {
      const nextTheme = getThemeState(pathname);
      setIsLightMode(prev => (prev !== nextTheme ? nextTheme : prev));
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          handleThemeChange();
          break;
        }
      }
    });

    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    if (isAdmin) {
      window.addEventListener('dashboard-theme-change', handleThemeChange);
    } else {
      window.addEventListener('theme-change', handleThemeChange);
    }
    window.addEventListener('storage', handleThemeChange);

    handleThemeChange();

    return () => {
      observer.disconnect();
      if (isAdmin) {
        window.removeEventListener('dashboard-theme-change', handleThemeChange);
      } else {
        window.removeEventListener('theme-change', handleThemeChange);
      }
      window.removeEventListener('storage', handleThemeChange);
    };
  }, [pathname, getThemeState]);

  useEffect(() => {
    if (settings?.favicon) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        if (link.href !== settings.favicon) {
          link.href = settings.favicon;
        }
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = settings.favicon;
        document.head.appendChild(newLink);
      }
    }
  }, [settings?.favicon]);

  useEffect(() => {
    if (!settings) return;

    if (settings.primary_color) {
      const current = document.documentElement.style.getPropertyValue('--color-neon-purple');
      if (current !== settings.primary_color) {
        document.documentElement.style.setProperty('--color-neon-purple', settings.primary_color);
        localStorage.setItem('branding_primary_color', settings.primary_color);
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
          metaThemeColor = document.createElement('meta');
          metaThemeColor.setAttribute('name', 'theme-color');
          document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', settings.primary_color);
      }
    }
    if (settings.secondary_color) {
      const current = document.documentElement.style.getPropertyValue('--color-neon-blue');
      if (current !== settings.secondary_color) {
        document.documentElement.style.setProperty('--color-neon-blue', settings.secondary_color);
        localStorage.setItem('branding_secondary_color', settings.secondary_color);
      }
    }

    if (settings.font_sans) {
      const sansFallback = ', ui-sans-serif, system-ui, sans-serif';
      const val = `"${settings.font_sans}"${sansFallback}`;
      if (document.documentElement.style.getPropertyValue('--font-sans') !== val) {
        document.documentElement.style.setProperty('--font-sans', val);
        document.documentElement.style.setProperty('--font-mono', val);
      }
    }
    if (settings.font_display) {
      let displayFallback = ', sans-serif';
      if (settings.font_display === 'Playfair Display') displayFallback = ', serif';
      if (settings.font_display === 'JetBrains Mono') displayFallback = ', monospace';
      const val = `"${settings.font_display}"${displayFallback}`;
      if (document.documentElement.style.getPropertyValue('--font-display') !== val) {
        document.documentElement.style.setProperty('--font-display', val);
      }
    }

    if (typeof window !== 'undefined') {
      if (settings.default_theme) {
        localStorage.setItem('default_theme_fallback', settings.default_theme);
      }

      const isAdmin = checkAdmin(location.pathname);
      if (!isAdmin) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === null) {
          const defaultTheme = settings.default_theme || 'dark';
          if (defaultTheme === 'light') {
            if (!document.documentElement.classList.contains('light')) {
              document.documentElement.classList.add('light');
              document.documentElement.style.backgroundColor = '#f8f9fa';
            }
          } else {
            if (document.documentElement.classList.contains('light')) {
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

  const resolveDjImage = useCallback((djPhoto: string | null | undefined) => {
    if (!djPhoto || djPhoto.trim() === "") {
      return logoUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=200&q=80";
    }
    return djPhoto;
  }, [logoUrl]);

  const getPageTitle = useCallback((key: string, defaultTitle: string): string => {
    if (settings?.menu_item_page_titles) {
      try {
        const titles = JSON.parse(settings.menu_item_page_titles);
        if (titles[key] && titles[key].trim() !== "") {
          return titles[key];
        }
      } catch (e) {
        console.error("Failed to parse menu_item_page_titles", e);
      }
    }
    return defaultTitle;
  }, [settings?.menu_item_page_titles]);

  return { logoUrl, logoShape, isLightMode, settings, resolveDjImage, getPageTitle };
}
