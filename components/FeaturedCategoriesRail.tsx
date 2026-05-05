'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { categories } from '@/data/categories';

type Category = typeof categories[number];

type FeaturedCategoriesRailProps = {
  items?: Category[];
};

export default function FeaturedCategoriesRail({ items = categories }: FeaturedCategoriesRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -clientWidth : clientWidth,
      behavior: 'smooth',
    });
  };

  return (
    <section className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative">
          <button
            onClick={() => scroll('left')}
            className="absolute top-1/2 -translate-y-1/2 left-2 z-20 inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 shadow hover:bg-primary hover:text-white transition"
            aria-label="Scroll left"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute top-1/2 -translate-y-1/2 right-2 z-20 inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 shadow hover:bg-primary hover:text-white transition"
            aria-label="Scroll right"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-gray-50 via-gray-50 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-gray-50 via-gray-50 to-transparent" />
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          >
            {items.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="shrink-0 inline-flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-primary hover:text-primary transition min-w-[200px] sm:min-w-[240px]"
              >
                <category.icon className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{category.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{category.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
