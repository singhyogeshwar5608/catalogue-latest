'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Image as ImageIcon, Link as LinkIcon, UploadCloud } from 'lucide-react';

type BannerImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  bannerTitle?: string;
  bannerSubtitle?: string;
};

type TabOption = 'url' | 'upload';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function BannerImageUpload({
  value,
  onChange,
  bannerTitle = 'Spotlight your category',
  bannerSubtitle = 'Craft a bold hero section for this collection',
}: BannerImageUploadProps) {
  const [activeTab, setActiveTab] = useState<TabOption>('url');
  const [urlInput, setUrlInput] = useState(value);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setUrlInput(value);
  }, [value]);

  const handleUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setUrlInput(nextValue);
      setImageError(null);
      onChange(nextValue.trim());
    },
    [onChange]
  );

  const handleImageLoadError = useCallback(() => {
    if (value) {
      setImageError('The provided image URL appears to be invalid or unreachable.');
    }
  }, [value]);

  const handleFileSelection = useCallback(
    (file: File | undefined | null) => {
      if (!file) {
        return;
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setImageError('Only JPG, PNG, or WEBP files are supported.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        setImageError(null);
        setActiveTab('upload');
        onChange(result);
      };
      reader.onerror = () => {
        setImageError('Something went wrong while reading that file.');
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);
      const file = event.dataTransfer.files?.[0];
      handleFileSelection(file);
    },
    [handleFileSelection]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelection(event.target.files?.[0]);
    },
    [handleFileSelection]
  );

  const previewBackground = useMemo(() => {
    if (!value) {
      return 'linear-gradient(135deg, #0f172a, #1e1b4b)';
    }
    return undefined;
  }, [value]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            activeTab === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <LinkIcon className="h-4 w-4" /> URL
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <UploadCloud className="h-4 w-4" /> Upload
          </span>
        </button>
      </div>

      {activeTab === 'url' ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Banner Image URL</label>
          <input
            type="url"
            value={urlInput}
            onChange={handleUrlChange}
            placeholder="https://example.com/banner.jpg"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-gray-500">Paste a direct link to a 16:4 banner image (JPG, PNG, or WEBP).</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-slate-300 bg-white'
            }`}
          >
            <UploadCloud className="mb-4 h-10 w-10 text-primary" />
            <p className="text-base font-semibold text-slate-900">Drag & drop your banner</p>
            <p className="mt-2 text-sm text-slate-500">JPG, PNG, or WEBP • No file size limits</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-primary px-4 py-2 font-semibold text-white shadow hover:bg-primary/90"
              >
                Choose file
              </button>
              <span className="text-xs text-slate-500">or drop it anywhere in this box</span>
            </div>
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileInputChange}
            />
          </div>

          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
          >
            ⚙️ Cloudinary integration coming soon
          </button>
          {/* TODO: Cloudinary integration pending */}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">Live Preview</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">16:4</span>
        </div>
        <div className="relative aspect-[16/4] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {value ? (
            <img
              src={value}
              alt="Banner preview"
              className="absolute inset-0 h-full w-full object-cover"
              onError={handleImageLoadError}
              onLoad={() => setImageError(null)}
            />
          ) : (
            <div
              className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3 text-white"
              style={{ background: previewBackground }}
            >
              <ImageIcon className="h-8 w-8" />
              <p className="text-sm font-semibold tracking-wide text-white/80">Banner preview</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
            <h3 className="text-2xl font-bold leading-tight">{bannerTitle || 'Category spotlight'}</h3>
            <p className="text-sm text-white/80">{bannerSubtitle || 'Tell customers what makes this category special.'}</p>
          </div>
        </div>
        {imageError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {imageError}
          </div>
        )}
      </div>
    </div>
  );
}
