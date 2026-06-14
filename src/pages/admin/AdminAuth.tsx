import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { LogOut, Settings, Users, Calendar, Eye, EyeOff, UserCog, User, Home as HomeIcon, MessageSquare, Menu, X, Radio, BarChart3, Globe, TrendingUp, PlayCircle, Ghost, Shield, FileText, Image as ImageIcon, Plus, Search, Upload, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "motion/react";
import { fetchAdmin } from "./adminApi";
import { ImageUploadField } from "./ImageUploadField";

export function AdminSecretGate({ onPass, onLogin }: { onPass: () => void; onLogin: (user?: any) => void }) {
  const [passedSecret, setPassedSecret] = useState(() => sessionStorage.getItem('admin_secret_passed') === 'true');
  const [answer, setAnswer] = useState("");
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

      if (res.ok) {
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
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-neon-purple" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-black uppercase tracking-tight">Security Check</h2>
            <p className="text-white/40 text-sm font-medium">Identify yourself to proceed to the control center.</p>
          </div>
        </div>

        <form onSubmit={handleSecretSubmit} className="space-y-6">
          <div className="space-y-2 text-left">
            <label className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-4">Authorized Name</label>
            <div className="relative">
              <input
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Who are you?"
                className="w-full bg-white/5 border border-white/10 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple rounded-2xl px-6 py-4 text-white placeholder:text-white/10 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={isVerifying || !answer.trim()}
                className="absolute right-2 top-2 bottom-2 px-4 bg-white text-dark-bg rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isVerifying ? <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent animate-spin rounded-full" /> : <Shield className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="pt-2">
            <Link to="/" className="text-xs text-white/20 hover:text-white transition-colors uppercase tracking-widest font-black">
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
      <h2 className="text-4xl font-display font-black mb-8 text-center tracking-tight uppercase">Admin <span className="text-neon-purple">Portal</span></h2>
      {err && !success && <div className="bg-red-500/20 text-red-500 p-3 rounded mb-4 text-center text-sm">{err}</div>}
      {success && <div className="bg-green-500/20 border border-green-500 text-green-400 p-3 rounded mb-4 text-center text-sm">You are logged in! Redirecting...</div>}
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-xs uppercase text-white/50 mb-1">Username</label>
          <input type="text" value={user} onChange={e=>setUser(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 focus:border-neon-purple outline-none" required />
        </div>
        <div>
          <label className="block text-xs uppercase text-white/50 mb-1">Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={pass} onChange={e=>setPass(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded px-4 py-2 pr-10 focus:border-neon-purple outline-none" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors focus:outline-none">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button type="submit" className="w-full bg-neon-purple text-white font-bold py-3 rounded hover:bg-neon-blue hover:shadow-[0_0_15px_#00d2ff] transition-all">
          Login
        </button>
        <div className="pt-2 text-center">
          <Link to="/" className="inline-flex items-center text-sm text-white/50 hover:text-white transition-colors">
            <HomeIcon className="w-4 h-4 mr-2" />
            Back to Homepage
          </Link>
        </div>
      </form>
    </div>
  );
}
