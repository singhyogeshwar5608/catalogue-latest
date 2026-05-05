'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Palette, Save } from 'lucide-react';
import { themes } from '@/data/themes';
import { categories } from '@/data/categories';

export default function AdminThemesPage() {
  const [allThemes, setAllThemes] = useState(themes);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTheme, setEditingTheme] = useState<any>(null);

  const handleDeleteTheme = (themeId: string) => {
    if (confirm('Are you sure you want to delete this theme?')) {
      setAllThemes(allThemes.filter(t => t.id !== themeId));
      alert('Theme deleted successfully!');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Theme Management</h1>
          <p className="text-gray-600">Create and manage themes for all categories</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition font-semibold"
        >
          <Plus className="w-5 h-5" />
          Create New Theme
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <ThemeCreatorForm
              onClose={() => setIsCreating(false)}
              onSave={(newTheme: any) => {
                setAllThemes([...allThemes, newTheme]);
                setIsCreating(false);
                alert('Theme created successfully!');
              }}
            />
          </div>
        </div>
      )}

      {editingTheme && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <ThemeCreatorForm
              theme={editingTheme}
              onClose={() => setEditingTheme(null)}
              onSave={(updatedTheme: any) => {
                setAllThemes(allThemes.map(t => t.id === updatedTheme.id ? updatedTheme : t));
                setEditingTheme(null);
                alert('Theme updated successfully!');
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {categories.map((category) => {
          const categoryThemes = allThemes.filter(t => t.categoryId === category.id);
          const CategoryIcon = category.icon;

          return (
            <div key={category.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: category.color.accent }}
                >
                  <CategoryIcon className="w-6 h-6" style={{ color: category.color.primary }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-600">{categoryThemes.length} themes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{theme.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            theme.plan === 'premium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {theme.plan === 'premium' ? `₹${theme.price}` : 'FREE'}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">{theme.layout.type}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTheme(theme)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTheme(theme.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      {theme.features.slice(0, 3).map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThemeCreatorForm({ theme, onClose, onSave }: any) {
  const [formData, setFormData] = useState(theme || {
    id: '',
    name: '',
    categoryId: '',
    plan: 'basic',
    price: 0,
    preview: '',
    features: [''],
    layout: {
      type: 'grid',
      headerStyle: 'classic',
      productCardStyle: 'card',
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id) {
      formData.id = `${formData.categoryId}-${formData.plan}-${Date.now()}`;
    }
    
    onSave(formData);
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, ''],
    });
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_: any, i: number) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {theme ? 'Edit Theme' : 'Create New Theme'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Type *
            </label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="basic">Basic (Free)</option>
              <option value="premium">Premium (Paid)</option>
            </select>
          </div>

          {formData.plan === 'premium' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (₹) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preview Image URL
          </label>
          <input
            type="url"
            value={formData.preview}
            onChange={(e) => setFormData({ ...formData, preview: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="https://..."
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Layout Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layout Type
              </label>
              <select
                value={formData.layout.type}
                onChange={(e) => setFormData({
                  ...formData,
                  layout: { ...formData.layout, type: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="grid">Grid</option>
                <option value="masonry">Masonry</option>
                <option value="carousel">Carousel</option>
                <option value="minimal">Minimal</option>
                <option value="magazine">Magazine</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Style
              </label>
              <select
                value={formData.layout.headerStyle}
                onChange={(e) => setFormData({
                  ...formData,
                  layout: { ...formData.layout, headerStyle: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="classic">Classic</option>
                <option value="modern">Modern</option>
                <option value="minimal">Minimal</option>
                <option value="bold">Bold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Card Style
              </label>
              <select
                value={formData.layout.productCardStyle}
                onChange={(e) => setFormData({
                  ...formData,
                  layout: { ...formData.layout, productCardStyle: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="card">Card</option>
                <option value="flat">Flat</option>
                <option value="elevated">Elevated</option>
                <option value="bordered">Bordered</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Color Scheme</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary</label>
              <input
                type="color"
                value={formData.layout.colorScheme.primary}
                onChange={(e) => setFormData({
                  ...formData,
                  layout: {
                    ...formData.layout,
                    colorScheme: { ...formData.layout.colorScheme, primary: e.target.value }
                  }
                })}
                className="w-full h-10 rounded-lg border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary</label>
              <input
                type="color"
                value={formData.layout.colorScheme.secondary}
                onChange={(e) => setFormData({
                  ...formData,
                  layout: {
                    ...formData.layout,
                    colorScheme: { ...formData.layout.colorScheme, secondary: e.target.value }
                  }
                })}
                className="w-full h-10 rounded-lg border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
              <input
                type="color"
                value={formData.layout.colorScheme.background}
                onChange={(e) => setFormData({
                  ...formData,
                  layout: {
                    ...formData.layout,
                    colorScheme: { ...formData.layout.colorScheme, background: e.target.value }
                  }
                })}
                className="w-full h-10 rounded-lg border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Text</label>
              <input
                type="color"
                value={formData.layout.colorScheme.text}
                onChange={(e) => setFormData({
                  ...formData,
                  layout: {
                    ...formData.layout,
                    colorScheme: { ...formData.layout.colorScheme, text: e.target.value }
                  }
                })}
                className="w-full h-10 rounded-lg border border-gray-300"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Customizations</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.customizations.animations}
                onChange={(e) => setFormData({
                  ...formData,
                  customizations: { ...formData.customizations, animations: e.target.checked }
                })}
                className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-gray-700">Enable Animations</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.customizations.parallax}
                onChange={(e) => setFormData({
                  ...formData,
                  customizations: { ...formData.customizations, parallax: e.target.checked }
                })}
                className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-gray-700">Parallax Effects</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.customizations.videoSupport}
                onChange={(e) => setFormData({
                  ...formData,
                  customizations: { ...formData.customizations, videoSupport: e.target.checked }
                })}
                className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-gray-700">Video Support</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.customizations.customCSS}
                onChange={(e) => setFormData({
                  ...formData,
                  customizations: { ...formData.customizations, customCSS: e.target.checked }
                })}
                className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-gray-700">Custom CSS</span>
            </label>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Features</h3>
            <button
              type="button"
              onClick={addFeature}
              className="text-sm text-primary hover:text-primary-700 font-medium"
            >
              + Add Feature
            </button>
          </div>
          <div className="space-y-3">
            {formData.features.map((feature: string, index: number) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Feature description"
                />
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8 pt-6 border-t">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition font-semibold"
        >
          <Save className="w-5 h-5" />
          {theme ? 'Update Theme' : 'Create Theme'}
        </button>
      </div>
    </form>
  );
}
