'use client';

import { useMemo, useState } from 'react';
import { ListFilter, X } from 'lucide-react';
import type { Store } from '@/types';
import StoreCategoryShowcase from './StoreCategoryShowcase';

export const createCategorySlug = (value: string) =>
  value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function getStoreCategoryOptions(stores: Store[]): { id: string; label: string }[] {
  const uniqueLabels = Array.from(
    new Set(
      stores.map((store) => store.categoryName?.trim()).filter((label): label is string => Boolean(label && label.length > 0))
    )
  );
  if (!uniqueLabels.length) {
    const legacy = Array.from(new Set(stores.map((store) => store.businessType)));
    uniqueLabels.push(...legacy);
  }
  return [{ id: 'all', label: 'All stores' }, ...uniqueLabels.map((label) => ({ id: createCategorySlug(label), label }))];
}

type StoreExplorerProps = {
  stores: Store[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  /** Unfiltered list used for mobile category sheet labels (and should match home filter tabs). */
  categorySourceStores?: Store[];
};

export default function StoreExplorer({ stores, activeCategory, onSelectCategory, categorySourceStores }: StoreExplorerProps) {
  const categories = useMemo(
    () => getStoreCategoryOptions(categorySourceStores ?? stores),
    [categorySourceStores, stores]
  );

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const filteredStores = useMemo(() => {
    if (activeCategory === 'all') return stores;
    return stores.filter((store) => {
      const label = store.categoryName ?? store.businessType;
      return createCategorySlug(label) === activeCategory;
    });
  }, [stores, activeCategory]);

  const handlePanelSelect = (categoryId: string) => {
    onSelectCategory(categoryId);
    setIsPanelOpen(false);
  };

  return (
    <div className="relative">
      <StoreCategoryShowcase stores={filteredStores} />

      {/* Mobile bottom menu */}
      <div className="sm:hidden fixed bottom-4 inset-x-0 flex justify-center z-30">
        <div className="bg-slate-900 text-white rounded-full shadow-xl px-5 py-3 flex items-center gap-2">
          <button
            onClick={() => setIsPanelOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold"
          >
            <ListFilter className="w-4 h-4" />
            Categories
          </button>
        </div>
      </div>

      {/* Sliding category panel */}
      <div className={`fixed inset-0 z-40 transition pointer-events-none ${isPanelOpen ? 'pointer-events-auto' : ''}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isPanelOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsPanelOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl p-5 transition-transform duration-300 ${
            isPanelOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Browse</p>
              <h3 className="text-lg font-semibold text-slate-900">Select category</h3>
            </div>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500"
              aria-label="Close category panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {categories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => handlePanelSelect(category.id)}
                  className={`px-4 py-3 rounded-2xl border text-sm font-semibold text-left transition ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
