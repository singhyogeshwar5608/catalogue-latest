# Banner Template Builder - Complete Implementation

## ✅ Feature Status: FULLY IMPLEMENTED

This document describes the complete Banner Template Builder feature that has been successfully implemented in your Next.js Super Admin Panel.

---

## 📋 Overview

The Banner Template Builder allows super admins to create dynamic banner templates for each category with separate mobile and desktop layouts. Templates include draggable product frames that will automatically populate with store owner's product images.

---

## 🗄️ Database

### Table: `banner_templates`

**Migration:** `2026_03_13_000000_create_banner_templates_table.php`

**Columns:**
- `id` - Primary key
- `name` - Template name
- `category_id` - Foreign key to categories
- `device` - Enum: 'mobile' or 'desktop'
- `bg_image` - Background image URL (nullable)
- `bg_color` - Background color (default: #1a1a2e)
- `title` - Banner title text (nullable)
- `subtitle` - Banner subtitle text (nullable)
- `show_cta_button` - Show/hide CTA button (default: true)
- `cta_text` - Button text (default: 'Shop Now')
- `cta_bg_color` - Button background color (default: #ffffff)
- `cta_text_color` - Button text color (default: #111111)
- `cta_border_radius` - Button roundness (default: 20)
- `frames` - JSON array of frame objects
- `is_active` - Template status (default: true)
- `created_at`, `updated_at` - Timestamps

**Status:** ✅ Migration run successfully

---

## 🔌 Backend API

### Model: `BannerTemplate`
**Location:** `backend/app/Models/BannerTemplate.php`
- Eloquent model with category relationship
- JSON casting for frames array
- Boolean casting for flags

### Controller: `BannerTemplateController`
**Location:** `backend/app/Http/Controllers/Api/BannerTemplateController.php`

**Methods:**
- `index()` - List all templates (with filters: category_id, device, is_active)
- `store()` - Create new template (super_admin only)
- `update()` - Update template (super_admin only)
- `destroy()` - Delete template (super_admin only)
- `show()` - Get single template
- `getByCategory($categoryId)` - Public endpoint for frontend

### API Routes
**Location:** `backend/routes/api.php`

**Public:**
- `GET /api/v1/banner-templates/category/{categoryId}` - Get active templates for category

**Super Admin (requires auth + super_admin role):**
- `GET /api/v1/banner-templates` - List all templates
- `POST /api/v1/banner-templates` - Create template
- `GET /api/v1/banner-templates/{id}` - Get single template
- `PUT /api/v1/banner-templates/{id}` - Update template
- `DELETE /api/v1/banner-templates/{id}` - Delete template

---

## 💻 Frontend

### Admin Page
**Location:** `app/admin/banner-templates/page.tsx`

**Features:**
- Templates grid with mini previews
- Search by name/category
- Filter by category dropdown
- Filter by device (All/Mobile/Desktop)
- Active/Inactive status toggle
- Edit/Delete actions
- "+ New Template" button
- Toast notifications for success/error

### Builder Modal
**Location:** `components/admin/BannerTemplateBuilder.tsx`

**Full-screen modal with three sections:**

#### 1. Left Sidebar - Controls Panel

**Template Info:**
- Name input
- Category dropdown
- Device selector (Mobile/Desktop) - changes canvas ratio

**Background:**
- Image upload (base64)
- Color picker
- Remove image option

**Text Content:**
- Title input
- Subtitle input

**CTA Button:**
- Show/Hide toggle
- Button text input
- Background color picker
- Text color picker
- Border radius slider (0-30px)

**Frames Manager:**
- "+ Add Frame" button
- List of frames with:
  - Frame number
  - Delete button
  - Expand/collapse for styles

**Selected Frame Styles (when frame clicked):**
- Shape selector (Square/Circle/Portrait/Landscape)
- Size slider (8-40% of banner width)
- Border width slider (0-8px)
- Border color picker
- Border radius slider (0-50%)
- Shadow toggle
- Shadow blur slider (0-30px)
- Shadow Y offset slider (-20 to 20px)
- Opacity slider (0.3-1.0)
- Rotation slider (-30° to +30°)

#### 2. Right Side - Canvas

**Features:**
- Live preview with responsive ratios:
  - Mobile: 9:16 portrait (paddingTop: 130%)
  - Desktop: 16:5 landscape (paddingTop: 32%)
- Draggable frames (click and drag)
- Selected frame highlighting (blue ring)
- Real-time updates as you adjust controls
- Preview mode toggle (hides drag handles)
- Device toggle (Mobile/Desktop)

#### 3. Bottom Bar
- Cancel button
- Save Template button (with loading state)

### API Helpers
**Location:** `src/lib/api.ts`

**Types:**
- `BannerTemplateFrame` - Frame configuration interface
- `BannerTemplate` - Template data interface
- `CreateBannerTemplatePayload` - Create payload
- `UpdateBannerTemplatePayload` - Update payload

**Functions:**
- `getBannerTemplates(params?)` - List templates with filters
- `getBannerTemplate(id)` - Get single template
- `createBannerTemplate(payload)` - Create new template
- `updateBannerTemplate(id, payload)` - Update template
- `deleteBannerTemplate(id)` - Delete template
- `getBannerTemplatesByCategory(categoryId)` - Public fetch for frontend

### Sidebar Navigation
**Location:** `app/admin/layout.tsx`
- Added "Banner Templates" link after "Categories"
- Uses Layout icon from lucide-react
- Links to `/admin/banner-templates`

---

## 🎨 Frame Configuration

Each frame supports:

```typescript
{
  id: number;
  x: number;              // % position from left
  y: number;              // % position from top
  size: number;           // % width of container
  shape: 'square' | 'round' | 'portrait' | 'landscape';
  borderColor: string;    // default: rgba(255,255,255,0.9)
  borderWidth: number;    // default: 2.5px
  borderRadius: number;   // default: 10px
  showShadow: boolean;
  shadowColor: string;    // default: rgba(0,0,0,0.4)
  shadowBlur: number;     // default: 15px
  shadowSpread: number;   // default: 0
  shadowX: number;        // default: 0
  shadowY: number;        // default: 8px
  opacity: number;        // default: 1.0
  rotation: number;       // default: 0°
  productImage?: string | null;
}
```

---

## 🚀 Usage Guide

### For Super Admins:

1. **Access the feature:**
   - Login as super_admin
   - Navigate to Admin Panel → Banner Templates

2. **Create a template:**
   - Click "+ New Template"
   - Enter template name
   - Select category
   - Choose device (Mobile or Desktop)
   - Upload background image or set color
   - Add title/subtitle (optional)
   - Configure CTA button
   - Click "+ Add Frame" to add product frames
   - Drag frames to position them
   - Click on a frame to customize its styles
   - Click "Save Template"

3. **Edit a template:**
   - Click "Edit" on any template card
   - Make changes in the builder
   - Click "Save Template"

4. **Toggle active status:**
   - Click "Show/Hide" button on template card
   - Active templates will be visible on the frontend

5. **Delete a template:**
   - Click trash icon on template card
   - Confirm deletion

### For Frontend Integration (Future):

```typescript
// Fetch templates for a category
const templates = await getBannerTemplatesByCategory(categoryId);

// Filter by device
const mobileTemplate = templates.find(t => t.device === 'mobile' && t.is_active);
const desktopTemplate = templates.find(t => t.device === 'desktop' && t.is_active);

// Render template with store's product images
// Populate frame.productImage with store owner's product images
```

---

## 📁 Files Created/Modified

### Created:
1. `backend/database/migrations/2026_03_13_000000_create_banner_templates_table.php`
2. `backend/app/Models/BannerTemplate.php`
3. `backend/app/Http/Controllers/Api/BannerTemplateController.php`
4. `app/admin/banner-templates/page.tsx`
5. `components/admin/BannerTemplateBuilder.tsx`

### Modified:
1. `backend/routes/api.php` - Added banner template routes
2. `src/lib/api.ts` - Added API helpers and types
3. `app/admin/layout.tsx` - Added sidebar link

---

## ✨ Key Features

- ✅ Full CRUD operations for banner templates
- ✅ Drag-and-drop frame positioning
- ✅ Real-time canvas preview
- ✅ Responsive device layouts (Mobile/Desktop)
- ✅ Customizable frames (size, shape, border, shadow, rotation)
- ✅ Background image upload with color fallback
- ✅ Text content (title/subtitle)
- ✅ CTA button customization
- ✅ Active/Inactive status toggle
- ✅ Category-based filtering
- ✅ Search functionality
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling
- ✅ Design consistency with existing admin panel

---

## 🎯 Testing Checklist

- [x] Database migration runs successfully
- [x] API routes are registered
- [x] Admin page loads without errors
- [x] Builder modal opens/closes
- [x] Can create new template
- [x] Can edit existing template
- [x] Can delete template
- [x] Can toggle active status
- [x] Frames are draggable
- [x] Frame styles update in real-time
- [x] Device toggle changes canvas ratio
- [x] Search and filters work
- [x] Toast messages appear

---

## 🔮 Future Enhancements (Optional)

1. **Frontend Integration:**
   - Display templates on category pages
   - Display templates on store pages
   - Populate frames with store product images
   - Device detection (mobile/desktop)

2. **Additional Features:**
   - Template duplication
   - Template preview before saving
   - Gradient backgrounds
   - Text styling (font size, color, position)
   - Button size and position options
   - Frame animations
   - Template versioning

---

## 📞 Support

All functionality is implemented and ready to use. The feature follows the existing admin panel design patterns and includes comprehensive error handling.

**Status:** ✅ COMPLETE AND READY FOR USE
