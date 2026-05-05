import { getProductsByStore } from '@/src/lib/api';
import { fetchStoreByUsernameFromLaravel } from '@/lib/server/laravel-stores';
import { getThemeById } from '@/data/themes';
import BasicTheme from '@/components/themes/BasicTheme';
import PremiumTheme from '@/components/themes/PremiumTheme';
import StorefrontTrialShell from '@/components/StorefrontTrialShell';
import { notFound } from 'next/navigation';

export default async function ThemedStorePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  
  try {
    const store = await fetchStoreByUsernameFromLaravel(username);
    
    if (!store) {
      notFound();
    }

    const storeProducts = await getProductsByStore(store.id);
    
    const themeId = store.themeId || 'audio-basic';
    const theme = getThemeById(themeId);

    if (!theme) {
      notFound();
    }

    const ThemeComponent = theme.plan === 'premium' ? PremiumTheme : BasicTheme;

    return (
      <StorefrontTrialShell store={store}>
        <ThemeComponent
          theme={theme}
          products={storeProducts}
          storeName={store.name}
          storeLogo={store.logo}
          storeBanner={store.banner}
          storeDescription={store.description}
          storeRating={store.rating}
          storeLocation={store.location}
          storePhone={store.whatsapp}
        />
      </StorefrontTrialShell>
    );
  } catch (error) {
    console.error('Failed to load themed store:', error);
    notFound();
  }
}
