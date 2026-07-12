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
        setSeoTitle(data.seo_title || data.app_title || data.app_name || 'Dejavu FM');
        setSeoDescription(data.seo_description || 'Dejavu FM is the underground radio station combining London beats with global energy.');
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
    <div className={`space-y-8 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
      <div className="flex items-center gap-3">
        <Search className="w-6 h-6 text-neon-purple" />
        <div>
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">SEO</h2>
          <p className="text-sm opacity-70">Manage SEO title, description, and shared image for the application.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,360px)]">
          <div className="space-y-6">
            <div className="bg-dark-bg/50 border border-white/10 rounded-3xl p-6">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/40 mb-2">SEO Title</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Enter the site SEO title"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-neon-purple focus:outline-none transition-all"
                disabled={isLoading}
              />
            </div>

            <div className="bg-dark-bg/50 border border-white/10 rounded-3xl p-6">
              <label className="block text-xs uppercase tracking-[0.3em] text-white/40 mb-2">SEO Description</label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Enter the SEO description for the application"
                className="w-full min-h-[160px] bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-neon-purple focus:outline-none transition-all resize-none"
                disabled={isLoading}
              />
            </div>

            <div className="bg-dark-bg/50 border border-white/10 rounded-3xl p-6">
              <ImageUploadField
                label="SEO Image URL"
                value={seoImage}
                onChange={setSeoImage}
                placeholder="https://..."
                description="Image used when sharing the site on social platforms. Use a landscape image for best results."
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-dark-bg/50 border border-white/10 rounded-3xl p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Search result preview</p>
              <div className="space-y-2">
                <p className="text-neon-purple text-sm font-semibold">{seoTitle || 'Dejavu FM | The Sound of London'}</p>
                <p className="text-white/50 text-xs">www.dejavufm.com</p>
                <p className="text-white/70 text-sm leading-6">{seoDescription || 'Dejavu FM is the underground radio station combining London beats with global energy.'}</p>
              </div>
            </div>

            <div className="bg-dark-bg/50 border border-white/10 rounded-3xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Social share preview</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="h-44 overflow-hidden rounded-3xl bg-black/30 border border-white/10">
                  {seoImage ? (
                    <img src={seoImage} alt="SEO preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/30">No image selected</div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-white/50">Dejavu FM</p>
                  <p className="text-white text-lg font-semibold leading-tight">{seoTitle || 'Dejavu FM | The Sound of London'}</p>
                  <p className="text-white/60 text-sm leading-6">{seoDescription || 'Dejavu FM is the underground radio station combining London beats with global energy.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-white/50">
            {isLoading ? 'Loading current SEO settings…' : 'Save the values above to update the app metadata.'}
          </div>
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="bg-neon-purple text-white font-bold py-3 px-8 rounded-xl hover:bg-neon-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save SEO Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
