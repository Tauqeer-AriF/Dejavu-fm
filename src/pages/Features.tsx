import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CalendarDays, FileText, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

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

const fallbackImage = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=1200";

const formatDate = (value: string) => {
  if (!value) return "Latest";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const stripContentImages = (value: string) => value.replace(/!\[[^\]]*\]\([^)]+\)/g, " ");

const previewText = (post: BlogPost) => {
  return post.excerpt || stripContentImages(post.content).replace(/\s+/g, " ").slice(0, 180);
};

export default function Features() {
  const [query, setQuery] = useState("");

  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["features"],
    queryFn: () => fetch("/api/public/features").then(res => res.json()),
    staleTime: 1000 * 60 * 5,
  });

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return posts;

    return posts.filter(post =>
      post.title.toLowerCase().includes(normalized) ||
      post.excerpt?.toLowerCase().includes(normalized) ||
      post.content.toLowerCase().includes(normalized)
    );
  }, [posts, query]);

  if (isLoading) {
    return (
      <div className="space-y-12 py-12">
        <div className="h-20 w-72 bg-white/5 rounded-2xl animate-pulse mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="glass-panel rounded-2xl overflow-hidden">
              <div className="aspect-[16/10] bg-white/10 animate-pulse" />
              <div className="p-6 space-y-4">
                <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                <div className="h-8 w-full bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-14 py-12"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-4">
        <div className="relative max-w-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.06 }}
            className="absolute -top-14 left-0 text-[8rem] md:text-[12rem] font-black uppercase tracking-tighter text-stroke select-none pointer-events-none hidden sm:block"
          >
            Features
          </motion.div>
          <h1 className="relative text-5xl md:text-8xl font-display font-black uppercase tracking-tighter leading-none">
            Station <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">Features</span>
          </h1>
          <p className="relative mt-6 text-white/50 text-lg max-w-2xl border-l-2 border-neon-purple/30 pl-6">
            Stories, updates, artist notes, and culture from the Dejavu FM universe.
          </p>
        </div>

        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-neon-purple transition-colors" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search features..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm focus:outline-none focus:border-neon-purple/50 focus:bg-white/10 transition-all font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-3.5 h-3.5 text-white/50" />
            </button>
          )}
        </div>
      </div>

      {filteredPosts.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-4">
          {filteredPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              whileHover="hover"
              className="group glass-panel rounded-2xl overflow-hidden hover:border-neon-purple/30 transition-all relative"
            >
              <motion.div
                className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-30"
                variants={{ hover: { x: ['-150%', '150%'] } }}
                transition={{ duration: 0.75, ease: "easeInOut" }}
                initial={{ x: '-150%' }}
              />
              <Link to={`/features/${post.slug}`} className="block h-full">
                <div className="aspect-[16/10] overflow-hidden relative">
                  <img
                    src={post.image_url || fallbackImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 via-dark-bg/20 to-transparent" />
                  <div className="absolute left-5 bottom-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                    <CalendarDays className="w-3.5 h-3.5 text-neon-blue" />
                    <span className="text-[9px] uppercase tracking-widest font-black text-white/70">{formatDate(post.created_at)}</span>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-neon-purple">
                    <FileText className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em]">Feature Post</span>
                  </div>
                  <h2 className="text-2xl font-display font-black tracking-tight leading-tight group-hover:text-neon-blue transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-white/55 leading-relaxed line-clamp-3">
                    {previewText(post)}
                  </p>
                  <span className="pt-2 text-[10px] uppercase tracking-[0.25em] font-black text-white/40 group-hover:text-white transition-colors">
                    Read article
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="mx-4 py-20 text-center glass-panel rounded-2xl border-dashed flex flex-col items-center justify-center gap-4">
          <FileText className="w-12 h-12 text-white/10" />
          <p className="text-white/40 uppercase font-black tracking-widest text-xs">
            {query ? `No posts found for "${query}"` : "No features published yet"}
          </p>
        </div>
      )}
    </motion.div>
  );
}
