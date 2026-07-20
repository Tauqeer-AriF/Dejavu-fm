import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { useLocation } from "react-router-dom";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

type SliderLayout = "single" | "triple";

function parseSliderType(sliderType: string) {
  const value = (sliderType || "single").toLowerCase().trim();
  if (value.startsWith("triple:")) {
    return { layout: "triple" as SliderLayout, name: value.replace("triple:", "") };
  }
  if (value.startsWith("single:")) {
    return { layout: "single" as SliderLayout, name: value.replace("single:", "") };
  }
  if (value === "triple") {
    return { layout: "triple" as SliderLayout, name: "" };
  }
  return { layout: "single" as SliderLayout, name: value === "single" ? "" : value };
}

function getSliderTitle(sliderType: string) {
  const { layout, name } = parseSliderType(sliderType);
  if (name) {
    return name
      .split(/[-_]/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return layout === "triple" ? "Our Partners" : "Special Features";
}

function getSliderLayout(sliderType: string): SliderLayout {
  return parseSliderType(sliderType).layout;
}

export function AdvertisementSliders({ position = "bottom" }: { position?: "top" | "bottom" }) {
  const location = useLocation();
  const currentPage = location.pathname === "/" ? "home" : location.pathname.replace(/^\/+|\/+$/g, "") || "home";

  const { data: ads = [] } = useQuery({
    queryKey: ['publicAds', currentPage],
    queryFn: () => fetch(`/api/public/ads?page=${encodeURIComponent(currentPage)}`).then(res => res.json())
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: () => fetch("/api/public/settings").then(res => res.json())
  });

  const autoScroll = settings.ad_auto_scroll === '1';

  // Filter ads based on position prop (fallback to bottom for legacy ads)
  const positionFilteredAds = ads.filter((ad: any) => {
    const adPosition = ad.position || 'bottom';
    return adPosition === position;
  });

  if (positionFilteredAds.length === 0) return null;

  const sliderGroups = Array.from(
    positionFilteredAds.reduce((groups: Map<string, any[]>, ad: any) => {
      const key = ad.slider_type || "single";
      const existing = groups.get(key) || [];
      existing.push(ad);
      groups.set(key, existing);
      return groups;
    }, new Map())
  ).map(([sliderType, groupAds]) => ({
    sliderType,
    layout: getSliderLayout(sliderType),
    title: getSliderTitle(sliderType),
    ads: groupAds.sort((a: any, b: any) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0) || Number(a.id) - Number(b.id))
  }));

  return (
    <div className={`w-full space-y-12 px-4 md:px-8 max-w-7xl mx-auto ad-sliders-container ${position === 'top' ? 'pt-2 pb-8' : 'py-12'}`}>
      {sliderGroups.map(({ sliderType, layout, title, ads: groupAds }) => (
        <motion.div 
          key={sliderType}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative group"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">{title}</h3>
            <div className="h-px flex-1 bg-white/5 mx-4" />
          </div>

          {layout === "triple" ? (
            <Swiper
              modules={[Autoplay, Pagination, Navigation]}
              spaceBetween={20}
              breakpoints={{
                320: { slidesPerView: 1 },
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 }
              }}
              autoplay={autoScroll ? { delay: 3500, disableOnInteraction: false } : false}
              pagination={{ clickable: true }}
              navigation={true}
              className="pb-12 triple-swiper"
            >
              {groupAds.map((ad: any) => (
                <SwiperSlide key={ad.id}>
                  <AdItem ad={ad} />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <Swiper
              modules={[Autoplay, Pagination, Navigation]}
              spaceBetween={0}
              slidesPerView={1}
              autoplay={autoScroll ? { delay: 5000, disableOnInteraction: false } : false}
              pagination={{ clickable: true }}
              navigation={true}
              className="rounded-3xl overflow-hidden shadow-2xl border border-white/5 aspect-[21/9] md:aspect-[3/1] !pb-0"
            >
              {groupAds.map((ad: any) => (
                <SwiperSlide key={ad.id}>
                  <AdItem ad={ad} isLarge />
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function AdItem({ ad, isLarge }: { ad: any, isLarge?: boolean }) {
  const content = (
    <div className="relative w-full h-full overflow-hidden">
      <img 
        src={ad.image_url} 
        alt="Advertisement" 
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
      />
      {ad.link_url && (
        <div className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );

  if (ad.link_url) {
    return (
      <a 
        href={ad.link_url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={`block w-full h-full ${!isLarge ? 'aspect-[16/9] rounded-2xl overflow-hidden border border-white/5' : ''}`}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`w-full h-full ${!isLarge ? 'aspect-[16/9] rounded-2xl overflow-hidden border border-white/5' : ''}`}>
      {content}
    </div>
  );
}
