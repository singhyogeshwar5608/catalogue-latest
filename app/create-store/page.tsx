"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/src/context/AuthContext';
import { lookupPinCode } from '@/src/lib/location';
import {
  createStore,
  formatValidationErrorsForDisplay,
  getCategories,
  isApiError,
  parseApiValidationErrors,
  type Category,
} from '@/src/lib/api';
import { locationData } from '@/data/locationData';
import { Loader2 } from 'lucide-react';

const defaultLogo = 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=200&h=200&fit=crop';
/** Smaller = less base64; shared hosting (PHP) often OOMs on large JSON + logging. */
const MAX_LOGO_DIMENSION = 400;
const MAX_LOGO_SIZE_BYTES = 500_000;

async function compressImageToDataUrl(file: File): Promise<string> {
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

  const scale = Math.min(MAX_LOGO_DIMENSION / image.width, MAX_LOGO_DIMENSION / image.height, 1);
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
    }, 'image/jpeg', 0.72);
  });

  if (blob.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error('Logo is too large. Please choose a smaller image (under ~500 KB after compression).');
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function CreateStorePage() {
  const router = useRouter();
  const { isLoggedIn, user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [pinLookupLoading, setPinLookupLoading] = useState(false);
  const [pinLookupMessage, setPinLookupMessage] = useState<string | null>(null);
  const pinLookupRequestIdRef = useRef(0);
  const [formData, setFormData] = useState({
    categoryId: 0,
    storeName: '',
    logo: null as File | null,
    phone: '',
    email: '',
    description: '',
    address: '',
    pinCode: '',
    city: '',
    district: '',
    state: '',
    country: '',
  });

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/auth?redirect=/create-store');
      return;
    }

    setIsAuthorized(true);

    if (user?.email) {
      setFormData((prev) => (prev.email ? prev : { ...prev, email: user.email }));
    }

    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [isLoggedIn, router, user?.email]);

  useEffect(() => {
    if (pincode.length !== 6) {
      setPinLookupLoading(false);
      return;
    }

    const requestId = ++pinLookupRequestIdRef.current;
    const timer = window.setTimeout(async () => {
      setPinLookupLoading(true);
      setPinLookupMessage(null);
      try {
        const result = await lookupPinCode(pincode);
        if (requestId !== pinLookupRequestIdRef.current) return;
        if (!result) {
          setPinLookupMessage('PIN not found. You can still choose state / district manually.');
          return;
        }
        const countryName = (result.country || 'India').trim();
        const stateName = (result.state || '').trim();
        const districtName = (result.district || result.city || '').trim();
        const cityLine = (result.locality || result.city || districtName).trim();

        setCountry(countryName);
        setState(stateName);
        setCity(districtName);
        setFormData((prev) => ({
          ...prev,
          pinCode: pincode,
          country: countryName,
          state: stateName,
          district: districtName,
          city: cityLine || districtName,
        }));
      } finally {
        if (requestId === pinLookupRequestIdRef.current) {
          setPinLookupLoading(false);
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      pinLookupRequestIdRef.current += 1;
      setPinLookupLoading(false);
    };
  }, [pincode]);

  const locationTree = locationData as Record<string, Record<string, Record<string, string>>>;
  const countries = Object.keys(locationTree);
  const states = Object.keys(locationTree[country] || {});
  const cities = Object.keys(locationTree[country]?.[state] || {});

  const handleCountryChange = (value: string) => {
    setCountry(value);
    setState('');
    setCity('');
    setPincode('');
    setFormData((prev) => ({
      ...prev,
      country: value,
      state: '',
      city: '',
      district: '',
      pinCode: '',
    }));
  };

  const handleStateChange = (value: string) => {
    setState(value);
    setCity('');
    setPincode('');
    setFormData((prev) => ({
      ...prev,
      state: value,
      city: '',
      district: '',
      pinCode: '',
    }));
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    const pin = locationTree[country]?.[state]?.[value];
    const nextPin = pin || '';
    setPincode(nextPin);
    setFormData((prev) => ({
      ...prev,
      city: value,
      district: value,
      pinCode: nextPin,
    }));
    setPinLookupMessage(null);
  };

  const handlePinCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(digits);
    setFormData((prev) => ({ ...prev, pinCode: digits }));
    if (digits.length < 6) {
      setPinLookupMessage(null);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData({ ...formData, logo: file });
    compressImageToDataUrl(file)
      .then((dataUrl) => {
        setLogoPreview(dataUrl);
        setFieldErrors((current) => {
          const { logo: _removed, ...rest } = current;
          return rest;
        });
      })
      .catch((error) => {
        console.error('Failed to prepare logo:', error);
        setLogoPreview(null);
        setFieldErrors((current) => ({
          ...current,
          logo: ['Please upload an image under ~500 KB (after compression).'],
        }));
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    setFieldErrors({});
    
    // Add small delay to ensure loading state is visible
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!formData.categoryId) {
      setErrorMessage('Please select a category');
      setLoading(false);
      return;
    }

    const emailTrimmed = (user?.email ?? formData.email).trim();
    if (!emailTrimmed) {
      setErrorMessage('Please enter your business email');
      setLoading(false);
      return;
    }

    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    const normalizedDescription =
      formData.description?.trim() || `Discover curated ${selectedCategory?.name.toLowerCase() || 'products'} in your area.`;

    const locationLabel = [
      formData.city.trim(),
      formData.district.trim(),
      formData.state.trim(),
      formData.country.trim(),
    ]
      .filter(Boolean)
      .join(', ');
    const fullAddress = [
      formData.address.trim(),
      locationLabel,
      formData.pinCode ? `PIN ${formData.pinCode}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const { store } = await createStore({
        name: formData.storeName.trim(),
        category_id: formData.categoryId,
        logo: logoPreview ?? defaultLogo,
        address: fullAddress,
        phone: formData.phone,
        email: emailTrimmed,
        description: normalizedDescription,
        location: locationLabel || undefined,
        state: formData.state.trim() || undefined,
        district: formData.district.trim() || undefined,
      });

      if (user) {
        setUser({ ...user, storeSlug: store.username });
      }

      router.push(`/store/${store.username}?edit=true`);
    } catch (error) {
      if (isApiError(error)) {
        if (error.status === 401) {
          router.replace('/login');
          return;
        }

        const validationErrors = parseApiValidationErrors(error.payload);
        if (validationErrors) {
          setFieldErrors(validationErrors);
          setErrorMessage(formatValidationErrorsForDisplay(validationErrors, 'store'));
        } else {
          setErrorMessage(error.message || 'Unable to create store.');
        }
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="create-store-page flex w-full flex-col bg-gray-50 px-2 pt-3 pb-8 md:px-4 md:pt-6 md:pb-12">
      <div className="create-store-shell flex w-full items-start px-2 py-0 max-[700px]:px-1.5 md:px-0 md:py-0">
        <div className="create-store-container mx-auto flex w-full max-w-md flex-1 flex-col justify-start">
          <form onSubmit={handleSubmit} className="create-store-form bg-white rounded-xl border border-gray-200 shadow-sm px-2 py-2.5 space-y-2.5 max-[700px]:space-y-2 max-[700px]:px-1.5 max-[700px]:py-2 md:rounded-2xl md:px-4 md:py-5 md:space-y-5">
          <div className="create-store-logo-block space-y-2 max-[700px]:space-y-1.5 md:space-y-3">
            <div className="flex items-center justify-between gap-1.5 md:justify-center md:gap-4">
              <div className="create-store-hook-panel hidden lg:flex">
                <p className="create-store-hook-title">Launch your store with confidence</p>
                <div className="create-store-hook-lines">
                  <p>Check visibility before publishing</p>
                  <p>Check branding with logo and name</p>
                  <p>Check address details for trust</p>
                </div>
              </div>
              <div className="w-4/5 space-y-1 md:flex-1">
                <label htmlFor="storeNameTop" className="text-[11px] font-medium text-gray-700 md:hidden">
                  Store name
                </label>
                <input
                  id="storeNameTop"
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="Store name"
                  required
                  className="h-[34px] w-full rounded-xl border border-gray-400 bg-gray-50 px-2 py-1 text-[11px] text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 max-[700px]:h-8 max-[700px]:py-0.5 md:hidden"
                />
              </div>

              <label className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50 p-1 text-center cursor-pointer hover:border-indigo-300 transition max-[700px]:h-20 max-[700px]:w-20 md:h-44 md:w-44 md:rounded-2xl md:border-2 md:p-6">
                {logoPreview ? (
                  <Image src={logoPreview} alt="Logo preview" fill className="object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-blue-600 md:gap-3">
                    <div className="w-6 h-6 rounded-lg bg-white/90 shadow-inner flex items-center justify-center md:w-16 md:h-16 md:rounded-2xl">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 16L8.5 11.5C9.05228 10.9477 9.94772 10.9477 10.5 11.5L13.5 14.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M15 13L16.5 11.5C17.0523 10.9477 17.9477 10.9477 18.5 11.5L20 13" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <rect x="3" y="5" width="18" height="14" rx="3" stroke="#2563eb" strokeWidth="1.5" />
                          <circle cx="9" cy="9" r="1" fill="#2563eb" />
                        </svg>
                    </div>
                    <p className="text-[9px] font-semibold text-gray-800 md:text-sm">Upload Logo</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
            {fieldErrors.logo && <p className="text-[11px] text-red-600 md:text-sm">{fieldErrors.logo[0]}</p>}
          </div>

          <div className="create-store-grid">
          <div className="desktop-span-2 space-y-1.5 max-[700px]:space-y-1">
            <label htmlFor="storeName" className="hidden text-[11px] font-medium text-gray-700 md:block md:text-sm">
              Store name
            </label>
            <input
              id="storeName"
              type="text"
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              placeholder="Store name"
              required
              className="hidden h-[34px] w-full rounded-xl border border-gray-200 px-2 py-1 text-[11px] focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 max-[700px]:h-8 max-[700px]:py-0.5 md:block md:px-4 md:py-3 md:text-sm"
            />
            {fieldErrors.name && <p className="text-[11px] text-red-600 md:text-sm">{fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-1.5 max-[700px]:space-y-1">
            <label htmlFor="category" className="text-[11px] font-medium text-gray-700 md:text-sm">
              Category
            </label>
            <div className="relative">
              <input
                id="category"
                type="text"
                value={categoryQuery}
                onClick={() => setIsCategoryOpen((prev) => !prev)}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategoryQuery(value);
                  setIsCategoryOpen(true);
                  const matched = categories.find((cat) => cat.name.toLowerCase() === value.trim().toLowerCase());
                  setFormData({ ...formData, categoryId: matched ? matched.id : 0 });
                }}
                required
                disabled={loadingCategories}
                placeholder={loadingCategories ? 'Loading categories...' : 'Search or select category'}
              className="h-[34px] w-full rounded-xl border border-gray-200 bg-white px-2 py-1 text-[11px] focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 max-[700px]:h-8 max-[700px]:py-0.5 md:px-4 md:py-3 md:text-sm"
              />
              {isCategoryOpen && !loadingCategories && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <ul className="max-h-40 overflow-y-auto py-1">
                    {categories
                      .filter((cat) => cat.name.toLowerCase().includes(categoryQuery.trim().toLowerCase()))
                      .map((cat) => (
                        <li key={cat.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCategoryQuery(cat.name);
                              setFormData({ ...formData, categoryId: cat.id });
                              setIsCategoryOpen(false);
                            }}
                            className="w-full px-2 py-1.5 text-left text-[11px] text-gray-700 hover:bg-gray-50 md:px-4 md:py-2 md:text-sm"
                          >
                            {cat.name}
                          </button>
                        </li>
                      ))}
                    {categories.filter((cat) => cat.name.toLowerCase().includes(categoryQuery.trim().toLowerCase())).length === 0 && (
                      <li className="px-2 py-1.5 text-[11px] text-gray-400 md:px-4 md:py-2 md:text-sm">No category found</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            {fieldErrors.category_id && <p className="text-[11px] text-red-600 md:text-sm">{fieldErrors.category_id[0]}</p>}
          </div>

          <div className="space-y-1.5 max-[700px]:space-y-1">
            <label htmlFor="phone" className="text-[11px] font-medium text-gray-700 md:text-sm">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone number"
              required
              className="h-[34px] w-full rounded-xl border border-gray-200 px-2 py-1 text-[11px] focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 max-[700px]:h-8 max-[700px]:py-0.5 md:px-4 md:py-3 md:text-sm"
            />
            {fieldErrors.phone && <p className="text-[11px] text-red-600 md:text-sm">{fieldErrors.phone[0]}</p>}
          </div>

          <div className="desktop-span-2 space-y-1.5 max-[700px]:space-y-1">
            <label htmlFor="description" className="text-[11px] font-medium text-gray-700 md:text-sm">
              Company description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Company description"
              rows={2}
              className="w-full min-h-[64px] max-h-[84px] resize-none rounded-xl border border-gray-200 px-2 py-1.5 text-[11px] focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 max-[700px]:py-1 md:px-4 md:py-3 md:text-sm"
            />
            {fieldErrors.description && <p className="text-[11px] text-red-600 md:text-sm">{fieldErrors.description[0]}</p>}
          </div>

          <div className="desktop-span-2 grid grid-cols-2 gap-2 max-[700px]:gap-1.5 md:gap-4">
            <div className="space-y-1.5 max-[700px]:space-y-1">
              <label htmlFor="pinCode" className="text-[11px] font-medium text-gray-700 md:text-sm">
                PIN code
              </label>
              <input
                id="pinCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pincode}
                onChange={handlePinCodeInput}
                placeholder="PIN code"
                required
                autoComplete="postal-code"
                className="h-[34px] w-full rounded-xl border border-gray-200 px-2 py-1 text-[11px] focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 max-[700px]:h-8 max-[700px]:py-0.5 md:px-4 md:py-3 md:text-sm"
              />
              {pinLookupLoading ? (
                <p className="text-[10px] text-slate-500 md:text-xs">Fetching district and state…</p>
              ) : pinLookupMessage ? (
                <p className="text-[10px] text-amber-700 md:text-xs">{pinLookupMessage}</p>
              ) : null}
            </div>
            <div className="space-y-1.5 max-[700px]:space-y-1">
              <label htmlFor="district" className="text-[11px] font-medium text-gray-700 md:text-sm">
                District <span className="text-gray-400">(auto or manual)</span>
              </label>
              <input
                id="district"
                type="text"
                list="city-options"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                placeholder="District"
                className="h-[34px] w-full rounded-xl border border-gray-200 px-2 py-1 text-[11px] focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 max-[700px]:h-8 max-[700px]:py-0.5 md:px-4 md:py-3 md:text-sm"
              />
              <datalist id="city-options">
                {cities.map((cityOption) => (
                  <option key={cityOption} value={cityOption} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="desktop-span-2 grid grid-cols-2 gap-2 max-[700px]:gap-1.5 md:gap-4">
            <div className="space-y-1.5 max-[700px]:space-y-1">
              <label htmlFor="state" className="text-[11px] font-medium text-gray-700 md:text-sm">
                State
              </label>
              <input
                id="state"
                type="text"
                list="state-options"
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                placeholder="State"
                className="h-[34px] w-full rounded-xl border border-gray-200 px-2 py-1 text-[11px] focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 max-[700px]:h-8 max-[700px]:py-0.5 md:px-4 md:py-3 md:text-sm"
                required
              />
              <datalist id="state-options">
                {states.map((stateOption) => (
                  <option key={stateOption} value={stateOption} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5 max-[700px]:space-y-1">
              <label htmlFor="country" className="text-[11px] font-medium text-gray-700 md:text-sm">
                Country
              </label>
              <input
                id="country"
                type="text"
                list="country-options"
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                placeholder="Country"
                className="h-[34px] w-full rounded-xl border border-gray-200 px-2 py-1 text-[11px] focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 max-[700px]:h-8 max-[700px]:py-0.5 md:px-4 md:py-3 md:text-sm"
                required
              />
              <datalist id="country-options">
                {countries.map((countryOption) => (
                  <option key={countryOption} value={countryOption} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="desktop-span-2 space-y-1.5 max-[700px]:space-y-1">
            <label htmlFor="address" className="text-[11px] font-medium text-gray-700 md:text-sm">
              Complete address
            </label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Complete address"
              required
              rows={2}
              className="w-full max-h-[60px] resize-none rounded-xl border border-gray-200 px-2 py-1 text-[11px] focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 max-[700px]:py-0.5 md:px-4 md:py-3 md:text-sm"
            />
            {fieldErrors.address && <p className="text-[11px] text-red-600 md:text-sm">{fieldErrors.address[0]}</p>}
          </div>

          {fieldErrors.location && (
            <p className="desktop-span-2 text-[11px] text-red-600 md:text-sm">
              <span className="font-medium">Location: </span>
              {fieldErrors.location[0]}
            </p>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="desktop-span-2 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800 whitespace-pre-line md:px-3 md:py-2 md:text-sm"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="desktop-span-2 w-full shrink-0 rounded-xl bg-gray-900 py-2 text-xs font-semibold text-white transition disabled:opacity-60 flex items-center justify-center gap-1.5 max-[700px]:py-1.5 md:py-3 md:text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin md:w-4 md:h-4" />
                Creating store...
              </>
            ) : (
              'Create my store'
            )}
          </button>
          </div>
        </form>
        </div>
      </div>
      <style jsx>{`
        @media (min-width: 1024px) {
          .create-store-page {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 40px 24px;
          }

          .create-store-shell {
            max-width: 1060px;
            padding: 0;
          }

          .create-store-container {
            max-width: 960px;
          }

          .create-store-form {
            width: 100%;
            max-width: 960px;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            border-color: #e5e7eb;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            column-gap: 20px;
            row-gap: 20px;
          }

          .create-store-logo-block,
          .create-store-grid,
          .desktop-span-2 {
            grid-column: span 2;
          }

          .create-store-logo-block {
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 18px 20px;
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          }

          .create-store-logo-block > div {
            justify-content: space-between;
            align-items: center;
            gap: 24px;
          }

          .create-store-hook-panel {
            flex: 1;
            flex-direction: column;
            justify-content: center;
            gap: 10px;
            min-height: 170px;
            padding: 12px 6px;
            color: #1f2937;
          }

          .create-store-hook-title {
            font-size: 22px;
            line-height: 1.25;
            font-weight: 700;
            margin: 0;
            color: #111827;
          }

          .create-store-hook-lines {
            display: grid;
            gap: 8px;
          }

          .create-store-hook-lines p {
            position: relative;
            margin: 0;
            padding-left: 22px;
            font-size: 14px;
            line-height: 1.45;
            color: #4b5563;
          }

          .create-store-hook-lines p::before {
            content: '';
            position: absolute;
            left: 0;
            top: 7px;
            width: 12px;
            height: 12px;
            border-radius: 9999px;
            border: 2px solid #9ca3af;
            background: #ffffff;
          }

          .create-store-hook-lines p::after {
            content: '';
            position: absolute;
            left: 4px;
            top: 11px;
            width: 6px;
            height: 2px;
            background: #6b7280;
            border-radius: 2px;
          }

          .create-store-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
          }

          .create-store-grid > div {
            min-width: 0;
          }

          .create-store-form label {
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 6px;
            color: #374151;
          }

          .create-store-form input:not([type='file']) {
            height: 48px;
            font-size: 14px;
            padding: 10px 14px;
          }

          .create-store-form textarea {
            font-size: 14px;
            padding: 10px 14px;
            min-height: 96px;
            max-height: none;
          }

          .create-store-form input:not([type='file']):hover,
          .create-store-form textarea:hover {
            border-color: #9ca3af;
            background-color: #ffffff;
          }

          .create-store-form input:not([type='file']):focus,
          .create-store-form textarea:focus {
            border-color: #6b7280;
            box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.25);
          }

          .create-store-form button[type='submit'] {
            height: 50px;
            font-size: 15px;
            font-weight: 600;
            border-radius: 10px;
            margin-top: 4px;
          }
        }
      `}</style>
    </div>
  );
}
