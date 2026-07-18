import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image_url: string;
  content: string;
  created_at: string;
  updated_at: string;
}

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

export default function FeatureDetail() {
  const { slug } = useParams();

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
        <div className="h-10 w-36 bg-white/5 rounded-xl animate-pulse" />
        <div className="aspect-[16/7] bg-white/5 rounded-3xl animate-pulse" />
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />
          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="py-24 text-center space-y-6">
        <FileText className="w-14 h-14 text-white/10 mx-auto" />
        <h1 className="text-3xl font-display font-black uppercase">Post not found</h1>
        <Link to="/features" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-dark-bg text-[10px] font-black uppercase tracking-widest">
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
      <Link to="/features" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.25em]">
        <ArrowLeft className="w-4 h-4" />
        Back to Features
      </Link>

      <header className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 min-h-[360px] md:min-h-[520px]">
          <img src={post.image_url || fallbackImage} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/35 to-dark-bg/10" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 lg:p-16 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-purple/20 border border-neon-purple/30 text-neon-purple text-[10px] font-black uppercase tracking-widest">
                <FileText className="w-3.5 h-3.5" />
                Feature
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest">
                <CalendarDays className="w-3.5 h-3.5 text-neon-blue" />
                {formatDate(post.created_at)}
              </span>
            </div>
            <h1 className="text-4xl md:text-7xl lg:text-8xl font-display font-black uppercase tracking-tighter leading-none max-w-5xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-base md:text-xl text-white/65 max-w-3xl leading-relaxed border-l-2 border-neon-blue/40 pl-5">
                {post.excerpt}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-2">
        <div className="glass-panel rounded-2xl p-6 md:p-10">
          <div className="space-y-8 text-base md:text-lg leading-8 text-white/75 font-light">
            {parseContent(post.content).map((part, index) => {
              if (part.type === "image") {
                return (
                  <figure key={`${part.url}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <img src={part.url} alt={part.caption} className="w-full max-h-[520px] object-cover" />
                    {part.caption && (
                      <figcaption className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
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
                    {paragraph.trim()}
                  </p>
                ));
            })}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
