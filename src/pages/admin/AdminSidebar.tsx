import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Database, Video, Key, Facebook, Layers, Mic } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

import { useLogo } from "../../hooks/useLogo";

export function AdminSidebar({ onLogout, isAdminUser }: { onLogout: () => void; isAdminUser: boolean }) {
  const { isLightMode } = useLogo();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const { data: features = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
  });

  const adminBasePath = (features.admin_custom_path || '/admin').trim().replace(/\/+$/, '') || '/admin';

  let navs = [
    { name: "Analytics", path: `${adminBasePath}`, icon: BarChart3 },
    { name: "Live Tools", path: `${adminBasePath}/live-tools`, icon: Radio },
    { name: "Menu", path: `${adminBasePath}/menu`, icon: Menu },
    { name: "Pages", path: `${adminBasePath}/pages`, icon: Layers },
    { name: "SEO", path: `${adminBasePath}/seo`, icon: Globe },
    { name: "Settings", path: `${adminBasePath}/settings`, icon: Settings },
    { name: "Advanced", path: `${adminBasePath}/advanced`, icon: Ghost },
    { name: "Media", path: `${adminBasePath}/media`, icon: Video },
    { name: "My Profile", path: `${adminBasePath}/profile`, icon: User },
    { name: "Interactions", path: `${adminBasePath}/shoutouts`, icon: MessageSquare },
    { name: "Agency", path: `${adminBasePath}/bookings`, icon: Calendar },
    { name: "Branding", path: `${adminBasePath}/branding`, icon: HomeIcon },
    { name: "DJs", path: `${adminBasePath}/djs`, icon: Users },
    { name: "Pop-up", path: `${adminBasePath}/popup`, icon: Sparkles },
    { name: "Ads", path: `${adminBasePath}/ads`, icon: ImageIcon },
    { name: "Schedule", path: `${adminBasePath}/schedule`, icon: Calendar },
    { name: "Staff Users", path: `${adminBasePath}/users`, icon: UserCog },
    { name: "Chat Users", path: `${adminBasePath}/chat-users`, icon: MessageSquare },
    { name: "Data Operations", path: `${adminBasePath}/chat-room-setting`, icon: Settings },
    { name: "Backup", path: `${adminBasePath}/backup`, icon: Database },
    { name: "Audit Logs", path: `${adminBasePath}/audit-logs`, icon: Shield },
    { name: "Meta Integrations", path: `${adminBasePath}/meta-integrations`, icon: Facebook },
  ];

  if (!isAdminUser) {
    // DJs/non-admins only see Live Tools, Interactions, and My Profile
    navs = navs.filter(n =>
      n.name === "Live Tools" ||
      n.name === "Interactions" ||
      n.name === "My Profile"
    );

    // Apply dynamic feature flags
    if (features.feat_live_tools === '0') navs = navs.filter(n => n.name !== 'Live Tools');
    if (features.feat_shoutouts === '0') navs = navs.filter(n => n.name !== 'Interactions');
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className={`md:hidden flex items-center justify-between p-4 border-b w-full transition-colors ${isLightMode ? 'bg-white border-black/10' : 'bg-dark-bg/50 border-white/10'}`}>
        <span className="font-bold uppercase tracking-widest text-neon-purple font-display">Creator Station</span>
        <button onClick={() => setIsOpen(true)} className={`${isLightMode ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/5'} p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider`}>
          <Menu className="w-5 h-5 text-neon-purple" />
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile Sliding Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="md:hidden fixed inset-0 z-[200] flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Sliding Menu Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={`fixed top-0 bottom-0 left-0 w-[290px] h-full flex flex-col p-6 shadow-2xl overflow-y-auto z-10 ${
                isLightMode 
                  ? 'bg-[#ffffff] text-black border-r border-black/10' 
                  : 'bg-[#0b0c10] text-white border-r border-white/10'
              }`}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-dashed border-neon-purple/20">
                <div className="flex flex-col">
                  <span className="font-black uppercase tracking-wider text-neon-purple text-base font-display">Dashboard</span>
                  <span className={`text-[10px] uppercase tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Control Center</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className={`p-2 rounded-xl border transition-all ${
                    isLightMode 
                      ? 'border-black/10 hover:bg-black/5 text-black' 
                      : 'border-white/10 hover:bg-white/5 text-white'
                  }`}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-neon-purple" />
                </button>
              </div>

              {/* Navigation Tabs List */}
              <div className="flex-1 space-y-1.5 py-2 overflow-y-auto scrollbar-none">
                {navs.map(n => {
                  const active = location.pathname === n.path;
                  return (
                    <Link
                      key={n.name}
                      to={n.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        active 
                          ? 'bg-neon-purple/20 text-neon-purple font-bold shadow-[inset_0_0_12px_rgba(176,38,255,0.15)]' 
                          : isLightMode 
                            ? 'hover:bg-black/5 text-black/70 hover:text-black' 
                            : 'hover:bg-white/5 text-white/70 hover:text-white'
                      }`}
                    >
                      <n.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-neon-purple' : ''}`} />
                      <span className="text-sm font-semibold truncate">{n.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="pt-4 mt-4 border-t border-dashed border-neon-purple/20 space-y-2">
                <button
                  onClick={() => {
                    window.open('/', '_blank', 'noopener,noreferrer');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 shadow-sm group ${
                    isLightMode 
                      ? 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-600 hover:text-white' 
                      : 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue hover:bg-neon-blue hover:text-dark-bg'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Globe className="w-4 h-4 flex-shrink-0 group-hover:rotate-12 transition-transform" />
                    <span className="font-bold text-xs uppercase tracking-wider">Station View</span>
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLightMode ? 'bg-cyan-400' : 'bg-neon-blue'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLightMode ? 'bg-cyan-500' : 'bg-neon-blue'}`}></span>
                  </span>
                </button>

                <button 
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }} 
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors text-left ${
                    isLightMode 
                      ? 'text-black/50 hover:text-red-600 hover:bg-red-50' 
                      : 'text-white/50 hover:text-red-500 hover:bg-red-500/10'
                  }`}
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="font-semibold text-xs uppercase tracking-wider">Logout</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Structural precision intact, beautifully styled) */}
      <div className={`hidden md:flex flex-col w-full ${isCollapsed ? 'md:w-20' : 'md:w-64'} border-b md:border-b-0 md:border-r relative z-10 transition-all duration-300 ease-in-out ${isLightMode ? 'bg-[#fcfcfc] border-black/10' : 'bg-dark-bg/50 border-white/10'} admin-sidebar`}>
        {/* Toggle Button for Desktop */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 bg-neon-purple rounded-full items-center justify-center text-white border border-white/20 shadow-lg z-30 hover:scale-110 transition-transform admin-sidebar-toggle"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex-1 flex flex-col p-4 overflow-y-auto scrollbar-thin overflow-x-visible">
          <div className="flex-1 space-y-2 mt-4">
            {navs.map(n => {
              const active = location.pathname === n.path;
              return (
                <Link key={n.name} title={isCollapsed ? n.name : ""} to={n.path} className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition-all duration-200 ${active ? 'bg-neon-purple/20 text-neon-purple' : isLightMode ? 'hover:bg-black/5 text-black/70' : 'hover:bg-white/5 text-white/70'}`}>
                  <n.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-neon-purple' : ''}`} />
                  {!isCollapsed && <span className="font-semibold text-sm truncate">{n.name}</span>}
                </Link>
              )
            })}
          </div>
          <div className="mt-auto space-y-2 pt-4">
            <button
              onClick={() => {
                // Clear any saved admin path so the new tab opens the true home page
                window.open('/', '_blank', 'noopener,noreferrer');
              }}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3 rounded-xl border transition-all duration-300 shadow-sm group mb-2 ${isLightMode ? 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-600 hover:text-white' : 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue hover:bg-neon-blue hover:text-dark-bg shadow-[0_0_15px_rgba(0,210,255,0.1)]'}`}
              title={isCollapsed ? "Station View" : ""}
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Globe className="w-5 h-5 flex-shrink-0 group-hover:rotate-12 transition-transform" />
                {!isCollapsed && <span className="font-bold text-sm">Station View</span>}
              </div>
              {!isCollapsed && <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLightMode ? 'bg-cyan-400 group-hover:bg-white' : 'bg-neon-blue group-hover:bg-dark-bg'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLightMode ? 'bg-cyan-500 group-hover:bg-white' : 'bg-neon-blue group-hover:bg-dark-bg'}`}></span>
              </span>}
            </button>
            <button onClick={onLogout} title={isCollapsed ? "Logout" : ""} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors ${isLightMode ? 'text-black/40 hover:text-red-600 hover:bg-red-50 hover:border-red-100' : 'text-white/50 hover:text-red-500 hover:bg-red-500/10'}`}>
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-semibold text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
