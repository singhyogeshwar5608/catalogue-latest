'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getThemeById } from '@/data/themes';
import { getCategoryById } from '@/data/categories';
import { CheckCircle, Store, Palette, ArrowRight, Sparkles, Plus } from 'lucide-react';
import Link from 'next/link';

function SetupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [theme, setTheme] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);

  useEffect(() => {
    const themeId = searchParams.get('theme');
    const categoryId = searchParams.get('category');
    
    // Get data from localStorage
    const storedData = localStorage.getItem('pendingRegistration');
    if (storedData) {
      const data = JSON.parse(storedData);
      setRegistrationData(data);
    }

    if (themeId) {
      const themeData = getThemeById(themeId);
      setTheme(themeData);
    }

    if (categoryId) {
      const categoryData = getCategoryById(categoryId);
      setCategory(categoryData);
    }
  }, [searchParams]);

  if (!registrationData || !theme || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your store details...</p>
        </div>
      </div>
    );
  }

  const CategoryIcon = category.icon;
  const isPremium = theme.plan === 'premium';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-primary-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            🎉 Congratulations!
          </h1>
          <p className="text-xl text-gray-600">
            Your store has been successfully created
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Store Details</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Business Name</h3>
                <p className="text-gray-700 text-lg">{registrationData.userData.businessName}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Username: @{registrationData.userData.username}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: category.color.accent }}
              >
                <CategoryIcon className="w-6 h-6" style={{ color: category.color.primary }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Category</h3>
                <p className="text-gray-700 text-lg">{category.name}</p>
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-primary-50 to-white rounded-lg border-2 border-primary-200">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Palette className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">Theme</h3>
                  {isPremium && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      PREMIUM
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-lg">{theme.name}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-500 capitalize">
                    Layout: {theme.layout.type}
                  </span>
                  {isPremium ? (
                    <span className="text-sm font-semibold text-amber-600">
                      ₹{theme.price} (One-time)
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-green-600">
                      FREE Forever
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isPremium && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Premium Theme Features Unlocked
            </h3>
            <ul className="space-y-2 text-sm text-amber-800">
              {theme.features.slice(0, 4).map((feature: string, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Link
            href="/dashboard/products"
            className="flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-lg shadow-[0_20px_45px_rgba(37,99,235,0.25)] hover:shadow-[0_25px_55px_rgba(37,99,235,0.35)] transition"
          >
            <Plus className="w-5 h-5" />
            Add Your First Product
          </Link>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition font-semibold"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href={`/catalog/${registrationData.userData.username}`}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-primary text-primary rounded-lg hover:bg-primary-50 transition font-semibold"
            >
              View Catalog
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Your store URL: <span className="font-semibold text-primary">cateloge.com/store/{registrationData.userData.username}</span>
          </p>
          <p className="text-sm text-gray-500">
            You can customize your store anytime from the dashboard
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SetupCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-primary-50">
          <div className="text-center">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading your store details...</p>
          </div>
        </div>
      }
    >
      <SetupCompleteContent />
    </Suspense>
  );
}
