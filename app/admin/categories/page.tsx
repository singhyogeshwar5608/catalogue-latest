"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Trash2, PencilLine, RefreshCcw, X } from "lucide-react";
import BannerImageUpload from "@/components/admin/BannerImageUpload";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategoryBanner,
  type Category,
} from "@/src/lib/api";
import { uploadImageToCloudinary } from "@/src/lib/cloudinary";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [header, body] = dataUrl.split(",");
  const match = header.match(/data:(.*?);base64/);
  const mime = match?.[1] ?? "image/png";
  const binary = atob(body ?? "");
  const len = binary.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new File([buffer], filename, { type: mime });
};

type FeedbackState = {
  type: "success" | "error";
  text: string;
} | null;

type AddCategoryForm = {
  name: string;
  slug: string;
  businessType: Category["business_type"];
  status: "active" | "inactive";
  bannerImage: string;
  bannerTitle: string;
  bannerSubtitle: string;
};

type BannerFormState = {
  bannerTitle: string;
  bannerSubtitle: string;
};

const defaultAddForm: AddCategoryForm = {
  name: "",
  slug: "",
  businessType: "product",
  status: "active",
  bannerImage: "",
  bannerTitle: "",
  bannerSubtitle: "",
};

const defaultBannerForm: BannerFormState = {
  bannerTitle: "",
  bannerSubtitle: "",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddCategoryForm>(defaultAddForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [bannerModalCategory, setBannerModalCategory] = useState<Category | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerFormState>(defaultBannerForm);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [bannerUrlInput, setBannerUrlInput] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const activeCount = useMemo(() => categories.filter((cat) => cat.is_active).length, [categories]);

  const showFeedback = useCallback((payload: FeedbackState) => {
    setFeedback(payload);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    if (payload) {
      feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 4000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories({ auth: true });
      setCategories(data);
    } catch (error) {
      showFeedback({ type: "error", text: error instanceof Error ? error.message : "Failed to load categories." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetAddForm = () => {
    setAddForm(defaultAddForm);
    setSlugTouched(false);
  };

  const handleOpenAddModal = () => {
    resetAddForm();
    setAddModalOpen(true);
  };

  const handleAddInputChange = <K extends keyof AddCategoryForm>(key: K, value: AddCategoryForm[K]) => {
    setAddForm((prev) => {
      if (key === "name" && !slugTouched) {
        const nextValue = value as string;
        return { ...prev, name: nextValue, slug: slugify(nextValue) };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setAddForm((prev) => ({ ...prev, slug: slugify(value) }));
  };

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addForm.name.trim() || !addForm.slug.trim()) {
      showFeedback({ type: "error", text: "Name and slug are required." });
      return;
    }

    try {
      setAddSaving(true);

      let bannerImage = addForm.bannerImage?.trim() || "";
      if (bannerImage.startsWith("data:")) {
        try {
          const file = dataUrlToFile(bannerImage, `category-banner-${Date.now()}.png`);
          bannerImage = await uploadImageToCloudinary(file);
        } catch (error) {
          console.error("Banner upload failed", error);
          showFeedback({ type: "error", text: "Banner upload failed. Please try again." });
          setAddSaving(false);
          return;
        }
      }

      const payload = {
        name: addForm.name.trim(),
        slug: addForm.slug.trim(),
        business_type: addForm.businessType,
        is_active: addForm.status === "active",
        banner_image: bannerImage || null,
        banner_title: addForm.bannerTitle || null,
        banner_subtitle: addForm.bannerSubtitle || null,
      };

      await createCategory(payload);
      showFeedback({ type: "success", text: "Category created successfully." });
      setAddModalOpen(false);
      resetAddForm();
      await fetchCategories();
    } catch (error) {
      showFeedback({ type: "error", text: error instanceof Error ? error.message : "Failed to create category." });
    } finally {
      setAddSaving(false);
    }
  };

  useEffect(() => {
    if (!bannerModalCategory) {
      setBannerForm(defaultBannerForm);
      setBannerImages([]);
      setBannerUrlInput('');
      return;
    }

    const existingImages = bannerModalCategory.banner_images ?? [];
    console.log('Loading existing images:', existingImages);
    setBannerForm({
      bannerTitle: bannerModalCategory.banner_title || "",
      bannerSubtitle: bannerModalCategory.banner_subtitle || "",
    });
    setBannerImages(existingImages);
    setBannerUrlInput('');
  }, [bannerModalCategory]);

  const addBanner = (url: string) => {
    const cleaned = url.trim();
    if (!cleaned) return;
    setBannerImages((prev) => [...prev, cleaned]);
  };

  const addBannerFromUrl = () => {
    if (!bannerUrlInput.trim()) return;
    addBanner(bannerUrlInput);
    setBannerUrlInput('');
  };

  const handleBannerImageUpload = async (file: File) => {
    console.log('Uploading file:', file.name);
    try {
      setUploadingBanner(true);
      const url = await uploadImageToCloudinary(file);
      console.log('Cloudinary URL received:', url);
      if (url) {
        setBannerImages((prev) => {
          const updated = [...prev, url];
          console.log('bannerImages updated:', updated);
          return updated;
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Upload failed';
      showFeedback({ type: 'error', text: message });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBannerUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    console.log('FILES SELECTED:', selectedFiles.length);
    if (selectedFiles.length === 0) {
      return;
    }

    event.target.value = '';
    for (const file of selectedFiles) {
      await handleBannerImageUpload(file);
    }
  };

  const removeBanner = (index: number) => {
    setBannerImages((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    console.log('Rendering thumbnails:', bannerImages);
  }, [bannerImages]);

  const handleBannerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bannerModalCategory) return;

    try {
      setBannerSaving(true);
      const updated = await updateCategoryBanner(bannerModalCategory.id, {
        banner_images: bannerImages,
        banner_title: bannerForm.bannerTitle || null,
        banner_subtitle: bannerForm.bannerSubtitle || null,
      });

      setCategories((prev) => prev.map((cat) => (cat.id === updated.id ? updated : cat)));
      showFeedback({ type: "success", text: "Banner updated successfully." });
      setBannerModalCategory(null);
    } catch (error) {
      showFeedback({ type: "error", text: error instanceof Error ? error.message : "Failed to update banner." });
    } finally {
      setBannerSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      setDeletingId(categoryId);
      await deleteCategory(categoryId);
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
      showFeedback({ type: "success", text: "Category deleted successfully." });
    } catch (error) {
      showFeedback({ type: "error", text: error instanceof Error ? error.message : "Failed to delete category." });
    } finally {
      setDeletingId(null);
    }
  };

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [categories]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Catalog</p>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">{activeCount} active · {categories.length} total</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fetchCategories()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add New Category
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Slug</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {sortedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-500">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  sortedCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{category.name}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{category.slug}</td>
                      <td className="px-6 py-4 capitalize">{category.business_type}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            category.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setBannerModalCategory(category)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            <PencilLine className="h-4 w-4" />
                            Edit Banner
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={deletingId === category.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingId === category.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add New Category</h2>
                <p className="text-sm text-gray-500">Create a fresh category with banner preview.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddModalOpen(false);
                }}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category Name</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(event) => handleAddInputChange("name", event.target.value)}
                    placeholder="Luxury Fashion"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
                  <input
                    type="text"
                    value={addForm.slug}
                    onChange={(event) => handleSlugChange(event.target.value)}
                    placeholder="luxury-fashion"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={addForm.businessType}
                    onChange={(event) =>
                      handleAddInputChange("businessType", event.target.value as AddCategoryForm["businessType"])
                    }
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="product">Product</option>
                    <option value="service">Service</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={addForm.status}
                    onChange={(event) =>
                      handleAddInputChange("status", event.target.value as AddCategoryForm["status"])
                    }
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Banner Title</label>
                  <input
                    type="text"
                    value={addForm.bannerTitle}
                    onChange={(event) => handleAddInputChange("bannerTitle", event.target.value)}
                    placeholder="New Season Drop"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Banner Subtitle</label>
                  <input
                    type="text"
                    value={addForm.bannerSubtitle}
                    onChange={(event) => handleAddInputChange("bannerSubtitle", event.target.value)}
                    placeholder="Curated picks for premium shoppers"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Banner Image</label>
                <BannerImageUpload
                  value={addForm.bannerImage}
                  onChange={(url) => handleAddInputChange("bannerImage", url)}
                  bannerTitle={addForm.bannerTitle}
                  bannerSubtitle={addForm.bannerSubtitle}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-60"
                >
                  {addSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Category"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bannerModalCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Update Banner</p>
                <h2 className="text-2xl font-bold text-gray-900">{bannerModalCategory.name}</h2>
                <p className="text-sm text-gray-500">Fine-tune the hero treatment for this category.</p>
              </div>
              <button
                type="button"
                onClick={() => setBannerModalCategory(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBannerSubmit} className="space-y-4 px-6 py-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Banner Images</label>
                <p className="text-xs text-gray-500">Store banners will randomly pick one of these images.</p>
                <div className="flex flex-wrap gap-3">
                  {bannerImages.length === 0 ? (
                    <span className="text-sm text-gray-400">No banners added yet.</span>
                  ) : (
                    bannerImages.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="relative h-24 w-32 overflow-hidden rounded-xl border border-gray-200"
                      >
                        <img
                          src={url}
                          alt={`Banner ${index + 1}`}
                          className="h-full w-full object-cover"
                          onError={() => console.error('Image failed to load:', url)}
                          onLoad={() => console.log('Image loaded OK:', url)}
                        />
                        <button
                          type="button"
                          onClick={() => removeBanner(index)}
                          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow"
                          aria-label={`Remove banner ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Add image clicked');
                      if (!uploadingBanner) {
                        bannerFileInputRef.current?.click();
                      }
                    }}
                    disabled={uploadingBanner}
                    className={`flex h-24 w-32 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm font-semibold transition ${
                      uploadingBanner
                        ? 'cursor-not-allowed text-gray-400'
                        : 'text-gray-600 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {uploadingBanner ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="mt-1 text-xs">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">＋</span>
                        Add image
                      </>
                    )}
                  </button>
                </div>
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}
                  onChange={handleBannerUploadChange}
                />
                {uploadingBanner && (
                  <div className="text-xs font-semibold text-gray-500">⏳ Uploading...</div>
                )}
                <p className="text-xs text-gray-500">
                  Supports JPG, PNG, WEBP, GIF · Images are stored as base64 · No upload limit
                </p>

                <div className="space-y-2 rounded-2xl border border-gray-200 p-4">
                  <label className="text-sm font-medium text-gray-700">Add via URL</label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={bannerUrlInput}
                      onChange={(event) => setBannerUrlInput(event.target.value)}
                      placeholder="https://example.com/banner.jpg"
                      className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={addBannerFromUrl}
                      disabled={!bannerUrlInput.trim()}
                      className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-60"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Banner Title</label>
                  <input
                    type="text"
                    value={bannerForm.bannerTitle}
                    onChange={(event) => setBannerForm((prev) => ({ ...prev, bannerTitle: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Headline copy"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Banner Subtitle</label>
                  <input
                    type="text"
                    value={bannerForm.bannerSubtitle}
                    onChange={(event) => setBannerForm((prev) => ({ ...prev, bannerSubtitle: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Supportive description"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setBannerModalCategory(null)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bannerSaving}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-60"
                >
                  {bannerSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
