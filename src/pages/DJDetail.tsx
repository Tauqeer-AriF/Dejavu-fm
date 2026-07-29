import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Instagram, Facebook, Radio, Calendar, Send, X, CheckCircle, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLogo } from '../hooks/useLogo';

const MixcloudIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 640 512" fill="currentColor">
    <path d="M424.43 219.729C416.124 134.727 344.135 68 256.919 68c-72.266 0-136.224 46.516-159.205 114.074-54.545 8.029-96.63 54.822-96.63 111.582 0 62.298 50.668 112.966 113.243 112.966h289.614c52.329 0 94.969-42.362 94.969-94.693 0-45.131-32.118-83.063-74.48-92.2zm-20.489 144.53H114.327c-39.04 0-70.881-31.564-70.881-70.604s31.841-70.604 70.881-70.604c18.827 0 36.548 7.475 49.838 20.766 19.963 19.963 50.133-10.227 30.18-30.18-14.675-14.398-32.672-24.365-52.053-29.349 19.935-44.3 64.79-73.926 114.628-73.926 69.496 0 125.979 56.483 125.979 125.702 0 13.568-2.215 26.857-6.369 39.594-8.943 27.517 32.133 38.939 40.147 13.29 2.769-8.306 4.984-16.889 6.369-25.472 19.381 7.476 33.502 26.303 33.502 48.453 0 28.795-23.535 52.33-52.607 52.33zm235.069-52.33c0 44.024-12.737 86.386-37.102 122.657-4.153 6.092-10.798 9.414-17.72 9.414-16.317 0-27.127-18.826-17.443-32.949 19.381-29.349 29.903-63.682 29.903-99.122s-10.521-69.773-29.903-98.845c-15.655-22.831 19.361-47.24 35.163-23.534 24.366 35.993 37.102 78.356 37.102 122.379zm-70.88 0c0 31.565-9.137 62.021-26.857 88.325-4.153 6.091-10.798 9.136-17.72 9.136-17.201 0-27.022-18.979-17.443-32.948 13.013-19.104 19.658-41.255 19.658-64.513 0-22.981-6.645-45.408-19.658-64.512-15.761-22.986 19.008-47.095 35.163-23.535 17.719 26.026 26.857 56.483 26.857 88.047z" />
  </svg>
);

