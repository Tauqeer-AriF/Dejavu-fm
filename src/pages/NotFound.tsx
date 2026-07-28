import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Home, Radio, Calendar, Users, Headphones, Compass, AlertCircle, ArrowLeft } from 'lucide-react';
import { useLogo } from '../hooks/useLogo';

export default function NotFound() {
  const { isLightMode } = useLogo();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center relative overflow-hidden"
    >
      {/* Background Decorative Signal Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none">
        <div className="w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full border border-neon-purple/20 animate-ping" style={{ animationDuration: '4s' }} />
        <div className="w-[200px] h-[200px] sm:w-[350px] sm:h-[350px] rounded-full border border-neon-blue/20 animate-pulse" />
      </div>

      {/* Hero 404 Backdrop Number */}
      <div className="relative mb-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.08 }}
          transition={{ duration: 0.8 }}
          className="text-[8rem] sm:text-[14rem] md:text-[20rem] font-black pointer-events-none uppercase tracking-tighter w-full text-transparent text-stroke select-none leading-none"
        >
          404
        </motion.div>

        <div className="relative z-10 -mt-20 sm:-mt-36 md:-mt-48 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-neon-purple/20 to-neon-blue/20 border border-white/10 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-md"
          >
            <Radio className="w-8 h-8 sm:w-10 sm:h-10 text-neon-purple animate-pulse" />
          </motion.div>

          <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-400 font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" /> 404 Error • Frequency Off-Air
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
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-neon-purple to-violet-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-neon-purple/25 hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Home className="w-4 h-4" /> Return to Main Stage
            </Link>

            <Link
              to="/watch"
              className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 ${
                isLightMode 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <Headphones className="w-4 h-4 text-neon-blue" /> Listen Live Radio
            </Link>
          </div>

          {/* Quick Station Shortcuts */}
          <div className={`w-full max-w-2xl p-6 sm:p-8 rounded-3xl border backdrop-blur-xl transition-all ${
            isLightMode ? 'bg-white/70 border-slate-200/80 shadow-xl' : 'bg-[#0D0F1D]/80 border-white/10 shadow-2xl'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Compass className={`w-4 h-4 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`} />
              <h2 className={`text-xs font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-700' : 'text-white/70'}`}>
                Popular Station Channels
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              <Link
                to="/schedule"
                className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                  isLightMode 
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' 
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-white/90'
                }`}
              >
                <Calendar className="w-4 h-4 text-neon-purple shrink-0" />
                <div>
                  <div className="text-xs font-bold">Schedule</div>
                  <div className={`text-[10px] ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Shows & Roster</div>
                </div>
              </Link>

              <Link
                to="/djs"
                className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                  isLightMode 
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' 
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-white/90'
                }`}
              >
                <Users className="w-4 h-4 text-neon-blue shrink-0" />
                <div>
                  <div className="text-xs font-bold">DJs & Hosts</div>
                  <div className={`text-[10px] ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Resident Artists</div>
                </div>
              </Link>

              <Link
                to="/podcasts"
                className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 col-span-2 sm:col-span-1 ${
                  isLightMode 
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' 
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-white/90'
                }`}
              >
                <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Podcasts</div>
                  <div className={`text-[10px] ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>Catch Up Recordings</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
