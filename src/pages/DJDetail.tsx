import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Instagram, Music, Radio, Calendar, Send, X, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function DJDetail() {
  const { id } = useParams();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/public/settings').then(res => res.json()),
  });

  const { data: djs, isLoading } = useQuery<any[]>({
    queryKey: ['djs'],
    queryFn: () => fetch('/api/public/djs').then(res => res.json())
  });

  const [bookingForm, setBookingForm] = useState({
    client_name: '',
    client_email: '',
    event_date: '',
    message: ''
  });

  const dj = djs?.find(d => d.id === id);
  const featBookings = settings?.feat_bookings !== '0';

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
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
              <img src={dj.image_url} alt={dj.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Artist ID: {dj.id}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">{dj.name}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-[10px] font-black uppercase tracking-widest border border-neon-purple/30 rounded-full">Resident</span>
              <span className="px-3 py-1 bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-full">Underground</span>
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
              {dj.soundcloud && (
                <a href={`https://soundcloud.com/${dj.soundcloud}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-neon-blue/20 border border-white/10 rounded-xl transition-all text-white/40 hover:text-neon-blue">
                  <Music className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingOpen(false)}
              className="absolute inset-0 bg-dark-bg/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl p-8 md:p-12"
            >
              <button onClick={() => setIsBookingOpen(false)} className="absolute top-8 right-8 text-white/40 hover:text-white">
                <X className="w-6 h-6" />
              </button>

              {bookingStatus === 'success' ? (
                <div className="text-center py-12 space-y-6">
                  <div className="w-20 h-20 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-neon-purple" />
                  </div>
                  <h3 className="text-3xl font-display font-black uppercase">Request Sent</h3>
                  <p className="text-white/50">Your booking request has been forwarded to the DJ. Expect a reply soon.</p>
                </div>
              ) : (
                <form onSubmit={handleBooking} className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-display font-black uppercase">Book <span className="text-neon-purple">{dj.name}</span></h2>
                    <p className="text-white/40 text-sm mt-2">Professional inquiry for events and radio guest spots.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Full Name</label>
                      <input 
                        required
                        value={bookingForm.client_name}
                        onChange={e => setBookingForm({...bookingForm, client_name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-neon-purple/50 transition-colors"
                        placeholder="Your Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Email Address</label>
                      <input 
                        required
                        type="email"
                        value={bookingForm.client_email}
                        onChange={e => setBookingForm({...bookingForm, client_email: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-neon-purple/50 transition-colors"
                        placeholder="email@address.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Event Date</label>
                      <input 
                        type="date"
                        value={bookingForm.event_date}
                        onChange={e => setBookingForm({...bookingForm, event_date: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-neon-purple/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Event Details</label>
                      <textarea 
                        rows={4}
                        value={bookingForm.message}
                        onChange={e => setBookingForm({...bookingForm, message: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-neon-purple/50 transition-colors resize-none"
                        placeholder="Tell us about your event..."
                      />
                    </div>
                  </div>

                  <button 
                    disabled={bookingStatus === 'sending'}
                    className="w-full bg-neon-purple hover:bg-neon-purple/80 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-neon-purple/20 flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
                  >
                    {bookingStatus === 'sending' ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
      </AnimatePresence>
    </motion.div>
  );
}
