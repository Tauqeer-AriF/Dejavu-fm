import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLogo } from '../hooks/useLogo';
import { toast } from 'sonner';
import unmutedArchivesImage from '../assets/images/unmuted_archives_1785234146059.jpg';
import { 
  Mail, 
  ArrowLeft, 
  Clock,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Arch421() {
  const { isLightMode, getPageTitle } = useLogo();
  const rawTitle = getPageTitle('arch421', 'ARCH421');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/public/arch421/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email }),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success("Welcome to the movement!", {
        description: "Added to the VIP opening list. Verification sent to " + email,
        duration: 5000,
      });
    } catch (err) {
      setIsSubmitting(false);
      toast.error("Unable to register right now. Please try again later.");
    }
  };

  const infoItems = [
    {
      title: "31 Years of dejavufm History.",
      textColor: "text-neon-purple",
      bgColor: "bg-neon-purple/10 border-neon-purple/20"
    },
    {
      title: "The Telepathy Legacy (Step In Time).",
      textColor: "text-neon-blue",
      bgColor: "bg-neon-blue/10 border-neon-blue/20"
    },
    {
      title: "Intimate Sound & Film Space + Record Shop (Upstairs).",
      textColor: "text-neon-purple",
      bgColor: "bg-neon-purple/10 border-neon-purple/20"
    },
    {
      title: "Sound System & DIY Production Archives.",
      textColor: "text-neon-blue",
      bgColor: "bg-neon-blue/10 border-neon-blue/20"
    },
    {
      title: "The CES Mission: Managed as a Community & Culture Hub.",
      textColor: "text-neon-purple",
      bgColor: "bg-neon-purple/10 border-neon-purple/20"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto px-4 py-6 md:py-12 pb-24 space-y-8 relative"
    >
      {/* Dynamic background element */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-neon-purple/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors group mb-2"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[9px] font-black uppercase tracking-widest border border-red-500/20 animate-pulse flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500"></span>
              SYSTEM LOADING
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
              CODE: ARCH421
            </span>
          </div>
          <h1 className={`text-3xl md:text-5xl font-display font-black uppercase tracking-tighter ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            {rawTitle}
          </h1>
        </div>

        {/* Concise opening banner */}
        <div className={`p-3 rounded-xl flex items-center gap-3 border ${
          isLightMode ? 'bg-slate-50 border-black/10' : 'bg-white/5 border-white/5'
        }`}>
          <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-neon-purple" />
          </div>
          <div>
            <div className={`text-[9px] font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>Opening Date</div>
            <div className={`text-sm font-black uppercase tracking-tight ${isLightMode ? 'text-slate-800' : 'text-white'}`}>June 26</div>
          </div>
        </div>
      </div>

      {/* Main concise 2-column module split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
        
        {/* Left column: Showcase Image */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {/* Unmuted Archives Image: Fitting edge-to-edge perfectly in the box */}
          <div className="aspect-[16/10] w-full rounded-2xl bg-black border border-white/10 overflow-hidden relative flex items-center justify-center">
            <img 
              src={unmutedArchivesImage} 
              alt="Unmuted Archives" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain bg-black"
            />
            {/* Image container */}
          </div>
        </div>

        {/* Right column: VIP Registration form */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className={`p-6 rounded-2xl border relative overflow-hidden h-full flex flex-col justify-between ${
            isLightMode 
              ? 'bg-slate-50/50 border-black/10 shadow-sm' 
              : 'bg-black/30 border-white/5 shadow-xl'
          }`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-purple via-pink-500 to-neon-blue" />
            
            <div className="space-y-4 my-auto">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neon-purple/10 border border-neon-purple/20 text-neon-purple rounded text-[9px] font-black uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> VIP ACCESS
              </div>
              
              <div className="space-y-2">
                <h3 className={`text-xl font-display font-black uppercase tracking-tight leading-none ${
                  isLightMode ? 'text-slate-900' : 'text-white'
                }`}>
                  Join the movement.
                </h3>
                <p className={`text-xs font-light leading-relaxed ${
                  isLightMode ? 'text-slate-500' : 'text-white/50'
                }`}>
                  Get the opening VIP information and secure priority access for June 26.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.form 
                    key="vip-mini-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmitted} 
                    className="space-y-3 pt-2"
                  >
                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-wider mb-1.5 ${
                        isLightMode ? 'text-slate-500' : 'text-white/40'
                      }`}>
                        Name
                      </label>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Wayne Smith" 
                        className={`w-full px-3.5 py-2.5 rounded-lg border font-medium text-xs transition-all focus:outline-none focus:ring-2 focus:ring-neon-purple/30 ${
                          isLightMode 
                            ? 'bg-[#ffffff] border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-[#ffffff] [color-scheme:light]' 
                            : 'bg-black/50 border-white/10 text-white placeholder:text-white/30 [color-scheme:dark]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[9px] font-black uppercase tracking-wider mb-1.5 ${
                        isLightMode ? 'text-slate-500' : 'text-white/40'
                      }`}>
                        Email
                      </label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. wayne@dejavu.fm" 
                        className={`w-full px-3.5 py-2.5 rounded-lg border font-medium text-xs transition-all focus:outline-none focus:ring-2 focus:ring-neon-purple/30 ${
                          isLightMode 
                            ? 'bg-[#ffffff] border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-[#ffffff] [color-scheme:light]' 
                            : 'bg-black/50 border-white/10 text-white placeholder:text-white/30 [color-scheme:dark]'
                        }`}
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-lg bg-neon-purple hover:bg-neon-purple/90 text-white font-black uppercase text-[10px] tracking-widest shadow-[0_5px_15px_rgba(176,38,255,0.2)] hover:shadow-[0_8px_20px_rgba(176,38,255,0.3)] hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isSubmitting ? "TRANSMITTING..." : "GET OPENING VIP DETAILS"}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="vip-mini-success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto text-green-400">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-display font-black text-white uppercase">REGISTRATION SECURED</h4>
                      <p className={`text-[11px] leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-white/60'}`}>
                        Thank you, {name}! Your spot has been secured. Details will arrive shortly at <span className="text-neon-purple font-semibold">{email}</span>.
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsSubmitted(false)}
                      className={`text-[9px] font-black uppercase tracking-wider underline hover:text-white ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}
                    >
                      Register another name
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

      {/* Full Width: Information Section */}
      <div className="space-y-4 pt-4 relative z-10">
        <h2 className={`text-lg font-display font-black uppercase tracking-wider ${
          isLightMode ? 'text-slate-800' : 'text-white'
        }`}>
          Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {infoItems.map((item, index) => {
            return (
              <div 
                key={index} 
                className={`flex items-start gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.01] ${
                  isLightMode 
                    ? 'bg-slate-50/50 border-black/10 hover:border-black/20' 
                    : 'bg-black/20 border-white/5 hover:border-white/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-display font-black text-sm tracking-tight ${item.bgColor} ${item.textColor}`}>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="space-y-1 pt-0.5">
                  <p className={`text-sm font-semibold tracking-tight leading-snug ${
                    isLightMode ? 'text-slate-800' : 'text-white'
                  }`}>
                    {item.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
