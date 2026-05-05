import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import { Theme } from '@/data/themes';

interface BasicThemeProps {
  theme: Theme;
  products: Product[];
  storeName: string;
  storeLogo?: string;
  storeBanner?: string;
}

export default function BasicTheme({ theme, products, storeName, storeLogo, storeBanner }: BasicThemeProps) {
  const { layout } = theme;

  return (
    <div className="min-h-screen" style={{ backgroundColor: layout.colorScheme.background }}>
      <header 
        className="relative h-64 bg-cover bg-center"
        style={{
          backgroundImage: storeBanner ? `url(${storeBanner})` : 'linear-gradient(135deg, ' + layout.colorScheme.primary + ' 0%, ' + layout.colorScheme.secondary + ' 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center">
            {storeLogo && (
              <img src={storeLogo} alt={storeName} className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white shadow-lg" loading="lazy" decoding="async" />
            )}
            <h1 className="text-4xl font-bold text-white mb-2">{storeName}</h1>
            <p className="text-white/90">Welcome to our store</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: layout.colorScheme.text }}>
            Our Products
          </h2>
          <div className="h-1 w-20 rounded" style={{ backgroundColor: layout.colorScheme.primary }}></div>
        </div>

        <div className={`grid gap-6 ${
          layout.type === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
