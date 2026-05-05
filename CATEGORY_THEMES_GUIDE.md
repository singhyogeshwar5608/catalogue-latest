# Category-Based Theme Selection System

## Overview
Yeh feature users ko signup time pe apni category choose karne aur uske hisab se **Basic (Free)** ya **Premium (Paid)** theme select karne ki facility deta hai.

## Features Implemented

### 1. **19 Categories Available**
- Audio
- Wearables
- Accessories
- Clothing
- Footwear
- Food & Beverages
- Home Decor
- Lighting
- Books
- Fitness
- Skincare
- Pet Food
- Pet Toys
- Art
- Educational Toys
- Toys
- Gaming
- Beverages
- Home Fragrance

### 2. **Signup Flow (3 Steps)**

#### Step 1: Basic Registration (`/register`)
- User details (Name, Email, Password)
- Business information (Business Name, Type, Username)
- Redirect to Category Selection

#### Step 2: Category Selection (`/register/category-selection`)
- Beautiful grid layout with category icons
- Color-coded categories
- Select category that matches your business

#### Step 3: Theme Selection (`/register/theme-selection`)
- **Basic Theme (FREE)**
  - Clean grid layout
  - Product gallery
  - Basic filters
  - Mobile responsive
  - Standard fonts
  
- **Premium Theme (₹499-₹599)**
  - Advanced layouts (Carousel, Masonry, Magazine)
  - Video support
  - Custom animations
  - Parallax effects
  - Custom CSS
  - Premium fonts
  - Analytics integration

### 3. **Theme Layouts**

#### Basic Theme Features:
- Grid/Minimal layout
- Classic header style
- Card-based product display
- Basic color schemes
- 2 font options

#### Premium Theme Features:
- Advanced layouts (Masonry, Carousel, Magazine)
- Modern/Bold header styles
- Elevated product cards
- Custom color schemes
- 4-5 premium font options
- Video backgrounds
- Interactive elements
- Custom branding

### 4. **Category Pages**
- Browse all categories: `/categories`
- Individual category pages: `/categories/[slug]`
- Filter products by category
- Show category-specific stores

### 5. **Dynamic Store Themes**
- Each store can have its own theme
- Theme applied based on `store.themeId`
- Access themed store: `/store/[username]/themed`

## File Structure

```
data/
├── categories.ts          # All 19 categories with icons & colors
└── themes.ts             # Basic & Premium themes for each category

app/
├── register/
│   ├── page.tsx                    # Step 1: Registration
│   ├── category-selection/
│   │   └── page.tsx               # Step 2: Category Selection
│   └── theme-selection/
│       └── page.tsx               # Step 3: Theme Selection
├── categories/
│   ├── page.tsx                   # All categories listing
│   └── [slug]/
│       └── page.tsx               # Individual category page
└── store/
    └── [username]/
        └── themed/
            └── page.tsx           # Themed store page

components/
└── themes/
    ├── BasicTheme.tsx            # Basic theme component
    └── PremiumTheme.tsx          # Premium theme component
```

## How to Use

### For New Users:
1. Go to `/register`
2. Fill registration form
3. Choose your business category
4. Select Basic (Free) or Premium (Paid) theme
5. Complete setup → Redirected to dashboard

### For Existing Stores:
- Store theme is stored in `store.themeId`
- Category is stored in `store.categoryId`
- Can change theme from dashboard settings

### Browse Categories:
- Visit `/categories` to see all categories
- Click any category to see products & stores
- Each category has unique color scheme

## Theme Pricing

| Plan | Price | Features |
|------|-------|----------|
| Basic | FREE | Standard layouts, basic features |
| Premium | ₹499-₹599 | Advanced layouts, animations, videos, custom CSS |

## Category Color Schemes

Each category has its own color palette:
- **Audio**: Purple (#8B5CF6)
- **Wearables**: Blue (#3B82F6)
- **Clothing**: Pink (#EC4899)
- **Food**: Red (#EF4444)
- **Books**: Indigo (#6366F1)
- **Fitness**: Teal (#14B8A6)
- And more...

## Technical Details

### Types Updated:
```typescript
interface Store {
  // ... existing fields
  categoryId?: string;
  themeId?: string;
}
```

### Theme Structure:
```typescript
interface Theme {
  id: string;
  name: string;
  categoryId: string;
  plan: 'basic' | 'premium';
  price: number;
  layout: {
    type: 'grid' | 'masonry' | 'carousel' | 'minimal' | 'magazine';
    headerStyle: 'classic' | 'modern' | 'minimal' | 'bold';
    productCardStyle: 'card' | 'flat' | 'elevated' | 'bordered';
    colorScheme: {...}
  };
  customizations: {...}
}
```

## Navigation

Categories link added to:
- Desktop navbar
- Mobile menu
- Accessible from anywhere in the app

## Future Enhancements

- Theme preview before purchase
- Custom theme builder
- More layout options
- A/B testing for themes
- Theme marketplace
- Seasonal themes
- Industry-specific templates

## Testing

1. **Test Signup Flow:**
   ```
   /register → Fill form → Select category → Choose theme → Dashboard
   ```

2. **Test Category Browsing:**
   ```
   /categories → Click any category → View products
   ```

3. **Test Themed Store:**
   ```
   /store/[username]/themed → See theme applied
   ```

## Notes

- All themes are responsive
- Premium themes include advanced features
- Each category has 2 themes (Basic + Premium)
- Themes are customizable per category
- Color schemes match category branding
