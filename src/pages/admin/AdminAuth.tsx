import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";
import { useLogo } from "../../hooks/useLogo";

export function AdminSecretGate({ onPass, onLogin }: { onPass: () => void; onLogin: (user?: any) => void }) {
  const { isLightMode } = useLogo();
  const [passedSecret, setPassedSecret] = useState(() => sessionStorage.getItem('admin_secret_passed') === 'true');
  const [answer, setAnswer] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  const handleSecretSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setIsVerifying(true);
    try {
      const res = await fetch("/api/public/admin-challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });

      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        sessionStorage.setItem('admin_secret_passed', 'true');
        setPassedSecret(true);
      } else {
        setAnswer("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!passedSecret) {
    return (
      <div className="max-w-md w-full mx-auto p-8 md:p-12 glass-panel rounded-[2.5rem] shadow-2xl relative z-10 text-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'} border`}>
            <Shield className="w-8 h-8 text-neon-purple" />
          </div>
          <div className="space-y-2">
            <h2 className={`text-2xl font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>Security Check</h2>
            <p className={`text-sm font-medium ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Identify yourself to proceed to the control center.</p>
          </div>
        </div>

        <form onSubmit={handleSecretSubmit} className="space-y-6">
          <div className="space-y-2 text-left">
            <label className={`text-[10px] uppercase font-black tracking-widest ml-4 ${isLightMode ? 'text-black/40' : 'text-white/30'}`}>Authorized Name</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                spellCheck="false"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Who are you?"
                className={`w-full border focus:border-neon-purple focus:ring-1 focus:ring-neon-purple rounded-2xl px-6 py-4 transition-all outline-none pr-24 ${isLightMode ? 'bg-black/5 border-black/10 text-black placeholder:text-black/30' : 'bg-white/5 border-white/10 text-white placeholder:text-white/10'}`}
              />
              <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`p-2.5 rounded-xl transition-colors focus:outline-none ${isLightMode ? 'text-black/40 hover:text-black hover:bg-black/5' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !answer.trim()}
                  className={`px-4 h-full rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${isLightMode ? 'bg-white text-black border border-black/10 shadow-sm hover:bg-gray-50' : 'bg-white text-dark-bg disabled:grayscale'}`}
                  style={isLightMode ? { backgroundColor: '#ffffff' } : {}}
                >
                  {isVerifying ? <div className={`w-5 h-5 border-2 border-t-transparent animate-spin rounded-full ${isLightMode ? 'border-black' : 'border-white'}`} /> : <Shield className={`w-5 h-5 ${isLightMode ? 'text-black/80' : ''}`} />}
                </button>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Link to="/" className={`text-xs transition-colors uppercase tracking-widest font-black ${isLightMode ? 'text-black/30 hover:text-black' : 'text-white/20 hover:text-white'}`}>
              Return Home
            </Link>
          </div>
        </form>
      </div>
    );
  }

  return <AdminLogin onLogin={onLogin} />;
}

function AdminLogin({ onLogin }: { onLogin: (user?: any) => void }) {
  const { isLightMode } = useLogo();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    const res = await fetchAdmin("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
      }
      setSuccess(true);
      setTimeout(() => onLogin(data.user), 1500);
    } else {
      const data = await res.json().catch(() => ({ error: "Invalid login" }));
      setErr(data.error || "Invalid login");
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-8 md:p-12 glass-panel rounded-3xl shadow-[0_0_50px_rgba(176,38,255,0.15)] relative z-10">
      <h2 className={`text-4xl font-display font-black mb-8 text-center tracking-tight uppercase ${isLightMode ? 'text-black' : 'text-white'}`}>Admin <span className="text-neon-purple">Portal</span></h2>
      {err && !success && <div className="bg-red-500/20 text-red-500 p-3 rounded mb-4 text-center text-sm">{err}</div>}
      {success && <div className="bg-green-500/20 border border-green-500 text-green-400 p-3 rounded mb-4 text-center text-sm">You are logged in! Redirecting...</div>}
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className={`block text-xs uppercase mb-1 ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Username</label>
          <input type="text" value={user} onChange={e=>setUser(e.target.value)} className={`w-full border rounded px-4 py-2 focus:border-neon-purple outline-none ${isLightMode ? 'bg-black/5 border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} required />
        </div>
        <div>
          <label className={`block text-xs uppercase mb-1 ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={pass} onChange={e=>setPass(e.target.value)} className={`w-full border rounded px-4 py-2 pr-10 focus:border-neon-purple outline-none ${isLightMode ? 'bg-black/5 border-black/10 text-black' : 'bg-dark-bg border-white/10 text-white'}`} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${isLightMode ? 'text-black/50 hover:text-black' : 'text-white/50 hover:text-white'}`}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button type="submit" className="w-full bg-neon-purple text-white font-bold py-3 rounded hover:bg-neon-blue hover:shadow-[0_0_15px_var(--color-neon-blue)] transition-all">
          Login
        </button>
        <div className="pt-2 text-center">
          <Link to="/" className={`inline-flex items-center text-sm transition-colors ${isLightMode ? 'text-black/50 hover:text-black' : 'text-white/50 hover:text-white'}`}>
            <HomeIcon className="w-4 h-4 mr-2" />
            Back to Homepage
          </Link>
        </div>
      </form>
    </div>
  );
}
