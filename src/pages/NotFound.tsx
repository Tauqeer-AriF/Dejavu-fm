import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Home, Radio, Calendar, Users, Headphones, Compass, AlertCircle, ArrowLeft } from 'lucide-react';
import { useLogo } from '../hooks/useLogo';

export default function NotFound() {
  const { isLightMode } = useLogo();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-4xl mx-auto px-4 pt-2 sm:pt-6 pb-16 text-center relative overflow-hidden"
    >
      {/* Background Decorative Signal Rings */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none">
        <div className="w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full border border-neon-purple/20 animate-ping" style={{ animationDuration: '4s' }} />
        <div className="w-[200px] h-[200px] sm:w-[350px] sm:h-[350px] rounded-full border border-neon-blue/20 animate-pulse" />
      </div>

      {/* Hero 404 Backdrop Number (Absolute overlay so it doesn't push content down) */}
      <div className="relative flex flex-col items-center justify-center pt-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.06 }}
          transition={{ duration: 0.8 }}
          className="absolute top-[-2rem] sm:top-[-4rem] left-1/2 -translate-x-1/2 text-[9rem] sm:text-[15rem] md:text-[18rem] font-black pointer-events-none uppercase tracking-tighter text-transparent text-stroke select-none leading-none -z-10"
        >
          404
        </motion.div>

        <div className="relative z-10 flex flex-col items-center w-full">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 border border-white/10 flex items-center justify-center mb-5 shadow-2xl backdrop-blur-md"
          >
            <Radio className="w-7 h-7 sm:w-8 sm:h-8 text-neon-purple animate-pulse" />
          </motion.div>

          <span className={`px-3.5 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border font-bold mb-4 flex items-center gap-2 shadow-sm ${
            isLightMode 
              ? 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple' 
              : 'bg-neon-purple/15 border-neon-purple/30 text-neon-purple shadow-[0_0_12px_rgba(176,38,255,0.2)]'
          }`}>
            <AlertCircle className="w-3.5 h-3.5 text-neon-purple" /> 404 Error • Frequency Off-Air
          </span>

          <h1 className={`text-3xl sm:text-5xl md:text-6xl font-display font-black uppercase tracking-tight mb-4 ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            Signal <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">Not Found</span>
          </h1>

          <p className={`text-sm sm:text-base md:text-lg max-w-xl mx-auto font-light leading-relaxed mb-10 ${
            isLightMode ? 'text-slate-600' : 'text-white/60'
          }`}>
            The station frequency or page URL you requested is unavailable, has moved, or was typed incorrectly. Let's get you back on track with the broadcast.
          </p>

          {/* Action Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-neon-purple/25 hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Home className="w-4 h-4" /> Return to Main Stage
            </Link>

            <Link
              to="/watch"
              className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 ${
                isLightMode 
                  ? 'bg-slate-100 hover:bg-slate-200 border-neon-blue/40 text-slate-900 shadow-sm' 
                  : 'bg-white/5 hover:bg-white/10 border-neon-blue/30 text-white hover:border-neon-blue/60 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
              }`}
            >
              <Headphones className="w-4 h-4 text-neon-blue" /> Listen Live Radio
            </Link>
          </div>

          {/* Quick Station Shortcuts */}
          <div className={`w-full max-w-2xl p-6 sm:p-8 rounded-3xl border backdrop-blur-xl transition-all ${
            isLightMode 
              ? 'bg-[#ffffff] border-slate-200 shadow-xl shadow-slate-200/50' 
              : 'bg-[#0D0F1D]/90 border-white/10 shadow-2xl shadow-neon-purple/5'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Compass className="w-4.5 h-4.5 text-neon-blue" />
              <h2 className={`text-xs font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-800' : 'text-white/80'}`}>
                Popular Station Channels
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              <Link
                to="/schedule"
                className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                  isLightMode 
                    ? 'bg-slate-50/80 hover:bg-slate-100 hover:border-neon-purple/50 border-slate-200/80 text-slate-900 shadow-sm' 
                    : 'bg-white/[0.03] hover:bg-white/[0.08] hover:border-neon-purple/40 border-white/5 text-white/90'
                }`}
              >
                <Calendar className="w-4 h-4 text-neon-purple shrink-0" />
                <div>
                  <div className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Schedule</div>
                  <div className={`text-[10px] ${isLightMode ? 'text-slate-500 font-medium' : 'text-white/40'}`}>Shows & Roster</div>
                </div>
              </Link>

              <Link
                to="/djs"
                className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                  isLightMode 
                    ? 'bg-slate-50/80 hover:bg-slate-100 hover:border-neon-blue/50 border-slate-200/80 text-slate-900 shadow-sm' 
                    : 'bg-white/[0.03] hover:bg-white/[0.08] hover:border-neon-blue/40 border-white/5 text-white/90'
                }`}
              >
                <Users className="w-4 h-4 text-neon-blue shrink-0" />
                <div>
                  <div className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>DJs & Hosts</div>
                  <div className={`text-[10px] ${isLightMode ? 'text-slate-500 font-medium' : 'text-white/40'}`}>Resident Artists</div>
                </div>
              </Link>

              <Link
                to="/podcasts"
                className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 col-span-2 sm:col-span-1 ${
                  isLightMode 
                    ? 'bg-slate-50/80 hover:bg-slate-100 hover:border-neon-purple/50 border-slate-200/80 text-slate-900 shadow-sm' 
                    : 'bg-white/[0.03] hover:bg-white/[0.08] hover:border-neon-purple/40 border-white/5 text-white/90'
                }`}
              >
                <Headphones className="w-4 h-4 text-neon-purple shrink-0" />
                <div>
                  <div className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Podcasts</div>
                  <div className={`text-[10px] ${isLightMode ? 'text-slate-500 font-medium' : 'text-white/40'}`}>Catch Up Recordings</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
