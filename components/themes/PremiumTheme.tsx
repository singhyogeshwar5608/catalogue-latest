import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import { Theme } from '@/data/themes';
import { Star, MapPin, Phone } from 'lucide-react';

interface PremiumThemeProps {
  theme: Theme;
  products: Product[];
  storeName: string;
  storeLogo?: string;
  storeBanner?: string;
  storeDescription?: string;
  storeRating?: number;
  storeLocation?: string;
  storePhone?: string;
}

export default function PremiumTheme({ 
  theme, 
  products, 
  storeName, 
  storeLogo, 
  storeBanner,
  storeDescription,
  storeRating = 4.5,
  storeLocation,
  storePhone
}: PremiumThemeProps) {
  const { layout } = theme;

  return (
    <div className="min-h-screen" style={{ backgroundColor: layout.colorScheme.background }}>
      <header 
        className="relative h-96 bg-cover bg-center"
        style={{
          backgroundImage: storeBanner ? `url(${storeBanner})` : 'linear-gradient(135deg, ' + layout.colorScheme.primary + ' 0%, ' + layout.colorScheme.secondary + ' 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center max-w-4xl px-4">
            {storeLogo && (
              <img 
                src={storeLogo} 
                alt={storeName} 
                className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-white shadow-2xl ring-4 ring-white/20"
                loading="lazy"
                decoding="async"
              />
            )}
            <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">{storeName}</h1>
            {storeDescription && (
              <p className="text-xl text-white/90 mb-6">{storeDescription}</p>
            )}
            <div className="flex items-center justify-center gap-6 text-white">
              {storeRating && (
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{storeRating}</span>
                </div>
              )}
              {storeLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{storeLocation}</span>
                </div>
              )}
              {storePhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  <span>{storePhone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold mb-4" style={{ color: layout.colorScheme.text }}>
            Featured Collection
          </h2>
          <div className="h-1 w-32 mx-auto rounded-full" style={{ backgroundColor: layout.colorScheme.primary }}></div>
        </div>

        <div className={`gap-8 ${
          layout.type === 'masonry' 
            ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 space-y-8'
            : layout.type === 'carousel'
            ? 'flex overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide'
            : layout.type === 'magazine'
            ? 'grid grid-cols-1 md:grid-cols-12 gap-8'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {layout.type === 'magazine' ? (
            <>
              {products[0] && (
                <div className="md:col-span-8 md:row-span-2">
                  <div className="h-full">
                    <ProductCard product={products[0]} />
                  </div>
                </div>
              )}
              {products.slice(1, 3).map((product) => (
                <div key={product.id} className="md:col-span-4">
                  <ProductCard product={product} />
                </div>
              ))}
              {products.slice(3).map((product) => (
                <div key={product.id} className="md:col-span-3">
                  <ProductCard product={product} />
                </div>
              ))}
            </>
          ) : layout.type === 'carousel' ? (
            products.map((product) => (
              <div key={product.id} className="min-w-[300px] snap-start">
                <ProductCard product={product} />
              </div>
            ))
          ) : (
            products.map((product) => (
              <div key={product.id} className={layout.type === 'masonry' ? 'break-inside-avoid' : ''}>
                <ProductCard product={product} />
              </div>
            ))
          )}
        </div>
      </div>

      <div 
        className="py-16 mt-16"
        style={{ 
          background: `linear-gradient(135deg, ${layout.colorScheme.primary} 0%, ${layout.colorScheme.secondary} 100%)` 
        }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">Get in Touch</h3>
          <p className="text-lg mb-8 text-white/90">
            Have questions? We&apos;re here to help!
          </p>
          <button className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition">
            Contact Us
          </button>
        </div>
      </div>
    </div>
  );
}
