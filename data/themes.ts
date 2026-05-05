export interface Theme {
  id: string;
  name: string;
  categoryId: string;
  plan: 'basic' | 'premium';
  price: number;
  preview: string;
  features: string[];
  layout: {
    type: 'grid' | 'masonry' | 'carousel' | 'minimal' | 'magazine';
    headerStyle: 'classic' | 'modern' | 'minimal' | 'bold';
    productCardStyle: 'card' | 'flat' | 'elevated' | 'bordered';
    colorScheme: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
    };
  };
  customizations: {
    fonts: string[];
    animations: boolean;
    parallax: boolean;
    videoSupport: boolean;
    customCSS: boolean;
  };
}

export const themes: Theme[] = [
  {
    id: 'audio-basic',
    name: 'Sound Wave Basic',
    categoryId: 'audio',
    plan: 'basic',
    price: 0,
    preview: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop',
    features: ['Clean Grid Layout', 'Product Gallery', 'Basic Filters', 'Mobile Responsive'],
    layout: {
      type: 'grid',
      headerStyle: 'classic',
      productCardStyle: 'card',
      colorScheme: {
        primary: '#8B5CF6',
        secondary: '#A78BFA',
        background: '#FFFFFF',
        text: '#1F2937',
      },
    },
    customizations: {
      fonts: ['Inter', 'Roboto'],
      animations: false,
      parallax: false,
      videoSupport: false,
      customCSS: false,
    },
  },
  {
    id: 'audio-premium',
    name: 'Sound Wave Pro',
    categoryId: 'audio',
    plan: 'premium',
    price: 499,
    preview: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop',
    features: ['Advanced Carousel', 'Video Backgrounds', 'Custom Animations', 'Product Zoom', 'Custom CSS', 'Premium Support'],
    layout: {
      type: 'carousel',
      headerStyle: 'modern',
      productCardStyle: 'elevated',
      colorScheme: {
        primary: '#8B5CF6',
        secondary: '#A78BFA',
        background: '#F9FAFB',
        text: '#111827',
      },
    },
    customizations: {
      fonts: ['Inter', 'Roboto', 'Poppins', 'Montserrat'],
      animations: true,
      parallax: true,
      videoSupport: true,
      customCSS: true,
    },
  },
  {
    id: 'wearables-basic',
    name: 'Tech Minimal',
    categoryId: 'wearables',
    plan: 'basic',
    price: 0,
    preview: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
    features: ['Minimal Design', 'Product Grid', 'Basic Search', 'Mobile Friendly'],
    layout: {
      type: 'minimal',
      headerStyle: 'minimal',
      productCardStyle: 'flat',
      colorScheme: {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        background: '#FFFFFF',
        text: '#1F2937',
      },
    },
    customizations: {
      fonts: ['Inter', 'Roboto'],
      animations: false,
      parallax: false,
      videoSupport: false,
      customCSS: false,
    },
  },
  {
    id: 'wearables-premium',
    name: 'Tech Elite',
    categoryId: 'wearables',
    plan: 'premium',
    price: 499,
    preview: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
    features: ['3D Product Views', 'Interactive Filters', 'Video Demos', 'AR Preview', 'Custom Branding', 'Analytics'],
    layout: {
      type: 'masonry',
      headerStyle: 'bold',
      productCardStyle: 'elevated',
      colorScheme: {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        background: '#F8FAFC',
        text: '#0F172A',
      },
    },
    customizations: {
      fonts: ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Plus Jakarta Sans'],
      animations: true,
      parallax: true,
      videoSupport: true,
      customCSS: true,
    },
  },
  {
    id: 'clothing-basic',
    name: 'Fashion Simple',
    categoryId: 'clothing',
    plan: 'basic',
    price: 0,
    preview: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop',
    features: ['Grid Layout', 'Image Gallery', 'Size Filters', 'Responsive Design'],
    layout: {
      type: 'grid',
      headerStyle: 'classic',
      productCardStyle: 'card',
      colorScheme: {
        primary: '#EC4899',
        secondary: '#F472B6',
        background: '#FFFFFF',
        text: '#1F2937',
      },
    },
    customizations: {
      fonts: ['Inter', 'Roboto'],
      animations: false,
      parallax: false,
      videoSupport: false,
      customCSS: false,
    },
  },
  {
    id: 'clothing-premium',
    name: 'Fashion Luxe',
    categoryId: 'clothing',
    plan: 'premium',
    price: 599,
    preview: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop',
    features: ['Magazine Layout', 'Lookbook Gallery', 'Video Lookbooks', 'Virtual Try-On', 'Style Quiz', 'Influencer Section'],
    layout: {
      type: 'magazine',
      headerStyle: 'bold',
      productCardStyle: 'elevated',
      colorScheme: {
        primary: '#EC4899',
        secondary: '#F472B6',
        background: '#FFF7ED',
        text: '#1C1917',
      },
    },
    customizations: {
      fonts: ['Playfair Display', 'Cormorant', 'Bodoni Moda', 'Cinzel'],
      animations: true,
      parallax: true,
      videoSupport: true,
      customCSS: true,
    },
  },
  {
    id: 'food-basic',
    name: 'Fresh Market',
    categoryId: 'food',
    plan: 'basic',
    price: 0,
    preview: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=600&fit=crop',
    features: ['Clean Grid', 'Category Filters', 'Product Info', 'Mobile Optimized'],
    layout: {
      type: 'grid',
      headerStyle: 'classic',
      productCardStyle: 'card',
      colorScheme: {
        primary: '#EF4444',
        secondary: '#F87171',
        background: '#FFFFFF',
        text: '#1F2937',
      },
    },
    customizations: {
      fonts: ['Inter', 'Roboto'],
      animations: false,
      parallax: false,
      videoSupport: false,
      customCSS: false,
    },
  },
  {
    id: 'food-premium',
    name: 'Gourmet Gallery',
    categoryId: 'food',
    plan: 'premium',
    price: 499,
    preview: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=600&fit=crop',
    features: ['Recipe Integration', 'Video Recipes', 'Nutrition Info', 'Chef Stories', 'Custom Menu Builder', 'Delivery Tracking'],
    layout: {
      type: 'magazine',
      headerStyle: 'modern',
      productCardStyle: 'elevated',
      colorScheme: {
        primary: '#EF4444',
        secondary: '#F87171',
        background: '#FFFBEB',
        text: '#1C1917',
      },
    },
    customizations: {
      fonts: ['Playfair Display', 'Merriweather', 'Lora', 'Crimson Text'],
      animations: true,
      parallax: true,
      videoSupport: true,
      customCSS: true,
    },
  },
  {
    id: 'books-basic',
    name: 'Library Classic',
    categoryId: 'books',
    plan: 'basic',
    price: 0,
    preview: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&h=600&fit=crop',
    features: ['Book Grid', 'Genre Filters', 'Author Info', 'Reading List'],
    layout: {
      type: 'grid',
      headerStyle: 'classic',
      productCardStyle: 'card',
      colorScheme: {
        primary: '#6366F1',
        secondary: '#818CF8',
        background: '#FFFFFF',
        text: '#1F2937',
      },
    },
    customizations: {
      fonts: ['Inter', 'Roboto'],
      animations: false,
      parallax: false,
      videoSupport: false,
      customCSS: false,
    },
  },
  {
    id: 'books-premium',
    name: 'Literary Elite',
    categoryId: 'books',
    plan: 'premium',
    price: 549,
    preview: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&h=600&fit=crop',
    features: ['Book Preview', 'Author Interviews', 'Reading Community', 'Book Clubs', 'Custom Recommendations', 'E-Book Integration'],
    layout: {
      type: 'magazine',
      headerStyle: 'modern',
      productCardStyle: 'elevated',
      colorScheme: {
        primary: '#6366F1',
        secondary: '#818CF8',
        background: '#FEF3C7',
        text: '#1C1917',
      },
    },
    customizations: {
      fonts: ['Merriweather', 'Lora', 'Crimson Text', 'Libre Baskerville'],
      animations: true,
      parallax: true,
      videoSupport: true,
      customCSS: true,
    },
  },
  {
    id: 'fitness-basic',
    name: 'Gym Essentials',
    categoryId: 'fitness',
    plan: 'basic',
    price: 0,
    preview: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
    features: ['Product Grid', 'Equipment Filters', 'Workout Tips', 'Mobile Ready'],
    layout: {
      type: 'grid',
      headerStyle: 'classic',
      productCardStyle: 'card',
      colorScheme: {
        primary: '#14B8A6',
        secondary: '#2DD4BF',
        background: '#FFFFFF',
        text: '#1F2937',
      },
    },
    customizations: {
      fonts: ['Inter', 'Roboto'],
      animations: false,
      parallax: false,
      videoSupport: false,
      customCSS: false,
    },
  },
  {
    id: 'fitness-premium',
    name: 'Athlete Pro',
    categoryId: 'fitness',
    plan: 'premium',
    price: 599,
    preview: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
    features: ['Workout Videos', 'Training Plans', 'Progress Tracker', 'Nutrition Guide', 'Community Forum', 'Live Classes'],
    layout: {
      type: 'masonry',
      headerStyle: 'bold',
      productCardStyle: 'elevated',
      colorScheme: {
        primary: '#14B8A6',
        secondary: '#2DD4BF',
        background: '#F0FDFA',
        text: '#134E4A',
      },
    },
    customizations: {
      fonts: ['Bebas Neue', 'Oswald', 'Anton', 'Teko'],
      animations: true,
      parallax: true,
      videoSupport: true,
      customCSS: true,
    },
  },
];

export const getThemesByCategory = (categoryId: string) => {
  return themes.filter(theme => theme.categoryId === categoryId);
};

export const getThemeById = (themeId: string) => {
  return themes.find(theme => theme.id === themeId);
};
