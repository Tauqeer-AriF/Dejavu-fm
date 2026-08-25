import { motion } from 'motion/react';
import { useLogo } from '../hooks/useLogo';

export default function About() {
  const { isLightMode } = useLogo();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="front-page-about max-w-4xl mx-auto space-y-16 pb-20 py-12 px-4 sm:px-6"
    >
      <div className="relative text-center space-y-6 max-w-4xl mx-auto mb-20">
        <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 0.1 }}
           transition={{ duration: 1 }}
           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[4rem] sm:text-[10rem] md:text-[16rem] font-black pointer-events-none uppercase tracking-tighter w-full text-transparent text-stroke opacity-10 select-none whitespace-nowrap overflow-hidden"
        >
          About Us
        </motion.div>
        <h1 className={`text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase tracking-tighter relative z-10 drop-shadow-2xl ${
          isLightMode ? 'text-slate-900' : 'text-white'
        }`}>
          About <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">dejavufm</span>
        </h1>
        <p className={`text-base md:text-lg font-light tracking-wide relative z-10 max-w-2xl mx-auto border-t pt-8 transition-colors ${
          isLightMode ? 'border-black/5 text-slate-500' : 'border-white/5 text-white/50'
        }`}>
          The Contemporary sounds of UK Underground Music. Championing independent culture for decades.
        </p>
      </div>

      <div className={`glass-panel p-8 md:p-12 rounded-3xl space-y-8 text-base md:text-lg leading-relaxed font-light transition-colors ${
        isLightMode ? 'text-slate-700 bg-white/50 border-black/10' : 'text-white/80 border-white/5 bg-black/40'
      }`}>
        <p>
          With over <span className="text-neon-purple font-semibold">30 years</span> under our belt, dejavufm is the UK’s most influential underground music platform.
        </p>
        
        <p>
          dejavufm has been the undisputed champion at pioneering London’s new underground music genres since its beginning, where a large chunk of the UK’s top and legendary DJ’s, Artist’s & Producers, who have since broken into the mainstream market, were first brought to you courtesy of the mighty dejavufm.
        </p>
        
        <p>
          We broadcast black music entertainment by way of live DJ shows and mixes, live band and artist music lounge sessions and talk based debate shows.
        </p>
        
        <p>
          Making use of modern technology and still continue to boast the ability to find the stars of tomorrow and showcase the best in new and independent artist and music.
        </p>

        <div className={`pt-8 mt-8 border-t text-center ${isLightMode ? 'border-black/5' : 'border-white/10'}`}>
          <p className="text-xl md:text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue uppercase tracking-widest">
            Know your history… know ours…..
          </p>
        </div>
      </div>
    </motion.div>
  );
}

