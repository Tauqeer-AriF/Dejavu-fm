import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useLogo } from "../hooks/useLogo";
import { PremiumRingLoader } from "../components/PremiumRingLoader";
import NotFound from "./NotFound";

interface PageBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'link' | 'iframe' | 'form';
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  imageCaption?: string;
  imageAlign?: 'left' | 'center' | 'right';
  align?: 'left' | 'center' | 'right';
  linkUrl?: string;
  linkText?: string;
  linkStyle?: 'fill' | 'outline' | 'minimal';
  iframeUrl?: string;
  iframeHeight?: number;
  formTitle?: string;
  formDescription?: string;
  formSubmitText?: string;
  formFields?: Array<{
    id: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'textarea';
    required: boolean;
    placeholder?: string;
  }>;
}

interface CustomPageData {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string; // JSON Array of PageBlock
}

interface DynamicFormProps {
  pageId: string;
  block: PageBlock;
  isLightMode: boolean;
}

function DynamicForm({ pageId, block, isLightMode }: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const payload = {
        formTitle: block.formTitle || "Contact Form",
        formData: (block.formFields || []).reduce((acc, field) => {
          acc[field.label] = formData[field.id] || "";
          return acc;
        }, {} as Record<string, string>)
      };

      const response = await fetch(`/api/pages/${pageId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit form details.");
      }

      setSubmitSuccess(true);
      setFormData({});
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className={`p-8 rounded-3xl text-center space-y-4 max-w-xl mx-auto border shadow-xl ${
        isLightMode 
          ? 'bg-[#f0fdf4] border-[#bbf7d0] text-slate-900' 
          : 'bg-[#052e16]/30 border-[#14532d] text-white'
      } animate-fade-in`}>
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
          ✓
        </div>
        <h3 className="text-lg font-bold uppercase tracking-wide">Submission Received!</h3>
        <p className="text-xs opacity-85 leading-relaxed">
          Thank you! Your information has been successfully saved to our Agency roster. We'll review your submission and be in touch soon.
        </p>
        <button
          type="button"
          onClick={() => setSubmitSuccess(false)}
          className="text-xs font-black uppercase tracking-widest text-neon-blue hover:underline mt-2"
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`p-6 md:p-8 rounded-3xl border ${
      isLightMode 
        ? 'bg-white border-black/5 text-black' 
        : 'bg-[#12131C] border-white/5 text-white'
    } shadow-2xl max-w-xl mx-auto space-y-6`}>
      <div className={`space-y-1.5 ${
        block.align === 'left' ? 'text-left' : block.align === 'right' ? 'text-right' : 'text-center'
      }`}>
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">
          {block.formTitle || "Contact Form"}
        </h2>
        {block.formDescription && (
          <p className={`text-xs md:text-sm ${isLightMode ? 'text-slate-500' : 'text-white/60'}`}>
            {block.formDescription}
          </p>
        )}
      </div>

      {submitError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold text-center">
          {submitError}
        </div>
      )}

      <div className="space-y-4">
        {(block.formFields || []).map((field) => (
          <div key={field.id} className="space-y-1.5 text-left">
            <label className="block text-[10px] font-black uppercase tracking-wider opacity-75">
              {field.label} {field.required && <span className="text-rose-500">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                rows={4}
                required={field.required}
                placeholder={field.placeholder || "Enter details here..."}
                value={formData[field.id] || ""}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border transition-all ${
                  isLightMode 
                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple focus:bg-white' 
                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple focus:bg-[#1b1d28]'
                }`}
              />
            ) : (
              <input
                type={field.type}
                required={field.required}
                placeholder={field.placeholder || ""}
                value={formData[field.id] || ""}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none border transition-all ${
                  isLightMode 
                    ? 'bg-black/[0.02] border-black/10 text-black focus:border-neon-purple focus:bg-white' 
                    : 'bg-black/40 border-white/10 text-white focus:border-neon-purple focus:bg-[#1b1d28]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-full text-xs font-black uppercase tracking-widest text-white bg-neon-purple shadow-lg shadow-neon-purple/20 hover:scale-[1.02] transition-transform disabled:opacity-55 disabled:pointer-events-none"
        >
          {isSubmitting ? "Submitting..." : block.formSubmitText || "Submit"}
        </button>
      </div>
    </form>
  );
}

