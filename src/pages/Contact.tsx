import { motion } from 'motion/react';
import { Mail, Phone, MapPin, CheckCircle2, Send } from 'lucide-react';
import { useLogo } from '../hooks/useLogo';

export default function Contact() {
  const { isLightMode } = useLogo();
  const advertisingChannels = [
    "Various Banner Placements and Hyperlinks within our Website and other social media.",
    "Audio adverts via our radio stream.",
    "Advertising/Sponsorship via our YouTube Video’s.",
    "Mail Outs to our subscribed users via email Newsletter.",
    "Sponsorship through one of our DJ’s who will help promote your product in Live Shows/Podcasts, Social Network and Events.",
    "Creating a features post on our site which is aggregated to various social networks.",
    "Posting on our events calendar."
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="front-page-contact max-w-4xl mx-auto space-y-16 pb-20 py-12"
    >
      <div className="relative text-center space-y-6 max-w-4xl mx-auto px-4 mb-20">
        <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 0.1 }}
           transition={{ duration: 1 }}
           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[4rem] sm:text-[10rem] md:text-[16rem] font-black pointer-events-none uppercase tracking-tighter w-full text-transparent text-stroke opacity-10 select-none whitespace-nowrap overflow-hidden"
        >
          Contact
        </motion.div>
        <h1 className={`text-4xl sm:text-6xl md:text-8xl font-display font-black uppercase tracking-tighter relative z-10 drop-shadow-2xl ${
          isLightMode ? 'text-slate-900' : 'text-white'
        }`}>
          Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">Touch</span>
        </h1>
        <p className={`text-base md:text-lg font-light tracking-wide relative z-10 max-w-2xl mx-auto border-t pt-8 transition-colors ${
          isLightMode ? 'border-black/5 text-slate-500' : 'border-white/5 text-white/50'
        }`}>
          For advertising on dejavufm, contact our sales team for a tailor made package to suit your business needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        <motion.div whileHover="hover" className={`glass-panel p-8 rounded-3xl space-y-6 flex flex-col items-center text-center relative overflow-hidden transition-colors ${
          isLightMode ? 'bg-white border-black/10' : 'border-white/5 bg-black/40'
        }`}>
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            initial={{ x: '-150%' }}
          />
          <div className="w-16 h-16 rounded-2xl bg-neon-purple/20 flex items-center justify-center text-neon-purple shadow-[0_0_20px_rgba(176,38,255,0.2)] relative z-10">
            <Mail className="w-8 h-8" />
          </div>
          <div className="relative z-10">
            <h3 className={`text-xl font-display font-black uppercase tracking-wider mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Email Us</h3>
            <a href="mailto:info@dejavufm.com" className="text-neon-blue hover:underline text-lg font-mono">info@dejavufm.com</a>
          </div>
        </motion.div>

        <motion.div whileHover="hover" className={`glass-panel p-8 rounded-3xl space-y-6 flex flex-col items-center text-center relative overflow-hidden transition-colors ${
          isLightMode ? 'bg-white border-black/10' : 'border-white/5 bg-black/40'
        }`}>
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            initial={{ x: '-150%' }}
          />
          <div className="w-16 h-16 rounded-2xl bg-neon-blue/20 flex items-center justify-center text-neon-blue shadow-[0_0_20px_rgba(38,150,255,0.2)] relative z-10">
            <Send className="w-8 h-8" />
          </div>
          <div className="relative z-10">
            <h3 className={`text-xl font-display font-black uppercase tracking-wider mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Advertising</h3>
            <p className={isLightMode ? 'text-slate-500' : 'text-white/60'}>No obligations info</p>
          </div>
        </motion.div>

        <motion.div whileHover="hover" className={`glass-panel p-8 rounded-3xl space-y-6 flex flex-col items-center text-center relative overflow-hidden transition-colors ${
          isLightMode ? 'bg-white border-black/10' : 'border-white/5 bg-black/40'
        }`}>
          <motion.div
            className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
            variants={{ hover: { x: ['-150%', '150%'] } }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
            initial={{ x: '-150%' }}
          />
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] relative z-10">
            <CheckCircle2 className="w-8 h-8 text-neon-purple" />
          </div>
          <div className="relative z-10">
            <h3 className={`text-xl font-display font-black uppercase tracking-wider mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Rates</h3>
            <p className={isLightMode ? 'text-slate-500' : 'text-white/60'}>Competitive Pricing</p>
          </div>
        </motion.div>
      </div>

      <motion.div whileHover="hover" className={`glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden transition-colors mx-4 ${
        isLightMode ? 'bg-white border-black/10' : 'border-white/5 bg-black/40'
      }`}>
        <motion.div
          className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-0"
          variants={{ hover: { x: ['-100%', '100%'] } }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          initial={{ x: '-100%' }}
        />
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-blue/10 blur-[100px] -z-10"></div>
        
        <h2 className={`text-3xl font-display font-black uppercase tracking-tighter mb-8 relative z-10 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
          Our Advertising <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">Streams</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {advertisingChannels.map((channel, index) => (
            <div key={index} className="flex items-start space-x-4 group">
              <div className="mt-1.5 w-5 h-5 rounded-full border border-neon-blue/50 flex items-center justify-center flex-shrink-0 group-hover:bg-neon-blue transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-blue group-hover:bg-white"></div>
              </div>
              <p className={`transition-colors leading-relaxed ${isLightMode ? 'text-slate-600 group-hover:text-slate-900' : 'text-white/80 group-hover:text-white'}`}>{channel}</p>
            </div>
          ))}
        </div>

        <div className={`mt-12 p-6 rounded-2xl border text-center relative z-10 transition-colors ${
          isLightMode ? 'bg-black/[0.02] border-black/10' : 'bg-white/5 border-white/10'
        }`}>
          <p className={`text-lg italic font-light ${isLightMode ? 'text-slate-700' : 'text-white/90'}`}>
            "If you’re interested in an advertising campaign, you can get in touch for more information with no obligations, you might be pleasantly surprised at our rates!"
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

