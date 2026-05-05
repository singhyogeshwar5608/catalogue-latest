'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Edit, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import type { Service, Store } from '@/types';
import { addService, getServicesByStore, getStoreBySlugFromApi, isApiError } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { isStoreTrialExpiredWithoutPaidPlan } from '@/src/lib/storeAccess';

type ServiceFormState = {
  title: string;
  description: string;
  price: string;
  isActive: boolean;
};

type ServicesManagerProps = {
  defaultShowForm?: boolean;
};

const initialForm: ServiceFormState = {
  title: '',
  description: '',
  price: '',
  isActive: true,
};

const MAX_SERVICE_IMAGE_DIMENSION = 800;
const MAX_SERVICE_IMAGE_SIZE_BYTES = 650_000;

const compressImageToDataUrl = async (file: File): Promise<string> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result) {
        reject(new Error('Unable to read image.'));
        return;
      }
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const scale = Math.min(MAX_SERVICE_IMAGE_DIMENSION / image.width, MAX_SERVICE_IMAGE_DIMENSION / image.height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(Math.round(image.width * scale), 1);
  canvas.height = Math.max(Math.round(image.height * scale), 1);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context unavailable');
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Unable to compress image.'));
        return;
      }
      resolve(result);
    }, 'image/jpeg', 0.8);
  });

  if (blob.size > MAX_SERVICE_IMAGE_SIZE_BYTES) {
    throw new Error('Service image is too large. Please use an image under ~650 KB (after compression).');
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function ServicesManager({ defaultShowForm = false }: ServicesManagerProps) {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(defaultShowForm);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<ServiceFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [ownerStore, setOwnerStore] = useState<Store | null>(null);

  useEffect(() => {
    setShowAddForm(defaultShowForm);
  }, [defaultShowForm]);

  const hasStore = Boolean(user?.storeSlug);

  const loadServices = useCallback(async () => {
    if (!user?.storeSlug) {
      setServices([]);
      setLoading(false);
      setError('You need to create a store before adding services.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const store = await getStoreBySlugFromApi(user.storeSlug);
      if (!store) {
        setServices([]);
        setStoreId(null);
        setOwnerStore(null);
        setError('Store not found. Please create your store first.');
        return;
      }

      setOwnerStore(store);
      setStoreId(store.id);
      const storeServices = await getServicesByStore(store.id);
      setServices(storeServices ?? []);
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Unable to load services');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to load services');
      }
    } finally {
      setLoading(false);
    }
  }, [router, user?.storeSlug]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadServices();
  }, [isLoggedIn, loadServices, router]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      setImageError(null);
      return;
    }

    compressImageToDataUrl(file)
      .then((dataUrl) => {
        setImagePreview(dataUrl);
        setImageError(null);
      })
      .catch((error) => {
        console.error('Failed to prepare service image:', error);
        setImagePreview(null);
        setImageError('Please upload an image under ~650 KB (after compression).');
      });
  };

  const handleAddService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.storeSlug || !storeId) {
      setFormError('Create a store before adding services.');
      return;
    }

    if (newCatalogLocked) {
      setFormError('Renew your plan to add new services.');
      return;
    }

    if (!formState.title.trim()) {
      setFormError('Service title is required.');
      return;
    }

    setFormError(null);
    setFormSubmitting(true);

    try {
      await addService({
        store_id: storeId,
        title: formState.title.trim(),
        price: formState.price ? Number(formState.price) : undefined,
        description: formState.description.trim() || undefined,
        image: imagePreview ?? undefined,
        is_active: formState.isActive,
      });

      setFormState(initialForm);
      setImagePreview(null);
      setImageError(null);
      setShowAddForm(false);
      await loadServices();
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setFormError(err.message || 'Unable to add service');
      } else {
        setFormError(err instanceof Error ? err.message : 'Unable to add service');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const liveCount = useMemo(() => services.filter((service) => service.isActive).length, [services]);
  const newCatalogLocked = useMemo(() => isStoreTrialExpiredWithoutPaidPlan(ownerStore), [ownerStore]);

  return (
    <div className="space-y-6 md:space-y-8 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Services</h1>
          <p className="text-sm md:text-base text-gray-600">Manage your service catalog</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={!hasStore || newCatalogLocked}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 bg-primary text-white rounded-xl hover:bg-primary-700 transition font-semibold text-sm md:text-base shadow-sm disabled:opacity-60"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Add Service</span>
          <span className="sm:hidden">Add Service</span>
        </button>
      </div>

      <div className="grid gap-3 md:hidden">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Live</p>
            <p className="text-lg font-semibold text-gray-900">{liveCount}</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Quick actions</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary">
            {/* <button className="flex-1 rounded-full border border-primary/20 px-3 py-2">Boost store</button> */}
            <button className="w-full rounded-full border border-primary/20 px-3 py-2">Share catalog</button>
          </div>
        </div>
      </div>

      {!hasStore && !loading && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            Create your store to start adding services. Head over to the Create Store page to get started.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {newCatalogLocked && hasStore && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Your public store link is paused</p>
          <p className="mt-1 text-amber-900/90">
            Renew your plan to let visitors see your catalog again. You can still review this page; adding new services
            is blocked until you subscribe.
          </p>
          <Link
            href="/dashboard/subscription"
            className="mt-3 inline-flex text-sm font-semibold text-amber-950 underline decoration-amber-800/50 underline-offset-2 hover:decoration-amber-950"
          >
            Go to Subscription
          </Link>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm text-gray-500">Loading services…</div>
      )}

      {showAddForm && hasStore && (
        <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Create new service</p>
              <h2 className="text-xl font-semibold text-gray-900">Add Service</h2>
            </div>
            <div className="rounded-full bg-gray-100 p-2">
              <Briefcase className="w-5 h-5 text-gray-500" />
            </div>
          </div>
          <form className="space-y-4 text-sm" onSubmit={handleAddService}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  value={formState.title}
                  onChange={(event) => setFormState({ ...formState, title: event.target.value })}
                  type="text"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Bridal Makeup Session"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹)</label>
                <input
                  value={formState.price}
                  onChange={(event) => setFormState({ ...formState, price: event.target.value })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="1200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formState.description}
                onChange={(event) => setFormState({ ...formState, description: event.target.value })}
                className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={4}
                placeholder="Share what makes this service unique."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full" />
                {imagePreview && (
                  <div className="mt-3">
                    <img src={imagePreview} alt="Preview" className="h-32 w-32 rounded-2xl object-cover border border-gray-200" />
                  </div>
                )}
                {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                <select
                  value={formState.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setFormState({ ...formState, isActive: event.target.value === 'active' })
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Hidden</option>
                </select>
              </div>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formSubmitting ? 'Adding…' : 'Add Service'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormState(initialForm);
                  setImagePreview(null);
                  setImageError(null);
                  setFormError(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!services.length && !loading && hasStore && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">No services yet</h3>
          <p className="mt-2 text-sm text-gray-600">Add your first service to start showcasing your offerings.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>
      )}

      {services.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="aspect-video rounded-xl bg-gray-50 mb-3 overflow-hidden">
                  {service.image ? (
                    <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.title}</h3>
                    {service.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{service.description}</p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${service.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {service.isActive ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    {service.price != null ? `₹${service.price}` : 'Custom quote'}
                  </span>
                  <div className="flex gap-2">
                    <button className="rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" aria-label="Edit service">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="rounded-full border border-gray-200 p-2 text-red-500 hover:bg-red-50" aria-label="Delete service">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>Service</span>
              <span>Price</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            <div>
              {services.map((service) => (
                <div
                  key={service.id}
                  className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-4 border-b border-gray-100 px-5 py-4 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                      {service.image ? (
                        <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{service.title}</p>
                      <p className="truncate text-xs text-gray-500">{service.description || 'No description'}</p>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-gray-900">
                    {service.price != null ? `₹${service.price}` : 'Custom quote'}
                  </p>
                  <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${service.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                    {service.isActive ? 'Live' : 'Hidden'}
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" aria-label="Edit service">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="rounded-full border border-gray-200 p-2 text-red-500 hover:bg-red-50" aria-label="Delete service">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