export default function DJDetail() {
  const { id } = useParams();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const { logoUrl, isLightMode, settings, resolveDjImage } = useLogo();

  const { data: djs, isLoading } = useQuery<any[]>({
    queryKey: ['djs'],
    queryFn: () => fetch('/api/public/djs').then(res => res.json()),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const [bookingForm, setBookingForm] = useState({
    client_name: '',
    client_email: '',
    event_date: '',
    message: ''
  });

  // Lock body scroll when modal is open to prevent background scrolling
  useEffect(() => {
    if (isBookingOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Cleanup function to ensure scroll is restored if component unmounts
    return () => { document.body.style.overflow = 'unset'; };
  }, [isBookingOpen]);

  const dj = djs?.find(d => d.id === id);
  const featBookings = settings?.feat_bookings !== '0';

  useEffect(() => {
    if (dj?.name) {
      fetch('/api/public/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'dj_view', event_key: dj.name })
      }).catch(() => {});
    }
  }, [dj?.name]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStatus('sending');
    try {
      const res = await fetch('/api/public/book-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingForm, dj_id: id })
      });
      if (res.ok) {
        setBookingStatus('success');
        setTimeout(() => {
          setIsBookingOpen(false);
          setBookingStatus('idle');
          setBookingForm({ client_name: '', client_email: '', event_date: '', message: '' });
        }, 3000);
      }
    } catch (err) {
      setBookingStatus('idle');
    }
  };

  if (isLoading) return <div className="py-20 md:py-40 text-center text-white/30">Loading artist profile...</div>;
  if (!dj) return <div className="py-20 md:py-40 text-center text-white/30">Artist not found.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-4 space-y-12"
    >
      <Link to="/djs" className="inline-flex items-center text-white/50 hover:text-neon-purple transition-colors group">
        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Residents
      </Link>

      <div className="glass-panel overflow-hidden rounded-[3rem] border border-white/10 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="flex flex-col md:flex-row gap-8 p-8 md:p-12 relative z-10">
          <div className="w-full md:w-1/3 shrink-0">
            <div className={`aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative group border border-white/10 ${resolveDjImage(dj.image_url) === logoUrl && isLightMode && logoUrl ? (settings?.logo_light || settings?.logo_url ? 'bg-white' : 'bg-transparent') : ''}`}>
              <img src={resolveDjImage(dj.image_url)} alt={dj.name} className={`w-full h-full ${resolveDjImage(dj.image_url) === logoUrl && logoUrl ? 'object-contain p-10' : 'object-cover'}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Artist ID: {dj.id}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">{dj.name}</h1>
            <div className="flex flex-wrap gap-2">
              {dj.badge1 !== undefined && dj.badge1 !== null && dj.badge1 !== "" ? (
                <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-[10px] font-black uppercase tracking-widest border border-neon-purple/30 rounded-full">
                  {dj.badge1}
                </span>
              ) : (
                <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-[10px] font-black uppercase tracking-widest border border-neon-purple/30 rounded-full">
                  Resident
                </span>
              )}
              {dj.badge2 !== undefined && dj.badge2 !== null && dj.badge2 !== "" ? (
                <span className="px-3 py-1 bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-full">
                  {dj.badge2}
                </span>
              ) : (
                <span className="px-3 py-1 bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-full">
                  Underground
                </span>
              )}
              {dj.mixcloud && <span className="px-3 py-1 bg-neon-blue/10 text-neon-blue text-[10px] font-black uppercase tracking-widest border border-neon-blue/20 rounded-full">Archive Gold</span>}
            </div>
            
            <p className="text-white/70 text-lg leading-relaxed font-light">{dj.bio || "Crafting sonic journeys through the deepest layers of electronica and bass culture."}</p>

            <div className="flex flex-wrap gap-4 pt-4">
              {featBookings && (
                <button 
                  onClick={() => setIsBookingOpen(true)}
                  className="flex items-center space-x-2 px-8 py-3 bg-white text-dark-bg hover:bg-neon-purple hover:text-white rounded-2xl transition-all shadow-xl font-black uppercase tracking-widest text-xs"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Book Artist</span>
                </button>
              )}
              
              <Link 
                to={`/podcasts?s=${encodeURIComponent(dj.name)}`}
                className="flex items-center space-x-2 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-white font-black uppercase tracking-widest text-xs"
              >
                <Radio className="w-5 h-5" />
                <span>Podcasts</span>
              </Link>
            </div>

            <div className="flex gap-4 pt-4">
              {dj.instagram && (
                <a href={`https://instagram.com/${dj.instagram}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-neon-purple/20 border border-white/10 rounded-xl transition-all text-white/40 hover:text-neon-purple">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {dj.facebook && (
                <a href={dj.facebook.startsWith('http') ? dj.facebook : `https://facebook.com/${dj.facebook}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-neon-blue/20 border border-white/10 rounded-xl transition-all text-white/40 hover:text-neon-blue">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {dj.mixcloud && (
                <a href={dj.mixcloud.startsWith('http') ? dj.mixcloud : `https://mixcloud.com/${dj.mixcloud}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-sky-500/20 border border-white/10 rounded-xl transition-all text-white/40 hover:text-sky-400" title={`Mixcloud: ${dj.mixcloud}`}>
                  <MixcloudIcon className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal - Portal to body to escape all stacking contexts and z-index issues */}
      {createPortal(
        <AnimatePresence>
          {isBookingOpen && (
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBookingOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={`relative w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl p-8 md:p-12 my-auto border transition-colors ${
                  isLightMode 
                    ? 'bg-[#ffffff] border-zinc-200 text-zinc-900' 
                    : 'bg-[#0A0A0A] border-white/10 text-[#ffffff]'
                }`}
              >
                <button 
                  onClick={() => setIsBookingOpen(false)} 
                  className={`absolute top-8 right-8 transition-colors ${
                    isLightMode ? 'text-zinc-400 hover:text-zinc-900' : 'text-white/40 hover:text-[#ffffff]'
                  }`}
                >
                  <X className="w-6 h-6" />
                </button>

                {bookingStatus === 'success' ? (
                  <div className="text-center py-12 space-y-6">
                    <div className="w-20 h-20 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-10 h-10 text-neon-purple" />
                    </div>
                    <h3 className="text-3xl font-display font-black uppercase">Request Sent</h3>
                    <p className={isLightMode ? 'text-zinc-500' : 'text-white/50'}>
                      Your booking request has been forwarded to the DJ. Expect a reply soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleBooking} className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-display font-black uppercase">Book <span className="text-neon-purple">{dj.name}</span></h2>
                      <p className={`text-sm mt-2 transition-colors ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>
                        Professional inquiry for events and radio guest spots.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ml-2 transition-colors ${
                          isLightMode ? 'text-zinc-500' : 'text-white/40'
                        }`}>Full Name</label>
                        <input 
                          required
                          value={bookingForm.client_name}
                          onChange={e => setBookingForm({...bookingForm, client_name: e.target.value})}
                          className={`w-full rounded-2xl px-6 py-4 focus:outline-none focus:border-neon-purple/50 transition-all ${
                            isLightMode 
                              ? 'bg-zinc-100/80 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-[#ffffff]' 
                              : 'bg-white/5 border border-white/10 text-[#ffffff] placeholder:text-white/20'
                          }`}
                          placeholder="Your Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ml-2 transition-colors ${
                          isLightMode ? 'text-zinc-500' : 'text-white/40'
                        }`}>Email Address</label>
                        <input 
                          required
                          type="email"
                          value={bookingForm.client_email}
                          onChange={e => setBookingForm({...bookingForm, client_email: e.target.value})}
                          className={`w-full rounded-2xl px-6 py-4 focus:outline-none focus:border-neon-purple/50 transition-all ${
                            isLightMode 
                              ? 'bg-zinc-100/80 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-[#ffffff]' 
                              : 'bg-white/5 border border-white/10 text-[#ffffff] placeholder:text-white/20'
                          }`}
                          placeholder="email@address.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ml-2 transition-colors ${
                          isLightMode ? 'text-zinc-500' : 'text-white/40'
                        }`}>Event Date</label>
                        <div className="relative">
                          <input 
                            type="date"
                            required
                            value={bookingForm.event_date}
                            onChange={e => setBookingForm({...bookingForm, event_date: e.target.value})}
                            className={`w-full rounded-2xl pl-6 pr-12 py-4 focus:outline-none focus:border-neon-purple/50 transition-all text-left min-h-[58px] ${
                              isLightMode 
                                ? 'bg-zinc-100/80 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-[#ffffff] [color-scheme:light]' 
                                : 'bg-white/5 border border-white/10 text-[#ffffff] placeholder:text-white/20 [color-scheme:dark]'
                            } [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                          />
                          <div className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                            isLightMode ? 'text-zinc-400' : 'text-white/40'
                          }`}>
                            <Calendar className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ml-2 transition-colors ${
                          isLightMode ? 'text-zinc-500' : 'text-white/40'
                        }`}>Event Details</label>
                        <textarea 
                          rows={4}
                          value={bookingForm.message}
                          onChange={e => setBookingForm({...bookingForm, message: e.target.value})}
                          className={`w-full rounded-2xl px-6 py-4 focus:outline-none focus:border-neon-purple/50 transition-all resize-none ${
                            isLightMode 
                              ? 'bg-zinc-100/80 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-[#ffffff]' 
                              : 'bg-white/5 border border-white/10 text-[#ffffff] placeholder:text-white/20'
                          }`}
                          placeholder="Tell us about your event..."
                        />
                      </div>
                    </div>

                    <button 
                      disabled={bookingStatus === 'sending'}
                      className="w-full bg-neon-purple hover:bg-neon-purple/80 text-[#ffffff] py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-neon-purple/20 flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
                    >
                      {bookingStatus === 'sending' ? (
                        <div className="w-5 h-5 border-2 border-[#ffffff] rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>Send Booking Request</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
