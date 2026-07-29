import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, ArrowUp, ArrowDown, Eye, EyeOff, Save, Globe, Sparkles, RefreshCw, Layers, Shield, Radio, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useLogo } from '../../hooks/useLogo';
import { useModal } from '../../context/ModalContext';
import { ImageUploadField } from './ImageUploadField';
import { fetchAdmin } from './adminApi';

interface MenuItem {
  key: string;
  defaultLabel: string;
  path: string;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { key: 'arch421', defaultLabel: 'Arch421', path: '/arch421' },
  { key: 'listen', defaultLabel: 'Listen', path: '/' },
  { key: 'watch', defaultLabel: 'Watch', path: '/watch' },
  { key: 'schedule', defaultLabel: 'Schedule', path: '/schedule' },
  { key: 'djs', defaultLabel: 'DJs and Hosts', path: '/djs' },
  { key: 'podcasts', defaultLabel: 'Podcasts', path: '/podcasts' },
  { key: 'features', defaultLabel: 'Features', path: '/features' },
];

export function AdminMenu() {
  const { isLightMode } = useLogo();
  const { showAlert } = useModal();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Core Station Branding & Settings
  const [appName, setAppName] = useState('');
  const [appTitle, setAppTitle] = useState('');
  const [appTagline, setAppTagline] = useState('');

  // Menu Configuration
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [menuItemLabels, setMenuItemLabels] = useState<Record<string, string>>({});
  const [menuItemVisibility, setMenuItemVisibility] = useState<Record<string, boolean>>({});
  const [menuItemPaths, setMenuItemPaths] = useState<Record<string, string>>({});
  const [menuSubItems, setMenuSubItems] = useState<Record<string, { label: string; path: string; isExternal?: boolean }[]>>({});
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [expandedSubMenu, setExpandedSubMenu] = useState<string | null>(null);

  // Adding Custom Link UI
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkPath, setNewLinkPath] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/public/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();

        // 1. Branding
        setAppName(data.app_name || 'DejavuFM');
        setAppTitle(data.app_title || 'DejavuFM - Underground Gold');
        setAppTagline(data.app_tagline || 'The UKs Most Influential Independent Radio Station');

        // 4. Menu configuration parsing
        let parsedLabels: Record<string, string> = {};
        if (data.menu_item_labels) {
          try {
            parsedLabels = JSON.parse(data.menu_item_labels);
          } catch (e) {
            console.error('Failed to parse menu_item_labels', e);
          }
        }
        setMenuItemLabels(parsedLabels);

        let parsedPaths: Record<string, string> = {};
        if (data.menu_item_paths) {
          try {
            parsedPaths = JSON.parse(data.menu_item_paths);
          } catch (e) {
            console.error('Failed to parse menu_item_paths', e);
          }
        }
        setMenuItemPaths(parsedPaths);

        let parsedVisibility: Record<string, boolean> = {};
        if (data.menu_item_visibility) {
          try {
            parsedVisibility = JSON.parse(data.menu_item_visibility);
          } catch (e) {
            console.error('Failed to parse menu_item_visibility', e);
          }
        }
        // Ensure defaults if not defined
        DEFAULT_MENU_ITEMS.forEach(item => {
          if (parsedVisibility[item.key] === undefined) {
            parsedVisibility[item.key] = true;
          }
        });
        setMenuItemVisibility(parsedVisibility);

        // Menu ordering parse
        let orderedItems = [...DEFAULT_MENU_ITEMS];
        const allItemsMap: Record<string, MenuItem> = {};
        
        DEFAULT_MENU_ITEMS.forEach(item => {
          allItemsMap[item.key] = item;
        });

        // Populate custom items in allItemsMap
        Object.keys(parsedPaths).forEach(key => {
          if (key.startsWith('custom_')) {
            allItemsMap[key] = {
              key,
              defaultLabel: parsedLabels[key] || 'Custom Link',
              path: parsedPaths[key] || '#'
            };
          }
        });

        if (data.menu_order) {
          try {
            const orderKeys: string[] = data.menu_order.split(',').map((k: string) => k.trim());
            const itemsList: MenuItem[] = [];
            
            orderKeys.forEach(key => {
              if (allItemsMap[key]) {
                itemsList.push(allItemsMap[key]);
              }
            });

            // Append any missing default items
            DEFAULT_MENU_ITEMS.forEach(item => {
              if (!orderKeys.includes(item.key)) {
                itemsList.push(item);
              }
            });

            // Append any missing custom items so they are never lost
            Object.keys(parsedPaths).forEach(key => {
              if (key.startsWith('custom_') && !orderKeys.includes(key)) {
                itemsList.push(allItemsMap[key]);
              }
            });

            orderedItems = itemsList;
          } catch (e) {
            console.error('Failed to sort menu order', e);
          }
        } else {
          // If no order is saved yet, just append any custom items to the end of default items
          Object.keys(parsedPaths).forEach(key => {
            if (key.startsWith('custom_')) {
              orderedItems.push(allItemsMap[key]);
            }
          });
        }
        setMenuItems(orderedItems);

        // Parse Sub-items Configuration
        let parsedSubItems: Record<string, { label: string; path: string; isExternal?: boolean }[]> = {};
        if (data.menu_sub_items) {
          try {
            parsedSubItems = JSON.parse(data.menu_sub_items);
          } catch (e) {
            console.error('Failed to parse menu_sub_items', e);
          }
        }
        if (!parsedSubItems['features']) {
          parsedSubItems['features'] = [
            { path: '/features', label: 'All Features' },
            { path: 'https://dejavufmstore.secure-decoration.com', label: 'Online Store', isExternal: true },
            { path: '/about', label: 'About Station' },
            { path: '/contact', label: 'Contact' }
          ];
        }
        setMenuSubItems(parsedSubItems);

        // Fetch custom pages
        try {
          const pagesRes = await fetch('/api/pages');
          if (pagesRes.ok) {
            const pagesData = await pagesRes.json();
            setAvailablePages(pagesData || []);
          }
        } catch (err) {
          console.error('Failed to load custom pages', err);
        }
      } catch (error) {
        console.error(error);
        showAlert({ title: 'Error', message: 'Could not load menu & branding configurations.', style: 'danger' });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [showAlert]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...menuItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap elements
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setMenuItems(newItems);
  };

  const toggleVisibility = (key: string) => {
    setMenuItemVisibility(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLabelChange = (key: string, value: string) => {
    setMenuItemLabels(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePathChange = (key: string, value: string) => {
    setMenuItemPaths(prev => ({
      ...prev,
      [key]: value,
    }));
    setMenuItems(prev => prev.map(item => item.key === key ? { ...item, path: value } : item));
  };

  const handleAddCustomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkLabel.trim() || !newLinkPath.trim()) return;

    const key = `custom_${Date.now()}`;
    const newLink: MenuItem = {
      key,
      defaultLabel: newLinkLabel.trim(),
      path: newLinkPath.trim()
    };

    setMenuItems(prev => [...prev, newLink]);
    setMenuItemLabels(prev => ({ ...prev, [key]: newLinkLabel.trim() }));
    setMenuItemPaths(prev => ({ ...prev, [key]: newLinkPath.trim() }));
    setMenuItemVisibility(prev => ({ ...prev, [key]: true }));

    setNewLinkLabel('');
    setNewLinkPath('');
  };

  const removeCustomItem = (key: string) => {
    setMenuItems(prev => prev.filter(item => item.key !== key));
    setMenuItemLabels(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setMenuItemPaths(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setMenuItemVisibility(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const addPageToMainMenu = (page: any) => {
    const key = `custom_page_${page.slug}`;
    if (menuItems.some(item => item.key === key)) {
      showAlert({ title: 'Already Added', message: `Page "${page.title}" is already in the main menu.`, style: 'info' });
      return;
    }

    const newLink: MenuItem = {
      key,
      defaultLabel: page.title,
      path: `/${page.slug}`
    };

    setMenuItems(prev => [...prev, newLink]);
    setMenuItemLabels(prev => ({ ...prev, [key]: page.title }));
    setMenuItemPaths(prev => ({ ...prev, [key]: `/${page.slug}` }));
    setMenuItemVisibility(prev => ({ ...prev, [key]: true }));

    showAlert({ title: 'Success', message: `Added "${page.title}" to the main menu!`, style: 'success' });
  };

  const addPageToSubMenu = (page: any, parentKey: string) => {
    const existing = menuSubItems[parentKey] || [];
    if (existing.some(item => item.path === `/${page.slug}`)) {
      showAlert({ title: 'Already Nested', message: `Page "${page.title}" is already nested under this menu item.`, style: 'info' });
      return;
    }
    const updated = [...existing, { label: page.title, path: `/${page.slug}` }];
    setMenuSubItems(prev => ({ ...prev, [parentKey]: updated }));
    showAlert({ title: 'Success', message: `Nested "${page.title}" under "${menuItemLabels[parentKey] || parentKey || parentKey}"!`, style: 'success' });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    const orderStr = menuItems.map(item => item.key).join(',');
    const labelsStr = JSON.stringify(menuItemLabels);
    const visibilityStr = JSON.stringify(menuItemVisibility);
    const pathsStr = JSON.stringify(menuItemPaths);
    const subItemsStr = JSON.stringify(menuSubItems);

    try {
      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        body: {
          app_name: appName,
          app_title: appTitle,
          app_tagline: appTagline,
          menu_order: orderStr,
          menu_item_labels: labelsStr,
          menu_item_visibility: visibilityStr,
          menu_item_paths: pathsStr,
          menu_sub_items: subItemsStr,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update settings');
      }

      // Dispatch event to trigger refresh across open tabs & windows
      window.dispatchEvent(new Event('settings-updated'));
      
      // Invalidate React Query settings cache so all UI elements reload in real-time
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      
      showAlert({ title: 'Success', message: 'Menu & Branding configurations updated successfully.', style: 'success' });
    } catch (error) {
      console.error(error);
      showAlert({ title: 'Error', message: (error as Error).message || 'Save failed.', style: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-neon-purple animate-spin" />
        <p className="mt-4 text-xs font-mono uppercase tracking-widest opacity-50">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 pb-12 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isLightMode ? 'bg-neon-purple/10 text-neon-purple' : 'bg-neon-purple/20 text-neon-purple'}`}>
            <Menu className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-2xl sm:text-3xl font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Menu & Branding Control</h2>
            <p className={`text-xs sm:text-sm ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Customize front-view menu orders, labels, and nest custom pages or drop-down sub-menus.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: Menu Items Reordering & Renaming */}
        <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
          <h3 className="text-sm font-black uppercase tracking-widest text-neon-purple mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Navigation Menu Configurator
          </h3>
          <p className={`text-xs mb-6 ${isLightMode ? 'text-slate-500' : 'text-white/50'}`}>
            Drag or order front view navigation menu links. Adjust the labels or click visibility eyes to show/hide.
          </p>

          <div className="space-y-4">
            {menuItems.map((item, index) => {
              const isVisible = menuItemVisibility[item.key] !== false;
              const currentLabel = menuItemLabels[item.key] || item.defaultLabel;
              const subItemsCount = (menuSubItems[item.key] || []).length;
              const isExpanded = expandedSubMenu === item.key;

              return (
                <div
                  key={item.key}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    isLightMode 
                      ? 'bg-slate-50/50 border-slate-200' 
                      : 'bg-black/30 border-white/5'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono w-6 text-center ${isLightMode ? 'text-slate-400' : 'text-white/20'}`}>
                        {index + 1}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-widest font-mono text-neon-blue">
                          {item.key}
                        </span>
                        {item.key.startsWith('custom_') ? (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`text-[10px] font-bold ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>Path:</span>
                            <input
                              type="text"
                              value={item.path}
                              onChange={(e) => handlePathChange(item.key, e.target.value)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono outline-none border transition-all ${
                                isLightMode 
                                  ? 'bg-white border-black/10 text-black focus:border-neon-purple' 
                                  : 'bg-black/50 border-white/5 text-white focus:border-neon-purple'
                              }`}
                            />
                          </div>
                        ) : (
                          <span className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>
                            Path: {item.path}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 max-w-xl w-full justify-end ml-auto">
                      {/* Sub-menu Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedSubMenu(isExpanded ? null : item.key)}
                        className={`px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                          subItemsCount > 0
                            ? isLightMode ? 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100' : 'bg-neon-purple/10 border-neon-purple/20 text-neon-purple hover:bg-neon-purple/20'
                            : isLightMode ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        Dropdown ({subItemsCount})
                        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Label Input */}
                      <input
                        type="text"
                        value={currentLabel}
                        onChange={(e) => handleLabelChange(item.key, e.target.value)}
                        placeholder={item.defaultLabel}
                        className={`flex-1 min-w-[120px] rounded-xl px-3.5 py-2 text-xs font-semibold outline-none transition-all border ${
                          isLightMode 
                            ? 'bg-white border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                            : 'bg-black/50 border-white/5 text-white placeholder:text-white/20 focus:border-neon-purple'
                        }`}
                      />

                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleVisibility(item.key)}
                        title={isVisible ? "Hide Tab from Front View" : "Show Tab in Front View"}
                        className={`p-2 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${
                          isVisible
                            ? isLightMode ? 'bg-cyan-50 border-cyan-100 text-cyan-600' : 'bg-neon-blue/10 border-neon-blue/20 text-neon-blue'
                            : isLightMode ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white/5 border-white/5 text-white/20'
                        }`}
                      >
                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      {/* Delete Custom Link */}
                      {item.key.startsWith('custom_') && (
                        <button
                          type="button"
                          onClick={() => removeCustomItem(item.key)}
                          title="Delete Custom Link"
                          className="p-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Ordering Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveItem(index, 'up')}
                          className={`p-1.5 rounded-xl border transition-colors flex items-center justify-center ${
                            index === 0
                              ? 'opacity-30 cursor-not-allowed border-transparent'
                              : isLightMode ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-white/10 text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === menuItems.length - 1}
                          onClick={() => moveItem(index, 'down')}
                          className={`p-1.5 rounded-xl border transition-colors flex items-center justify-center ${
                            index === menuItems.length - 1
                              ? 'opacity-30 cursor-not-allowed border-transparent'
                              : isLightMode ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-white/10 text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-menu Tray */}
                  {isExpanded && (
                    <div className={`border-t p-4 space-y-4 transition-colors ${isLightMode ? 'bg-slate-100/50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
                      <div className="flex justify-between items-center">
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-neon-blue flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" /> Nested Dropdown Items
                        </h5>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isLightMode ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-white/50'}`}>
                          {subItemsCount} items
                        </span>
                      </div>

                      {/* Sub-items List */}
                      <div className="space-y-2">
                        {subItemsCount === 0 ? (
                          <p className={`text-[10px] italic ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>No nested sub-menu items configured. This will act as a direct link tab.</p>
                        ) : (
                          (menuSubItems[item.key] || []).map((sub, sIdx) => (
                            <div key={sIdx} className={`flex items-center justify-between p-2.5 rounded-xl border text-[11px] ${isLightMode ? 'bg-white border-slate-200/60' : 'bg-black/30 border-white/5'}`}>
                              <div className="flex flex-col">
                                <span className="font-bold">{sub.label}</span>
                                <span className={`text-[9px] font-mono ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>{sub.path}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={sIdx === 0}
                                  onClick={() => {
                                    const subCopy = [...(menuSubItems[item.key] || [])];
                                    const temp = subCopy[sIdx];
                                    subCopy[sIdx] = subCopy[sIdx - 1];
                                    subCopy[sIdx - 1] = temp;
                                    setMenuSubItems(prev => ({ ...prev, [item.key]: subCopy }));
                                  }}
                                  className="p-1 rounded bg-white/5 text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={sIdx === subItemsCount - 1}
                                  onClick={() => {
                                    const subCopy = [...(menuSubItems[item.key] || [])];
                                    const temp = subCopy[sIdx];
                                    subCopy[sIdx] = subCopy[sIdx + 1];
                                    subCopy[sIdx + 1] = temp;
                                    setMenuSubItems(prev => ({ ...prev, [item.key]: subCopy }));
                                  }}
                                  className="p-1 rounded bg-white/5 text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = (menuSubItems[item.key] || []).filter((_, i) => i !== sIdx);
                                    setMenuSubItems(prev => ({ ...prev, [item.key]: filtered }));
                                  }}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Quick add subitem form */}
                      <div className="pt-3 border-t border-dashed border-white/10 flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Sub Link Label (e.g. About)"
                          id={`sub-label-${item.key}`}
                          className={`flex-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold outline-none transition-all border ${
                            isLightMode 
                              ? 'bg-white border-black/10 text-black placeholder:text-black/30' 
                              : 'bg-black/50 border-white/5 text-white placeholder:text-white/20'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Path (e.g. /about or https://...)"
                          id={`sub-path-${item.key}`}
                          className={`flex-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold outline-none transition-all border ${
                            isLightMode 
                              ? 'bg-white border-black/10 text-black placeholder:text-black/30' 
                              : 'bg-black/50 border-white/5 text-white placeholder:text-white/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const labelInput = document.getElementById(`sub-label-${item.key}`) as HTMLInputElement;
                            const pathInput = document.getElementById(`sub-path-${item.key}`) as HTMLInputElement;
                            if (!labelInput?.value.trim() || !pathInput?.value.trim()) return;

                            const pathVal = pathInput.value.trim();
                            const isExt = pathVal.startsWith('http://') || pathVal.startsWith('https://');

                            setMenuSubItems(prev => ({
                              ...prev,
                              [item.key]: [
                                ...(prev[item.key] || []),
                                { label: labelInput.value.trim(), path: pathVal, isExternal: isExt }
                              ]
                            }));
                            labelInput.value = '';
                            pathInput.value = '';
                          }}
                          className={`py-1.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            isLightMode ? 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100' : 'bg-neon-blue/15 border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20'
                          }`}
                        >
                          Add Dropdown Link
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Published Custom Pages Selector */}
          <div className={`mt-8 pt-6 border-t ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
            <h4 className="text-xs font-black uppercase tracking-widest text-neon-purple mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> Published Custom Pages
            </h4>
            <p className={`text-[11px] mb-4 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
              Nest newly created custom pages directly under any of your header links as sub-menus, or add them as new main navigation tabs!
            </p>
            {availablePages.length === 0 ? (
              <p className={`text-[11px] italic opacity-50 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                No custom station pages created yet. Head over to the <strong className="text-neon-blue">Pages</strong> tab to design your first custom dynamic view!
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {availablePages.map(page => (
                  <div 
                    key={page.id} 
                    className={`flex items-center justify-between gap-4 p-3 rounded-2xl border transition-all ${
                      isLightMode ? 'bg-slate-50/50 border-slate-200 hover:bg-slate-100' : 'bg-black/20 border-white/5 hover:bg-black/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">{page.title}</span>
                      <span className="text-[9px] font-mono opacity-50 block">/{page.slug}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => addPageToMainMenu(page)}
                        className={`py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          isLightMode ? 'bg-white border-black/10 text-black hover:bg-black/[0.03]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        + Main Tab
                      </button>
                      <select
                        onChange={(e) => {
                          const parentKey = e.target.value;
                          if (parentKey) {
                            addPageToSubMenu(page, parentKey);
                            e.target.value = '';
                          }
                        }}
                        className={`py-1.5 px-2.5 rounded-xl text-[10px] font-bold outline-none border transition-all cursor-pointer ${
                          isLightMode 
                            ? 'bg-white border-slate-200 text-slate-700' 
                            : 'bg-black/50 border-white/10 text-white'
                        }`}
                      >
                        <option value="">Nest under...</option>
                        {menuItems.map(item => (
                          <option key={item.key} value={item.key}>
                            {menuItemLabels[item.key] || item.defaultLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Custom Link Form */}
          <div className={`mt-6 pt-6 border-t border-dashed ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
            <h4 className="text-xs font-black uppercase tracking-widest text-neon-blue mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Custom Menu Link / Route
            </h4>
            <p className={`text-[11px] mb-4 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
              Want to add a brand new page, custom route (e.g. <code>/gallery</code>), or an external web link (e.g. <code>https://instagram.com/dejavufm</code>)? Add it here!
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Link Name (e.g. Gallery)"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2 text-xs font-semibold outline-none transition-all border ${
                    isLightMode 
                      ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                      : 'bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                  }`}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Path / URL (e.g. /gallery or https://...)"
                  value={newLinkPath}
                  onChange={(e) => setNewLinkPath(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2 text-xs font-semibold outline-none transition-all border ${
                    isLightMode 
                      ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                      : 'bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomLink}
                disabled={!newLinkLabel.trim() || !newLinkPath.trim()}
                className={`py-2 px-5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  newLinkLabel.trim() && newLinkPath.trim()
                    ? isLightMode ? 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100' : 'bg-neon-blue/15 border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20'
                    : 'opacity-40 cursor-not-allowed ' + (isLightMode ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white/5 border-white/5 text-white/30')
                }`}
              >
                <Plus className="w-4 h-4" /> Add Link
              </button>
            </div>
          </div>
        </div>

        {/* Form Actions / Submit */}
        <div className="flex justify-end gap-4 pt-4 border-t border-dashed border-neon-purple/20">
          <button
            type="submit"
            disabled={isSaving}
            className={`px-8 py-3.5 rounded-full font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${
              isSaving 
                ? 'opacity-50 cursor-not-allowed bg-neon-purple text-white'
                : 'bg-neon-purple text-white hover:bg-neon-purple/90 shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Menu Configurations
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
