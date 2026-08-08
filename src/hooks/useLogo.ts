import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

export function useLogo() {
  let pathname = '';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const location = useLocation();
    pathname = location.pathname;
  } catch {
    pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  }

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch("/api/public/settings").then(res => res.json())
  });

  const customAdminPath = (settings?.admin_custom_path || '/admin').trim().replace(/\/+$/, '') || '/admin';
  const checkAdmin = (p: string) => p.startsWith(customAdminPath);

  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const isAdmin = checkAdmin(pathname);
      if (isAdmin) {
        return document.documentElement.classList.contains('admin-light-mode');
      }
      return localStorage.getItem('theme') === 'light' || document.documentElement.classList.contains('light');
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isAdmin = checkAdmin(pathname);

    if (isAdmin) {
      const handleThemeChange = () => {
        setIsLightMode(document.documentElement.classList.contains('admin-light-mode'));
      };
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            handleThemeChange();
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true });

      window.addEventListener('dashboard-theme-change', handleThemeChange);
      
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'dashboard_theme' || e.key === 'studio_theme') {
          handleThemeChange();
        }
      };
      window.addEventListener('storage', handleStorageChange);

      handleThemeChange();

      return () => {
        observer.disconnect();
        window.removeEventListener('dashboard-theme-change', handleThemeChange);
        window.removeEventListener('storage', handleStorageChange);
      };
    } else {
      const handleThemeChange = () => {
        setIsLightMode(document.documentElement.classList.contains('light') || localStorage.getItem('theme') === 'light');
      };

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            handleThemeChange();
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true });

      window.addEventListener('theme-change', handleThemeChange);
      window.addEventListener('storage', handleThemeChange);

      // Run on mount to ensure synchronization
      handleThemeChange();

      return () => {
        observer.disconnect();
        window.removeEventListener('theme-change', handleThemeChange);
        window.removeEventListener('storage', handleThemeChange);
      };
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
      if (settings.primary_color) {
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
      if (settings.secondary_color) {
        document.documentElement.style.setProperty('--color-neon-blue', settings.secondary_color);
        localStorage.setItem('branding_secondary_color', settings.secondary_color);
      }

      if (settings.font_sans) {
        const sansFallback = ', ui-sans-serif, system-ui, sans-serif';
        document.documentElement.style.setProperty('--font-sans', `"${settings.font_sans}"${sansFallback}`);
        document.documentElement.style.setProperty('--font-mono', `"${settings.font_sans}"${sansFallback}`);
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

        const isAdmin = checkAdmin(location.pathname);
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

  const getPageTitle = (key: string, defaultTitle: string): string => {
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
  };

  return { logoUrl, logoShape, isLightMode, settings, resolveDjImage, getPageTitle };
}
