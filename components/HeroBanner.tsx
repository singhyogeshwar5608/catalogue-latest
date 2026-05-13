'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCategories, getHeroBannerSlides, type Category } from '@/src/lib/api';
import { absolutizeStorageUrl } from '@/src/lib/api-shared';

type HeroSlide = {
  key: string;
  image: string;
  title: string;
  subtitle?: string;
};

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    key: 'fallback-1',
    title: 'Fashion & Lifestyle',
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80',
  },
  {
    key: 'fallback-2',
    title: 'Fresh Produce',
    image:
      'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80',
  },
  {
    key: 'fallback-3',
    title: 'Electronics & Gadgets',
    image:
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1600&q=80',
  },
  {
    key: 'fallback-4',
    title: 'Wellness & Pharmacy',
    image:
      'https://images.unsplash.com/photo-1584982751631-3f7c88d66a55?auto=format&fit=crop&w=1600&q=80',
  },
  {
    key: 'fallback-5',
    title: 'Food & Beverage',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
  },
];

function coerceBannerImageStrings(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
      .map((u) => u.trim());
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith('[') && t.endsWith(']')) {
      try {
        const parsed = JSON.parse(t) as unknown;
        return coerceBannerImageStrings(parsed);
      } catch {
        return [t];
      }
    }
    return [t];
  }
  return [];
}

function firstCategoryBannerUrl(category: Category): string | null {
  const firstFromList = coerceBannerImageStrings(category.banner_images)[0];
  if (firstFromList) return firstFromList;
  const single = typeof category.banner_image === 'string' ? category.banner_image.trim() : '';
  return single || null;
}

function slidesFromCategories(categories: Category[]): HeroSlide[] {
  const slides: HeroSlide[] = [];
  for (const c of categories) {
    const raw = firstCategoryBannerUrl(c);
    if (!raw) continue;
    const title =
      typeof c.banner_title === 'string' && c.banner_title.trim() !== ''
        ? c.banner_title.trim()
        : c.name;
    const subtitle =
      typeof c.banner_subtitle === 'string' && c.banner_subtitle.trim() !== ''
        ? c.banner_subtitle.trim()
        : undefined;
    slides.push({
      key: `cat-${c.id}`,
      image: absolutizeStorageUrl(raw),
      title,
      subtitle,
    });
  }
  return slides;
}

export default function HeroBanner() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const dto = await getHeroBannerSlides();
        if (cancelled) return;
        if (dto.length > 0) {
          setSlides(
            dto.map((s) => ({
              key: s.key,
              image: absolutizeStorageUrl(s.image),
              title: s.title,
              subtitle: typeof s.subtitle === 'string' && s.subtitle.trim() ? s.subtitle.trim() : undefined,
            }))
          );
          return;
        }
        const categories = await getCategories();
        if (cancelled) return;
        const built = slidesFromCategories(categories);
        if (built.length > 0) {
          setSlides(built);
        } else {
          setSlides(FALLBACK_SLIDES);
        }
      } catch {
        setSlides(FALLBACK_SLIDES);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const len = slides.length;

  useEffect(() => {
    setCurrentSlide((prev) => (len > 0 ? prev % len : 0));
  }, [len]);

  const tick = useCallback(() => {
    setCurrentSlide((prev) => (len > 0 ? (prev + 1) % len : 0));
  }, [len]);

  useEffect(() => {
    if (len <= 1) return undefined;
    const interval = setInterval(tick, 4000);
    return () => clearInterval(interval);
  }, [len, tick]);

  if (loading) {
    return (
      <section className="relative w-full bg-slate-900">
        <div className="relative flex h-[360px] w-full items-center justify-center sm:h-[450px] lg:aspect-[10/3] lg:h-auto">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Loading Marketplace</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative w-full bg-black">
        <div className="relative w-full h-[360px] sm:h-[450px] lg:aspect-[10/3] lg:h-auto">
          {slides.map((slide, index) => (
            <div
              key={slide.key}
              className={`absolute inset-0 will-change-[opacity] transition-opacity duration-700 ease-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.image}
                alt=""
                className="w-full h-full object-cover min-h-[360px] sm:min-h-[450px] lg:min-h-0"
                loading="eager"
                referrerPolicy="no-referrer"
              />
              {/* Light bottom fade to improve contrast on bright photos; no text on hero. */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
