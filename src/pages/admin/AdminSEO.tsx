import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useLogo } from '../../hooks/useLogo';
import { useModal } from '../../context/ModalContext';
import { ImageUploadField } from './ImageUploadField';
import { fetchAdmin } from './adminApi';

export function AdminSEO() {
  const { isLightMode } = useLogo();
  const { showAlert } = useModal();
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoImage, setSeoImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/public/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();
        setSeoTitle(data.seo_title || data.app_title || data.app_name || 'DejavuFM');
        setSeoDescription(data.seo_description || 'DejavuFM is the underground radio station combining London beats with global energy.');
        setSeoImage(data.seo_image || data.logo_url || data.favicon || '/icon.svg');
      } catch (error) {
        console.error(error);
        showAlert({ title: 'Error', message: 'Could not load SEO settings.', style: 'danger' });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [showAlert]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetchAdmin('/api/admin/settings', {
        method: 'PUT',
        body: {
          seo_title: seoTitle,
          seo_description: seoDescription,
          seo_image: seoImage,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save SEO settings');
      }
      showAlert({ title: 'Success', message: 'SEO settings saved.', style: 'success' });
    } catch (error) {
      console.error(error);
      showAlert({ title: 'Error', message: (error as Error).message || 'Save failed.', style: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`space-y-8 pb-12 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isLightMode ? 'bg-neon-purple/10 text-neon-purple' : 'bg-neon-purple/20 text-neon-purple'}`}>
          <Search className="w-6 h-6" />
        </div>
        <div>
          <h2 className={`text-2xl sm:text-3xl font-display font-black uppercase tracking-tight ${isLightMode ? 'text-black' : 'text-white'}`}>SEO Engine</h2>
          <p className={`text-xs sm:text-sm ${isLightMode ? 'text-black/50' : 'text-white/40'}`}>Optimize your station's visibility on search and social platforms.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,360px)]">
          <div className="space-y-6">
            <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
              <label className={`block text-[10px] uppercase tracking-[0.2em] font-bold mb-3 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>SEO Title</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Enter the site SEO title"
                className={`w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all border ${
                  isLightMode 
                    ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                    : 'bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                }`}
                disabled={isLoading}
              />
            </div>

            <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
              <label className={`block text-[10px] uppercase tracking-[0.2em] font-bold mb-3 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>SEO Description</label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Enter the SEO description for the application"
                className={`w-full min-h-[160px] rounded-2xl px-4 py-3.5 text-sm outline-none transition-all border resize-none ${
                  isLightMode 
                    ? 'bg-black/[0.03] border-black/10 text-black placeholder:text-black/30 focus:border-neon-purple' 
                    : 'bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-neon-purple'
                }`}
                disabled={isLoading}
              />
            </div>

            <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
              <ImageUploadField
                label="Social Share Image"
                value={seoImage}
                onChange={setSeoImage}
                placeholder="https://..."
                description="Landscape image recommended for social media previews."
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className={`border rounded-3xl p-5 sm:p-6 transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm text-black' : 'bg-dark-bg/50 border-white/10 text-white'}`}>
              <p className={`text-[10px] uppercase tracking-[0.2em] font-bold mb-6 ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Google Preview</p>
              <div className="space-y-1.5">
                <p className="text-neon-purple text-base font-semibold hover:underline cursor-pointer truncate">{seoTitle || 'DejavuFM | The Sound of London'}</p>
                <p className={`text-xs ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>https://dejavufm.com</p>
                <p className={`text-sm leading-relaxed mt-2 ${isLightMode ? 'text-black/70' : 'text-white/70'}`}>{seoDescription || 'DejavuFM is the underground radio station combining London beats with global energy.'}</p>
              </div>
            </div>

            <div className={`border rounded-3xl overflow-hidden transition-colors ${isLightMode ? 'bg-white border-black/10 shadow-sm' : 'bg-dark-bg/50 border-white/10'}`}>
              <div className={`px-5 sm:px-6 py-4 border-b ${isLightMode ? 'border-black/5' : 'border-white/10'}`}>
                <p className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>Social Preview</p>
              </div>
              <div className="p-5 sm:p-6 space-y-4">
                <div className={`aspect-video overflow-hidden rounded-2xl border ${isLightMode ? 'bg-black/5 border-black/5' : 'bg-black/30 border-white/5'}`}>
                  {seoImage ? (
                    <img src={seoImage} alt="SEO preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs uppercase font-black tracking-widest opacity-20">No preview image</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className={`text-[10px] uppercase tracking-widest font-black ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>DEJAVUFM</p>
                  <p className={`text-lg font-bold tracking-tight leading-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{seoTitle || 'DejavuFM | The Sound of London'}</p>
                  <p className={`text-xs leading-relaxed line-clamp-2 ${isLightMode ? 'text-black/60' : 'text-white/60'}`}>{seoDescription || 'DejavuFM is the underground radio station combining London beats with global energy.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-4 border-t border-dashed border-neon-purple/20">
          <div className={`text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-black/40' : 'text-white/40'}`}>
            {isLoading ? 'Syncing SEO data…' : 'Configuration ready for deployment.'}
          </div>
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="w-full sm:w-auto bg-neon-purple text-white font-black uppercase tracking-widest text-xs py-4 px-10 rounded-xl hover:bg-neon-blue transition-all shadow-lg shadow-neon-purple/20 disabled:opacity-50"
          >
            {isSaving ? 'Syncing...' : 'Save SEO Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
