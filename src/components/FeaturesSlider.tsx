import { BlogPost } from "../types";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CalendarDays, FileText, ExternalLink, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { useLogo } from "../hooks/useLogo";
import { safeFetchJson } from "../utils/safeFetch";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const fallbackImage = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=1200";

const formatDate = (value: string) => {
  if (!value) return "Latest";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const stripContentImagesAndLinks = (value: string) => {
  return value
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
};

const previewText = (post: BlogPost) => {
  return post.excerpt || stripContentImagesAndLinks(post.content).replace(/\s+/g, " ").slice(0, 120);
};

export function FeaturesSlider() {
  const location = useLocation();
  const swiperRef = useRef<SwiperType | null>(null);
  const { isLightMode } = useLogo();

  // Fetch settings
  const { data: settings } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => safeFetchJson("/api/public/settings"),
    staleTime: 1000 * 60,
  });

  // Fetch posts
  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["features"],
    queryFn: () => safeFetchJson("/api/public/features"),
    staleTime: 1000 * 60 * 5,
  });

  // Check if enabled and configured for this page
  const isEnabled = settings?.features_slider_enabled === "1";
  const sliderPages = useMemo(() => {
    if (!settings?.features_slider_pages) return [];
    return settings.features_slider_pages
      .split(",")
      .map((p: string) => p.trim())
      .filter(Boolean);
  }, [settings?.features_slider_pages]);

  const matchesPage = useMemo(() => {
    return sliderPages.includes(location.pathname);
  }, [sliderPages, location.pathname]);

  if (!isEnabled || !matchesPage || isLoading || posts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="front-features-slider w-full pt-[90px] pb-12 px-4 md:px-8 relative z-20 overflow-hidden"
    >
      <div className="front-features-container max-w-[1400px] mx-auto space-y-8">
        {/* Slider Header */}
        <div className="front-features-header flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-neon-purple">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">Trending Now</span>
            </div>
            <h2 className={`front-features-title text-3xl md:text-5xl font-display font-black uppercase tracking-tighter ${isLightMode ? "text-black" : "text-white"}`}>
              Features
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* View All Link */}
            <Link
              to="/features"
              className="front-features-view-all group/btn inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:border-neon-purple/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer mr-2"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
            </Link>

            {/* Carousel Navigation Buttons */}
            {posts.length > 1 && (
              <div className="front-features-nav-btns flex items-center gap-2">
                <button
                  onClick={() => swiperRef.current?.slidePrev()}
                  className="p-3 rounded-full border bg-white/5 border-white/10 hover:border-neon-purple/50 text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer select-none"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => swiperRef.current?.slideNext()}
                  className="p-3 rounded-full border bg-white/5 border-white/10 hover:border-neon-purple/50 text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer select-none"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Carousel Content Window powered by Swiper for smooth autoplay and manual control */}
        <div className="relative w-full">
          <Swiper
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            modules={[Autoplay, Navigation, Pagination]}
            spaceBetween={24}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 20 },
              1024: { slidesPerView: 3, spaceBetween: 24 },
              1280: { slidesPerView: 3, spaceBetween: 24 },
            }}
            loop={posts.length > 1}
            autoplay={{
              delay: 3500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            className="w-full features-swiper !pb-2"
          >
            {posts.map((post) => (
              <SwiperSlide key={post.id} className="!h-auto flex">
                <motion.article
                  whileHover="hover"
                  className={`group glass-panel rounded-2xl overflow-hidden hover:border-neon-purple/30 transition-all relative flex flex-col h-[360px] w-full ${
                    isLightMode ? 'bg-white border-black/10 shadow-lg' : 'bg-dark-bg/40 border-white/10 backdrop-blur-md'
                  }`}
                >
                  {/* Sliding shine effect */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 z-30"
                    variants={{ hover: { x: ["-150%", "150%"] } }}
                    transition={{ duration: 0.75, ease: "easeInOut" }}
                    initial={{ x: "-150%" }}
                  />

                  {/* Thumbnail */}
                  <Link to={`/features/${post.slug}`} className="block relative aspect-[16/9] overflow-hidden shrink-0">
                    <img
                      src={post.image_url || fallbackImage}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${
                      isLightMode ? 'from-white/90 via-transparent' : 'from-dark-bg/90 via-dark-bg/20 to-transparent'
                    }`} />
                    <div className={`feature-date-badge absolute left-4 bottom-3 flex items-center gap-2 px-2.5 py-1 rounded-full border shadow-md backdrop-blur-md ${
                      isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-black/75 border-white/10 text-white'
                    }`}>
                      <CalendarDays className="w-3 h-3 text-neon-blue shrink-0" />
                      <span className={`text-[8px] uppercase tracking-widest font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="p-4 flex flex-col justify-between flex-1 min-h-0">
                    <Link to={`/features/${post.slug}`} className="block space-y-1.5 overflow-hidden">
                      <div className="flex items-center gap-1.5 text-neon-purple">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Feature Post</span>
                      </div>
                      <h3 className={`text-sm sm:text-base font-display font-black tracking-tight leading-snug group-hover:text-neon-blue transition-colors line-clamp-2 uppercase overflow-hidden ${
                        isLightMode ? 'text-slate-900' : 'text-white'
                      }`}>
                        {post.title}
                      </h3>
                    </Link>

                    {/* Bottom row actions */}
                    <div className={`flex items-center justify-between pt-2.5 border-t mt-auto z-10 relative ${
                      isLightMode ? 'border-black/10' : 'border-white/5'
                    }`}>
                      <Link
                        to={`/features/${post.slug}`}
                        className={`text-[8px] uppercase tracking-[0.2em] font-black group-hover:text-neon-blue transition-colors ${
                          isLightMode ? 'text-slate-400' : 'text-white/40'
                        }`}
                      >
                        Read article
                      </Link>
                      {post.link_url && (
                        <a
                          href={post.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-neon-blue/10 border border-neon-blue/20 text-neon-blue rounded-full text-[8px] font-black uppercase tracking-widest hover:bg-neon-blue/20 transition-colors"
                        >
                          Visit
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </motion.div>
  );
}

