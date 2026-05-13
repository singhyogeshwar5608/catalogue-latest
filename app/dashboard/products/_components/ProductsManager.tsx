'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import {
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Briefcase,
  X,
  Search,
  ChevronDown,
  Check,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { Product, Service, Store } from '@/types';
import { addProduct, addService, deleteProduct, getProductsByStore, getServicesByStore, getStoreBySlugFromApi, isApiError, updateProduct } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { useSearch } from '@/src/context/SearchContext';
import { isStoreTrialExpiredWithoutPaidPlan } from '@/src/lib/storeAccess';

const PRODUCT_UNIT_OPTIONS = [
  { value: 'piece', label: 'Pieces (pcs)' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'set', label: 'Set' },
  { value: 'kilogram', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'milliliter', label: 'Milliliter (ml)' },
  { value: 'meter', label: 'Meter (m)' },
  { value: 'centimeter', label: 'Centimeter (cm)' },
  { value: 'square_meter', label: 'Square meter (m²)' },
  { value: 'custom', label: 'Custom unit' },
] as const;

type ProductUnitType = (typeof PRODUCT_UNIT_OPTIONS)[number]['value'];

const SERVICE_BILLING_UNITS = [
  { value: 'session', label: 'Per session' },
  { value: 'hour', label: 'Per hour' },
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per month' },
  { value: 'project', label: 'Per project' },
  { value: 'custom', label: 'Custom unit' },
] as const;

type ServiceBillingUnit = (typeof SERVICE_BILLING_UNITS)[number]['value'];

type ProductFormState = {
  name: string;
  description: string;
  price: string;
  stockStatus: 'inStock' | 'outOfStock';
  unitType: ProductUnitType;
  unitCustomLabel: string;
  unitQuantity: string;
  wholesaleEnabled: boolean;
  wholesalePrice: string;
  wholesaleMinQty: string;
  minOrderQuantity: string;
  discountEnabled: boolean;
  discountPrice: string;
  discountScheduleEnabled: boolean;
  discountStartsAt: string;
  discountEndsAt: string;
};

type ServiceFormState = {
  title: string;
  description: string;
  price: string;
  isActive: boolean;
  billingUnit: ServiceBillingUnit;
  customBillingUnit: string;
  minQuantity: string;
  packagePrice: string;
};

type ProductsManagerProps = {
  defaultShowForm?: boolean;
};

const initialForm: ProductFormState = {
  name: '',
  description: '',
  price: '',
  stockStatus: 'inStock',
  unitType: 'piece',
  unitCustomLabel: '',
  unitQuantity: '1',
  wholesaleEnabled: false,
  wholesalePrice: '',
  wholesaleMinQty: '',
  minOrderQuantity: '',
  discountEnabled: false,
  discountPrice: '',
  discountScheduleEnabled: false,
  discountStartsAt: '',
  discountEndsAt: '',
};

const initialServiceForm: ServiceFormState = {
  title: '',
  description: '',
  price: '',
  isActive: true,
  billingUnit: 'session',
  customBillingUnit: '',
  minQuantity: '',
  packagePrice: '',
};

const MAX_PRODUCT_IMAGE_DIMENSION = 800;