export function CustomDynamicPage() {
  const { slug } = useParams();
  const { isLightMode, getPageTitle, settings } = useLogo();
  const navigate = useNavigate();
  const [page, setPage] = useState<CustomPageData | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    fetch(`/api/pages/slug/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) {
          throw new Error("Failed to load page");
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setPage(data);
          try {
            const parsed = JSON.parse(data.content);
            setBlocks(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            // Fallback for simple content string
            setBlocks([
              {
                id: "fallback_text",
                type: "text",
                content: data.content,
              }
            ]);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (page) {
      const appTitle = settings?.app_name || "DejavuFM";
      const customTitle = getPageTitle(`custom_page_${page.slug}`, page.title);
      document.title = `${customTitle} | ${appTitle}`;
    }
  }, [page, settings, getPageTitle]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full py-24 gap-4">
        <PremiumRingLoader size="md" />
        <span className="text-xs font-mono opacity-50 tracking-widest uppercase">
          Loading Station Page...
        </span>
      </div>
    );
  }

  if (notFound || !page) {
    return <NotFound />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 py-12 space-y-16"
    >
      {/* Dynamic SEO Document Properties */}
      {page.description && (
        <meta name="description" content={page.description} />
      )}

      {/* RENDER MODULAR CONTENT BLOCKS */}
      <div className="space-y-12">
        {blocks.map((block) => {
          return (
            <div key={block.id} className="transition-all animate-fade-in">
              {block.type === 'header' && (
                <div 
                  className={`relative rounded-3xl overflow-hidden py-16 px-8 flex flex-col justify-center shadow-lg bg-cover bg-center ${
                    block.align === 'left' ? 'items-start text-left' : block.align === 'right' ? 'items-end text-right' : 'items-center text-center'
                  }`}
                  style={{ 
                    backgroundImage: block.imageUrl ? `url(${block.imageUrl})` : 'none',
                    backgroundColor: block.imageUrl ? 'transparent' : isLightMode ? '#f1f5f9' : '#12131C',
                    minHeight: '260px'
                  }}
                >
                  {block.imageUrl && (
                    <div className="absolute inset-0 bg-black/60 z-0" />
                  )}
                  <div className="relative z-10 space-y-3 w-full">
                    <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tight ${block.imageUrl ? 'text-white' : isLightMode ? 'text-slate-900' : 'text-white'}`}>
                      {(block.title === page.title) ? getPageTitle(`custom_page_${page.slug}`, page.title) : (block.title || "Untitled Heading")}
                    </h1>
                    {block.subtitle && (
                      <p className={`text-sm sm:text-base tracking-wide max-w-xl ${
                        block.align === 'left' ? '' : block.align === 'right' ? 'ml-auto' : 'mx-auto'
                      } ${block.imageUrl ? 'text-white/80' : isLightMode ? 'text-slate-600' : 'text-white/60'}`}>
                        {block.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {block.type === 'text' && (
                <div className={`prose prose-invert max-w-none text-base sm:text-lg leading-relaxed whitespace-pre-wrap font-light transition-colors ${
                  block.align === 'center' ? 'text-center' : block.align === 'right' ? 'text-right' : 'text-left'
                } ${isLightMode ? 'text-slate-700' : 'text-white/95'}`}>
                  {block.content || ""}
                </div>
              )}

              {block.type === 'image' && block.imageUrl && (
                <div className={`flex flex-col ${
                  (block.align || block.imageAlign) === 'left' ? 'items-start' : (block.align || block.imageAlign) === 'right' ? 'items-end' : 'items-center'
                }`}>
                  <img 
                    src={block.imageUrl} 
                    alt={block.imageCaption || page.title} 
                    referrerPolicy="no-referrer"
                    className="max-w-full rounded-2xl max-h-[550px] object-cover shadow-2xl"
                  />
                  {block.imageCaption && (
                    <p className={`text-xs mt-3 italic ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                      {block.imageCaption}
                    </p>
                  )}
                </div>
              )}

              {block.type === 'link' && block.linkUrl && (
                <div className={`flex my-6 ${
                  block.align === 'left' ? 'justify-start' : block.align === 'right' ? 'justify-end' : 'justify-center'
                }`}>
                  {block.linkUrl.startsWith('http') ? (
                    <a
                      href={block.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-105 ${
                        block.linkStyle === 'fill'
                          ? 'bg-neon-purple text-white shadow-neon-purple/20 hover:shadow-neon-purple/30'
                          : block.linkStyle === 'outline'
                            ? 'border border-neon-blue/60 text-neon-blue bg-transparent'
                            : 'border-b border-neon-purple pb-0.5 text-neon-purple font-bold'
                      }`}
                    >
                      {block.linkText || "Learn More"}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(block.linkUrl || "/")}
                      className={`px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-105 ${
                        block.linkStyle === 'fill'
                          ? 'bg-neon-purple text-white shadow-neon-purple/20 hover:shadow-neon-purple/30'
                          : block.linkStyle === 'outline'
                            ? 'border border-neon-blue/60 text-neon-blue bg-transparent'
                            : 'border-b border-neon-purple pb-0.5 text-neon-purple font-bold'
                      }`}
                    >
                      {block.linkText || "Learn More"}
                    </button>
                  )}
                </div>
              )}

              {block.type === 'iframe' && block.iframeUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-black/40 shadow-2xl">
                  <iframe 
                    src={block.iframeUrl} 
                    width="100%" 
                    height={block.iframeHeight || 450}
                    style={{ border: 0 }}
                    allowFullScreen 
                    referrerPolicy="no-referrer"
                    title="Dynamic station embed player"
                    className="w-full"
                  />
                </div>
              )}

              {block.type === 'form' && (
                <div className="py-4">
                  <DynamicForm pageId={page.id} block={block} isLightMode={isLightMode} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
