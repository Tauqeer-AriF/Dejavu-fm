import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { ExternalLink } from "lucide-react";
import { motion } from "motion/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

export function AdvertisementSliders() {
  const { data: ads = [] } = useQuery({
    queryKey: ['publicAds'],
    queryFn: () => fetch("/api/public/ads").then(res => res.json())
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: () => fetch("/api/public/settings").then(res => res.json())
  });

  const autoScroll = settings.ad_auto_scroll === '1';

  if (ads.length === 0) return null;

  const singleAds = ads.filter((ad: any) => ad.slider_type === 'single');
  const tripleAds = ads.filter((ad: any) => ad.slider_type === 'triple');

  return (
    <div className="w-full space-y-12 py-12 px-4 md:px-8 max-w-7xl mx-auto ad-sliders-container">
      {/* Single Image Slider */}
      {singleAds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative group"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Special Features</h3>
            <div className="h-px flex-1 bg-white/5 mx-4" />
          </div>
          
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            spaceBetween={0}
            slidesPerView={1}
            autoplay={autoScroll ? { delay: 5000, disableOnInteraction: false } : false}
            pagination={{ clickable: true }}
            navigation={true}
            className="rounded-3xl overflow-hidden shadow-2xl border border-white/5 aspect-[21/9] md:aspect-[3/1] !pb-0"
          >
            {singleAds.map((ad: any) => (
              <SwiperSlide key={ad.id}>
                <AdItem ad={ad} isLarge />
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      )}

      {/* Triple Image Slider */}
      {tripleAds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative group"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Our Partners</h3>
            <div className="h-px flex-1 bg-white/5 mx-4" />
          </div>

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
            className="pb-12"
          >
            {tripleAds.map((ad: any) => (
              <SwiperSlide key={ad.id}>
                <AdItem ad={ad} />
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      )}
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