function ProductActiveSwitch({
  active,
  disabled,
  busy,
  onToggle,
}: {
  active: boolean;
  disabled: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  /** ~10% smaller than prior h-5 w-9 / h-4 thumb (20×36px → 18×32.4px, thumb 14.4px). */
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? 'Product visible on store' : 'Product hidden from store'}
      disabled={disabled || busy}
      onClick={() => onToggle()}
      className={`relative inline-flex h-[18px] w-[32.4px] shrink-0 items-center rounded-full p-[2px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'justify-end bg-emerald-500' : 'justify-start bg-slate-300'
      }`}
    >
      <span className="pointer-events-none block h-[14.4px] w-[14.4px] shrink-0 rounded-full bg-white shadow-sm ring-0" />
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/55">
          <Loader2 className="h-[10.8px] w-[10.8px] animate-spin text-slate-600" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

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

  const scale = Math.min(MAX_PRODUCT_IMAGE_DIMENSION / image.width, MAX_PRODUCT_IMAGE_DIMENSION / image.height, 1);
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

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function ProductsManager({ defaultShowForm = false }: ProductsManagerProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { isLoggedIn, user, logout } = useAuth();
  const { searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery } = useSearch();
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(defaultShowForm);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [serviceFormState, setServiceFormState] = useState<ServiceFormState>(initialServiceForm);
  const [serviceFormError, setServiceFormError] = useState<string | null>(null);
  const [serviceFormSubmitting, setServiceFormSubmitting] = useState(false);

  const [serviceImagePreview, setServiceImagePreview] = useState<string | null>(null);
  const [serviceImageError, setServiceImageError] = useState<string | null>(null);
  const serviceImageInputRef = useRef<HTMLInputElement | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [ownerStore, setOwnerStore] = useState<Store | null>(null);
  const [listFilter, setListFilter] = useState<'products' | 'services'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const unitDropdownRef = useRef<HTMLDivElement | null>(null);
  const isEditingProduct = Boolean(editingProduct);

  useEffect(() => {
    if (!unitDropdownOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!unitDropdownRef.current) return;
      if (!unitDropdownRef.current.contains(event.target as Node)) {
        setUnitDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [unitDropdownOpen]);

  useEffect(() => {
    setShowAddForm(defaultShowForm);
  }, [defaultShowForm]);

  const hasStore = Boolean(user?.storeSlug);
  const newCatalogLocked = useMemo(() => isStoreTrialExpiredWithoutPaidPlan(ownerStore), [ownerStore]);

  const loadProducts = useCallback(
    async (syncDashboard = false) => {
      if (!user?.storeSlug) {
        setProducts([]);
        setServices([]);
        setLoading(false);
        setError('You need to create a store before adding products.');
        return;
      }

      setLoading(true);
      setError(null);
      // Drop stale “plan limit” / API messages once the catalog is refreshed (e.g. after delete).
      setFormError(null);
      try {
        const store = await getStoreBySlugFromApi(user.storeSlug);
        setOwnerStore(store ?? null);
        setStoreId(store?.id ?? null);

        // Load products directly using getProductsByStore
        if (store?.id) {
          const storeProducts = await getProductsByStore(store.id);
          setProducts(storeProducts ?? []);

          const storeServices = await getServicesByStore(store.id);
          setServices(storeServices ?? []);
        } else {
          setProducts([]);
          setServices([]);
          setOwnerStore(null);
        }

        if (syncDashboard && user.storeSlug) {
          void mutate(user.storeSlug);
        }
      } catch (err) {
        if (isApiError(err)) {
          if (err.status === 401) {
            router.replace('/login');
            return;
          }
          setError(err.message || 'Unable to load products');
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load products');
        }
      } finally {
        setLoading(false);
      }
    },
    [user?.storeSlug, router, mutate],
  );

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadProducts();
  }, [isLoggedIn, loadProducts, router]);

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
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      })
      .catch((error) => {
        console.error('Failed to prepare product image:', error);
        setImagePreview(null);
        setImageError('Please upload an image under ~3.5 MB (after compression).');
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      });
  };

  const handleTriggerImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleRemoveImage = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setImagePreview(null);
    setImageError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleEditClick = (product: Product) => {
    if (newCatalogLocked) {
      setError('Renew your plan to edit products.');
      return;
    }
    setShowAddForm(true);
    setShowAddServiceForm(false);
    setEditingProduct(product);
    setFormState({
      ...initialForm,
      name: product.name,
      description: product.description ?? '',
      price: product.price ? String(product.price) : '',
      stockStatus: product.inStock ? 'inStock' : 'outOfStock',
      unitType: (product.unitType as ProductUnitType) ?? 'piece',
      unitCustomLabel: product.unitCustomLabel ?? '',
      unitQuantity: product.unitQuantity != null ? String(product.unitQuantity) : '1',
      wholesaleEnabled: Boolean(product.wholesaleEnabled),
      wholesalePrice: product.wholesalePrice != null ? String(product.wholesalePrice) : '',
      wholesaleMinQty: product.wholesaleMinQty != null ? String(product.wholesaleMinQty) : '',
      minOrderQuantity: product.minOrderQuantity != null ? String(product.minOrderQuantity) : '',
      discountEnabled: Boolean(product.discountEnabled),
      discountPrice: product.discountPrice != null ? String(product.discountPrice) : '',
      discountScheduleEnabled: Boolean(product.discountScheduleEnabled),
      discountStartsAt: product.discountStartsAt ?? '',
      discountEndsAt: product.discountEndsAt ?? '',
    });
    setImagePreview(product.image || null);
    setFormError(null);
  };

  const handleToggleProductActive = async (product: Product) => {
    if (newCatalogLocked) {
      setError('Renew your plan to edit products.');
      return;
    }
    setTogglingProductId(product.id);
    setError(null);
    try {
      await updateProduct({
        id: product.id,
        is_active: !product.inStock,
      });
      await loadProducts(true);
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err.message || 'Unable to update product status');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to update product status');
      }
    } finally {
      setTogglingProductId(null);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeletingProductId(productId);
    try {
      await deleteProduct(productId);
      setShowDeleteConfirm(null);
      if (editingProduct && editingProduct.id === productId) {
        handleResetProductForm();
        setShowAddForm(false);
      }
      await loadProducts(true);
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message || 'Unable to delete product');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to delete product');
      }
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleResetProductForm = () => {
    setFormState(initialForm);
    setImagePreview(null);
    setImageError(null);
    setEditingProduct(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  /** Same behavior as the top toolbar “Add Product” control (also used below the list). */
  const handlePrimaryAddProductToolbarClick = () => {
    if (editingProduct) {
      handleResetProductForm();
      setShowAddServiceForm(false);
      setShowAddForm(true);
      setFormError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowAddServiceForm(false);
    setShowAddForm((prev) => {
      const next = !prev;
      if (next) {
        setFormError(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return next;
    });
  };

  const addProductToolbarButtonClassName = `flex items-center justify-center gap-1.5 w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl text-white shadow-sm transition sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm md:px-6 md:py-3 md:text-base ${
    isEditingProduct ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary-700'
  } disabled:opacity-60`;

  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.storeSlug) {
      setFormError('Create a store before adding products.');
      return;
    }

    if (newCatalogLocked) {
      setFormError(
        editingProduct ? 'Renew your plan to save product changes.' : 'Renew your plan to add new products.',
      );
      return;
    }

    setFormError(null);
    setFormSubmitting(true);

    try {
      const unitQuantityValue = Number(formState.unitQuantity);
      const priceValue = Number(formState.price);
      const wholesalePriceValue = Number(formState.wholesalePrice);
      const wholesaleMinQtyValue = Number(formState.wholesaleMinQty);
      const minOrderQtyValue = Number(formState.minOrderQuantity);
      const discountPriceValue = Number(formState.discountPrice);
      const parsedUnitQty =
        Number.isFinite(unitQuantityValue) ? unitQuantityValue : Number(formState.unitQuantity.trim());
      const parsedWholesalePrice =
        Number.isFinite(wholesalePriceValue) ? wholesalePriceValue : Number(formState.wholesalePrice.trim());
      const parsedWholesaleMin =
        Number.isFinite(wholesaleMinQtyValue) ? wholesaleMinQtyValue : Number(formState.wholesaleMinQty.trim());
      const parsedMinOrder =
        Number.isFinite(minOrderQtyValue) ? minOrderQtyValue : Number(formState.minOrderQuantity.trim());
      const parsedDiscount =
        Number.isFinite(discountPriceValue) ? discountPriceValue : Number(formState.discountPrice.trim());
      const payload = {
        ...(storeId ? { store_id: storeId } : {}),
        title: formState.name,
        price: Number.isFinite(priceValue) ? priceValue : Number(formState.price.trim()),
        description: formState.description,
        image: imagePreview ?? undefined,
        is_active: formState.stockStatus === 'inStock',
        unit_type: formState.unitType,
        unit_custom_label: formState.unitType === 'custom' ? (formState.unitCustomLabel || null) : null,
        unit_quantity: Number.isFinite(parsedUnitQty) ? parsedUnitQty : null,
        wholesale_enabled: Boolean(formState.wholesalePrice || formState.wholesaleMinQty),
        wholesale_price: Number.isFinite(parsedWholesalePrice) ? parsedWholesalePrice : null,
        wholesale_min_qty: Number.isFinite(parsedWholesaleMin) ? parsedWholesaleMin : null,
        min_order_quantity: Number.isFinite(parsedMinOrder) ? parsedMinOrder : null,
        discount_enabled: formState.discountEnabled,
        discount_price: Number.isFinite(parsedDiscount) ? parsedDiscount : null,
        discount_schedule_enabled: formState.discountScheduleEnabled,
        discount_starts_at: formState.discountStartsAt || undefined,
        discount_ends_at: formState.discountEndsAt || undefined,
      };

      if (editingProduct) {
        await updateProduct({
          id: editingProduct.id,
          ...payload,
        });
      } else {
        await addProduct(payload);
      }

      handleResetProductForm();
      setShowAddForm(false);
      setFormError(null);
      await loadProducts(true);
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setFormError(err.message || 'Unable to add product');
      } else {
        setFormError(err instanceof Error ? err.message : 'Unable to add product');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleServiceImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setServiceImagePreview(null);
      setServiceImageError(null);
      return;
    }

    compressImageToDataUrl(file)
      .then((dataUrl) => {
        setServiceImagePreview(dataUrl);
        setServiceImageError(null);
        if (serviceImageInputRef.current) {
          serviceImageInputRef.current.value = '';
        }
      })
      .catch((error) => {
        console.error('Failed to prepare service image:', error);
        setServiceImagePreview(null);
        setServiceImageError('Please upload an image under ~3.5 MB (after compression).');
        if (serviceImageInputRef.current) {
          serviceImageInputRef.current.value = '';
        }
      });
  };

  const handleTriggerServiceImageUpload = () => {
    serviceImageInputRef.current?.click();
  };

  const handleRemoveServiceImage = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setServiceImagePreview(null);
    setServiceImageError(null);
    if (serviceImageInputRef.current) {
      serviceImageInputRef.current.value = '';
    }
  };

  const handleAddService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.storeSlug || !storeId) {
      setServiceFormError('Create a store before adding services.');
      return;
    }

    if (newCatalogLocked) {
      setServiceFormError('Renew your plan to add new services.');
      return;
    }

    if (!serviceFormState.title.trim()) {
      setServiceFormError('Service title is required.');
      return;
    }

    if (serviceFormState.billingUnit === 'custom' && !serviceFormState.customBillingUnit.trim()) {
      setServiceFormError('Please provide a label for the custom billing unit.');
      return;
    }

    setServiceFormError(null);
    setServiceFormSubmitting(true);

    try {
      const minQuantityValue = serviceFormState.minQuantity ? Number(serviceFormState.minQuantity) : null;
      const packagePriceValue = serviceFormState.packagePrice ? Number(serviceFormState.packagePrice) : null;

      const billingUnit = serviceFormState.billingUnit;
      const customBillingUnit =
        billingUnit === 'custom' ? serviceFormState.customBillingUnit.trim() || null : null;

      await addService({
        store_id: storeId,
        title: serviceFormState.title.trim(),
        price: serviceFormState.price ? Number(serviceFormState.price) : undefined,
        description: serviceFormState.description.trim() || undefined,
        image: serviceImagePreview ?? undefined,
        is_active: serviceFormState.isActive,
        billing_unit: billingUnit,
        custom_billing_unit: customBillingUnit,
        min_quantity:
          minQuantityValue != null && !Number.isNaN(minQuantityValue) && minQuantityValue > 0
            ? minQuantityValue
            : null,
        package_price:
          packagePriceValue != null && !Number.isNaN(packagePriceValue) ? packagePriceValue : null,
      });

      setServiceFormState(initialServiceForm);
      setServiceImagePreview(null);
      setServiceImageError(null);
      setShowAddServiceForm(false);
      await loadProducts(true);
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          router.replace('/login');
          return;
        }
        setServiceFormError(err.message || 'Unable to add service');
      } else {
        setServiceFormError(err instanceof Error ? err.message : 'Unable to add service');
      }
    } finally {
      setServiceFormSubmitting(false);
    }
  };

  const liveCount = useMemo(() => products.filter((product) => product.inStock).length, [products]);
  const liveServicesCount = useMemo(() => services.filter((service) => service.isActive).length, [services]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!localSearchQuery.trim()) return products;
    
    const query = localSearchQuery.toLowerCase().trim();
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        (product.unitType && product.unitType.toLowerCase().includes(query))
      );
    });
  }, [products, localSearchQuery]);

  // Filter services based on search query
  const filteredServices = useMemo(() => {
    if (!localSearchQuery.trim()) return services;
    
    const query = localSearchQuery.toLowerCase().trim();
    return services.filter((service) => {
      return (
        service.title.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query) ||
        (service.billingUnit && service.billingUnit.toLowerCase().includes(query))
      );
    });
  }, [services, localSearchQuery]);

  const renderMobileProductCard = (product: Product) => (
    <div
      key={product.id}
      className={`rounded-2xl border bg-white px-2 py-2 shadow-sm ${
        product.inStock ? 'border border-gray-100' : 'border border-dashed border-slate-200 bg-slate-50/70'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[12px] font-semibold text-gray-900">{product.name}</h3>
              <p className="text-[9px] text-gray-500">{product.category || 'Uncategorized'}</p>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1">
              <ProductActiveSwitch
                active={product.inStock}
                disabled={newCatalogLocked}
                busy={togglingProductId === product.id}
                onToggle={() => void handleToggleProductActive(product)}
              />
              <button
                type="button"
                onClick={() => handleEditClick(product)}
                disabled={newCatalogLocked}
                className="rounded-full border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Edit product"
              >
                <Edit className="h-[10.56px] w-[10.56px]" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm({ id: product.id, name: product.name })}
                className="rounded-full border border-gray-200 p-1 text-red-500 hover:bg-red-50"
                aria-label="Delete product"
              >
                <Trash2 className="h-[10.56px] w-[10.56px]" aria-hidden />
              </button>
            </div>
          </div>

          <p className="mt-0.5 text-[10px] font-semibold text-gray-900">₹{product.price}</p>
        </div>
      </div>
    </div>
  );

  const renderDesktopProductRow = (product: Product) => (
    <div
      key={product.id}
      className={`grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0 ${
        product.inStock ? '' : 'bg-slate-50/60'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{product.name}</p>
          <p className="truncate text-xs text-slate-500">{product.description || 'No description'}</p>
        </div>
      </div>

      <p className="truncate text-sm text-slate-700">{product.category || 'Uncategorized'}</p>
      <p className="text-sm font-semibold text-slate-950">₹{product.price}</p>
      <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${product.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
        {product.inStock ? 'Live' : 'Hidden'}
      </span>

      <div className="flex items-center justify-end gap-2">
        <ProductActiveSwitch
          active={product.inStock}
          disabled={newCatalogLocked}
          busy={togglingProductId === product.id}
          onToggle={() => void handleToggleProductActive(product)}
        />
        <button
          type="button"
          onClick={() => handleEditClick(product)}
          disabled={newCatalogLocked}
          className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Edit product"
        >
          <Edit className="h-[21.12px] w-[21.12px]" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm({ id: product.id, name: product.name })}
          className="rounded-full border border-slate-200 bg-white p-2 text-rose-600 transition hover:bg-rose-50"
          aria-label="Delete product"
        >
          <Trash2 className="h-[21.12px] w-[21.12px]" aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 md:space-y-8 md:rounded-3xl md:border md:border-slate-200 md:bg-white md:p-6 md:shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
          <button
            type="button"
            onClick={handlePrimaryAddProductToolbarClick}
            disabled={!hasStore || (newCatalogLocked && !editingProduct)}
            className={addProductToolbarButtonClassName}
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">{isEditingProduct ? 'Editing product' : 'Add Product'}</span>
            <span className="sm:hidden">{isEditingProduct ? 'Editing product' : 'Add Product'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (editingProduct) {
                handleResetProductForm();
              }
              setShowAddForm(false);
              setShowAddServiceForm((prev) => !prev);
            }}
            disabled={!hasStore || newCatalogLocked}
            className="flex items-center justify-center gap-1.5 w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm md:px-6 md:py-3 md:text-base"
          >
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Add Service</span>
            <span className="sm:hidden">Add Service</span>
          </button>
        </div>
      </div>

      {!hasStore && !loading && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            Create your store to start adding products. Head over to the Create Store page to get started.
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
            Visitors won&apos;t see your catalog until you renew. You can still open this dashboard to review your
            store, but adding or editing products and services is blocked until you subscribe again.
          </p>
          <Link
            href="/dashboard/subscription"
            className="mt-3 inline-flex text-sm font-semibold text-amber-950 underline decoration-amber-800/50 underline-offset-2 hover:decoration-amber-950"
          >
            Go to Subscription
          </Link>
        </div>
      )}

      {showAddForm && (
        <div className="add-product-form-shell rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form onSubmit={handleAddProduct} className="add-product-form space-y-5">
            <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="md:justify-self-start">
                <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                  <div className="space-y-1 text-left">
                    <label className="block text-left text-[13px] font-semibold text-slate-700" htmlFor="product-image-input">
                      Product cover
                    </label>
                    <label
                      htmlFor="product-image-input"
                      className={`relative inline-flex min-h-[128px] w-[112px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white text-center shadow-[0_6px_18px_rgba(15,23,42,0.12)] ${imagePreview ? 'px-2 py-2' : 'px-2 py-2'}`}
                    >
                      <div className="relative flex-1 self-stretch w-full min-h-0">
                        {imagePreview ? (
                          <>
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-full w-full rounded-[14px] border border-slate-200 bg-white object-contain p-0"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 transition hover:bg-red-500 hover:text-white"
                              aria-label="Remove image"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary sm:h-14 sm:w-14">
                            <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                </div>
                <input
                  id="product-image-input"
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imageError && <p className="text-sm text-red-600">{imageError}</p>}
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-slate-700" htmlFor="product-name-input">
                      Name
                    </label>
                    <input
                      id="product-name-input"
                      type="text"
                      value={formState.name}
                      onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      placeholder="e.g., Modern Wooden Chair"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Price (₹)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formState.price}
                      onChange={(event) => setFormState({ ...formState, price: event.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 items-end gap-2">
                    <div ref={unitDropdownRef} className="relative">
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Sell by</label>
                      <button
                        type="button"
                        onClick={() => setUnitDropdownOpen((previous) => !previous)}
                        className="flex h-[34px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[8px] text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 md:h-10 md:px-4 md:text-sm"
                      >
                        <span className="truncate">
                          {PRODUCT_UNIT_OPTIONS.find((option) => option.value === formState.unitType)?.label ?? 'Select unit'}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition ${unitDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {unitDropdownOpen && (
                        <div className="absolute left-0 right-0 z-30 mt-1.5 max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
                          {PRODUCT_UNIT_OPTIONS.map((option) => {
                            const selected = option.value === formState.unitType;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setFormState({
                                    ...formState,
                                    unitType: option.value,
                                    unitCustomLabel: '',
                                  });
                                  setUnitDropdownOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[8px] transition ${
                                  selected ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50'
                                } md:text-sm`}
                              >
                                <span>{option.label}</span>
                                {selected ? <Check className="h-3.5 w-3.5" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Units</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formState.unitQuantity}
                        onChange={(event) => setFormState({ ...formState, unitQuantity: event.target.value })}
                        className="h-[34px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[8px] text-left text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 md:h-10 md:px-4 md:text-sm"
                        placeholder="e.g., 12"
                      />
                    </div>

                    {formState.unitType === 'custom' && (
                      <div className="col-span-2">
                        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Custom unit label</label>
                        <input
                          type="text"
                          value={formState.unitCustomLabel}
                          onChange={(event) => setFormState({ ...formState, unitCustomLabel: event.target.value })}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                          placeholder="e.g., Bundle"
                        />
                      </div>
                    )}

                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Wholesale price</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formState.wholesalePrice}
                      onChange={(event) => setFormState({ ...formState, wholesalePrice: event.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      placeholder="350.00"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Min qty</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formState.wholesaleMinQty}
                      onChange={(event) => setFormState({ ...formState, wholesaleMinQty: event.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                      placeholder="20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={4}
                    value={formState.description}
                    onChange={(event) => setFormState({ ...formState, description: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    placeholder="Highlight product features, materials, or usage in a few short lines."
                  />
                </div>

              </div>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => {
                    handleResetProductForm();
                    setShowAddForm(false);
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {isEditingProduct ? 'Cancel edit' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || newCatalogLocked}
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {formSubmitting ? (isEditingProduct ? 'Updating…' : 'Saving...') : isEditingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showAddServiceForm && (
        <div className="add-product-form-shell rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form onSubmit={handleAddService} className="add-product-form space-y-5">
            <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-6">
              <div className="md:justify-self-start">
                <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[112px_minmax(0,1fr)]">
                  <div className="space-y-1 text-left">
                    <label className="block text-left text-[13px] font-semibold text-slate-700" htmlFor="service-image-input">
                      Service cover
                    </label>
                    <label
                      htmlFor="service-image-input"
                      className={`relative inline-flex min-h-[128px] w-[112px] cursor-pointer flex-col items-center justify-center gap-0 rounded-xl border-2 border-slate-300 bg-white text-center shadow-[0_6px_18px_rgba(15,23,42,0.12)] ${
                        serviceImagePreview ? 'p-0' : 'p-2'
                      }`}
                    >
                      <div className="relative flex-1 self-stretch w-full min-h-0">
                        {serviceImagePreview ? (
                          <>
                            <img
                              src={serviceImagePreview}
                              alt="Preview"
                              className="absolute inset-0 h-full w-full rounded-[14px] bg-white object-contain"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveServiceImage}
                              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 transition hover:bg-red-500 hover:text-white"
                              aria-label="Remove image"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary sm:h-14 sm:w-14">
                            <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="mt-1 sm:mt-2 lg:mt-2">
                    <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Service name *</label>
                    <input
                      type="text"
                      value={serviceFormState.title}
                      onChange={(event) => setServiceFormState({ ...serviceFormState, title: event.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 lg:px-4 lg:py-3"
                      placeholder="e.g., Bridal Makeup Session"
                      required
                    />
                  </div>
                </div>

                <input
                  id="service-image-input"
                  ref={serviceImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleServiceImageChange}
                  className="hidden"
                />
                {serviceImageError && <p className="text-sm text-red-600">{serviceImageError}</p>}
              </div>

              <div className="space-y-4">
                <div className="space-y-4">

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={serviceFormState.price}
                        onChange={(event) => setServiceFormState({ ...serviceFormState, price: event.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 lg:px-4 lg:py-3"
                        placeholder="1200"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Package price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={serviceFormState.packagePrice}
                        onChange={(event) => setServiceFormState({ ...serviceFormState, packagePrice: event.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 lg:px-4 lg:py-3"
                        placeholder="5000"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 items-end gap-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Billing unit *</label>
                    <select
                      value={serviceFormState.billingUnit}
                      onChange={(event) =>
                        setServiceFormState({
                          ...serviceFormState,
                          billingUnit: event.target.value as ServiceBillingUnit,
                          customBillingUnit: '',
                        })
                      }
                      className="h-[34px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[8px] text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 lg:h-10 lg:px-4 lg:text-sm"
                    >
                      {SERVICE_BILLING_UNITS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Min booking qty</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={serviceFormState.minQuantity}
                      onChange={(event) => setServiceFormState({ ...serviceFormState, minQuantity: event.target.value })}
                      className="h-[34px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[8px] text-left text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 lg:h-10 lg:px-4 lg:text-sm"
                      placeholder="e.g., 2"
                    />
                  </div>

                  {serviceFormState.billingUnit === 'custom' && (
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Custom billing label *</label>
                      <input
                        type="text"
                        value={serviceFormState.customBillingUnit}
                        onChange={(event) =>
                          setServiceFormState({ ...serviceFormState, customBillingUnit: event.target.value })
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 lg:px-4 lg:py-3 lg:text-sm"
                        placeholder="e.g., Complete project"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={4}
                    value={serviceFormState.description}
                    onChange={(event) => setServiceFormState({ ...serviceFormState, description: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 lg:px-4 lg:py-3"
                    placeholder="Share what makes this service unique."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Visibility</label>
                  <select
                    value={serviceFormState.isActive ? 'active' : 'inactive'}
                    onChange={(event) => setServiceFormState({ ...serviceFormState, isActive: event.target.value === 'active' })}
                    className="h-[34px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[8px] text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 lg:h-10 lg:px-4 lg:text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Hidden</option>
                  </select>
                </div>
              </div>
            </div>

            {serviceFormError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serviceFormError}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddServiceForm(false);
                    setServiceFormState(initialServiceForm);
                    setServiceImagePreview(null);
                    setServiceImageError(null);
                    setServiceFormError(null);
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={serviceFormSubmitting || newCatalogLocked}
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {serviceFormSubmitting ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex w-full justify-center px-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {products.length} total products
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {liveCount} live
            </span>
            <span className="hidden items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 md:inline-flex">
              {services.length} services
            </span>
            {hasStore && user?.storeSlug ? (
              <Link
                href={`/store/${encodeURIComponent(user.storeSlug)}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                View Store
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="Search products by name, description, category..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:py-3 md:text-base"
          />
          {localSearchQuery && (
            <button
              type="button"
              onClick={() => setLocalSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="md:hidden flex gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setListFilter('products')}
            className={`flex-1 rounded-full px-3 py-1 border ${listFilter === 'products' ? 'border-primary text-primary bg-primary/10' : 'border-gray-200 text-gray-500'}`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setListFilter('services')}
            className={`flex-1 rounded-full px-3 py-1 border ${listFilter === 'services' ? 'border-primary text-primary bg-primary/10' : 'border-gray-200 text-gray-500'}`}
          >
            Services
          </button>
        </div>

        {listFilter === 'products' ? (
          <div className="space-y-3 md:hidden">
            {filteredProducts.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-3 py-6 text-center text-xs text-gray-500">
                {localSearchQuery ? 'No products found matching your search.' : 'No products yet. Add your first product to see it here.'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProducts.map((product) => renderMobileProductCard(product))}
              </div>
            )}
            {hasStore && !loading ? (
              <button
                type="button"
                onClick={handlePrimaryAddProductToolbarClick}
                disabled={newCatalogLocked && !editingProduct}
                className={`${addProductToolbarButtonClassName} w-full max-w-none`}
              >
                <Plus className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span>{isEditingProduct ? 'Editing product' : 'Add Product'}</span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1 md:hidden">
            {filteredServices.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-3 py-6 text-center text-xs text-gray-500">
                {localSearchQuery ? 'No services found matching your search.' : 'No services yet. Add one to see it here.'}
              </div>
            ) : (
              filteredServices.map((service) => (
                <div key={service.id} className="rounded-2xl border border-gray-100 bg-white px-1.5 py-1.5 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50">
                      {service.image ? (
                        <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h3 className="truncate text-[12px] font-semibold text-gray-900">{service.title}</h3>
                          <p className="text-[9px] text-gray-500 line-clamp-1">{service.description || 'Service'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-[7px] font-semibold ${service.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {service.isActive ? 'Live' : 'Hidden'}
                          </span>
                                <div className="flex items-center gap-0.5">
                            <button className="rounded-full border border-gray-200 p-0.5 text-gray-600 hover:bg-gray-50" aria-label="Edit service">
                              <Edit className="w-2 h-2" />
                            </button>
                            <button className="rounded-full border border-gray-200 p-0.5 text-red-500 hover:bg-red-50" aria-label="Delete service">
                              <Trash2 className="w-2 h-2" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="mt-0 text-[10px] font-semibold text-gray-900">
                        {service.price != null ? `₹${service.price}` : 'Custom quote'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Product</span>
          <span>Category</span>
          <span>Price</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div>
          {filteredProducts.length === 0 && !loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              {localSearchQuery ? 'No products found matching your search.' : 'No products yet. Add your first product to see it here.'}
            </div>
          ) : (
            <>{filteredProducts.map((product) => renderDesktopProductRow(product))}</>
          )}
          {products.length > 0 && !loading ? (
            <div className="flex justify-center border-t border-gray-100 px-5 py-4 sm:justify-start">
              <button
                type="button"
                onClick={handlePrimaryAddProductToolbarClick}
                disabled={!hasStore || (newCatalogLocked && !editingProduct)}
                className={addProductToolbarButtonClassName}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">{isEditingProduct ? 'Editing product' : 'Add Product'}</span>
                <span className="sm:hidden">{isEditingProduct ? 'Editing product' : 'Add Product'}</span>
              </button>
            </div>
          ) : null}
        </div>
        {!products.length && !loading && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">No products yet</h3>
            <p className="mt-2 text-sm text-gray-600">Add your first product to start showcasing your catalog.</p>
            <button
              onClick={() => {
                setShowAddServiceForm(false);
                setShowAddForm(true);
              }}
              disabled={newCatalogLocked}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 hidden md:block">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {services.length} services
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {liveServicesCount} live
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Services</p>
              <h3 className="text-lg font-semibold text-gray-900">Added services</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                if (editingProduct) {
                  handleResetProductForm();
                }
                setShowAddForm(false);
                setShowAddServiceForm(true);
              }}
              disabled={newCatalogLocked}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Briefcase className="h-4 w-4" />
              Add Service
            </button>
          </div>

          {!filteredServices.length && !loading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-600">{localSearchQuery ? 'No services found matching your search.' : 'No services added yet.'}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>Service</span>
                <span>Price</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              <div>
                {filteredServices.map((service) => (
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

                    <div className="flex items-center gap-2">
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
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete product</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to remove <span className="font-semibold">{showDeleteConfirm.name}</span> from your catalog?
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                disabled={Boolean(deletingProductId)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(showDeleteConfirm.id)}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-60"
                disabled={Boolean(deletingProductId)}
              >
                {deletingProductId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        /* Keep the dense form sizing on mobile only; desktop should stay readable. */
        @media (max-width: 767px) {
          .add-product-form :is(label, p, span, button, a) {
            font-size: 80% !important;
          }

          .add-product-form label {
            margin-bottom: 0.3rem !important;
            line-height: 1.2 !important;
          }

          .add-product-form input:not([type='checkbox']):not([type='file']),
          .add-product-form select,
          .add-product-form textarea {
            font-size: 70% !important;
            line-height: 1.2 !important;
            padding-top: 0.28rem !important;
            padding-bottom: 0.28rem !important;
            min-height: 1.95rem;
          }

          .add-product-form textarea {
            min-height: 5.25rem;
          }

          .add-product-form input::placeholder,
          .add-product-form textarea::placeholder {
            font-size: 80% !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>
    </div>
  );
}
