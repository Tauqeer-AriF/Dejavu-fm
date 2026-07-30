import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLogo } from '../hooks/useLogo';
import { Shield, Lock, Eye, CheckCircle, Mail, HelpCircle, FileText, ChevronRight } from 'lucide-react';

export default function PrivacyPolicy() {
  const { isLightMode, settings } = useLogo();
  const [activeSection, setActiveSection] = useState('intro');

  const appName = settings?.app_name || 'DejavuFM';
  const appTagline = settings?.app_tagline || 'The UKs Most Influential Independent Radio Station';

  const sections = [
    { id: 'intro', title: '1. Introduction', icon: Shield },
    { id: 'data-collect', title: '2. Information We Collect', icon: Eye },
    { id: 'data-use', title: '3. How We Use Your Information', icon: CheckCircle },
    { id: 'media-shoutouts', title: '4. Media & Shoutouts', icon: Lock },
    { id: 'audio-streams', title: '5. Streams & Analytics', icon: HelpCircle },
    { id: 'cookies-auth', title: '6. Cookies & Local Storage', icon: FileText },
    { id: 'data-rights', title: '7. Your Rights & Choice', icon: Shield },
    { id: 'contact', title: '8. Contact Us', icon: Mail }
  ];

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px', // triggers when the section is in the middle-top area of the viewport
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleScrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-6xl mx-auto space-y-16 pb-20 py-12 px-4"
    >
      {/* Visual Display Header */}
      <div className="relative text-center space-y-6 max-w-4xl mx-auto mb-16">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.05 }}
          transition={{ duration: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[4rem] sm:text-[10rem] md:text-[14rem] font-black pointer-events-none uppercase tracking-tighter w-full text-transparent text-stroke opacity-10 select-none whitespace-nowrap overflow-hidden"
        >
          Privacy
        </motion.div>
        <h1 className={`text-4xl sm:text-6xl md:text-7xl font-display font-black uppercase tracking-tighter relative z-10 drop-shadow-2xl ${
          isLightMode ? 'text-slate-900' : 'text-white'
        }`}>
          Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">Policy</span>
        </h1>
        <p className={`text-base md:text-lg font-light tracking-wide relative z-10 max-w-2xl mx-auto border-t pt-8 transition-colors ${
          isLightMode ? 'border-black/5 text-slate-500' : 'border-white/5 text-white/50'
        }`}>
          How we safeguard your digital footprints on <strong>{appName}</strong>. Your privacy is paramount.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
        {/* Sticky Sidebar Navigation */}
        <div className="hidden lg:block lg:col-span-1 sticky top-8 z-30 self-start h-fit space-y-2">
          <div className={`p-4 rounded-2xl border ${
            isLightMode ? 'bg-slate-50 border-black/5 text-slate-900' : 'bg-black/30 border-white/5 text-white'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 block mb-4">Table of Contents</span>
            <div className="space-y-1">
              {sections.map((sec) => {
                const SecIcon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => handleScrollTo(sec.id)}
                    className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl transition-all group ${
                      isActive 
                        ? 'bg-gradient-to-r from-neon-purple/20 to-neon-blue/10 text-neon-purple font-semibold border-l-2 border-neon-purple pl-2.5' 
                        : isLightMode 
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' 
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SecIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-neon-purple' : 'opacity-50'}`} />
                      <span className="text-xs font-medium truncate">{sec.title}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform opacity-0 group-hover:opacity-100 ${
                      isActive ? 'text-neon-purple opacity-100' : ''
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="lg:col-span-3 space-y-12">
          {/* Section 1: Introduction */}
          <section id="intro" className={`glass-panel p-8 rounded-3xl space-y-5 transition-colors scroll-mt-28 ${
            isLightMode ? 'bg-white/50 border-black/10 text-slate-700' : 'bg-black/40 border-white/5 text-white/80'
          }`}>
            <h2 className={`text-2xl font-display font-black uppercase tracking-tight flex items-center gap-3 ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              <Shield className="w-6 h-6 text-neon-purple" />
              1. Introduction
            </h2>
            <div className="border-t border-white/5 pt-4 space-y-4 text-sm md:text-base leading-relaxed font-light">
              <p>
                Welcome to <strong>{appName}</strong> ("we," "our," "us"). This Privacy Policy describes how we collect, use, process, and share your personal information when you access our broadcasting platform, use our interactive chatrooms, submit media, register for bookings, or participate in live events.
              </p>
              <p>
                As a leading independent radio broadcaster in London and globally, we believe in radical transparency. We do not sell or lease your personal information. Our goal is to connect music creators with audiences while establishing the highest tier of security for our digital workspace.
              </p>
            </div>
          </section>

          {/* Section 2: Information We Collect */}
          <section id="data-collect" className={`glass-panel p-8 rounded-3xl space-y-5 transition-colors scroll-mt-28 ${
            isLightMode ? 'bg-white/50 border-black/10 text-slate-700' : 'bg-black/40 border-white/5 text-white/80'
          }`}>
            <h2 className={`text-2xl font-display font-black uppercase tracking-tight flex items-center gap-3 ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              <Eye className="w-6 h-6 text-neon-blue" />
              2. Information We Collect
            </h2>
            <div className="border-t border-white/5 pt-4 space-y-4 text-sm md:text-base leading-relaxed font-light">
              <p>
                We collect personal information directly from you, automatically through your device interactions, and occasionally from third-party services.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Account Information:</strong> When you register on {appName} to use the Chat room, we collect your username, email address, password hash, and avatar choices.
                </li>
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>User-Generated Content:</strong> Any message, custom avatar, shoutout request, or public comment you send in our chat rooms or studio portals.
                </li>
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Media Attachments:</strong> File uploads for shoutout selections (images, video clips, and vocal clips) processed by our servers.
                </li>
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Device and Interaction Information:</strong> We log connection parameters, local timestamps, IP addresses, browser types, and operating systems to prevent security breaches and maintain stream handshakes.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: How We Use Your Information */}
          <section id="data-use" className={`glass-panel p-8 rounded-3xl space-y-5 transition-colors scroll-mt-28 ${
            isLightMode ? 'bg-white/50 border-black/10 text-slate-700' : 'bg-black/40 border-white/5 text-white/80'
          }`}>
            <h2 className={`text-2xl font-display font-black uppercase tracking-tight flex items-center gap-3 ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              3. How We Use Your Information
            </h2>
            <div className="border-t border-white/5 pt-4 space-y-4 text-sm md:text-base leading-relaxed font-light">
              <p>
                Your data is strictly utilized for the functional execution of {appName}'s services:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Providing high-fidelity, adaptive live audio and video streaming on your web browser or mobile client.</li>
                <li>Powering live chatroom interactions, ensuring message indexing, and displaying real-time listener counts.</li>
                <li>Transmitting shoutouts directly to the on-air DJ's dashboard interface.</li>
                <li>Providing analytics to help our engineers optimize server loads during peak listening hours.</li>
                <li>Detecting, preventing, and prosecuting disruptive activities, fraudulent requests, or unauthorized bot access.</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Media & Shoutouts */}
          <section id="media-shoutouts" className={`glass-panel p-8 rounded-3xl space-y-5 transition-colors scroll-mt-28 ${
            isLightMode ? 'bg-white/50 border-black/10 text-slate-700' : 'bg-black/40 border-white/5 text-white/80'
          }`}>
            <h2 className={`text-2xl font-display font-black uppercase tracking-tight flex items-center gap-3 ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              <Lock className="w-6 h-6 text-rose-400" />
              4. Media & Shoutouts
            </h2>
            <div className="border-t border-white/5 pt-4 space-y-4 text-sm md:text-base leading-relaxed font-light">
              <p>
                When you upload images, sound bytes, or short videos to submit as shoutouts, our backend handles these securely:
              </p>
              <p>
                We run optimization algorithms (such as converting image files to light `.webp` files) and store media inside a secure `/uploads` directory on our server. Submissions are delivered to on-air DJs and broadcast strictly inside the context of the requested show.
              </p>
              <p>
                Our platform enforces an automatic media deletion cleanup timer (configured inside our system settings) that periodically purges older or orphaned files from the server, keeping storage clean and lightweight.
              </p>
            </div>
          </section>

          {/* Section 5: Streams & Analytics */}
          <section id="audio-streams" className={`glass-panel p-8 rounded-3xl space-y-5 transition-colors scroll-mt-28 ${
            isLightMode ? 'bg-white/50 border-black/10 text-slate-700' : 'bg-black/40 border-white/5 text-white/80'
          }`}>
            <h2 className={`text-2xl font-display font-black uppercase tracking-tight flex items-center gap-3 ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              <HelpCircle className="w-6 h-6 text-neon-purple" />
              5. Streams & Analytics
            </h2>
            <div className="border-t border-white/5 pt-4 space-y-4 text-sm md:text-base leading-relaxed font-light">
              <p>
                To provide premium listening services, our audio player relies on connections to Icecast/SomaFM media relays. When streaming, your IP address is processed momentarily by the streaming client to feed audio buffers.
              </p>
              <p>
                We do not track precise, individual geolocation positions. We translate IP addresses into generalized geographical statistics (such as City and Country levels) via lightweight, non-tracking APIs. This lets us generate a global reach dashboard for our creators without violating your individual privacy.
              </p>
            </div>
          </section>

          {/* Section 6: Cookies & Local Storage */}
          <section id="cookies-auth" className={`glass-panel p-8 rounded-3xl space-y-5 transition-colors scroll-mt-28 ${
            isLightMode ? 'bg-white/50 border-black/10 text-slate-700' : 'bg-black/40 border-white/5 text-white/80'
          }`}>
            <h2 className={`text-2xl font-display font-black uppercase tracking-tight flex items-center gap-3 ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              <FileText className="w-6 h-6 text-neon-blue" />
              6. Cookies & Local Storage
            </h2>
            <div className="border-t border-white/5 pt-4 space-y-4 text-sm md:text-base leading-relaxed font-light">
              <p>
                Our server and client use local storage technology for session tracking and user choices:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Authentication Tokens:</strong> Secure HTTP-only cookies (`user_token` or `admin_token`) containing JSON Web Tokens (JWT) are stored securely on your browser. These keep you logged in to chat room features across sessions.
                </li>
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Preferences:</strong> Client-side keys in `localStorage` remember choices like theme settings (Light vs. Dark mode) and player configurations.
                </li>
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Tab Sessions:</strong> Temporary browser storage (`sessionStorage`) coordinates Socket.IO handshakes to prevent multiple connections from a single device, minimizing system load.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 7: Your Rights & Choices */}
          <section id="data-rights" className={`glass-panel p-8 rounded-3xl space-y-5 transition-colors scroll-mt-28 ${
            isLightMode ? 'bg-white/50 border-black/10 text-slate-700' : 'bg-black/40 border-white/5 text-white/80'
          }`}>
            <h2 className={`text-2xl font-display font-black uppercase tracking-tight flex items-center gap-3 ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              <Shield className="w-6 h-6 text-emerald-400" />
              7. Your Rights & Choice
            </h2>
            <div className="border-t border-white/5 pt-4 space-y-4 text-sm md:text-base leading-relaxed font-light">
              <p>
                You hold absolute rights over your electronic data on {appName}:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Access and Portability:</strong> You may request an audit of your chat logs, registered profiles, and bookings on our servers.
                </li>
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Rectification & Profile Updates:</strong> You can modify your username, passwords, profile details, and custom avatar directly from your user dashboard at any time.
                </li>
                <li>
                  <strong className={isLightMode ? 'text-slate-900' : 'text-white'}>Right to Be Forgotten:</strong> You can request immediate, permanent deletion of your chat account and past shoutout records by contacting our data protection support team.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 8: Contact Us */}
          <section id="contact" className={`glass-panel p-8 rounded-3xl space-y-5 transition-colors scroll-mt-28 border-2 ${
            isLightMode 
              ? 'bg-gradient-to-r from-neon-purple/5 to-neon-blue/5 border-neon-purple/20 text-slate-700 shadow-xl' 
              : 'bg-gradient-to-r from-neon-purple/[0.04] to-neon-blue/[0.04] border-neon-purple/30 text-white/80'
          }`}>
            <h2 className={`text-2xl font-display font-black uppercase tracking-tight flex items-center gap-3 ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              <Mail className="w-6 h-6 text-neon-purple" />
              8. Contact Us
            </h2>
            <div className="border-t border-white/5 pt-4 space-y-4 text-sm md:text-base leading-relaxed font-light">
              <p>
                For questions about this Privacy Policy, your user profile data, or to make data deletion requests, you can reach out directly to our Data Protection Officer:
              </p>
              <div className={`p-5 rounded-2xl border ${
                isLightMode ? 'bg-white border-black/10 text-slate-800' : 'bg-black/50 border-white/10 text-white/95'
              }`}>
                <p className="font-semibold text-neon-purple uppercase text-xs tracking-wider mb-2">Station Data Operations & Support</p>
                <p className="text-sm">Email: <a href="mailto:info@dejavufm.com" className="text-neon-blue hover:underline font-medium">info@dejavufm.com</a></p>
                <p className="text-xs opacity-70 mt-3 italic">
                  *We aim to respond to all certified privacy and data export requests within 48 business hours.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
