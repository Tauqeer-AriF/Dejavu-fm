import { motion } from 'motion/react';

export default function About() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-12 pb-20"
    >
      <div className="space-y-6 text-center pt-8">
        <h1 className="text-4xl md:text-6xl font-display font-bold uppercase tracking-tighter glow-text">
          About <span className="text-neon-purple">DejavuFM</span>
        </h1>
        <p className="text-xl md:text-2xl text-neon-blue font-medium mt-4">
          The Contemporary sounds of UK Underground Music.
        </p>
      </div>

      <div className="glass-panel p-8 md:p-12 rounded-3xl space-y-8 text-lg md:text-xl text-white/80 leading-relaxed font-light">
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

        <div className="pt-8 mt-8 border-t border-white/10 text-center">
          <p className="text-2xl font-display font-bold text-white uppercase tracking-widest">
            Know your history… know ours…..
          </p>
        </div>
      </div>
    </motion.div>
  );
}
