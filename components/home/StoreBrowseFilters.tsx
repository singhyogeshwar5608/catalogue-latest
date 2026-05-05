'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpDown, ChevronDown, Filter } from 'lucide-react';
import MarketplaceSearchBar from '@/components/home/MarketplaceSearchBar';

type CategoryOption = {
  id: string;
  label: string;
};

export type StoreBrowseSortOption = 'relevance' | 'name-asc' | 'name-desc';

type StoreBrowseFiltersProps = {
  categories: CategoryOption[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  sortOption: StoreBrowseSortOption;
  onSortChange: (next: StoreBrowseSortOption) => void;
};

export default function StoreBrowseFilters({
  categories,
  activeCategory,
  onSelectCategory,
  sortOption,
  onSortChange,
}: StoreBrowseFiltersProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filtersPanelRef = useRef<HTMLDivElement | null>(null);
  const sortPanelRef = useRef<HTMLDivElement | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeLabel = useMemo(() => {
    if (activeCategory === 'all') return 'All categories';
    return categories.find((c) => c.id === activeCategory)?.label ?? 'All categories';
  }, [activeCategory, categories]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -clientWidth : clientWidth,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!filtersPanelRef.current?.contains(target)) {
        setFiltersOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!sortPanelRef.current?.contains(target)) {
        setSortOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSortOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileFiltersOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileFiltersOpen]);

  return (
    <div className="space-y-0">
      <div className="flex w-full items-center gap-2">
        <MarketplaceSearchBar
          submitPath="/"
          enableSuggestions={false}
          wrapperClassName="flex-[1.35] min-w-0 sm:flex-1 sm:max-w-[720px]"
        />

        {/* Mobile: search + slide-in filters */}
        <div className="flex flex-shrink-0 items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            aria-haspopup="dialog"
            aria-expanded={mobileFiltersOpen}
          >
            <Filter className="h-2.5 w-2.5" />
            Filter
          </button>
        </div>

        {/* Desktop/tablet: dropdown filters + sort */}
        <div className="hidden flex-shrink-0 items-center gap-2 sm:flex">
          <div className="relative z-10" ref={filtersPanelRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
              aria-haspopup="menu"
              aria-expanded={filtersOpen}
            >
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Filter</span>
              <span className="max-w-[90px] truncate text-slate-500 sm:max-w-[160px]">{activeLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
            </button>

            {filtersOpen ? (
              <div
                className="absolute left-0 right-0 z-30 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.6)] sm:left-auto sm:right-0"
                role="menu"
                aria-label="Category filters"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Categories</p>
                  <button
                    type="button"
                    onClick={() => onSelectCategory('all')}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40"
                    disabled={activeCategory === 'all'}
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-72 overflow-auto p-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory('all');
                      setFiltersOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-slate-50 sm:text-sm ${
                      activeCategory === 'all' ? 'bg-slate-50 text-slate-950' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">All categories</span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        activeCategory === 'all' ? 'bg-slate-900' : 'border border-slate-300'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        onSelectCategory(category.id);
                        setFiltersOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-slate-50 sm:text-sm ${
                        activeCategory === category.id ? 'bg-slate-50 text-slate-950' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{category.label}</span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          activeCategory === category.id ? 'bg-slate-900' : 'border border-slate-300'
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative z-10" ref={sortPanelRef}>
            <button
              type="button"
              onClick={() => setSortOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
              aria-haspopup="menu"
              aria-expanded={sortOpen}
            >
              <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sort</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
            </button>

            {sortOpen ? (
              <div
                className="absolute right-0 z-30 mt-2 w-[min(260px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.6)]"
                role="menu"
                aria-label="Sort options"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Sort by</p>
                </div>
                <div className="p-2">
                  {(
                    [
                      { id: 'relevance', label: 'Default' },
                      { id: 'name-asc', label: 'Name: A to Z' },
                      { id: 'name-desc', label: 'Name: Z to A' },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onSortChange(option.id);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-slate-50 sm:text-sm ${
                        sortOption === option.id ? 'bg-slate-50 text-slate-950' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          sortOption === option.id ? 'bg-slate-900' : 'border border-slate-300'
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      <div
        className={`fixed inset-0 z-[110] sm:hidden ${mobileFiltersOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileFiltersOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-950/30 transition-opacity ${mobileFiltersOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileFiltersOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={`absolute right-0 top-0 h-full w-[min(340px,92vw)] bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.7)] transition-transform ${
            mobileFiltersOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <p className="text-base font-semibold text-slate-900">Filters</p>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <p className="text-sm font-semibold text-slate-900">Categories</p>
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40"
                disabled={activeCategory === 'all'}
              >
                Clear
              </button>
            </div>

            <div className="px-2">
              <label
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[12px] transition hover:bg-slate-50 ${
                  activeCategory === 'all' ? 'bg-slate-50 text-slate-950' : 'text-slate-700'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">All categories</span>
                <input
                  type="checkbox"
                  checked={activeCategory === 'all'}
                  onChange={() => onSelectCategory('all')}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </label>
            </div>

            <div className="flex-1 overflow-auto px-2 pb-4">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[12px] transition hover:bg-slate-50 ${
                    activeCategory === category.id ? 'bg-slate-50 text-slate-950' : 'text-slate-700'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{category.label}</span>
                  <input
                    type="checkbox"
                    checked={activeCategory === category.id}
                    onChange={() => onSelectCategory(category.id)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                </label>
              ))}
            </div>

            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
