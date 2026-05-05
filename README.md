# Cateloge - Digital Store Marketplace

A complete production-ready SaaS marketplace platform built with modern web technologies. Create digital stores, boost visibility, manage products, and grow your business online.

## 🚀 Tech Stack

### Core Framework
- **Next.js 15.1.0** - React framework with App Router for server-side rendering and routing
- **React 19.0.0** - UI library for building interactive user interfaces
- **TypeScript 5.7.2** - Type-safe JavaScript for better developer experience

### Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework for rapid UI development
- **PostCSS 8.4.49** - CSS processing with autoprefixer
- **Custom Design System** - Soft blue primary (#2563eb), rounded-xl cards, shadow-md

### UI Components & Icons
- **Lucide React 0.462.0** - Beautiful, consistent icon library
- **Next Image** - Optimized image loading and rendering

### Additional Libraries
- **QRCode 1.5.4** - QR code generation for store sharing
- **@types/qrcode** - TypeScript definitions for QRCode

### Development Tools
- **ESLint 9.17.0** - Code linting and quality checks
- **eslint-config-next** - Next.js specific ESLint configuration

## 📁 Project Structure

```
/app
  /page.tsx                      # Homepage with hero, stores, products sections
  /login/page.tsx                # Login page with Google OAuth UI
  /register/page.tsx             # Registration with business details
  /store/[username]/page.tsx     # Dynamic store pages with products & reviews
  /dashboard
    /page.tsx                    # Dashboard home with stats
    /products/page.tsx           # Product management
    /boost/page.tsx              # Store boost plans
    /subscription/page.tsx       # Subscription management
    /referral/page.tsx           # Referral program
    /qr/page.tsx                 # QR code download
  /admin
    /page.tsx                    # Admin dashboard
    /users/page.tsx              # User management
    /plans/page.tsx              # Plan management
    /boosts/page.tsx             # Boost management
    /reviews/page.tsx            # Review moderation

/components
  Navbar.tsx                     # Main navigation with search
  Footer.tsx                     # Footer with links
  MobileBottomNav.tsx            # Mobile bottom navigation
  Sidebar.tsx                    # Dashboard sidebar
  StoreCard.tsx                  # Store display card
  ProductCard.tsx                # Product card with modal
  ReviewCard.tsx                 # Review display with seller reply
  RatingStars.tsx                # Interactive star rating
  BoostBadge.tsx                 # Sponsored badge
  DashboardCard.tsx              # Dashboard stat card
  SectionHeader.tsx              # Section title component
  LocationBanner.tsx             # Location-based banner

/data
  mockStores.ts                  # 10 mock stores with varied data
  mockProducts.ts                # 25 mock products across stores
  mockReviews.ts                 # 15 mock reviews with replies
  mockPlans.ts                   # Boost & subscription plans

/types
  index.ts                       # TypeScript interfaces for all entities

/public
  manifest.json                  # PWA manifest for installability
```

## 🎨 Design System

### Colors
- **Primary**: #2563eb (Soft Blue)
- **Background**: White with gray neutral sections
- **Accents**: Green (success), Red (error), Orange (boost), Purple (premium)

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, 2xl-6xl sizes
- **Body**: Regular, gray-600/700/900

### Components
- **Cards**: rounded-xl with shadow-md
- **Buttons**: rounded-lg with smooth transitions
- **Inputs**: rounded-lg with focus:ring-2
- **Badges**: rounded-full with color-coded backgrounds

### Responsive Design
- **Mobile-first**: Tailwind breakpoints (sm, md, lg, xl)
- **Bottom Navigation**: Mobile-only sticky nav
- **Grid Layouts**: 1-4 columns based on screen size
- **Horizontal Scroll**: Mobile product/store sliders

## ✨ Key Features

### Public Features
- **Homepage**: Hero section, sponsored stores, verified sellers, trending products, location-based stores
- **Store Pages**: Dynamic routing, product grid, reviews, WhatsApp integration, QR code
- **Authentication**: Login/Register with Google OAuth UI (mock)
- **Search**: Store and product search functionality
- **Mobile App-like**: Bottom nav, floating WhatsApp button, smooth animations

### User Dashboard
- **Overview**: Stats cards, quick actions, recent activity
- **Products**: Add/edit/delete products with image upload
- **Boost**: 3/7/15 day boost plans with features
- **Subscription**: Free/Basic/Pro/Enterprise plans
- **Referral**: Referral link, earnings tracker, recent referrals
- **QR Code**: Download PNG/SVG, print-ready preview

### Admin Dashboard
- **Dashboard**: Platform stats, revenue overview, recent activity
- **Users**: Manage stores, verify/ban users
- **Plans**: Edit subscription plans and pricing
- **Boosts**: Active boost management, revenue tracking
- **Reviews**: Approve/reject customer reviews

### Store Boost System
- **Sponsored Badge**: Yellow/orange gradient badge
- **Homepage Priority**: Boosted stores appear first
- **Expiry Tracking**: Days remaining display
- **Multiple Durations**: 3, 7, 15 day options

### Rating & Review System
- **5-Star Rating**: Interactive star selection
- **Review Submission**: Comment and rating form
- **Seller Replies**: Store owners can respond
- **Moderation**: Admin approval workflow

## 🔧 Installation & Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 🌐 Routes

### Public Routes
- `/` - Homepage
- `/login` - Login page
- `/register` - Registration page
- `/store/[username]` - Dynamic store page

### User Routes (Protected)
- `/dashboard` - Dashboard home
- `/dashboard/products` - Product management
- `/dashboard/boost` - Boost store
- `/dashboard/subscription` - Subscription plans
- `/dashboard/referral` - Referral program
- `/dashboard/qr` - QR code download

### Admin Routes (Protected)
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/plans` - Plan management
- `/admin/boosts` - Boost management
- `/admin/reviews` - Review moderation

## 📱 PWA Support

The application is PWA-ready with:
- **manifest.json**: App name, icons, theme colors
- **Standalone Display**: Full-screen app experience
- **Installable**: Add to home screen on mobile
- **Theme Color**: #2563eb (primary blue)

## 🎯 Mock Data

### Stores (10)
- 2 Boosted stores (Tech Gadgets Pro, Fashion Hub)
- 3 Verified stores
- Various business types (Electronics, Fashion, Food, etc.)
- Different locations (Delhi, Mumbai, Bangalore, etc.)

### Products (25)
- Distributed across stores
- Price ranges from ₹299 to ₹12,999
- Discount pricing on select items
- High-quality Unsplash images

### Reviews (15)
- Mix of 4-5 star ratings
- Seller replies on some reviews
- Realistic customer feedback
- Approved status for moderation

## 🚀 Performance Optimizations

- **Next.js Image**: Automatic image optimization
- **Lazy Loading**: Dynamic imports for heavy components
- **Server Components**: Default server-side rendering
- **Code Splitting**: Automatic route-based splitting
- **Tailwind Purge**: Unused CSS removal in production

## 🎨 UI Inspiration

Design inspired by:
- **Stripe**: Clean, professional SaaS UI
- **Shopify**: E-commerce best practices
- **Airbnb**: Card-based layouts and spacing

## 📝 Future Enhancements

- Backend API integration
- Real authentication (NextAuth.js)
- Payment gateway (Stripe/Razorpay)
- Real-time notifications
- Analytics dashboard
- Email marketing integration
- Multi-language support
- Dark mode theme

## 📄 License

This is a demo project for educational purposes.

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
