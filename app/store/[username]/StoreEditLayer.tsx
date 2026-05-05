"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Store, Product, Review } from '@/types';
import StoreView from '@/components/store/StoreView';

type StoreEditLayerProps = {
  store: Store;
  products: Product[];
  reviews: Review[];
};

export default function StoreEditLayer({ store, products, reviews }: StoreEditLayerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams?.get('edit') === 'true';

  const [logoPreview, setLogoPreview] = useState(store.logo);
  const [storeName, setStoreName] = useState(store.name);
  const [storeDescription, setStoreDescription] = useState(store.description);
  const [storeLocation, setStoreLocation] = useState(store.location);
  const [previewProducts, setPreviewProducts] = useState(products);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductImage, setNewProductImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editedStore = useMemo(
    () => ({
      ...store,
      logo: logoPreview,
      name: storeName,
      description: storeDescription,
      shortDescription: storeDescription,
      location: storeLocation,
    }),
    [store, logoPreview, storeName, storeDescription, storeLocation]
  );

  useEffect(() => {
    setLogoPreview(store.logo);
    setStoreName(store.name);
    setStoreDescription(store.description);
    setStoreLocation(store.location);
    setPreviewProducts(products);
  }, [store, products]);

  const enterEditMode = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('edit', 'true');
    router.push(`${url.pathname}?${url.searchParams.toString()}${url.hash}`);
  }, [router]);

  const exitEditMode = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    router.push(`${url.pathname}${url.search}${url.hash}`);
  }, [router]);

  const handleLogoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAddProductShortcut = useCallback(() => {
    if (!newProductName || !newProductPrice) return;
    setPreviewProducts((previous) => [
      ...previous,
      {
        id: `new-${Date.now()}`,
        storeId: store.id,
        storeName: store.name,
        name: newProductName,
        description: 'New product',
        price: Number(newProductPrice),
        image: newProductImage || '/placeholder.png',
        images: [newProductImage || '/placeholder.png'],
        category: 'Custom',
        rating: 5,
        totalReviews: 0,
        inStock: true,
      },
    ]);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductImage('');
  }, [newProductName, newProductPrice, newProductImage, store.id, store.name]);

  return (
    <>
      <StoreView
        store={editedStore}
        products={previewProducts}
        services={[]}
        reviews={reviews}
        isEditMode={isEditMode}
        onEnterEdit={enterEditMode}
        onInlineLogoEdit={() => {
          fileInputRef.current?.click();
        }}
        onNameChange={setStoreName}
        onDescriptionChange={setStoreDescription}
        onLocationChange={setStoreLocation}
        onAddProductShortcut={handleAddProductShortcut}
        onStoreUpdated={(next) => {
          setLogoPreview(next.logo);
          setStoreName(next.name);
          setStoreDescription(next.description);
          setStoreLocation(next.location);
        }}
      />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
      {isEditMode && (
        <div className="fixed bottom-4 left-4 right-4 z-50 space-y-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Quick product add</p>
            <button
              type="button"
              onClick={exitEditMode}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white"
            >
              Publish
            </button>
          </div>
          <div className="grid gap-2">
            <input
              type="text"
              placeholder="Product name"
              value={newProductName}
              onChange={(event) => setNewProductName(event.target.value)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Price"
              value={newProductPrice}
              onChange={(event) => setNewProductPrice(event.target.value)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Image URL"
              value={newProductImage}
              onChange={(event) => setNewProductImage(event.target.value)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAddProductShortcut}
            className="w-full rounded-2xl bg-slate-900 py-2 text-sm font-semibold text-white"
          >
            Add product
          </button>
        </div>
      )}
    </>
  );
}
