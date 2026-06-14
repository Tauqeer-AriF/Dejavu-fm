import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminSidebar({ onLogout, isAdminUser }: { onLogout: () => void; isAdminUser: boolean }) {
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

  let navs = [
    { name: "Analytics", path: "/admin", icon: BarChart3 },
    { name: "Live Tools", path: "/admin/live-tools", icon: Radio },
    { name: "Settings", path: "/admin/settings", icon: Settings },
    { name: "Advanced", path: "/admin/advanced", icon: Ghost },
    { name: "My Profile", path: "/admin/profile", icon: User },
    { name: "Interaction", path: "/admin/shoutouts", icon: MessageSquare },
    { name: "Agency", path: "/admin/bookings", icon: Calendar },
    { name: "Branding", path: "/admin/branding", icon: HomeIcon },
    { name: "DJs", path: "/admin/djs", icon: Users },
    { name: "Blogs", path: "/admin/blogs", icon: FileText },
    { name: "Pop-up", path: "/admin/popup", icon: Sparkles },
    { name: "Schedule", path: "/admin/schedule", icon: Calendar },
    { name: "Admin Users", path: "/admin/users", icon: UserCog },
    { name: "Chat Users", path: "/admin/chat-users", icon: MessageSquare },
    { name: "Audit Logs", path: "/admin/audit-logs", icon: Shield },
  ];

  if (!isAdminUser) {
    // 1. Filter out tabs that strictly require the 'admin' role
    navs = navs.filter(n =>
      n.name !== "Settings" &&
      n.name !== "Advanced" &&
      n.name !== "Branding" &&
      n.name !== "Admin Users" &&
      n.name !== "Chat Users" &&
      n.name !== "Audit Logs"
    );

    // 2. Apply dynamic feature flags only for non-admins to ensure admins have full control
    if (features.feat_live_tools === '0') navs = navs.filter(n => n.name !== 'Live Tools');
    if (features.feat_shoutouts === '0') navs = navs.filter(n => n.name !== 'Interaction');
    if (features.feat_bookings === '0') navs = navs.filter(n => n.name !== 'Agency');
    if (features.feat_chat === '0') navs = navs.filter(n => n.name !== 'Chat Users');
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 w-full bg-dark-bg/50">
        <span className="font-bold uppercase tracking-widest text-neon-purple">Admin</span>
        <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className={`${isOpen ? 'flex' : 'hidden'} md:flex flex-col w-full ${isCollapsed ? 'md:w-20' : 'md:w-64'} bg-dark-bg/95 md:bg-dark-bg/50 border-b md:border-b-0 md:border-r border-white/10 absolute md:relative z-20 top-[73px] md:top-0 left-0 h-[calc(100%-73px)] md:h-auto transition-all duration-300 ease-in-out`}>
        {/* Toggle Button for Desktop */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 bg-neon-purple rounded-full items-center justify-center text-white border border-white/20 shadow-lg z-30 hover:scale-110 transition-transform"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex-1 flex flex-col p-4 overflow-y-auto scrollbar-thin overflow-x-visible">
          <div className="flex-1 space-y-2 mt-4">
            {navs.map(n => {
              const active = location.pathname === n.path;
              return (
                <Link key={n.name} title={isCollapsed ? n.name : ""} to={n.path} onClick={() => setIsOpen(false)} className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition-all duration-200 ${active ? 'bg-neon-purple/20 text-neon-purple' : 'hover:bg-white/5 text-white/70'}`}>
                  <n.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-neon-purple' : ''}`} />
                  {!isCollapsed && <span className="font-semibold text-sm truncate">{n.name}</span>}
                </Link>
              )
            })}
          </div>
          <div className="mt-auto space-y-2 pt-4">
            <a 
              href="/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3 rounded-xl bg-neon-blue/10 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue hover:text-dark-bg transition-all duration-300 shadow-[0_0_15px_rgba(0,210,255,0.1)] group mb-2`}
              title={isCollapsed ? "Station View" : ""}
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Globe className="w-5 h-5 flex-shrink-0 group-hover:rotate-12 transition-transform" />
                {!isCollapsed && <span className="font-bold text-sm">Station View</span>}
              </div>
              {!isCollapsed && <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue group-hover:bg-dark-bg opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue group-hover:bg-dark-bg"></span>
              </span>}
            </a>
            <button onClick={onLogout} title={isCollapsed ? "Logout" : ""} className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg text-white/50 hover:text-red-500 hover:bg-red-500/10 transition-colors`}>
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-semibold text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
