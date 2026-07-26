import React from "react";
import { BlogPost } from "../types";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, CalendarDays, FileText, ExternalLink } from "lucide-react";
import { useLogo } from "../hooks/useLogo";


const fallbackImage = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=1400";

const formatDate = (value: string) => {
  if (!value) return "Latest";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

type ContentPart =
  | { type: "text"; value: string }
  | { type: "image"; url: string; caption: string };

const parseContent = (content: string): ContentPart[] => {
  const parts: ContentPart[] = [];
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imagePattern.exec(content)) !== null) {
    const text = content.slice(lastIndex, match.index);
    if (text.trim()) parts.push({ type: "text", value: text });
    parts.push({ type: "image", caption: match[1] || "Feature image", url: match[2] });
    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.slice(lastIndex);
  if (remainingText.trim()) parts.push({ type: "text", value: remainingText });

  return parts;
};

const renderParagraphWithLinks = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = text.split(linkRegex);
  if (parts.length === 1) {
    return text;
  }

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) {
      elements.push(parts[i]);
    }
    if (i + 1 < parts.length) {
      const linkText = parts[i + 1];
      const linkUrlFull = parts[i + 2];
      
      let linkUrl = linkUrlFull;
      let target = "_blank";
      if (linkUrlFull.includes("|")) {
        const urlParts = linkUrlFull.split("|");
        linkUrl = urlParts[0];
        target = urlParts[1];
      }

      elements.push(
        <a
          key={`link-${i}`}
          href={linkUrl}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="text-neon-blue hover:text-neon-purple underline decoration-neon-blue/60 hover:decoration-neon-purple/80 underline-offset-4 decoration-2 font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          {linkText}
          {target === "_blank" && (
            <ExternalLink className="w-3.5 h-3.5 inline text-neon-blue/70" />
          )}
        </a>
      );
    }
  }
  return elements;
};

export default function FeatureDetail() {
  const { slug } = useParams();
  const { isLightMode } = useLogo();

  const { data: post, isLoading, isError } = useQuery<BlogPost>({
    queryKey: ["feature", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/features/${slug}`);
      if (!res.ok) throw new Error("Feature not found");
      return res.json();
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="py-12 space-y-8">
        <div className={`h-10 w-36 rounded-xl animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
        <div className={`aspect-[16/7] rounded-3xl animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
        <div className="max-w-3xl mx-auto space-y-4">
          <div className={`h-12 w-full rounded-xl animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
          <div className={`h-4 w-full rounded animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
          <div className={`h-4 w-4/5 rounded animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="py-24 text-center space-y-6">
        <FileText className={`w-14 h-14 mx-auto ${isLightMode ? 'text-slate-300' : 'text-white/10'}`} />
        <h1 className={`text-3xl font-display font-black uppercase ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Post not found</h1>
        <Link to="/features" className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
          isLightMode ? 'bg-slate-900 text-white' : 'bg-white text-dark-bg'
        }`}>
          <ArrowLeft className="w-4 h-4" />
          Back to Features
        </Link>
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-10 md:py-14 space-y-10"
    >
      <Link to="/features" className={`inline-flex items-center gap-2 transition-colors text-[10px] font-black uppercase tracking-[0.25em] ${
        isLightMode ? 'text-slate-400 hover:text-slate-900' : 'text-white/40 hover:text-white'
      }`}>
        <ArrowLeft className="w-4 h-4" />
        Back to Features
      </Link>

      <header className="space-y-8">
        <div className="space-y-6 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neon-purple/15 border border-neon-purple/30 text-neon-purple text-[10px] font-black uppercase tracking-widest">
              <FileText className="w-3.5 h-3.5" />
              Feature
            </span>
            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm ${
              isLightMode ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-white/10 border-white/10 text-white/90'
            }`}>
              <CalendarDays className="w-3.5 h-3.5 text-neon-blue shrink-0" />
              <span>{formatDate(post.created_at)}</span>
            </span>
            {post.link_url && (
              <a
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neon-blue/15 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/25 transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                <ExternalLink className="w-3.5 h-3.5 text-neon-blue" />
                Visit Link
              </a>
            )}
          </div>

          <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black uppercase tracking-tight leading-[1.08] ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            {post.title}
          </h1>

          {post.excerpt && (
            <p className={`text-lg md:text-2xl font-light leading-relaxed border-l-4 border-neon-blue/60 pl-5 ${
              isLightMode ? 'text-slate-600' : 'text-white/70'
            }`}>
              {post.excerpt}
            </p>
          )}
        </div>

        <div className={`relative overflow-hidden rounded-3xl border shadow-2xl transition-all ${
          isLightMode ? 'border-slate-200 bg-slate-100 shadow-slate-200/50' : 'border-white/10 bg-black/60 shadow-black/80'
        }`}>
          <div className="aspect-[16/9] md:aspect-[21/9] max-h-[520px] w-full overflow-hidden relative group">
            <img 
              src={post.image_url || fallbackImage} 
              alt={post.title} 
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out" 
            />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-2">
        <div className={`glass-panel rounded-2xl p-6 md:p-10 transition-colors ${
          isLightMode ? 'bg-white border-black/10' : 'border-white/5 bg-black/40'
        }`}>
          <div className={`space-y-8 text-base md:text-lg leading-8 font-light ${
            isLightMode ? 'text-slate-700' : 'text-white/75'
          }`}>
            {parseContent(post.content).map((part, index) => {
              if (part.type === "image") {
                return (
                  <figure key={`${part.url}-${index}`} className={`overflow-hidden rounded-2xl border ${
                    isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'
                  }`}>
                    <img src={part.url} alt={part.caption} className="w-full max-h-[520px] object-cover" />
                    {part.caption && (
                      <figcaption className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] ${
                        isLightMode ? 'text-slate-400' : 'text-white/35'
                      }`}>
                        {part.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              return part.value
                .split(/\n{2,}/)
                .filter(paragraph => paragraph.trim())
                .map((paragraph, paragraphIndex) => (
                  <p key={`${index}-${paragraphIndex}`} className="whitespace-pre-wrap">
                    {renderParagraphWithLinks(paragraph.trim())}
                  </p>
                ));
            })}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
