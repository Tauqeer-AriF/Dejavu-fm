import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Plus, Trash2, Edit3, BarChart2, Radio, Clock, 
  Sparkles, Flame, Check, X, Users, RefreshCw, AlertCircle, 
  ExternalLink, Eye, ArrowUpRight, Search, Play, Award, Image as ImageIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { safeFetchJson } from '../../utils/safeFetch';
import { fetchAdmin } from './adminApi';
import { SpecialEvent, EventSession, EventStatus, EventAnalytics } from '../../types/events';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useLogo } from '../../hooks/useLogo';
import { ImageUploadField } from './ImageUploadField';

export function AdminEvents() {
  const { isLightMode } = useLogo();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<'all' | 'live' | 'scheduled' | 'completed' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Modals & form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [analyticsEventId, setAnalyticsEventId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formTimezone, setFormTimezone] = useState('Europe/London');
  const [formStatus, setFormStatus] = useState<EventStatus>('scheduled');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formGenres, setFormGenres] = useState('House, Garage, Electronic');
  const [formXpMultiplier, setFormXpMultiplier] = useState(2.0);
  const [formBadgeName, setFormBadgeName] = useState('');
  const [formBadgeDesc, setFormBadgeDesc] = useState('');
  const [formBadgeMinutes, setFormBadgeMinutes] = useState(30);
  const [formStreamOverride, setFormStreamOverride] = useState('');

  // Multi-session builder state
  const [formSessions, setFormSessions] = useState<Array<{
    id?: string;
    dj_id?: string;
    dj_name: string;
    session_title: string;
    genre: string;
    start_time: string;
    end_time: string;
  }>>([]);

  // Fetch resident DJs list for session selector
  const { data: residentDjs = [] } = useQuery<any[]>({
    queryKey: ['admin-djs-list'],
    queryFn: () => safeFetchJson<any[]>('/api/public/djs')
  });

  // Fetch events
  const { data: events = [], isLoading } = useQuery<SpecialEvent[]>({
    queryKey: ['admin-special-events'],
    queryFn: async () => {
      const res = await fetchAdmin('/api/admin/events');
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Analytics for selected event
  const { data: eventAnalytics, isLoading: isAnalyticsLoading } = useQuery<EventAnalytics>({
    queryKey: ['admin-event-analytics', analyticsEventId],
    queryFn: async () => {
      if (!analyticsEventId) return null as any;
      const res = await fetchAdmin(`/api/admin/events/${analyticsEventId}/analytics`);
      if (!res.ok) return null as any;
      return res.json();
    },
    enabled: !!analyticsEventId
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const handleOpenCreateForm = () => {
    setEditingEventId(null);
    setFormTitle('');
    setFormSlug('');
    setFormShortDesc('');
    setFormDesc('');
    setFormCoverImage('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80');
    
    // Default start tomorrow 20:00, end tomorrow 24:00
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(20, 0, 0, 0);
    const endTomorrow = new Date(tomorrow.getTime() + 4 * 3600000);

    setFormStartTime(tomorrow.toISOString().slice(0, 16));
    setFormEndTime(endTomorrow.toISOString().slice(0, 16));
    setFormTimezone('Europe/London');
    setFormStatus('scheduled');
    setFormIsFeatured(true);
    setFormGenres('House, UK Garage, Deep House');
    setFormXpMultiplier(2.0);
    setFormBadgeName('');
    setFormBadgeDesc('');
    setFormBadgeMinutes(30);
    setFormStreamOverride('');
    setFormSessions([
      {
        dj_name: 'Resident DJ',
        session_title: 'Opening Warm-up Set',
        genre: 'Deep House',
        start_time: tomorrow.toISOString().slice(0, 16),
        end_time: new Date(tomorrow.getTime() + 2 * 3600000).toISOString().slice(0, 16)
      }
    ]);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (evt: SpecialEvent) => {
    setEditingEventId(evt.id);
    setFormTitle(evt.title);
    setFormSlug(evt.slug || '');
    setFormShortDesc(evt.short_description || '');
    setFormDesc(evt.description || '');
    setFormCoverImage(evt.cover_image || '');
    setFormStartTime(evt.start_time ? new Date(evt.start_time).toISOString().slice(0, 16) : '');
    setFormEndTime(evt.end_time ? new Date(evt.end_time).toISOString().slice(0, 16) : '');
    setFormTimezone(evt.timezone || 'Europe/London');
    setFormStatus(evt.status);
    setFormIsFeatured(evt.is_featured);
    setFormGenres(evt.genres?.join(', ') || '');
    setFormXpMultiplier(evt.xp_multiplier || 1.0);
    setFormBadgeName(evt.badge_name || '');
    setFormBadgeDesc(evt.badge_description || '');
    setFormBadgeMinutes(evt.badge_listen_minutes || 30);
    setFormStreamOverride(evt.stream_override_url || '');
    setFormSessions(
      evt.sessions?.map(s => ({
        id: s.id,
        dj_id: s.dj_id,
        dj_name: s.dj_name,
        session_title: s.session_title,
        genre: s.genre || '',
        start_time: s.start_time ? new Date(s.start_time).toISOString().slice(0, 16) : '',
        end_time: s.end_time ? new Date(s.end_time).toISOString().slice(0, 16) : ''
      })) || []
    );
    setIsFormOpen(true);
  };

  const handleAddSessionRow = () => {
    setFormSessions(prev => [
      ...prev,
      {
        dj_name: 'Guest Selector',
        session_title: 'Live DJ Set',
        genre: 'Electronic',
        start_time: formStartTime,
        end_time: formEndTime
      }
    ]);
  };

  const handleRemoveSessionRow = (index: number) => {
    setFormSessions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSessionFieldChange = (index: number, field: string, value: any) => {
    setFormSessions(prev => prev.map((s, i) => {
      if (i !== index) return s;
      const updated = { ...s, [field]: value };
      if (field === 'dj_name' && residentDjs.length > 0) {
        const match = residentDjs.find(d => d.name.toLowerCase() === value.toLowerCase());
        if (match) {
          updated.dj_id = String(match.id);
        }
      }
      return updated;
    }));
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const genresArray = formGenres
        .split(',')
        .map(g => g.trim())
        .filter(Boolean);

      const payload = {
        title: formTitle.trim(),
        slug: formSlug.trim() || undefined,
        short_description: formShortDesc.trim(),
        description: formDesc.trim(),
        cover_image: formCoverImage.trim(),
        start_time: new Date(formStartTime).toISOString(),
        end_time: new Date(formEndTime).toISOString(),
        timezone: formTimezone,
        status: formStatus,
        is_featured: formIsFeatured,
        genres: genresArray,
        xp_multiplier: Number(formXpMultiplier) || 1.0,
        badge_name: formBadgeName.trim() || undefined,
        badge_description: formBadgeDesc.trim() || undefined,
        badge_listen_minutes: Number(formBadgeMinutes) || 30,
        stream_override_url: formStreamOverride.trim() || undefined,
        sessions: formSessions.map((s, idx) => ({
          dj_id: s.dj_id || undefined,
          dj_name: s.dj_name || 'Guest DJ',
          session_title: s.session_title || 'DJ Set',
          genre: s.genre || '',
          start_time: s.start_time ? new Date(s.start_time).toISOString() : new Date(formStartTime).toISOString(),
          end_time: s.end_time ? new Date(s.end_time).toISOString() : new Date(formEndTime).toISOString(),
          display_order: idx
        }))
      };

      const url = editingEventId ? `/api/admin/events/${editingEventId}` : '/api/admin/events';
      const method = editingEventId ? 'PUT' : 'POST';

      const res = await fetchAdmin(url, {
        method,
        body: payload
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save event');
      }

      toast.success(editingEventId ? 'Event updated successfully' : 'Special event created successfully');
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-special-events'] });
      queryClient.invalidateQueries({ queryKey: ['special-events'] });
    } catch (err: any) {
      toast.error(err.message || 'Error saving event');
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the event "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetchAdmin(`/api/admin/events/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete event');

      toast.success('Event deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-special-events'] });
      queryClient.invalidateQueries({ queryKey: ['special-events'] });
    } catch (err: any) {
      toast.error(err.message || 'Error deleting event');
    }
  };

  const handleStatusChange = async (id: string, status: EventStatus) => {
    try {
      const res = await fetchAdmin(`/api/admin/events/${id}/status`, {
        method: 'PATCH',
        body: { status }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update event status');

      toast.success(`Event status changed to ${status.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ['admin-special-events'] });
      queryClient.invalidateQueries({ queryKey: ['special-events'] });
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    }
  };

  const handleSeedSampleEvents = async () => {
    try {
      const res = await fetchAdmin('/api/admin/events/seed', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed events');
      toast.success('Sample events seeded successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-special-events'] });
      queryClient.invalidateQueries({ queryKey: ['special-events'] });
    } catch (err: any) {
      toast.error('Error seeding events');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      if (activeFilter !== 'all' && evt.status !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return evt.title.toLowerCase().includes(q) || evt.genres?.some(g => g.toLowerCase().includes(q));
      }
      return true;
    });
  }, [events, activeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 ${
        isLightMode ? 'border-gray-200' : 'border-white/10'
      }`}>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-widest mb-2 bg-neon-purple/10 border-neon-purple/30 text-neon-purple">
            <Sparkles className="w-3.5 h-3.5" />
            Special Events Manager
          </div>
          <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-tight font-display ${
            isLightMode ? 'text-gray-900' : 'text-white'
          }`}>
            Special Events & Takeovers
          </h2>
          <p className={`text-xs font-mono mt-1 ${
            isLightMode ? 'text-gray-600' : 'text-white/50'
          }`}>
            Create, schedule, broadcast, and analyse special DJ marathons, guest battles, and genre milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {events.length === 0 && (
            <button
              onClick={handleSeedSampleEvents}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                isLightMode
                  ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700 hover:text-gray-900'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-neon-blue" />
              <span>Seed Samples</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateForm}
            className="px-5 py-2.5 rounded-2xl bg-neon-purple hover:bg-neon-purple/90 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Special Event</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className={`p-1.5 rounded-2xl border flex items-center gap-1 overflow-x-auto ${
          isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-white/[0.03] border-white/10'
        }`}>
          {[
            { id: 'all', label: `All (${events.length})` },
            { id: 'scheduled', label: 'Upcoming' },
            { id: 'live', label: 'Live Now' },
            { id: 'completed', label: 'Completed' },
            { id: 'draft', label: 'Drafts' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(176,38,255,0.4)]'
                  : isLightMode
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`relative rounded-2xl border px-3.5 py-2.5 flex items-center gap-2.5 w-full sm:w-72 transition-all ${
          isLightMode
            ? 'bg-white border-slate-300 text-slate-900 shadow-xs focus-within:border-neon-purple focus-within:ring-2 focus-within:ring-neon-purple/20'
            : 'bg-white/5 border-white/10 text-white focus-within:border-neon-purple focus-within:ring-2 focus-within:ring-neon-purple/20'
        }`}>
          <Search className={`w-4 h-4 shrink-0 ${isLightMode ? 'text-slate-400' : 'text-white/40'}`} />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 shadow-none text-xs p-0 m-0 ${
              isLightMode ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-white/30'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`p-0.5 rounded-full ${isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white'}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Events Table / Card List */}
      {isLoading ? (
        <div className={`p-12 text-center text-xs font-mono uppercase animate-pulse ${
          isLightMode ? 'text-gray-500' : 'text-white/40'
        }`}>
          Loading events...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className={`py-16 text-center rounded-3xl border border-dashed space-y-3 ${
          isLightMode ? 'border-gray-300 bg-gray-50' : 'border-white/10'
        }`}>
          <Calendar className={`w-10 h-10 mx-auto ${isLightMode ? 'text-gray-400' : 'text-white/20'}`} />
          <p className={`text-sm font-bold uppercase tracking-wider ${
            isLightMode ? 'text-gray-700' : 'text-white/60'
          }`}>No special events found</p>
          <button
            onClick={handleOpenCreateForm}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              isLightMode
                ? 'bg-neon-purple text-white hover:opacity-90'
                : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30'
            }`}
          >
            Create your first event
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedEvents.map(evt => (
            <div
              key={evt.id}
              className={`p-5 rounded-3xl border transition-all shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                isLightMode
                  ? 'bg-white border-gray-200 text-gray-900 shadow-gray-200/50 hover:border-gray-300'
                  : 'bg-[#111118] border-white/10 hover:border-white/20 text-white'
              }`}
            >
              {/* Event Info Left */}
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                {/* Cover Image thumbnail */}
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 relative group border ${
                  isLightMode ? 'bg-gray-100 border-gray-200' : 'bg-white/10 border-white/10'
                }`}>
                  <img
                    src={evt.cover_image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80'}
                    alt={evt.title}
                    className="w-full h-full object-cover"
                  />
                  {evt.is_featured && (
                    <div className="absolute top-1 left-1 bg-neon-purple text-white p-0.5 rounded-md shadow">
                      <Sparkles className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Pill */}
                    {evt.status === 'live' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest animate-pulse">
                        Live Broadcast
                      </span>
                    ) : evt.status === 'scheduled' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-neon-blue/15 text-neon-blue border-neon-blue/30">
                        Scheduled
                      </span>
                    ) : evt.status === 'completed' ? (
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        isLightMode ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-white/10 text-white/50 border-transparent'
                      }`}>
                        Completed
                      </span>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        isLightMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        Draft
                      </span>
                    )}

                    {evt.xp_multiplier > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-neon-purple/10 text-neon-purple border border-neon-purple/20">
                        {evt.xp_multiplier}× XP
                      </span>
                    )}

                    <span className={`text-[10px] font-mono ${isLightMode ? 'text-gray-500' : 'text-white/40'}`}>
                      {new Date(evt.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className={`text-base sm:text-lg font-black uppercase tracking-tight truncate ${
                    isLightMode ? 'text-gray-900' : 'text-white'
                  }`}>
                    {evt.title}
                  </h3>

                  <div className={`text-xs flex flex-wrap items-center gap-2 ${
                    isLightMode ? 'text-gray-600' : 'text-white/50'
                  }`}>
                    <span>{evt.sessions?.length || 0} Sessions</span>
                    <span>•</span>
                    <span>{evt.genres?.slice(0, 2).join(', ')}</span>
                    {evt.badge_name && (
                      <>
                        <span>•</span>
                        <span className="text-neon-purple flex items-center gap-1 font-semibold">
                          <Award className="w-3 h-3" /> {evt.badge_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Status Changers & Action Buttons Right */}
              <div className={`flex flex-wrap items-center gap-2.5 lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 ${
                isLightMode ? 'border-gray-200' : 'border-white/5'
              }`}>
                {/* Status Switch Dropdown */}
                <select
                  value={evt.status}
                  onChange={e => handleStatusChange(evt.id, e.target.value as EventStatus)}
                  aria-label="Change event status"
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase outline-none cursor-pointer transition-colors ${
                    isLightMode
                      ? 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <option value="draft" className={isLightMode ? 'bg-white text-gray-900' : 'bg-[#111118] text-white'}>Draft</option>
                  <option value="scheduled" className={isLightMode ? 'bg-white text-gray-900' : 'bg-[#111118] text-white'}>Scheduled</option>
                  <option value="live" className={isLightMode ? 'bg-white text-gray-900' : 'bg-[#111118] text-white'}>Live Broadcast</option>
                  <option value="completed" className={isLightMode ? 'bg-white text-gray-900' : 'bg-[#111118] text-white'}>Completed</option>
                  <option value="cancelled" className={isLightMode ? 'bg-white text-gray-900' : 'bg-[#111118] text-white'}>Cancelled</option>
                </select>

                {/* View Event Page Link */}
                <Link
                  to={`/events/${evt.slug || evt.id}`}
                  target="_blank"
                  title="View Public Page"
                  className={`p-2 rounded-xl border transition-colors ${
                    isLightMode
                      ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700 hover:text-gray-900'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </Link>

                {/* Analytics Button */}
                <button
                  onClick={() => setAnalyticsEventId(evt.id)}
                  title="View Analytics"
                  className="p-2 rounded-xl border transition-colors bg-neon-blue/10 hover:bg-neon-blue/20 border-neon-blue/20 text-neon-blue"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => handleOpenEditForm(evt)}
                  title="Edit Event"
                  className={`p-2 rounded-xl border transition-colors ${
                    isLightMode
                      ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700 hover:text-gray-900'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteEvent(evt.id, evt.title)}
                  title="Delete Event"
                  className={`p-2 rounded-xl border transition-colors ${
                    isLightMode
                      ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                      : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && filteredEvents.length > 0 && totalPages > 1 && (
        <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isLightMode ? 'bg-white border-slate-200 text-slate-700 shadow-xs' : 'bg-[#111118] border-white/10 text-white/70'
        }`}>
          <div className="text-xs font-mono">
            Showing <span className="font-bold text-neon-purple">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
            <span className="font-bold text-neon-purple">{Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)}</span> of{' '}
            <span className="font-bold text-neon-purple">{filteredEvents.length}</span> special events
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                    currentPage === page
                      ? 'bg-neon-purple text-white shadow-sm'
                      : isLightMode
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-white/5 hover:bg-white/10 text-white/70'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
          <div
            onClick={() => setIsFormOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 ${
              isLightMode 
                ? 'bg-white border-black/10 text-black shadow-black/5' 
                : 'bg-[#0f0f15] border-white/15 text-white shadow-black/50'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b pb-4 ${
              isLightMode ? 'border-black/10' : 'border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-neon-purple/10 border border-neon-purple/30 text-neon-purple">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider font-display">
                    {editingEventId ? 'Edit Special Event' : 'Create New Special Event'}
                  </h3>
                  <p className={`text-xs font-mono ${isLightMode ? 'text-black/60' : 'text-white/50'}`}>
                    Configure broadcast timetable, DJ line-up, and gamification multipliers
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormOpen(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isLightMode ? 'bg-black/5 hover:bg-black/10 text-black/60 hover:text-black' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-6">
              {/* Primary Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Event Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Friday Night House Marathon"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${
                        isLightMode 
                          ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple focus:bg-white' 
                          : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                      }`}
                    />
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Custom Slug (URL)</label>
                  <input
                    type="text"
                    placeholder="e.g. friday-night-house-marathon"
                    value={formSlug}
                    onChange={e => setFormSlug(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none font-mono ${
                      isLightMode 
                        ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple focus:bg-white' 
                        : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Genre Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="House, UK Garage, Deep House"
                    value={formGenres}
                    onChange={e => setFormGenres(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${
                      isLightMode 
                        ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple focus:bg-white' 
                        : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                    }`}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <ImageUploadField
                    label="Cover / Banner Image *"
                    value={formCoverImage}
                    onChange={setFormCoverImage}
                    placeholder="https://images.unsplash.com/..."
                    description="Upload a cover graphic, input a web URL, or choose an existing banner from the Media Library."
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Short Summary</label>
                  <input
                    type="text"
                    placeholder="Catch a 6-hour marathon with resident DJs and special guest headliners."
                    value={formShortDesc}
                    onChange={e => setFormShortDesc(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${
                      isLightMode 
                        ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple focus:bg-white' 
                        : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                    }`}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Full Description / Information</label>
                  <textarea
                    rows={3}
                    placeholder="Detailed event information, special announcements, and guest bio..."
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${
                      isLightMode 
                        ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple focus:bg-white' 
                        : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                    }`}
                  />
                </div>
              </div>

              {/* Schedule & Timing */}
              <div className={`p-5 rounded-2xl border space-y-4 ${
                isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/[0.02] border-white/10'
              }`}>
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-neon-blue">
                  <Clock className="w-4 h-4" /> Timetable & Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Start Date/Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${
                        isLightMode
                          ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple'
                          : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>End Date/Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${
                        isLightMode
                          ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple'
                          : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Timezone</label>
                    <select
                      value={formTimezone}
                      onChange={e => setFormTimezone(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${
                        isLightMode
                          ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple'
                          : 'bg-[#111118] border-white/10 text-white focus:border-neon-purple'
                      }`}
                    >
                      <option value="Europe/London" className={isLightMode ? "text-black" : "text-white bg-[#111118]"}>London (GMT/BST)</option>
                      <option value="America/New_York" className={isLightMode ? "text-black" : "text-white bg-[#111118]"}>New York (EST/EDT)</option>
                      <option value="America/Los_Angeles" className={isLightMode ? "text-black" : "text-white bg-[#111118]"}>Los Angeles (PST/PDT)</option>
                      <option value="Europe/Berlin" className={isLightMode ? "text-black" : "text-white bg-[#111118]"}>Berlin / Paris (CET)</option>
                      <option value="Asia/Tokyo" className={isLightMode ? "text-black" : "text-white bg-[#111118]"}>Tokyo (JST)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Status</label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as EventStatus)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${
                        isLightMode
                          ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple'
                          : 'bg-[#111118] border-white/10 text-white focus:border-neon-purple'
                      }`}
                    >
                      <option value="scheduled" className={isLightMode ? "text-black" : "text-white bg-[#111118]"}>Scheduled</option>
                      <option value="live" className={isLightMode ? "text-black" : "text-white bg-[#111118]"}>Live Broadcast</option>
                      <option value="completed" className={isLightMode ? "text-black" : "text-white bg-[#111118]"}>Completed</option>
                      <option value="draft" className={isLightMode ? "text-black" : "text-white bg-[#111118]"}>Draft</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                      isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formIsFeatured}
                        onChange={e => setFormIsFeatured(e.target.checked)}
                        className={`rounded focus:ring-0 ${isLightMode ? 'border-black/20 text-neon-purple' : 'border-white/20 text-neon-purple'}`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider">Highlight as Featured</span>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Stream URL Override (optional)</label>
                    <input
                      type="url"
                      placeholder="Leave blank for standard radio stream"
                      value={formStreamOverride}
                      onChange={e => setFormStreamOverride(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none font-mono ${
                        isLightMode
                          ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple focus:bg-white'
                          : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Gamification & Badges */}
              <div className={`p-5 rounded-2xl border space-y-4 ${
                isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/[0.02] border-white/10'
              }`}>
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-neon-purple">
                  <Flame className="w-4 h-4" /> Gamification & Attendee Badges
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>XP Multiplier</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1.0"
                      max="10.0"
                      value={formXpMultiplier}
                      onChange={e => setFormXpMultiplier(parseFloat(e.target.value) || 1.0)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${
                        isLightMode
                          ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple'
                          : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Unlockable Badge Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Marathon Survivor"
                      value={formBadgeName}
                      onChange={e => setFormBadgeName(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${
                        isLightMode
                          ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple focus:bg-white'
                          : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/50'}`}>Listen Time to Unlock (Minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={formBadgeMinutes}
                      onChange={e => setFormBadgeMinutes(parseInt(e.target.value, 10) || 30)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${
                        isLightMode
                          ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple'
                          : 'bg-white/5 border-white/10 text-white focus:border-neon-purple'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Session Lineup Builder */}
              <div className={`p-5 rounded-2xl border space-y-4 ${
                isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/[0.02] border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-neon-blue" /> Line-up & Timetable Sessions ({formSessions.length})
                  </h4>

                  <button
                    type="button"
                    onClick={handleAddSessionRow}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      isLightMode ? 'bg-black/5 hover:bg-black/10 border-black/10 text-black' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Session</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formSessions.map((sess, idx) => (
                    <div key={idx} className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center gap-3 ${
                      isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isLightMode ? 'bg-black/10 text-black' : 'bg-white/10 text-white'
                      }`}>
                        {idx + 1}
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="DJ Name / Artist"
                          value={sess.dj_name}
                          onChange={e => handleSessionFieldChange(idx, 'dj_name', e.target.value)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs outline-none ${
                            isLightMode 
                              ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple focus:bg-white' 
                              : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                          }`}
                        />

                        <input
                          type="text"
                          placeholder="Session / Set Title"
                          value={sess.session_title}
                          onChange={e => handleSessionFieldChange(idx, 'session_title', e.target.value)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs outline-none ${
                            isLightMode 
                              ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple focus:bg-white' 
                              : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                          }`}
                        />

                        <input
                          type="datetime-local"
                          value={sess.start_time}
                          onChange={e => handleSessionFieldChange(idx, 'start_time', e.target.value)}
                          className={`px-2 py-1.5 rounded-lg border text-[11px] outline-none font-mono ${
                            isLightMode 
                              ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple' 
                              : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                          }`}
                        />

                        <input
                          type="datetime-local"
                          value={sess.end_time}
                          onChange={e => handleSessionFieldChange(idx, 'end_time', e.target.value)}
                          className={`px-2 py-1.5 rounded-lg border text-[11px] outline-none font-mono ${
                            isLightMode 
                              ? 'bg-black/5 border-black/10 text-black focus:border-neon-purple' 
                              : 'bg-black/40 border-white/10 text-white focus:border-neon-purple'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSessionRow(idx)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
                isLightMode ? 'border-black/10' : 'border-white/10'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors ${
                    isLightMode ? 'bg-black/5 hover:bg-black/10 text-black/70 hover:text-black' : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-neon-purple hover:bg-neon-purple/90 text-white text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
                >
                  {editingEventId ? 'Save Changes' : 'Publish Special Event'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* DETAILED ANALYTICS MODAL */}
      {analyticsEventId && createPortal(
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
          <div
            onClick={() => setAnalyticsEventId(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 ${
              isLightMode 
                ? 'bg-white border-black/10 text-black shadow-black/5' 
                : 'bg-[#0f0f15] border-white/15 text-white shadow-black/50'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-4 ${
              isLightMode ? 'border-black/10' : 'border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-neon-blue/10 border border-neon-blue/30 text-neon-blue">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider font-display">Event Broadcast Analytics</h3>
                  <p className={`text-xs font-mono ${isLightMode ? 'text-black/60' : 'text-white/50'}`}>
                    Listener engagement, peak concurrents, and attendee badges
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAnalyticsEventId(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isLightMode ? 'bg-black/5 hover:bg-black/10 text-black/60 hover:text-black' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isAnalyticsLoading ? (
              <div className={`py-12 text-center text-xs font-mono uppercase animate-pulse ${
                isLightMode ? 'text-black/40' : 'text-white/40'
              }`}>
                Calculating metrics...
              </div>
            ) : eventAnalytics ? (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
                  }`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Total Attendees</div>
                    <div className="text-2xl font-black font-mono">{eventAnalytics.attended_count || eventAnalytics.total_listeners}</div>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
                  }`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Peak Concurrent</div>
                    <div className="text-2xl font-black font-mono text-neon-blue">{eventAnalytics.peak_concurrent_listeners}</div>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
                  }`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Listening Hours</div>
                    <div className="text-2xl font-black font-mono text-neon-purple">{eventAnalytics.total_listening_hours}h</div>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'
                  }`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Reminders Set</div>
                    <div className="text-2xl font-black font-mono">{eventAnalytics.reminders_count}</div>
                  </div>
                </div>

                {/* Session Engagement */}
                {eventAnalytics.top_sessions && eventAnalytics.top_sessions.length > 0 && (
                  <div className={`p-5 rounded-2xl border space-y-3 ${
                    isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/[0.02] border-white/10'
                  }`}>
                    <h4 className="text-xs font-black uppercase tracking-wider">Line-up Session Breakdown</h4>
                    <div className="space-y-2">
                      {eventAnalytics.top_sessions.map((ts, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${
                          isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/5'
                        }`}>
                          <div>
                            <div className="text-xs font-bold">{ts.session_title}</div>
                            <div className={`text-[10px] ${isLightMode ? 'text-black/60' : 'text-white/50'}`}>{ts.dj_name} • {ts.genre}</div>
                          </div>
                          <div className="text-xs font-mono font-bold text-neon-blue">
                            {ts.listeners} listeners
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Attendees */}
                {eventAnalytics.attendees && eventAnalytics.attendees.length > 0 && (
                  <div className={`p-5 rounded-2xl border space-y-3 ${
                    isLightMode ? 'bg-black/5 border-black/10' : 'bg-white/[0.02] border-white/10'
                  }`}>
                    <h4 className="text-xs font-black uppercase tracking-wider">Top Engaged Listeners</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {eventAnalytics.attendees.map((att, idx) => (
                        <div key={idx} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          isLightMode ? 'bg-white border-black/10' : 'bg-white/5 border-white/5'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{att.username}</span>
                            {att.badge_awarded && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                                Badge Earned
                              </span>
                            )}
                          </div>
                          <span className={`font-mono ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>
                            {Math.round(att.listening_seconds / 60)} mins listened
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
