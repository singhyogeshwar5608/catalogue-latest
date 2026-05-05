import {
  Headphones,
  Watch,
  Cable,
  Shirt,
  Footprints,
  UtensilsCrossed,
  Frame,
  Lightbulb,
  BookOpen,
  Dumbbell,
  Sparkles,
  Dog,
  Cat,
  Palette,
  Blocks,
  Gamepad2,
  Coffee,
  Flame,
  Briefcase,
} from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: any;
  description: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const categories: Category[] = [
  {
    id: 'audio',
    name: 'Audio',
    slug: 'audio',
    icon: Headphones,
    description: 'Headphones, Earbuds, Speakers',
    color: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      accent: '#DDD6FE',
    },
  },
  {
    id: 'wearables',
    name: 'Wearables',
    slug: 'wearables',
    icon: Watch,
    description: 'Smart Watches, Fitness Trackers',
    color: {
      primary: '#3B82F6',
      secondary: '#60A5FA',
      accent: '#DBEAFE',
    },
  },
  {
    id: 'accessories',
    name: 'Accessories',
    slug: 'accessories',
    icon: Cable,
    description: 'Cables, Chargers, Power Banks',
    color: {
      primary: '#10B981',
      secondary: '#34D399',
      accent: '#D1FAE5',
    },
  },
  {
    id: 'clothing',
    name: 'Clothing',
    slug: 'clothing',
    icon: Shirt,
    description: 'Fashion, Apparel, Garments',
    color: {
      primary: '#EC4899',
      secondary: '#F472B6',
      accent: '#FCE7F3',
    },
  },
  {
    id: 'footwear',
    name: 'Footwear',
    slug: 'footwear',
    icon: Footprints,
    description: 'Shoes, Sneakers, Sandals',
    color: {
      primary: '#F59E0B',
      secondary: '#FBBF24',
      accent: '#FEF3C7',
    },
  },
  {
    id: 'food',
    name: 'Food & Beverages',
    slug: 'food',
    icon: UtensilsCrossed,
    description: 'Organic Food, Snacks, Drinks',
    color: {
      primary: '#EF4444',
      secondary: '#F87171',
      accent: '#FEE2E2',
    },
  },
  {
    id: 'decor',
    name: 'Home Decor',
    slug: 'decor',
    icon: Frame,
    description: 'Wall Art, Decorations',
    color: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      accent: '#EDE9FE',
    },
  },
  {
    id: 'lighting',
    name: 'Lighting',
    slug: 'lighting',
    icon: Lightbulb,
    description: 'Lamps, LED Lights',
    color: {
      primary: '#FBBF24',
      secondary: '#FCD34D',
      accent: '#FEF3C7',
    },
  },
  {
    id: 'books',
    name: 'Books',
    slug: 'books',
    icon: BookOpen,
    description: 'Fiction, Non-Fiction, Educational',
    color: {
      primary: '#6366F1',
      secondary: '#818CF8',
      accent: '#E0E7FF',
    },
  },
  {
    id: 'fitness',
    name: 'Fitness',
    slug: 'fitness',
    icon: Dumbbell,
    description: 'Gym Equipment, Yoga, Sports',
    color: {
      primary: '#14B8A6',
      secondary: '#2DD4BF',
      accent: '#CCFBF1',
    },
  },
  {
    id: 'skincare',
    name: 'Skincare',
    slug: 'skincare',
    icon: Sparkles,
    description: 'Beauty Products, Cosmetics',
    color: {
      primary: '#F472B6',
      secondary: '#F9A8D4',
      accent: '#FCE7F3',
    },
  },
  {
    id: 'pet-food',
    name: 'Pet Food',
    slug: 'pet-food',
    icon: Dog,
    description: 'Dog Food, Cat Food, Pet Nutrition',
    color: {
      primary: '#F97316',
      secondary: '#FB923C',
      accent: '#FFEDD5',
    },
  },
  {
    id: 'pet-toys',
    name: 'Pet Toys',
    slug: 'pet-toys',
    icon: Cat,
    description: 'Toys for Dogs, Cats, Pets',
    color: {
      primary: '#A855F7',
      secondary: '#C084FC',
      accent: '#F3E8FF',
    },
  },
  {
    id: 'art',
    name: 'Art',
    slug: 'art',
    icon: Palette,
    description: 'Paintings, Prints, Artwork',
    color: {
      primary: '#EC4899',
      secondary: '#F472B6',
      accent: '#FCE7F3',
    },
  },
  {
    id: 'educational-toys',
    name: 'Educational Toys',
    slug: 'educational-toys',
    icon: Blocks,
    description: 'Learning Toys, STEM Kits',
    color: {
      primary: '#06B6D4',
      secondary: '#22D3EE',
      accent: '#CFFAFE',
    },
  },
  {
    id: 'toys',
    name: 'Toys',
    slug: 'toys',
    icon: Gamepad2,
    description: 'Kids Toys, Action Figures',
    color: {
      primary: '#F59E0B',
      secondary: '#FBBF24',
      accent: '#FEF3C7',
    },
  },
  {
    id: 'gaming',
    name: 'Gaming',
    slug: 'gaming',
    icon: Gamepad2,
    description: 'Gaming Accessories, Controllers',
    color: {
      primary: '#7C3AED',
      secondary: '#8B5CF6',
      accent: '#EDE9FE',
    },
  },
  {
    id: 'beverages',
    name: 'Beverages',
    slug: 'beverages',
    icon: Coffee,
    description: 'Tea, Coffee, Drinks',
    color: {
      primary: '#92400E',
      secondary: '#B45309',
      accent: '#FED7AA',
    },
  },
  {
    id: 'home-fragrance',
    name: 'Home Fragrance',
    slug: 'home-fragrance',
    icon: Flame,
    description: 'Candles, Diffusers, Incense',
    color: {
      primary: '#DB2777',
      secondary: '#EC4899',
      accent: '#FCE7F3',
    },
  },
  {
    id: 'services',
    name: 'Professional Services',
    slug: 'services',
    icon: Briefcase,
    description: 'Agencies, consultants, creative studios',
    color: {
      primary: '#0F172A',
      secondary: '#1E293B',
      accent: '#E2E8F0',
    },
  },
];

export const getCategoryBySlug = (slug: string) => {
  return categories.find(cat => cat.slug === slug);
};

export const getCategoryById = (id: string) => {
  return categories.find(cat => cat.id === id);
};
